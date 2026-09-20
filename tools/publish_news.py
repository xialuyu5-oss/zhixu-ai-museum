"""Prepare a publication safely; never publish packaged data after a failed read.

First publication must be explicitly requested AND the old snapshot must return
HTTP 404. Timeout, 5xx, malformed JSON, or invalid schema always stop publication.
No GitHub write operations occur in this script.
"""
import argparse
import json
from urllib.error import HTTPError
from urllib.request import Request, urlopen

try:
    from . import update_news as news
except ImportError:
    import update_news as news


def validate_snapshot(data):
    if not isinstance(data, dict) or data.get('schemaVersion') != 1:
        raise ValueError('Invalid snapshot schema')
    if not isinstance(data.get('items'), list) or not isinstance(data.get('sources'), list):
        raise ValueError('Invalid snapshot collections')
    if not news.parse_date(data.get('lastAttemptAt', '')):
        raise ValueError('Snapshot needs a valid lastAttemptAt')
    known = {s['id']: s for s in news.SOURCES}
    if len(data['items']) > 160 or len(data['sources']) != len(known):
        raise ValueError('Unexpected snapshot size')
    if {s.get('id') for s in data['sources'] if isinstance(s, dict)} != set(known):
        raise ValueError('Snapshot sources do not match this site')
    for item in data['items']:
        source = known.get(item.get('sourceId')) if isinstance(item, dict) else None
        if not source or not news.safe_url(item.get('url', ''), source['hosts']):
            raise ValueError('Invalid snapshot source link')
        if not all(isinstance(item.get(k), str) for k in ('id', 'title', 'summary', 'publishedAt')):
            raise ValueError('Invalid snapshot item')
        if not news.parse_date(item['publishedAt']):
            raise ValueError('Invalid publication date')
    return data


def read_previous(base_url, allow_initial=False, opener=urlopen):
    if not base_url.startswith('https://'):
        raise ValueError('Publication requires an HTTPS site URL')
    request = Request(base_url.rstrip('/') + '/news.json', headers={'Cache-Control': 'no-cache'})
    try:
        with opener(request, timeout=30) as response:
            raw = response.read(3_000_001)
            if len(raw) > 3_000_000:
                raise ValueError('Previous snapshot too large')
            return validate_snapshot(json.loads(raw))
    except HTTPError as error:
        if error.code == 404 and allow_initial:
            return None
        raise


def prepare(base_url, allow_initial=False, opener=urlopen, collector=news.collect):
    previous = read_previous(base_url, allow_initial, opener)
    result = collector(previous, publisher='GitHub Actions')
    validate_snapshot(result)
    if previous is None and result['status'] == 'error':
        raise ValueError('First publication has no successful feed; publication stopped')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', required=True)
    parser.add_argument('--allow-initial', action='store_true')
    args = parser.parse_args()
    # No files are written until both the previous-state read and collection pass.
    result = prepare(args.base_url, args.allow_initial)
    news.atomic_json(news.ROOT / 'data/news.json', result)
    news.atomic_json(news.ROOT / 'deploy/site/news.json', result)
    print(json.dumps({k: result[k] for k in ('status', 'lastAttemptAt', 'lastSuccessAt')}))


if __name__ == '__main__':
    main()
