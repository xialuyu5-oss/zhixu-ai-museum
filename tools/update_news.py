"""Collect public publisher feeds. Standard library only; no accounts or uploads."""
from pathlib import Path
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request, urlopen
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
import argparse
import hashlib
import json
import os
import re
import tempfile
import xml.etree.ElementTree as ET
try:
    from .news_editorial import annotate, enrich, load_overrides
    from .news_localization import localize_snapshot
except ImportError:
    from news_editorial import annotate, enrich, load_overrides
    from news_localization import localize_snapshot

ROOT = Path(__file__).resolve().parents[1]
INTERVAL_HOURS = 6
SOURCES = [
    {'id': 'openai', 'name': 'OpenAI', 'feedUrl': 'https://openai.com/news/rss.xml', 'hosts': ['openai.com']},
    {'id': 'deepmind', 'name': 'Google DeepMind', 'feedUrl': 'https://deepmind.google/blog/rss.xml', 'hosts': ['deepmind.google']},
    {'id': 'google', 'name': 'Google AI', 'feedUrl': 'https://blog.google/technology/ai/rss/', 'hosts': ['blog.google']},
    {'id': 'huggingface', 'name': 'Hugging Face 社区', 'feedUrl': 'https://huggingface.co/blog/feed.xml', 'hosts': ['huggingface.co']},
]


def utcnow():
    return datetime.now(timezone.utc)


def stamp(dt):
    return dt.astimezone(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')


def parse_date(value):
    try:
        dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
    except (ValueError, TypeError):
        try:
            dt = parsedate_to_datetime(value)
        except (ValueError, TypeError, IndexError, OverflowError):
            return None
    return dt.astimezone(timezone.utc) if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts, self.hidden = [], 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.hidden += 1
        elif tag in ('p', 'br', 'div', 'li'):
            self.parts.append(' ')

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.hidden = max(0, self.hidden - 1)
        else:
            self.parts.append(' ')

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def plain(value, limit):
    p = PlainText()
    p.feed(value or '')
    text = re.sub(r'\s+', ' ', ''.join(p.parts)).strip()
    return text if len(text) <= limit else text[:limit].rsplit(' ', 1)[0] + '…'


def safe_url(value, hosts):
    try:
        p = urlsplit(value.strip())
        if p.scheme != 'https' or p.username or p.password or p.port not in (None, 443) or p.hostname not in hosts:
            return None
        query = urlencode([(k, v) for k, v in parse_qsl(p.query) if not k.lower().startswith('utm_')])
        return urlunsplit(('https', p.netloc.lower(), p.path.rstrip('/') or '/', query, ''))
    except ValueError:
        return None


def classify(title, summary):
    result = annotate(title, summary)
    return result['topic'], result['related']


def parse_feed(raw, source, now=None):
    now = now or utcnow()
    if len(raw) > 3_000_000 or b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper():
        raise ValueError('Feed size or format rejected')
    root = ET.fromstring(raw)
    items = []
    for entry in root.iter():
        if entry.tag.split('}')[-1] not in ('item', 'entry'):
            continue
        fields = {}
        for child in entry:
            name = child.tag.split('}')[-1]
            if name == 'link' and child.attrib.get('href') and child.attrib.get('rel', 'alternate') == 'alternate':
                fields['link'] = child.attrib['href']
            elif name not in fields:
                fields[name] = ''.join(child.itertext())
        title = plain(fields.get('title'), 220)
        url = safe_url(fields.get('link', ''), source['hosts'])
        published = parse_date(fields.get('pubDate') or fields.get('published') or fields.get('updated', ''))
        if not title or not url or not published or published > now + timedelta(minutes=10):
            continue
        if published < now - timedelta(days=90):
            continue
        summary = plain(fields.get('description') or fields.get('summary') or fields.get('content', ''), 500)
        topic, related = classify(title, summary)
        items.append({'id': hashlib.sha256(url.encode()).hexdigest()[:16], 'title': title, 'url': url,
                      'summary': summary, 'publishedAt': stamp(published), 'sourceId': source['id'],
                      'sourceName': source['name'], 'topic': topic, 'related': related})
    if not items:
        raise ValueError('No valid recent entries')
    return sorted({i['url']: i for i in items}.values(), key=lambda i: i['publishedAt'], reverse=True)[:40]


def fetch_source(source):
    request = Request(source['feedUrl'], headers={'User-Agent': 'Mozilla/5.0 AI-Museum/0.11 public feed reader', 'Accept': 'application/rss+xml, application/atom+xml, application/xml'})
    with urlopen(request, timeout=18) as response:
        return response.read(3_000_001)


def collect(previous=None, fetcher=fetch_source, now=None, publisher=None, overrides=None):
    """Merge fresh feeds with the previous snapshot. `publisher` names the party that runs this
    program on a schedule (for example a CI job); it is written only when given, never inherited."""
    previous, now = previous or {}, now or utcnow()
    overrides = load_overrides(ROOT / 'data/news-overrides.json') if overrides is None else overrides
    attempted, items, states, successes = stamp(now), [], [], 0
    old_sources = {s['id']: s for s in previous.get('sources', [])}
    def read(source):
        try:
            return parse_feed(fetcher(source), source, now), None
        except Exception as error:
            return None, type(error).__name__
    with ThreadPoolExecutor(max_workers=4) as pool:
        outcomes = list(pool.map(read, SOURCES))
    for source, (fresh, error) in zip(SOURCES, outcomes):
        old_state = old_sources.get(source['id'], {})
        state = {k: source[k] for k in ('id', 'name', 'feedUrl')}
        state.update(checkedAt=attempted, status='error' if error else 'ok', error=error)
        if error:
            fresh = [i for i in previous.get('items', []) if i.get('sourceId') == source['id']]
            state['lastSuccessAt'] = old_state.get('lastSuccessAt')
        else:
            successes += 1
            state['lastSuccessAt'] = attempted
            fresh = [enrich(item, overrides) for item in fresh]
        state['count'] = len(fresh)
        states.append(state)
        items.extend(fresh)
    unique = {}
    for item in items:
        if item['url'] not in unique:
            unique[item['url']] = item
    result = {'schemaVersion': 1, 'intervalHours': INTERVAL_HOURS, 'generatedAt': attempted,
              'lastAttemptAt': attempted, 'lastSuccessAt': attempted if successes else previous.get('lastSuccessAt'),
              'status': 'ok' if successes == len(SOURCES) else 'partial' if successes else 'error',
              'sources': states, 'items': sorted(unique.values(), key=lambda i: i['publishedAt'], reverse=True)[:160]}
    if publisher:
        result['publisher'] = publisher
    return localize_snapshot(result)


def atomic_json(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = None
    try:
        with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=path.parent, suffix='.tmp', delete=False) as stream:
            tmp = stream.name
            json.dump(data, stream, ensure_ascii=False, indent=2)
            stream.write('\n')
        os.replace(tmp, path)
    finally:
        if tmp and os.path.exists(tmp):
            os.unlink(tmp)


def load_snapshot(path=None):
    try:
        return json.loads((path or ROOT / 'data/news.json').read_text(encoding='utf-8'))
    except (FileNotFoundError, ValueError):
        return {}


def update(publisher=None):
    result = collect(load_snapshot(), publisher=publisher)
    atomic_json(ROOT / 'data/news.json', result)
    atomic_json(ROOT / 'deploy/site/news.json', result)
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--publisher', default=None, help='Name shown on the static site as the party that runs this check on a schedule, e.g. "GitHub Actions". Omit for local runs.')
    result = update(publisher=parser.parse_args().publisher or None)
    print(json.dumps({k: result[k] for k in ('status', 'lastAttemptAt', 'lastSuccessAt')}, ensure_ascii=False))
    for source in result['sources']:
        print(source['name'], source['status'], source['count'], source['error'] or '')
    raise SystemExit(1 if result['status'] == 'error' else 0)
