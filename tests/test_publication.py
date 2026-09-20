import io
import json
import unittest
from datetime import timedelta
from unittest.mock import Mock
from urllib.error import HTTPError

from test_news import NOW, feed
from tools import update_news as news
from tools import publish_news as pub
from tools.news_editorial import annotate, enrich, load_overrides


class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.previous = news.collect(fetcher=feed, now=NOW)

    def opener(self, data):
        return lambda *args, **kwargs: io.BytesIO(json.dumps(data).encode())

    def failing(self, code):
        def call(*args, **kwargs):
            raise HTTPError('https://museum.example/news.json', code, 'test', {}, None)
        return call

    def test_unreadable_previous_stops_before_collection(self):
        collector = Mock()
        def timeout(*args, **kwargs):
            raise TimeoutError()
        for opener in [timeout, self.failing(500), self.failing(404), self.opener(None), self.opener({'items': []})]:
            with self.subTest(opener=opener), self.assertRaises(Exception):
                pub.prepare('https://museum.example', opener=opener, collector=collector)
        collector.assert_not_called()

    def test_bootstrap_only_allows_explicit_404(self):
        self.assertIsNone(pub.read_previous('https://museum.example', True, self.failing(404)))
        with self.assertRaises(HTTPError):
            pub.read_previous('https://museum.example', True, self.failing(503))
        with self.assertRaises(ValueError):
            pub.read_previous('https://museum.example', True, self.opener([]))

    def test_total_feed_failure_preserves_verified_live_snapshot(self):
        def fail(_):
            raise TimeoutError()
        def collect(previous, publisher):
            return news.collect(previous, fail, NOW + timedelta(hours=6), publisher)
        result = pub.prepare('https://museum.example', opener=self.opener(self.previous), collector=collect)
        self.assertEqual(result['items'], self.previous['items'])
        self.assertEqual(result['lastSuccessAt'], self.previous['lastSuccessAt'])
        self.assertEqual(result['status'], 'error')

    def test_first_publication_with_no_feed_success_is_stopped(self):
        def collect(previous, publisher):
            return {**self.previous, 'status': 'error', 'items': []}
        with self.assertRaises(ValueError):
            pub.prepare('https://museum.example', True, self.failing(404), collect)

    def test_snapshot_rejects_foreign_links_and_missing_sources(self):
        self.previous['items'][0]['url'] = 'https://evil.example/test'
        with self.assertRaises(ValueError):
            pub.validate_snapshot(self.previous)
        self.previous['sources'] = []
        with self.assertRaises(ValueError):
            pub.validate_snapshot(self.previous)

    def test_headline_wins_over_incidental_summary_terms(self):
        examples = [
            ('Engineering productivity with AI', 'A security team reports results.', 'applications'),
            ('ChatGPT for Financial Services', 'Research and insights for financial teams.', 'applications'),
            ('On the Navier–Stokes Millennium Prize Problem', '', 'science'),
            ('A new AI agent', 'A model powers this service.', 'agents'),
            ('Introducing a new model', 'Safety and security reviewed.', 'models'),
            ('Our framework for reporting model misalignment', '', 'society'),
            ('Safety overview: GPT-6 Astra', '', 'society'),
            ('Introducing GPT‑6', '', 'models'),
        ]
        for title, summary, expected in examples:
            with self.subTest(title=title):
                self.assertEqual(annotate(title, summary)['topic'], expected)

    def test_fallback_is_exposed_and_does_not_invent_summary(self):
        result = enrich({'title':'A new announcement', 'summary':'', 'url':'https://openai.com/test'}, {})
        self.assertEqual(result['classification']['method'], 'fallback')
        self.assertEqual(result['summary'], '')
        self.assertEqual(len(result['relatedRoutes']), 3)

    def test_override_is_explainable_and_preserves_publisher_fields(self):
        item = self.previous['items'][0]
        override = {item['url']: {'topic':'science', 'reason':'Test correction', 'question':'What evidence?'}}
        result = enrich(item, override)
        self.assertEqual(result['classification']['method'], 'editorial')
        self.assertEqual(result['topic'], 'science')
        self.assertEqual(result['editorial']['question'], 'What evidence?')
        for key in ('title', 'summary', 'url', 'publishedAt'):
            self.assertEqual(result[key], item[key])

    def test_packaged_editorial_overrides_are_valid(self):
        self.assertGreater(len(load_overrides(news.ROOT / 'data/news-overrides.json')), 0)


if __name__ == '__main__':
    unittest.main()
