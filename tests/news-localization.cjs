const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict'),
  path = require('node:path');
const root = path.resolve(__dirname, '..'),
  data = JSON.parse(fs.readFileSync(path.join(root, 'data/news.json'), 'utf8'));
const ctx = vm.createContext({ I18n: { locale: 'zh-CN' } });
vm.runInContext(fs.readFileSync(path.join(root, 'src/news-reading.js'), 'utf8'), ctx);
const rows = [];
function check(name, fn) {
  try {
    fn();
    rows.push({ name, passed: true });
  } catch (e) {
    rows.push({ name, passed: false, error: e.message });
  }
}
check('Every current title and existing summary resolves in all eight languages', () => {
  for (const lang of ['zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'de', 'fr', 'ru']) {
    ctx.I18n.locale = lang;
    for (const item of data.items) {
      const value = ctx.newsText(item);
      assert.equal(value.lang, lang);
      assert.equal(value.title, lang === 'en' ? item.title : item.translations[lang].title);
      assert.equal(Boolean(value.summary), Boolean(item.summary));
    }
  }
});
check('Chinese view of the reported headline and summary is translated', () => {
  ctx.I18n.locale = 'zh-CN';
  const item = data.items[0],
    value = ctx.newsText(item);
  assert.equal(value.title, '报告模型失配行为的框架');
  assert.ok(value.summary.includes('六份'));
  assert.ok(!value.summary.includes('OpenAI shares'));
});
check('Original toggle returns exact publisher text', () => {
  const item = data.items[0],
    copy = ctx.newsText(item, true);
  assert.equal(copy.title, item.title);
  assert.equal(copy.summary, item.summary);
  assert.equal(copy.lang, 'en');
  assert.equal(copy.translated, false);
});
check('Changed title rejects stale frontend translation', () =>
  assert.equal(ctx.newsText({ ...data.items[0], title: 'Corrected' }).translated, false),
);
check('Changed summary rejects stale frontend translation', () =>
  assert.equal(ctx.newsText({ ...data.items[0], summary: 'Correction' }).translated, false),
);
check('Missing current-language translation is an explicit original fallback', () => {
  const item = JSON.parse(JSON.stringify(data.items[0]));
  delete item.translations['zh-CN'];
  const value = ctx.newsText(item);
  assert.equal(value.available, false);
  assert.equal(value.title, item.title);
});
check('Selecting a translation never changes original publisher text', () => {
  const item = JSON.parse(JSON.stringify(data.items[0])),
    before = JSON.stringify(item);
  ctx.newsText(item);
  ctx.newsText(item, true);
  assert.equal(JSON.stringify(item), before);
});
const result = { total: rows.length, passed: rows.filter((x) => x.passed).length, checks: rows };
fs.writeFileSync(
  path.join(root, 'docs/news-localization-regression.json'),
  JSON.stringify(result, null, 2) + '\n',
);
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.passed === result.total ? 0 : 1;
