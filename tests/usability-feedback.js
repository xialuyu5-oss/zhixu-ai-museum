const frame = document.querySelector('#app'),
  rows = [],
  missing = new Set();
const doc = () => frame.contentDocument,
  win = () => frame.contentWindow;
const settle = () => new Promise((r) => setTimeout(r, 260));
const visible = (e) =>
  e &&
  e.getClientRects().length &&
  !e.closest('[hidden],[inert]') &&
  getComputedStyle(e).visibility !== 'hidden';
async function click(selector) {
  const e = doc().querySelector(selector);
  if (!e) throw Error('Missing ' + selector);
  e.click();
  await settle();
}
async function route(hash) {
  win().location.hash = hash;
  await settle();
}
function record(name, errors = []) {
  for (const text of win().AtlasMuseum?.i18n.diagnostics().missing || []) missing.add(text);
  rows.push({ name, errors });
  document.querySelector('#status').textContent = rows.length + ' checks';
}
function overflow(selectors) {
  const errors = [];
  for (const e of doc().querySelectorAll(selectors)) {
    if (!visible(e)) continue;
    if (e.scrollHeight > e.clientHeight + 4 || e.scrollWidth > e.clientWidth + 4)
      errors.push(
        'overflow ' +
          e.className +
          ' ' +
          [e.clientWidth, e.scrollWidth, e.clientHeight, e.scrollHeight],
      );
    for (const child of [...e.children].filter(visible)) {
      const a = e.getBoundingClientRect(),
        b = child.getBoundingClientRect();
      if (b.bottom > a.bottom + 4 || b.right > a.right + 4 || b.left < a.left - 4)
        errors.push('clipped ' + child.className + ' in ' + e.className);
    }
  }
  return errors;
}
function shared() {
  const errors = overflow('.pager,.page-selector,.dots');
  const buttons = [...doc().querySelectorAll('.dots button')];
  if (buttons.some((b) => !b.textContent.trim())) errors.push('invisible page choice');
  return errors;
}
async function run() {
  const saved = localStorage.getItem('zhixu-v07:locale'),
    params = new URLSearchParams(location.search);
  rows.length = 0;
  missing.clear();
  document.querySelector('#run').disabled = true;
  try {
    frame.src = '../deploy/site/index.html?feedback=' + Date.now();
    await new Promise((r) => (frame.onload = r));
    for (const [width, height] of [
      [1920, 887],
      [1707, 766],
      [1280, 720],
      [390, 844],
      [844, 390],
    ]) {
      if (params.has('size') && params.get('size') !== width + 'x' + height) continue;
      frame.style.width = width + 'px';
      frame.style.height = height + 'px';
      await settle();
      for (const lang of params.get('lang')
        ? [params.get('lang')]
        : width > 1000
          ? ['zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'de', 'fr', 'ru']
          : ['zh-CN', 'en', 'ja']) {
        const prefix = width + 'x' + height + '/' + lang,
          picker = doc().querySelector('#locale-picker');
        picker.value = lang;
        picker.dispatchEvent(new (win().Event)('change', { bubbles: true }));
        await doc().fonts.ready;
        await settle();
        await route('entrance');
        for (const mode of ['0', '1', '2']) {
          await click('[data-do="phase"][data-id="' + mode + '"]');
          record(
            prefix + '/entrance/' + mode,
            overflow('.story-exhibit,.narrative-legend,.story-stage'),
          );
        }
        await route('act/1/0');
        for (const id of ['share', 'language', 'logs']) {
          await click('[data-group="need10"][data-id="' + id + '"]');
          if (width >= 780 && height > 480) {
            for (const view of ['compare', 'scene']) {
              await click('[data-group="needView"][data-id="' + view + '"]');
              record(prefix + '/needs/' + id + '/' + view, [
                ...shared(),
                ...overflow(
                  '.lesson-content,.need-scenario,.need-comparison,.need-visual,.era-card',
                ),
              ]);
            }
          } else record(prefix + '/needs/' + id, [...shared(), ...overflow('.lesson-content')]);
        }
        await route('act/1/1');
        for (const t of ['claim', 'today']) {
          await click('[data-group="history10"][data-id="' + t + '"]');
          record(prefix + '/history/' + t, [
            ...shared(),
            ...overflow('.depth-main,.claim-steps,.then-now'),
          ]);
        }
        await route('act/1/2');
        await click('[data-group="learning10"][data-id="test"]');
        record(prefix + '/learning', [
          ...shared(),
          ...overflow('.depth-main,.test-comparison,.test-piece'),
        ]);
        await route('act/3/0');
        await click('[data-group="lab-evidence"][data-id="revise"]');
        record(prefix + '/evidence', [...shared(), ...overflow('.depth-main,.lab-rewrite')]);
        await route('act/4/1');
        await click('[data-group="concept-mcp"][data-id="try"]');
        for (const mode of ['direct', 'mcp']) {
          await click('[data-group="mcp-mode"][data-id="' + mode + '"]');
          const viewTabs = doc().querySelector('[data-group="connectionView"]');
          for (const view of visible(viewTabs) ? ['map', 'call'] : ['map']) {
            if (visible(viewTabs))
              await click('[data-group="connectionView"][data-id="' + view + '"]');
            record(prefix + '/mcp/' + mode + '/' + view, [
              ...shared(),
              ...overflow('.spec-body,.connection-experiment,.connection-map,.connection-message'),
            ]);
          }
        }
        await route('act/5/0');
        for (const id of ['share', 'logs', 'family', 'study']) {
          await click('[data-do="preset"][data-id="' + id + '"]');
          for (const view of ['example', 'edit']) {
            await click('[data-group="goalView"][data-id="' + view + '"]');
            record(prefix + '/goal/' + id + '/' + view, [
              ...shared(),
              ...overflow('.spec-body,.goal-editor,.goal-example,.goal-fields'),
            ]);
          }
        }
        await route('act/5/3');
        await click('[data-do="run-reset"]');
        for (let n = 0; n < 7; n++) {
          const st = doc().querySelector('[data-runtime-stage]').dataset.runtimeStage;
          if (st === 'WAIT_APPROVAL') await click('[data-do="approve"]');
          else if (!['DONE', 'FAILED'].includes(st)) await click('[data-do="run-next"]');
          const now = doc().querySelector('[data-runtime-stage]').dataset.runtimeStage;
          const errors = [
            ...shared(),
            ...overflow(
              '.spec-body,.runtime-panel,.runtime-progress,.runtime-detail,.runtime-footer',
            ),
          ];
          if (!visible(doc().querySelector('.runtime-detail'))) errors.push('no visible result');
          record(prefix + '/runtime/' + n + '/' + now, errors);
          if (now === 'DONE') break;
        }
        await route('act/6/4');
        record(prefix + '/coda', [...shared(), ...overflow('.coda')]);
        if (width === 1280) {
          await route('act/5/3');
          const fault = doc().querySelector('#fault');
          fault.value = 'false-success';
          fault.dispatchEvent(new (win().Event)('change', { bubbles: true }));
          await settle();
          for (let n = 0; n < 6; n++) {
            const stage = doc().querySelector('[data-runtime-stage]').dataset.runtimeStage;
            await click(stage === 'WAIT_APPROVAL' ? '[data-do="approve"]' : '[data-do="run-next"]');
          }
          record(
            prefix + '/runtime/false-success',
            doc().querySelector('[data-runtime-stage]').dataset.runtimeStage === 'FAILED' &&
              win().AtlasMuseum.getState().run.artifact === null
              ? []
              : ['False success accepted'],
          );
          await click('[data-do="run-reset"]');
          for (let n = 0; n < 3; n++) await click('[data-do="run-next"]');
          await click('[data-do="deny"]');
          record(
            prefix + '/runtime/deny',
            doc().querySelector('[data-runtime-stage]').dataset.runtimeStage === 'STOPPED' &&
              !win().AtlasMuseum.getState().run.artifact
              ? []
              : ['Denied save proceeded'],
          );
          await click('[data-do="run-reset"]');
          await click('[data-do="run-next"]');
          await click('.runtime-recovery summary');
          await click('[data-do="checkpoint"]');
          await click('.runtime-recovery summary');
          await click('[data-do="pause-run"]');
          await click('.runtime-recovery summary');
          await click('[data-do="restore"]');
          record(
            prefix + '/runtime/restore',
            doc().querySelector('[data-runtime-stage]').dataset.runtimeStage === 'READ'
              ? []
              : ['Wrong restored stage'],
          );
          if (lang === 'zh-CN') {
            await route('entrance');
            await click('[data-do="phase"][data-id="2"]');
            const canvas = doc().querySelector('#story-canvas');
            await click('[data-do="narrative-review"][data-id="check"]');
            record(
              prefix + '/motion/stable-canvas',
              canvas === doc().querySelector('#story-canvas') &&
                doc().querySelector('#story-live').textContent.includes('退回修改')
                ? []
                : ['Animation restarted or explanation did not change'],
            );
            const legend = doc().querySelector('.narrative-legend').getBoundingClientRect();
            record(
              prefix + '/motion/separate-legend',
              legend.bottom <= canvas.getBoundingClientRect().top + 1
                ? []
                : ['Legend overlaps animation'],
            );
            if (win().AtlasMuseum.getState().motion) await click('#motion');
            const paused = win().AtlasMuseum.getState().sim.time;
            await settle();
            record(
              prefix + '/motion/pause',
              win().AtlasMuseum.getState().sim.time === paused
                ? []
                : ['Canvas continues while paused'],
            );
            await route('act/6/4');
            const light = doc().querySelector('.coda-light');
            record(
              prefix + '/motion/coda-pause',
              win().getComputedStyle(light, '::before').animationDuration === '0s'
                ? []
                : ['Light continues while paused'],
            );
            await click('#motion');
            record(
              prefix + '/motion/coda-active',
              win().getComputedStyle(light, '::before').animationName === 'codaDrift' &&
                win().getComputedStyle(light).maskImage !== 'none'
                ? []
                : ['Missing animated light or faded edge'],
            );
          }
        }
      }
    }
  } catch (e) {
    record('harness', [String(e)]);
  } finally {
    if (saved === null) localStorage.removeItem('zhixu-v07:locale');
    else localStorage.setItem('zhixu-v07:locale', saved);
    frame.src = 'about:blank';
    const result = {
      total: rows.length,
      passed: rows.filter((r) => !r.errors.length).length,
      failures: rows.filter((r) => r.errors.length),
      missing: [...missing],
    };
    document.querySelector('#report').textContent = JSON.stringify(result, null, 2);
    document.querySelector('#status').textContent = 'DONE ' + result.passed + '/' + result.total;
    document.querySelector('#run').disabled = false;
  }
}
document.querySelector('#run').onclick = run;
