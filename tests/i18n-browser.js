/* Local same-origin tests. Restore all preferences/notes touched by the test. */
const frame = document.getElementById('app'),
  checks = [],
  missing = new Set(),
  overflows = [],
  fontChecks = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms)),
  d = () => frame.contentDocument,
  w = () => frame.contentWindow,
  $ = (s) => d().querySelector(s);
const visible = (e) => e && e.getClientRects().length && !e.closest('[hidden]');
function assert(v, m) {
  if (!v) throw Error(m);
}
async function settle() {
  await d().fonts.ready;
  await wait(180);
  await new Promise((r) => w().requestAnimationFrame(() => w().requestAnimationFrame(r)));
}
async function test(name, fn) {
  try {
    await fn();
    checks.push({ name, passed: true });
  } catch (e) {
    checks.push({ name, passed: false, error: e.message });
  }
  document.getElementById('status').textContent =
    `${checks.filter((c) => c.passed).length} / ${checks.length}`;
}
async function language(lang) {
  $('#locale-picker').value = lang;
  $('#locale-picker').dispatchEvent(new (w().Event)('change', { bubbles: true }));
  await settle();
}
async function route(value) {
  w().location.hash = value;
  await settle();
}
async function click(selector) {
  const e = $(selector);
  assert(e, 'Missing ' + selector);
  e.click();
  await settle();
}
function layout(label) {
  label = d().documentElement.lang + ' ' + w().innerWidth + 'x' + w().innerHeight + ' ' + label;
  const root = d().documentElement;
  assert(root.scrollWidth <= w().innerWidth + 2, label + ' horizontal document overflow');
  assert(root.scrollHeight <= w().innerHeight + 2, label + ' vertical document overflow');
  for (const e of d().querySelectorAll(
    '.depth-main,.lab-stage,.lab-settings,.adaptive-page,.story-exhibit,.research-core,.research-station,.deck-head,.lesson-tabs',
  )) {
    if (!visible(e)) continue;
    const css = w().getComputedStyle(e);
    if (e.scrollHeight > e.clientHeight + 5 && !['auto', 'scroll'].includes(css.overflowY))
      overflows.push({
        label,
        element: e.className,
        height: e.clientHeight,
        content: e.scrollHeight,
      });
    if (e.scrollWidth > e.clientWidth + 5 && !['auto', 'scroll'].includes(css.overflowX))
      overflows.push({ label, element: e.className, width: e.clientWidth, content: e.scrollWidth });
  }
}
function collect() {
  for (const s of w().AtlasMuseum.i18n.diagnostics().missing) missing.add(s);
}
async function run() {
  document.getElementById('run').disabled = true;
  checks.length = 0;
  missing.clear();
  overflows.length = 0;
  fontChecks.length = 0;
  const keys = ['zhixu-v07:locale', 'zhixu-v07:notes', 'zhixu-v07:theme'],
    saved = Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)]));
  try {
    localStorage.removeItem(keys[0]);
    frame.style.width = '1440px';
    frame.style.height = '900px';
    frame.src = '../deploy/site/index.html?i18nqa=' + Date.now();
    await new Promise((r) => (frame.onload = r));
    await settle();
    await test('Fresh visit defaults to Chinese', () => {
      assert(d().documentElement.lang === 'zh-CN', 'Wrong default');
      assert($('#locale-picker').value === 'zh-CN', 'Picker default');
    });
    await language('en');
    await test('English selection translates document title, controls and visible content', () => {
      assert(d().title.includes('Zhixu'), 'Title missing');
      assert($('.topnav').textContent.includes('Research room'), 'Navigation missing');
      assert($('h1').textContent.includes('Why do we'), 'Hero missing');
    });
    await test('Saved choice survives reload', async () => {
      frame.src = '../deploy/site/index.html?reload=' + Date.now();
      await new Promise((r) => (frame.onload = r));
      await settle();
      assert(d().documentElement.lang === 'en', 'Locale not persisted');
      assert($('.topnav').textContent.includes('Research room'), 'Content not translated on load');
    });
    await route('act/2/0');
    await click('[data-group="lab-token"][data-id="generate"]');
    await test('Switch preserves route and active experiment tab', async () => {
      const before = w().AtlasMuseum.getState();
      await language('ja');
      const after = w().AtlasMuseum.getState();
      assert(JSON.stringify(before) === JSON.stringify(after), 'Experiment state changed');
      assert(d().documentElement.lang === 'ja', 'Japanese not set');
    });
    await route('act/5/0');
    const target = $('[data-spec="goal"]');
    target.value = '目标\nMy task 私の仕事 <tag>';
    target.dispatchEvent(new (w().Event)('input', { bubbles: true }));
    await settle();
    await test('Switch preserves user input without translating it', async () => {
      const before = target.value;
      await language('en');
      assert($('[data-spec="goal"]').value === before, 'Input changed');
      assert(w().AtlasMuseum.getState().spec.goal === before, 'Stored task changed');
    });
    await route('act/5/3');
    await click('[data-do="run-next"]');
    await click('[data-do="run-next"]');
    await click('[data-do="checkpoint"]');
    await test('Switch preserves an in-progress run', async () => {
      const before = w().AtlasMuseum.getState();
      await language('ja');
      assert(
        JSON.stringify(before) === JSON.stringify(w().AtlasMuseum.getState()),
        'Run state changed',
      );
    });
    await route('notes');
    const note = $('textarea');
    note.value = '目标\nMy private note 私のメモ';
    note.dispatchEvent(new (w().Event)('input', { bubbles: true }));
    await settle();
    await test('Notes stay intact through a round trip', async () => {
      const before = note.value;
      await language('en');
      await language('zh-CN');
      assert($('textarea').value === before, 'Note changed');
    });
    await route('basics');
    await language('en');
    const search = $('#concept-search');
    search.value = 'context';
    search.dispatchEvent(new (w().Event)('input', { bubbles: true }));
    await wait(250);
    await settle();
    await test('English concept search finds the translated concept', () =>
      assert($('.knowledge-tile')?.textContent.includes('Context'), 'No context result'));
    await route('act/1/1');
    await test('Returning to Chinese restores original labels', async () => {
      await language('en');
      await language('ja');
      await language('zh-CN');
      assert($('h1').textContent.includes('1955'), 'Title lost');
      assert($('.topnav').textContent.includes('资料室'), 'Chinese not restored');
    });
    const routes = [
      'entrance',
      'library',
      'basics',
      'notes',
      'news',
      ...w().AtlasMuseum.pages.flatMap((n, a) =>
        Array.from({ length: n }, (_, p) => `act/${a + 1}/${p}`),
      ),
    ];
    for (const [width, height] of [
      [1920, 1080],
      [1440, 900],
      [1366, 768],
      [1024, 600],
      [390, 844],
      [844, 390],
    ]) {
      frame.style.width = width + 'px';
      frame.style.height = height + 'px';
      await settle();
      for (const lang of w().AtlasMuseum.i18n.supported) {
        await language(lang);
        if (!fontChecks.some((row) => row.lang === lang)) {
          const fonts = [...d().fonts].filter((f) => f.status === 'loaded').map((f) => f.family);
          const suffix = { 'zh-CN': 'SC', 'zh-TW': 'TC', ja: 'JP', ko: 'KR' }[lang] || 'Latin';
          await test(`${lang} local fonts loaded`, () => {
            assert(fonts.includes('Atlas Sans ' + suffix), 'Body font not loaded');
            if (lang !== 'ko')
              assert(fonts.includes('Atlas Serif ' + suffix), 'Title font not loaded');
          });
          fontChecks.push({ lang, fonts });
        }
        for (const r of routes) {
          await route(r);
          await test(`${lang} ${width}x${height} ${r}`, () => layout(r));
        }
        collect();
      }
    }
    frame.style.width = '1440px';
    frame.style.height = '900px';
    await settle();
    for (const lang of w().AtlasMuseum.i18n.supported.filter((l) => l !== 'zh-CN')) {
      await language(lang);
      for (const r of [
        'act/1/1',
        'act/1/2',
        'act/1/3',
        'act/2/0',
        'act/2/1',
        'act/2/2',
        'act/2/3',
        'act/3/0',
        'act/3/1',
      ]) {
        await route(r);
        const choices = [...d().querySelectorAll('.lesson-tabs button')].map((b) => ({
          group: b.dataset.group,
          id: b.dataset.id,
        }));
        for (const { group, id } of choices) {
          await click(`[data-group="${group}"][data-id="${id}"]`);
          await test(`${lang} inner view ${group}/${id}`, () => layout(group + '/' + id));
        }
      }
      collect();
    }
    for (const lang of w().AtlasMuseum.i18n.supported.filter((l) => l !== 'zh-CN')) {
      await language(lang);
      for (const id of ['ai', 'vector', 'retrieval', 'agent', 'mcp', 'harness']) {
        await route('concept/' + id);
        for (const panel of ['exhibit', 'try', 'boundary', 'source']) {
          await click(`[data-group="concept-${id}"][data-id="${panel}"]`);
          await test(`${lang} concept ${id}/${panel}`, () => layout(id + '/' + panel));
        }
      }
      await route('concept/ai');
      await click('[data-group="concept-ai"][data-id="boundary"]');
      await click('[data-do="reading"]');
      await test(`${lang} curated reader translates full paragraphs`, () => {
        assert($('.reader-body').textContent.length > 40, 'Missing reader');
        assert(
          !/[\u3400-\u9fff]/.test(lang === 'en' ? $('.reader-body').textContent : ''),
          'Untranslated English paragraph',
        );
      });
      await click('[data-do="close-layer"]');
      await route('library');
      for (let path = 0; path < 5; path++) {
        await click(`[data-do="research-path"][data-id="${path}"]`);
        for (let step = 0; step < 3; step++) {
          await click(`[data-do="research-step"][data-id="${step}"]`);
          await test(`${lang} library ${path}/${step}`, () => layout('library'));
        }
      }
      await click('[data-do="archive"][data-route="articles"]');
      await click('[data-do="article"]');
      await test(`${lang} legacy article shows original-language notice`, () => {
        assert(visible($('.original-language-notice')), 'No original-language notice');
        assert($('.reader-body p[lang="zh-CN"][data-i18n-skip]'), 'Article source not protected');
      });
      await click('[data-do="close-layer"]');
      collect();
    }
    await test('No unscrollable clipped regions in checked views', () =>
      assert(!overflows.length, JSON.stringify(overflows.slice(0, 8))));
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
    frame.src = 'about:blank';
    window.testReport = {
      version: '0.15.0',
      time: new Date().toISOString(),
      total: checks.length,
      passed: checks.filter((c) => c.passed).length,
      checks,
      missing: [...missing],
      overflows,
      fontChecks,
    };
    document.getElementById('output').textContent = JSON.stringify(window.testReport, null, 2);
    document.getElementById('status').textContent =
      '完成 ' + window.testReport.passed + ' / ' + checks.length;
    document.getElementById('run').disabled = false;
  }
}
document.getElementById('run').onclick = () =>
  run().catch((e) => {
    document.getElementById('status').textContent = '异常 ' + e.message;
  });
