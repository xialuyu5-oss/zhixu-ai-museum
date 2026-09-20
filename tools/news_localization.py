"""Attach local translations only to the exact publisher text they were made for."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
LANGUAGES = ('zh-CN', 'zh-TW', 'ja', 'ko', 'de', 'fr', 'ru')


def load_translations(path=None):
    path = Path(path or ROOT / 'data/news-translations.json')
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding='utf-8'))
    if data.get('schemaVersion') != 1 or not isinstance(data.get('items'), dict):
        raise ValueError('Invalid news translations')
    return data['items']


def localized_item(item, catalog):
    result = {k: v for k, v in item.items() if k not in ('translations', 'translationSource')}
    source = {'title': item['title'], 'summary': item.get('summary', '')}
    entry = catalog.get(item['id'], {})
    if entry.get('source') != source:
        return result
    translations = {}
    for lang, value in entry.get('locales', {}).items():
        if lang not in LANGUAGES or not isinstance(value, dict):
            continue
        title, summary = value.get('title'), value.get('summary')
        if not isinstance(title, str) or not title.strip() or not isinstance(summary, str):
            continue
        if bool(source['summary']) != bool(summary.strip()):
            continue  # Never invent a summary or silently omit one that exists.
        translations[lang] = value
    if translations:
        result.update(translations=translations, translationSource=source)
    return result


def localize_snapshot(snapshot, catalog=None):
    catalog = load_translations() if catalog is None else catalog
    return {**snapshot, 'items': [localized_item(item, catalog) for item in snapshot.get('items', [])]}
