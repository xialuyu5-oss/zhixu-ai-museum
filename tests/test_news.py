import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from tools import update_news as n
import server

NOW = datetime(2026, 9, 16, 10, tzinfo=timezone.utc)


def feed(source, title='A new AI agent', link=None, date='Tue, 15 Sep 2026 10:00:00 GMT'):
    link = link or 'https://' + source['hosts'][0] + '/example'
    return f'<rss><channel><item><title>{title}</title><link>{link}</link><pubDate>{date}</pubDate><description><![CDATA[<p>New <b>capabilities</b>.</p><script>bad()</script>]]></description></item></channel></rss>'.encode()


class NewsTests(unittest.TestCase):
    def test_rss_dates_plain_summary_and_category(self):
        item = n.parse_feed(feed(n.SOURCES[0]), n.SOURCES[0], NOW)[0]
        self.assertEqual(item['publishedAt'], '2026-09-15T10:00:00Z')
        self.assertNotIn('bad', item['summary'])
        self.assertNotIn('<', item['summary'])
        self.assertEqual(item['topic'], 'agents')

    def test_atom_dates_and_alternate_links(self):
        raw = b'<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Test</title><link rel="self" href="https://invalid.test/"/><link rel="alternate" href="https://openai.com/test"/><published>2026-09-15T12:00:00+02:00</published><summary>A summary.</summary></entry></feed>'
        item = n.parse_feed(raw, n.SOURCES[0], NOW)[0]
        self.assertEqual(item['url'], 'https://openai.com/test')
        self.assertEqual(item['publishedAt'], '2026-09-15T10:00:00Z')

    def test_disallows_unsafe_or_foreign_links(self):
        for url in ('javascript:alert(1)', 'https://openai.com.evil.test/a', 'http://openai.com/a', 'https://name:pass@openai.com/a', 'https://openai.com:444/a'):
            with self.subTest(url=url), self.assertRaises(ValueError):
                n.parse_feed(feed(n.SOURCES[0], link=url), n.SOURCES[0], NOW)

    def test_future_invalid_and_old_dates_rejected(self):
        for date in ('bad-date', '2027-01-01T00:00:00Z', '2025-01-01T00:00:00Z'):
            with self.subTest(date=date), self.assertRaises(ValueError):
                n.parse_feed(feed(n.SOURCES[0], date=date), n.SOURCES[0], NOW)

    def test_canonical_url_dedup(self):
        a = feed(n.SOURCES[0], link='https://openai.com/a/?utm_source=test#top')
        b = feed(n.SOURCES[0], link='https://openai.com/a')
        raw = a.replace(b'</channel>', b.split(b'<channel>')[1].split(b'</channel>')[0] + b'</channel>')
        self.assertEqual(len(n.parse_feed(raw, n.SOURCES[0], NOW)), 1)

    def test_entity_and_oversized_input_rejected(self):
        for raw in (b'<!DOCTYPE a><rss/>', b'x' * 3_000_001):
            with self.assertRaises(ValueError):
                n.parse_feed(raw, n.SOURCES[0], NOW)

    def test_all_success(self):
        data = n.collect(fetcher=feed, now=NOW)
        self.assertEqual(data['status'], 'ok')
        self.assertEqual(len(data['items']), 4)
        self.assertEqual(data['lastSuccessAt'], n.stamp(NOW))

    def test_partial_failure_preserves_failed_source_items(self):
        old = n.collect(fetcher=feed, now=NOW)
        def fetch(source):
            if source['id'] == 'deepmind':
                raise TimeoutError()
            return feed(source, title='Changed title')
        new = n.collect(old, fetch, NOW + timedelta(hours=6))
        self.assertEqual(new['status'], 'partial')
        self.assertEqual(next(i for i in new['items'] if i['sourceId'] == 'deepmind')['title'], 'A new AI agent')
        self.assertEqual(new['sources'][1]['lastSuccessAt'], old['lastSuccessAt'])

    def test_total_failure_does_not_fake_success_or_erase(self):
        old = n.collect(fetcher=feed, now=NOW)
        def fail(source):
            raise ConnectionError()
        new = n.collect(old, fail, NOW + timedelta(days=1))
        self.assertEqual(new['status'], 'error')
        self.assertEqual(new['items'], old['items'])
        self.assertEqual(new['lastSuccessAt'], old['lastSuccessAt'])
        self.assertNotEqual(new['lastAttemptAt'], new['lastSuccessAt'])

    def test_empty_feed_is_failure_and_keeps_previous(self):
        old = n.collect(fetcher=feed, now=NOW)
        new = n.collect(old, lambda _: b'<rss><channel/></rss>', NOW)
        self.assertEqual(new['items'], old['items'])
        self.assertEqual(new['status'], 'error')

    def test_publisher_written_only_when_given_and_never_inherited(self):
        published = n.collect(fetcher=feed, now=NOW, publisher='GitHub Actions')
        self.assertEqual(published['publisher'], 'GitHub Actions')
        local = n.collect(published, feed, NOW + timedelta(hours=6))
        self.assertNotIn('publisher', local)
        self.assertNotIn('publisher', n.collect(fetcher=feed, now=NOW, publisher=''))

    def test_atomic_snapshot_roundtrip(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'news.json'
            n.atomic_json(path, {'title': '中文'})
            self.assertEqual(n.load_snapshot(path), {'title': '中文'})
            self.assertEqual([p.name for p in path.parent.iterdir()], ['news.json'])

    def test_scheduler_waits_six_hours(self):
        server.LAST_START = None
        with patch.object(server, 'utcnow', return_value=NOW), patch.object(server, 'load_snapshot', return_value={'lastAttemptAt': n.stamp(NOW-timedelta(hours=5))}):
            self.assertFalse(server.refresh())
            self.assertFalse(server.LOCK.locked())

    def test_scheduler_runs_when_due_and_skips_overlap(self):
        import threading
        started, release = threading.Event(), threading.Event()
        def fake_update():
            started.set()
            release.wait(2)
            return {'status': 'ok', 'lastAttemptAt': n.stamp(NOW)}
        server.LAST_START = None
        with patch.object(server, 'utcnow', return_value=NOW), patch.object(server, 'load_snapshot', return_value={'lastAttemptAt': n.stamp(NOW-timedelta(hours=6, minutes=1))}), patch.object(server, 'update', side_effect=fake_update):
            self.assertTrue(server.refresh())
            self.assertTrue(started.wait(1))
            self.assertFalse(server.refresh(force=True))
            release.set()
            # Acquire only after the worker releases; no actual network or clock waiting.
            self.assertTrue(server.LOCK.acquire(timeout=2))
            server.LOCK.release()

    def test_local_http_origin_guard_and_snapshot(self):
        from functools import partial
        from urllib.request import Request, build_opener, ProxyHandler
        from urllib.error import HTTPError
        from http.server import ThreadingHTTPServer
        import threading
        handler = partial(server.Handler, directory=str(n.ROOT / 'deploy/site'))
        http = ThreadingHTTPServer(('127.0.0.1', 0), handler)
        thread = threading.Thread(target=http.serve_forever, daemon=True)
        thread.start()
        origin = f'http://127.0.0.1:{http.server_port}'
        client = build_opener(ProxyHandler({}))
        try:
            with client.open(origin + '/news.json') as response:
                self.assertEqual(json.load(response)['schemaVersion'], 1)
            with self.assertRaises(HTTPError) as denied:
                client.open(Request(origin + '/api/news/refresh', method='POST', headers={'Origin': 'https://foreign.example', 'X-Museum-Request': '1'}))
            self.assertEqual(denied.exception.code, 403)
            with patch.object(server, 'refresh', return_value=True) as refresh_mock:
                with client.open(Request(origin + '/api/news/refresh', method='POST', headers={'Origin': origin, 'X-Museum-Request': '1'})) as response:
                    self.assertEqual(response.status, 202)
                    self.assertTrue(json.load(response)['started'])
                refresh_mock.assert_called_once_with(force=True)
            with self.assertRaises(HTTPError) as denied:
                client.open(Request(origin + '/api/news/status', headers={'Host': 'foreign.example'}))
            self.assertEqual(denied.exception.code, 403)
        finally:
            http.shutdown()
            http.server_close()
            thread.join(timeout=2)


if __name__ == '__main__':
    unittest.main(verbosity=2)
