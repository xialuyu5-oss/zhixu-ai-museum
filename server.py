"""Local-only museum preview with a six-hour public-feed updater."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
from datetime import timedelta
from urllib.parse import urlsplit
import argparse
import json
import threading
from tools.update_news import update, load_snapshot, utcnow, parse_date, INTERVAL_HOURS

ROOT = Path(__file__).resolve().parent
LOCK = threading.Lock()
STOP = threading.Event()
LAST_START = None


def refresh(force=False):
    global LAST_START
    if not LOCK.acquire(blocking=False):
        return False
    now = utcnow()
    if LAST_START and now - LAST_START < timedelta(seconds=30):
        LOCK.release()
        return False
    previous = load_snapshot()
    last = parse_date(previous.get('lastAttemptAt', ''))
    if not force and last and now - last < timedelta(hours=INTERVAL_HOURS):
        LOCK.release()
        return False
    LAST_START = now
    def work():
        try:
            data = update()
            print('News:', data['status'], data['lastAttemptAt'], flush=True)
        except Exception as error:
            print('News update failed:', type(error).__name__, flush=True)
        finally:
            LOCK.release()
    threading.Thread(target=work, daemon=True).start()
    return True


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def json_response(self, code, value):
        raw = json.dumps(value).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def local_host(self):
        return self.headers.get('Host') in (f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}')

    def do_GET(self):
        if not self.local_host():
            return self.json_response(403, {'error': 'Local host only'})
        path = urlsplit(self.path).path
        if path == '/api/news/status':
            data = load_snapshot()
            return self.json_response(200, {'updating': LOCK.locked(), 'autoUpdate': getattr(self.server, 'auto_update', True), 'intervalHours': INTERVAL_HOURS, 'lastAttemptAt': data.get('lastAttemptAt'), 'status': data.get('status')})
        if path.startswith('/api/'):
            return self.json_response(404, {'error': 'Not found'})
        return super().do_GET()

    def do_POST(self):
        # A browser from another website must not trigger requests through this local service.
        origin = self.headers.get('Origin')
        expected = 'http://' + self.headers.get('Host', '')
        if not self.local_host() or origin != expected or self.headers.get('X-Museum-Request') != '1':
            return self.json_response(403, {'error': 'Same-origin request required'})
        if urlsplit(self.path).path != '/api/news/refresh':
            return self.json_response(404, {'error': 'Not found'})
        started = refresh(force=True)
        self.json_response(202, {'started': started, 'updating': LOCK.locked()})


def schedule():
    while not STOP.is_set():
        refresh()
        STOP.wait(60)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8774)
    parser.add_argument('--no-update', action='store_true', help='Preview saved snapshot without networking')
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, directory=str(ROOT / 'deploy/site')))
    server.auto_update = not args.no_update
    if not args.no_update:
        threading.Thread(target=schedule, daemon=True).start()
    print(f'Museum: http://127.0.0.1:{server.server_port}  (Ctrl+C to stop)', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        STOP.set()
        server.server_close()
