const frame = document.querySelector('#app');
const d = () => frame.contentDocument;
const w = () => frame.contentWindow;
const wait = () => new Promise((r) => setTimeout(r, 480));
const q = (s) => d().querySelector(s);
const results = [];
const savedLocale = localStorage.getItem('zhixu-v07:locale');
async function click(s) {
  const el = q(s);
  if (!el) throw Error('Missing control: ' + s);
  el.click();
  await wait();
}
async function route(hash) {
  w().location.hash = hash;
  await wait();
}
function require(condition, message) {
  if (!condition) throw Error(message);
}
function fit(selector) {
  const el = q(selector);
  require(el && el.getClientRects().length, 'Missing visible panel: ' + selector);
  require(el.scrollHeight <= el.clientHeight + 3, selector +
    ' overflow ' +
    el.scrollHeight +
    ' > ' +
    el.clientHeight);
  require(el.scrollWidth <= el.clientWidth + 3, selector + ' width overflow');
}
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, passed: true });
  } catch (e) {
    results.push({ name, passed: false, error: e.message });
  }
  document.querySelector('#status').textContent = results.length + ' checked';
}
async function load() {
  frame.src = '../deploy/site/index.html?feedback=' + Date.now() + '#act/1/1';
  await new Promise((r) => (frame.onload = r));
  await wait();
  const picker = q('#locale-picker');
  picker.value = 'zh-CN';
  picker.dispatchEvent(new (w().Event)('change', { bubbles: true }));
  await wait();
  await click('[data-group="history10"][data-id="today"]');
}
async function run() {
  document.querySelector('#run').disabled = true;
  results.length = 0;
  for (const [width, height] of [
    [1920, 887],
    [1280, 720],
    [844, 390],
    [390, 844],
  ]) {
    frame.style.width = width + 'px';
    frame.style.height = height + 'px';
    await load();
    const prefix = width + '×' + height + ' ';
    await check(prefix + 'all history topics and comparison panels', async () => {
      for (const topic of ['language', 'concept', 'problem', 'improve']) {
        await click('[data-group="historyQuestion"][data-id="' + topic + '"]');
        if (q('.history-mobile-answer'))
          for (const view of ['then', 'now', 'limit']) {
            await click('[data-group="historyCompare"][data-id="' + view + '"]');
            fit('.depth-main');
          }
        else {
          fit('.depth-main');
          fit('.then-now');
          require(q('.reading-sources a'), 'Source footer missing');
        }
      }
    });
    await check(prefix + 'boundary changes and sample rows remain aligned', async () => {
      await route('act/1/2');
      await click('[data-group="learning10"][data-id="train"]');
      await click('[data-do="learn-fit"]');
      await click('[data-group="learning10"][data-id="test"]');
      require(q('.test-rule').dataset.threshold === '5.5', 'Initial learned boundary must be 5.5');
      require(q('.depth-result').textContent.includes('1 / 2'), 'Expected one test error');
      fit('.depth-main');
      if (width < 780 || height <= 480) {
        await click('[data-group="testView"][data-id="results"]');
        fit('.depth-main');
      }
      await click('[data-do="learn10-update"]');
      require(q('.test-rule').dataset.threshold === '6', 'Boundary must move to 6');
      require(q('.depth-result').textContent.includes('0 / 2'), 'Expected corrected examples');
      fit('.depth-main');
      await click('[data-group="learning10"][data-id="samples"]');
      fit('.depth-main');
      require(d().querySelectorAll('.learn-sample').length === 8, 'Missing new training samples');
      for (const row of d().querySelectorAll('.sample-row')) {
        const tops = [...row.children].map((e) => e.getBoundingClientRect().top);
        require(Math.max(...tops) - Math.min(...tops) < 2, 'Sample row wrapped');
      }
    });
    await check(prefix + 'fifteen library stations contain explanation and question', async () => {
      for (let path = 0; path < 5; path++)
        for (let step = 0; step < 3; step++) {
          await route('library/' + path + '/' + step);
          fit('.research-station');
          require(q('.station-insight p')?.textContent.length > 30, 'Missing mechanism');
          require(q('.station-insight strong')?.textContent.length > 5, 'Missing question');
          require(d().querySelectorAll('.station-map > span').length ===
            3, 'Missing relationship map');
        }
    });
    await check(prefix + 'conclusion precedes takeaways', async () => {
      await route('act/6/3');
      require(q('.museum-conclusion'), 'Missing conclusion');
      await click('.museum-conclusion [data-route="act/6/4"]');
      require(w().location.hash === '#act/6/4', 'Takeaways route mismatch');
    });
  }
  const report = {
    time: new Date().toISOString(),
    total: results.length,
    passed: results.filter((x) => x.passed).length,
    checks: results,
  };
  document.querySelector('#report').textContent = JSON.stringify(report, null, 2);
  document.querySelector('#status').textContent = report.passed + ' / ' + report.total;
  document.querySelector('#run').disabled = false;
  if (savedLocale === null) localStorage.removeItem('zhixu-v07:locale');
  else localStorage.setItem('zhixu-v07:locale', savedLocale);
}
document.querySelector('#run').onclick = () =>
  run().catch((e) => (document.querySelector('#status').textContent = e.message));
load();
