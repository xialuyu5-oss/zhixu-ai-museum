import copy
import json
from pathlib import Path
import unittest
from tools.news_localization import load_translations, localize_snapshot, localized_item, LANGUAGES

ROOT = Path(__file__).resolve().parents[1]


class LocalizationTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((ROOT / 'data/news.json').read_text(encoding='utf-8'))
        self.catalog = load_translations()
        self.item = self.data['items'][0]

    def test_all_current_items_have_all_seven_target_languages(self):
        for item in self.data['items']:
            translated = localized_item(item, self.catalog)
            self.assertEqual(set(translated['translations']), set(LANGUAGES))
            self.assertEqual(translated['title'], item['title'])
            self.assertEqual(translated['summary'], item['summary'])
            self.assertEqual(translated['url'], item['url'])

    def test_title_change_invalidates_all_old_translations(self):
        item = {**self.item, 'title': 'A revised headline'}
        self.assertNotIn('translations', localized_item(item, self.catalog))

    def test_summary_change_invalidates_all_old_translations(self):
        item = {**self.item, 'summary': 'The publisher corrected this summary.'}
        self.assertNotIn('translations', localized_item(item, self.catalog))

    def test_missing_translation_preserves_original_and_status(self):
        result = localize_snapshot(self.data, {})
        self.assertEqual(result['lastSuccessAt'], self.data['lastSuccessAt'])
        self.assertEqual(result['items'][0]['title'], self.item['title'])
        self.assertNotIn('translations', result['items'][0])

    def test_missing_summaries_remain_missing(self):
        blank = [x for x in self.data['items'] if not x['summary']]
        self.assertTrue(blank)
        for item in blank:
            for value in localized_item(item, self.catalog)['translations'].values():
                self.assertEqual(value['summary'], '')

    def test_invented_summary_is_rejected_without_affecting_other_languages(self):
        item = next(x for x in self.data['items'] if not x['summary'])
        catalog = copy.deepcopy(self.catalog)
        catalog[item['id']]['locales']['ja']['summary'] = 'Invented detail'
        result = localized_item(item, catalog)
        self.assertNotIn('ja', result['translations'])
        self.assertIn('zh-CN', result['translations'])

    def test_repeated_processing_is_idempotent(self):
        one = localize_snapshot(self.data, self.catalog)
        self.assertEqual(one, localize_snapshot(one, self.catalog))

    def test_live_collection_attaches_current_translations(self):
        from tools.update_news import collect, SOURCES
        from datetime import datetime, timezone
        item = self.item
        raw = f'<rss><channel><item><title>{item["title"]}</title><link>{item["url"]}</link><pubDate>2026-09-18T00:00:00Z</pubDate><description>{item["summary"]}</description></item></channel></rss>'.encode()
        def fetch(source):
            if source['id'] == item['sourceId']:
                return raw
            raise ConnectionError('isolated test')
        result = collect(fetcher=fetch, now=datetime(2026, 9, 18, 1, tzinfo=timezone.utc))
        self.assertEqual(result['items'][0]['translations']['zh-CN']['title'], '报告模型失配行为的框架')
