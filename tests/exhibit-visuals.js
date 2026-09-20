const frame = document.querySelector('#app'),
  rows = [];
const d = () => frame.contentDocument,
  w = () => frame.contentWindow;
const settle = () => new Promise((r) => setTimeout(r, 420));
const visible = (e) =>
  e &&
  e.getClientRects().length &&
  !e.closest('[hidden],[inert]') &&
  getComputedStyle(e).visibility !== 'hidden';
function record(name, errors = []) {
  rows.push({ name, errors });
  document.querySelector('#status').textContent = rows.length + ' checks';
}
function overflow(root, selectors) {
  const errors = [];
  for (const e of root.querySelectorAll(selectors)) {
    if (!visible(e)) continue;
    if (e.scrollHeight > e.clientHeight + 3 || e.scrollWidth > e.clientWidth + 3)
      errors.push(
        'overflow ' +
          e.className +
          ': ' +
          [e.clientWidth, e.scrollWidth, e.clientHeight, e.scrollHeight],
      );
    for (const child of [...e.children].filter(visible)) {
      const a = e.getBoundingClientRect(),
        b = child.getBoundingClientRect();
      if (b.bottom > a.bottom + 3 || b.right > a.right + 3 || b.left < a.left - 3)
        errors.push('clipped ' + child.className + ' in ' + e.className);
    }
  }
  if (
    d().documentElement.scrollWidth > w().innerWidth + 2 ||
    d().documentElement.scrollHeight > w().innerHeight + 2
  )
    errors.push('document scroll');
  return errors;
}
async function route(hash) {
  w().location.hash = hash;
  await settle();
}
async function click(selector) {
  const e = d().querySelector(selector);
  if (!e) throw new Error('missing ' + selector);
  e.click();
  await settle();
}
async function run() {
  const key = 'zhixu-v07:locale',
    saved = localStorage.getItem(key);
  document.querySelector('#run').disabled = true;
  rows.length = 0;
  try {
    frame.src = '../deploy/site/index.html?visuals=' + Date.now();
    await new Promise((r) => (frame.onload = r));
    for (const [width, height] of [
      [1920, 887],
      [1366, 768],
      [1280, 720],
      [390, 844],
      [844, 390],
    ]) {
      const params = new URLSearchParams(location.search);
      if (params.has('size') && params.get('size') !== width + 'x' + height) continue;
      frame.style.width = width + 'px';
      frame.style.height = height + 'px';
      await settle();
      const langs =
        width >= 1100
          ? ['zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'de', 'fr', 'ru']
          : ['zh-CN', 'en', 'ja'];
      for (const lang of langs) {
        if (params.has('lang') && params.get('lang') !== lang) continue;
        const picker = d().querySelector('#locale-picker');
        picker.value = lang;
        picker.dispatchEvent(new (w().Event)('change', { bubbles: true }));
        await d().fonts.ready;
        await settle();
        const prefix = width + 'x' + height + '/' + lang;
        let errors = [];
        if (params.get('focus') !== 'reader') {
          await route('act/1/0');
          for (const id of ['share', 'language', 'logs']) {
            await click('[data-group="need10"][data-id="' + id + '"]');
            record(
              prefix + '/comparison/' + id,
              overflow(
                d(),
                '.lesson-content:not(.adaptive-body),.adaptive-page:not([hidden]),.era-card,.lesson-takeaway',
              ),
            );
          }
          await route('act/1/1');
          const reading = d().querySelector('.reading-body'),
            nav = d().querySelector('.reading-pager');
          errors = overflow(d(), '.reading-body,.reading-page:not([hidden])');
          if (width === 1920 && ['zh-CN', 'zh-TW', 'ja'].includes(lang) && nav)
            errors.push('unnecessary history pagination');
          record(prefix + '/history', errors);
          await route('act/4/0');
          for (const step of [0, 3, 5]) {
            const button = d().querySelector('[data-do="flow-step"][data-id="' + step + '"]');
            if (button.getAttribute('aria-expanded') !== 'true') {
              button.click();
              await settle();
            }
            errors = overflow(
              d(),
              '.spec-body:not(.adaptive-body),.workflow-drawers,.workflow-drawer.active,.workflow-drawer.active .workflow-reveal',
            );
            if (d().querySelectorAll('.workflow-drawer.active').length !== 1)
              errors.push('drawer count');
            record(prefix + '/drawer/' + step, errors);
          }
          await route('act/4/1');
          await click('[data-group="concept-mcp"][data-id="try"]');
          for (const mode of ['direct', 'mcp']) {
            await click('[data-group="mcp-mode"][data-id="' + mode + '"]');
            if (width < 780 || height <= 480)
              await click('[data-group="connectionView"][data-id="map"]');
            errors = overflow(
              d(),
              '.spec-body:not(.adaptive-body),.connection-experiment,.connection-map,.connection-message',
            );
            if (!d().querySelector('.connection-map.' + mode)) errors.push('wrong topology');
            if (width < 780 || height <= 480)
              await click('[data-group="connectionView"][data-id="call"]');
            for (const stage of ['1', '2']) {
              await click('[data-group="connectionStage"][data-id="' + stage + '"]');
              errors.push(...overflow(d(), '.connection-message'));
            }
            record(prefix + '/connection/' + mode, errors);
          }
        } else await route('act/4/1');
        await click('[data-group="concept-mcp"][data-id="boundary"]');
        await click('[data-do="reading"][data-id="mcp"]');
        const layer = d().querySelector('#frame-layer'),
          navReader = layer.querySelector('.native-reader > .tabs');
        const initial = [...navReader.children].map((e) => {
          const r = e.getBoundingClientRect();
          return [r.x, r.y, r.width, r.height];
        });
        errors = [];
        for (const label of ['看机制', '看边界', '出处', '先理解']) {
          await click('[data-do="reader-label"][data-label="' + label + '"]');
          if (d().querySelector('#frame-layer') !== layer) errors.push('frame replaced');
          const current = [...navReader.children].map((e) => {
            const r = e.getBoundingClientRect();
            return [r.x, r.y, r.width, r.height];
          });
          if (initial.some((a, i) => a.some((n, j) => Math.abs(n - current[i][j]) > 1)))
            errors.push('reader nav moved: ' + JSON.stringify({ initial, current }));
          errors.push(...overflow(layer, '.reader-part,.reader-body'));
        }
        record(prefix + '/reader', errors);
        await click('[data-do="close-layer"]');
      }
    }
  } catch (error) {
    record('harness', [String(error)]);
  } finally {
    if (saved === null) localStorage.removeItem(key);
    else localStorage.setItem(key, saved);
    frame.src = 'about:blank';
    const result = {
      total: rows.length,
      passed: rows.filter((r) => !r.errors.length).length,
      failures: rows.filter((r) => r.errors.length),
    };
    document.querySelector('#report').textContent = JSON.stringify(result, null, 2);
    document.querySelector('#status').textContent = 'DONE ' + result.passed + '/' + result.total;
    document.querySelector('#run').disabled = false;
  }
}
document.querySelector('#run').onclick = run;
