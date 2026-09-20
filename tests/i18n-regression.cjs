const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict'),
  path = require('node:path');
const root = path.resolve(__dirname, '..');
const languages = JSON.parse(
  fs.readFileSync(path.join(root, 'src/locales/manifest.json'), 'utf8'),
).map((l) => l.id);
const resources = Object.fromEntries(
  languages.map((l) => [
    l,
    JSON.parse(fs.readFileSync(path.join(root, 'src/locales', l + '.json'), 'utf8')),
  ]),
);
const checks = [];
function check(name, fn) {
  try {
    fn();
    checks.push({ name, passed: true });
  } catch (e) {
    checks.push({ name, passed: false, error: e.message });
  }
}
function runtime(saved = null, blocked = false) {
  const storage = new Map(saved ? [['zhixu-v07:locale', saved]] : []);
  const document = {
    documentElement: { dataset: {} },
    body: {},
    getElementById: (id) =>
      id === 'locale-data' ? { textContent: JSON.stringify(resources) } : null,
    createTreeWalker: () => ({ nextNode: () => null }),
    querySelectorAll: () => [],
    dispatchEvent() {},
    addEventListener() {},
  };
  const context = {
    document,
    Intl,
    NodeFilter: { SHOW_TEXT: 4 },
    CustomEvent: class {},
    localStorage: {
      getItem: (k) => {
        if (blocked) throw Error('blocked');
        return storage.get(k);
      },
      setItem: (k, v) => {
        if (blocked) throw Error('blocked');
        storage.set(k, v);
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(root, 'src/i18n.js'), 'utf8') + '\nthis.i18n=I18n;',
    context,
  );
  return { i: context.i18n, storage };
}
check('All eight catalogs have matching active keys and placeholder contracts', () => {
  assert.deepEqual(Object.keys(resources.en).sort(), Object.keys(resources.ja).sort());
  for (const lang of languages.filter((l) => l !== 'zh-CN')) {
    assert.deepEqual(Object.keys(resources[lang]).sort(), Object.keys(resources.en).sort(), lang);
    for (const [key, value] of Object.entries(resources[lang])) {
      assert.ok(resources['zh-CN'][key], key);
      assert.ok(value.trim(), key);
      const slots = (s) => [...new Set(s.match(/\{\d+\}/g) || [])].sort();
      assert.deepEqual(slots(value), slots(resources['zh-CN'][key]), key);
      assert.ok(!value.includes('▁'), lang + ': tokenizer marker leaked');
    }
  }
});
check('Fresh and invalid storage default to Chinese', () => {
  assert.equal(runtime().i.locale, 'zh-CN');
  assert.equal(runtime('xx').i.locale, 'zh-CN');
});
check('Blocked local storage does not prevent switching', () => {
  const { i } = runtime(null, true);
  i.set('ja');
  assert.equal(i.locale, 'ja');
});
check('Stored choice survives initialization and invalid choices are rejected', () => {
  const { i, storage } = runtime('en');
  assert.equal(i.locale, 'en');
  i.set('ja');
  i.set('invalid');
  assert.equal(i.locale, 'ja');
  assert.equal(storage.get('zhixu-v07:locale'), 'ja');
});
check('Chinese whitespace and user text remain exact', () => {
  const { i } = runtime();
  assert.equal(i.t(' \n目标\n '), ' \n目标\n ');
  assert.equal(i.t('田中\nprivate <tag>'), '田中\nprivate <tag>');
});
check('Known UI, accessible labels and computed text translate', () => {
  const { i } = runtime('en');
  assert.equal(i.t('资料室'), 'Research room');
  assert.equal(i.t('暂停动效'), 'Pause animation');
  assert.equal(i.t('当前分界 5.5 mm'), 'Current boundary 5.5 mm');
  assert.equal(i.t('合计 100%'), 'Total 100%');
});
check('Full numeric messages translate before label fragments', () => {
  const { i } = runtime('en');
  for (const text of [
    '第 1 幕 · 它从哪里来',
    '第 1 次尝试 · 一次尝试',
    '24 项 ÷ 4 项并行，向上取整',
    'CPU 24 节拍；GPU 路径 8 节拍',
  ])
    assert.ok(!/[\u3400-\u9fff]/.test(i.t(text)), text);
});
check('Language-specific cache cannot leak between languages', () => {
  const { i } = runtime('en');
  i.t('当前分界 5.5 mm');
  i.set('ja');
  assert.equal(i.t('当前分界 5.5 mm'), '現在の境界 5.5 mm');
  i.set('zh-CN');
  assert.equal(i.t('当前分界 5.5 mm'), '当前分界 5.5 mm');
});
check('Missing text falls back and is recorded, not blanked', () => {
  const { i } = runtime('en');
  assert.equal(i.t('尚未收录的测试词'), '尚未收录的测试词');
  assert.ok(i.diagnostics().missing.includes('尚未收录的测试词'));
});
check('Localized search includes both original and translated title', () => {
  const { i } = runtime('en');
  assert.ok(i.search('上下文').includes('context'));
  assert.ok(i.search('上下文').includes('上下文'));
  assert.ok(i.search('保留的馆藏原文').includes('保留的馆藏原文'));
  assert.equal(i.diagnostics().missing.length, 0);
});
check('Offline and deployed bundles embed the same language resources', () => {
  for (const file of ['index.html', 'deploy/site/index.html']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const payload = html.match(
      /<script type="application\/json" id="locale-data">([\s\S]*?)<\/script>/,
    );
    assert.ok(payload, file);
    assert.deepEqual(JSON.parse(payload[1]), resources, file);
  }
});
check('Numeric and date formatting use the chosen locale', () => {
  const { i } = runtime('en');
  assert.equal(i.number(12345), '12,345');
  assert.match(
    i.date(new Date('2026-09-17T00:00:00Z'), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }),
    /September 17, 2026/,
  );
  i.set('ja');
  assert.match(
    i.date(new Date('2026-09-17T00:00:00Z'), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }),
    /2026年9月17日/,
  );
});
check('Exports localize headings while keeping user content and line breaks', () => {
  const { i } = runtime('en'),
    s = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
  const context = {
    I18n: i,
    U: { spec: { goal: '目标\n<private>', criterion: '日本語 intact', budget: 8 }, run: null },
    Notes: { why: '目标\n<private>', keep: '日本語 intact', question: '私の質問' },
  };
  vm.createContext(context);
  for (const name of ['blueprintText', 'noteMarkdown']) {
    const a = s.indexOf('function ' + name + '()'),
      b = s.indexOf('\nfunction ', a + 10);
    vm.runInContext(s.slice(a, b), context);
  }
  assert.match(context.blueprintText(), /^# My assistant design\n/);
  assert.ok(context.blueprintText().includes('目标\n<private>'));
  assert.ok(context.noteMarkdown().includes('日本語 intact'));
  assert.match(context.noteMarkdown(), /v0\.15\.0/);
});
check('Every supported locale can be saved and restored', () => {
  for (const lang of languages) {
    const { i, storage } = runtime();
    i.set(lang);
    assert.equal(i.locale, lang);
    assert.equal(runtime(storage.get('zhixu-v07:locale')).i.locale, lang);
    assert.deepEqual(Array.from(i.supported), languages);
  }
});
check('Local font files match the deployment and carry license records', () => {
  const fonts = JSON.parse(fs.readFileSync(path.join(root, 'assets/fonts/manifest.json'), 'utf8'));
  const crypto = require('node:crypto');
  assert.equal(fonts.length, 9);
  for (const f of fonts) {
    const data = fs.readFileSync(path.join(root, 'assets/fonts', f.file));
    assert.equal(crypto.createHash('sha256').update(data).digest('hex'), f.sha256);
    assert.ok(
      data.equals(fs.readFileSync(path.join(root, 'deploy/site/assets/fonts', f.file))),
      f.file,
    );
    assert.match(
      fs.readFileSync(path.join(root, 'assets/fonts', f.license), 'utf8'),
      /SIL OPEN FONT LICENSE/i,
    );
  }
  for (const lang of languages)
    assert.ok(
      fonts.some((f) => f.languages.includes(lang)),
      lang,
    );
});
check('Offline fonts are embedded and deployment uses local URLs', () => {
  const single = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const site = fs.readFileSync(path.join(root, 'deploy/site/index.html'), 'utf8');
  assert.equal((single.match(/data:font\/woff2;base64,/g) || []).length, 9);
  assert.equal((site.match(/assets\/fonts\/[^']+\.woff2/g) || []).length, 9);
  assert.ok(!single.includes("url('assets/fonts/"));
});
const report = {
  version: require('../package.json').version,
  time: new Date().toISOString(),
  total: checks.length,
  passed: checks.filter((c) => c.passed).length,
  translatedKeys: Object.keys(resources.en).length,
  checks,
};
fs.writeFileSync(path.join(root, 'docs/i18n-regression.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.total !== report.passed) process.exitCode = 1;
