/* Targeted follow-up: all languages, homepage canvas typography and regenerated labels. */
const frame = document.querySelector('#app'),
  rows = [],
  missing = new Set();
const doc = () => frame.contentDocument,
  win = () => frame.contentWindow;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function settle() {
  await doc().fonts.ready;
  await wait(240);
}
async function route(hash) {
  win().location.hash = hash;
  await settle();
}
async function language(lang) {
  const el = doc().querySelector('#locale-picker');
  el.value = lang;
  el.dispatchEvent(new (win().Event)('change', { bubbles: true }));
  await settle();
}
function inspect(label) {
  const errors = [];
  const root = doc().documentElement;
  if (root.scrollHeight > win().innerHeight + 2 || root.scrollWidth > win().innerWidth + 2)
    errors.push('Document overflow');
  for (const e of doc().querySelectorAll(
    '.entrance-ten-copy,.story-exhibit,.deck-head,.research-core',
  )) {
    if (!e.getClientRects().length || e.closest('[hidden]')) continue;
    const style = win().getComputedStyle(e);
    if (e.scrollHeight > e.clientHeight + 5 && !['auto', 'scroll'].includes(style.overflowY))
      errors.push(e.className + ' vertical');
    if (e.scrollWidth > e.clientWidth + 5 && !['auto', 'scroll'].includes(style.overflowX))
      errors.push(e.className + ' horizontal');
  }
  for (const s of win().AtlasMuseum.i18n.diagnostics().missing) missing.add(s);
  rows.push({ label, passed: !errors.length, errors });
  document.querySelector('#status').textContent = rows.length + ' 组已检查';
}
async function run() {
  rows.length = 0;
  missing.clear();
  document.querySelector('#run').disabled = true;
  const key = 'zhixu-v07:locale',
    saved = localStorage.getItem(key);
  try {
    frame.src = '../deploy/site/index.html?final=' + Date.now();
    await new Promise((r) => (frame.onload = r));
    for (const [width, height] of [
      [1920, 1080],
      [1440, 900],
      [1366, 768],
      [1280, 720],
      [390, 844],
      [844, 390],
    ]) {
      frame.style.width = width + 'px';
      frame.style.height = height + 'px';
      await settle();
      for (const lang of win().AtlasMuseum.i18n.supported) {
        await language(lang);
        await route('entrance');
        for (const mode of [0, 1, 2]) {
          doc().querySelector(`[data-do="phase"][data-id="${mode}"]`).click();
          await settle();
          inspect(`${lang} ${width}x${height} entrance/${mode}`);
        }
      }
    }
    frame.style.width = '1280px';
    frame.style.height = '720px';
    await settle();
    for (const lang of win().AtlasMuseum.i18n.supported) {
      await language(lang);
      for (const hash of ['act/1/1', 'act/1/2', 'library']) {
        await route(hash);
        if (hash === 'act/1/2') {
          doc().querySelector('[data-group="learning10"][data-id="test"]').click();
          await settle();
        }
        const before = JSON.stringify(win().AtlasMuseum.getState());
        await language('en');
        const labels = [
          ...doc().querySelectorAll(
            '.reading-pager [aria-label],.reading-pager,.station-view,.test-ruler',
          ),
        ].map((x) => x.getAttribute('aria-label') || '');
        const bad = labels.filter((s) => /[\u3400-\u9fff]/.test(s));
        rows.push({
          label: `${lang} -> en ${hash}`,
          passed: !bad.length && before === JSON.stringify(win().AtlasMuseum.getState()),
          errors: bad,
        });
        await language(lang);
      }
    }
  } finally {
    if (saved === null) localStorage.removeItem(key);
    else localStorage.setItem(key, saved);
    frame.src = 'about:blank';
    const result = {
      time: new Date().toISOString(),
      total: rows.length,
      passed: rows.filter((r) => r.passed).length,
      failures: rows.filter((r) => !r.passed),
      missing: [...missing],
    };
    document.querySelector('#report').textContent = JSON.stringify(result, null, 2);
    document.querySelector('#status').textContent = `完成 ${result.passed} / ${result.total}`;
    document.querySelector('#run').disabled = false;
  }
}
document.querySelector('#run').onclick = () =>
  run().catch((e) => (document.querySelector('#status').textContent = e.message));
