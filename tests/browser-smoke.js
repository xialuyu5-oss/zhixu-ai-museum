/* Dependency-free browser integration tests. Run from browser-smoke.html. */
const frame = document.getElementById('app');
const checks = [];
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const doc = () => frame.contentDocument;
const win = () => frame.contentWindow;
const find = (selector) => doc().querySelector(selector);
const visible = (el) =>
  el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
async function waitFor(fn, message) {
  for (let i = 0; i < 60; i++) {
    if (fn()) return;
    await delay(50);
  }
  throw new Error(message);
}
async function settle() {
  await delay(80);
  await waitFor(
    () => find('#main')?.dataset.layout === 'ready',
    'Responsive layout did not settle',
  );
  await new Promise((resolve) =>
    win().requestAnimationFrame(() => win().requestAnimationFrame(resolve)),
  );
}
async function click(selector) {
  const el = find(selector);
  assert(visible(el), 'Control missing/hidden: ' + selector);
  el.click();
  await settle();
}
async function route(hash) {
  win().location.hash = hash;
  await waitFor(
    () =>
      win().location.hash === '#' + hash &&
      find('#main')?.dataset.route ===
        (hash.startsWith('act/')
          ? hash.split('/').slice(0, 2).join('/')
          : hash.startsWith('concept/')
            ? 'concept'
            : hash.split('/')[0]),
    'Route did not render: ' + hash,
  );
  await settle();
}
async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, passed: true });
  } catch (error) {
    checks.push({ name, passed: false, error: error.message });
  }
  const li = document.createElement('li');
  const result = checks.at(-1);
  li.className = result.passed ? 'pass' : 'fail';
  li.textContent =
    (result.passed ? '✓ ' : '× ') + name + (result.error ? ' — ' + result.error : '');
  document.getElementById('results').append(li);
}
function bounds() {
  const root = doc().documentElement;
  assert(root.scrollWidth <= win().innerWidth + 2, 'Document width overflow');
  assert(root.scrollHeight <= win().innerHeight + 2, 'Document height overflow');
  for (const el of doc().querySelectorAll(
    '.lesson-content,.adaptive-page,.story-exhibit,.research-core,.research-station',
  )) {
    if (!visible(el)) continue;
    assert(
      el.scrollHeight <= el.clientHeight + 4,
      `${el.className}: content ${el.scrollHeight} > box ${el.clientHeight}`,
    );
    assert(el.scrollWidth <= el.clientWidth + 4, `${el.className}: width overflow`);
  }
  for (const el of doc().querySelectorAll(
    '.pager,.news-pagination,.story-modes,.narrative-controls',
  )) {
    if (!visible(el)) continue;
    const box = el.getBoundingClientRect();
    assert(
      box.bottom <= win().innerHeight + 2 && box.right <= win().innerWidth + 2,
      'Navigation outside viewport',
    );
  }
}
async function startViewport(width, height) {
  frame.style.width = width + 'px';
  frame.style.height = height + 'px';
  frame.src = '../deploy/site/index.html?qa=' + Date.now();
  await new Promise((resolve) => (frame.onload = resolve));
  await waitFor(() => win().AtlasMuseum, 'App did not initialize');
  // Disable only transition decoration; the homepage canvas remains live.
  const style = doc().createElement('style');
  style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}';
  doc().head.append(style);
  await settle();
}
async function run() {
  document.getElementById('run').disabled = true;
  checks.length = 0;
  document.getElementById('results').replaceChildren();
  const oldNotes = localStorage.getItem('zhixu-v07:notes');
  const oldLocale = localStorage.getItem('zhixu-v07:locale');
  localStorage.removeItem('zhixu-v07:locale');
  try {
    for (const [width, height] of [
      [1920, 1080],
      [1280, 720],
      [1707, 600],
      [844, 390],
      [390, 844],
      [360, 640],
    ]) {
      const size = `${width}×${height}`;
      document.getElementById('status').textContent = '正在检查 ' + size;
      await startViewport(width, height);
      await check(size + ' entrance and no eager archive fetch', () => {
        bounds();
        assert(
          !win()
            .performance.getEntriesByType('resource')
            .some((r) => r.name.endsWith('/archive.html')),
          'Archive fetched before use',
        );
      });
      await check(size + ' attempts leave visible feedback', async () => {
        await click('[data-do="narrative-attempt"]');
        assert(find('#story-live').textContent.includes('第 2 次'), 'Attempt feedback missing');
        bounds();
      });
      await check(size + ' canvas moves and pause really stops frames', async () => {
        if (!win().AtlasMuseum.getState().motion) await click('[data-do="motion"]');
        const canvas = find('#story-canvas');
        const before = canvas.toDataURL();
        await delay(140);
        assert(canvas.toDataURL() !== before, 'Running canvas did not change');
        await click('[data-do="motion"]');
        const paused = canvas.toDataURL();
        await delay(140);
        assert(canvas.toDataURL() === paused, 'Paused canvas still changed');
        await click('[data-do="motion"]');
      });
      await check(size + ' changing an input changes outcome', async () => {
        await click('[data-do="phase"][data-id="1"]');
        await click('[data-do="narrative-input"][data-id="2"]');
        assert(
          find('#story-live').textContent.includes('关闭了算力'),
          'Input did not affect result',
        );
        bounds();
      });
      await check(size + ' collision choice changes consequence', async () => {
        await click('[data-do="phase"][data-id="2"]');
        await click('[data-do="narrative-review"][data-id="check"]');
        assert(
          find('#story-live').textContent.includes('退回修改'),
          'Review did not change consequence',
        );
        bounds();
      });
      for (const hash of ['act/1/0', 'act/1/1', 'act/1/2', 'act/1/3', 'library/0/0']) {
        await check(size + ' ' + hash + ' layout', async () => {
          await route(hash);
          bounds();
        });
      }
      await check(size + ' deep exhibits, every view and diagram', async () => {
        const depthFailures = [];
        for (const [hash, group, panels] of [
          ['act/1/1', 'history10', ['event', 'claim', 'today', 'sources']],
          ['act/1/2', 'learning10', ['samples', 'train', 'test', 'meaning']],
          ['act/1/3', 'compute10', ['roles', 'run', 'limits']],
        ]) {
          await route(hash);
          for (const panel of panels) {
            await click(`[data-group="${group}"][data-id="${panel}"]`);
            if (width < 780 || height <= 480) {
              await click(`[data-group="depth-${group}"][data-id="exhibit"]`);
            }
            const main = find('.depth-main');
            if (!main.querySelector('.source-ledger') && main.scrollHeight > main.clientHeight + 4)
              depthFailures.push(
                `${group}/${panel}: exhibit ${main.scrollHeight} > ${main.clientHeight}`,
              );
            assert(
              main.scrollWidth <= main.clientWidth + 4,
              `${group}/${panel}: exhibit width overflow`,
            );
            for (const svg of main.querySelectorAll('svg')) {
              assert(svg.querySelector('title') && svg.querySelector('desc'), 'Unlabelled diagram');
            }
            bounds();
            if (group === 'history10' && panel === 'claim') {
              for (const stage of ['0', '1', '2']) {
                await click(`[data-group="claimStage"][data-id="${stage}"]`);
                assert(
                  find(`[data-group="claimStage"][data-id="${stage}"]`).getAttribute(
                    'aria-pressed',
                  ) === 'true',
                  'Claim step did not change',
                );
                assert(
                  find('.claim-detail').textContent.trim().length > 20,
                  'Claim explanation missing',
                );
              }
            }
            if (group === 'compute10' && panel === 'roles') {
              for (const stage of ['0', '1', '2', '3']) {
                await click(`[data-group="gpuStage"][data-id="${stage}"]`);
                assert(find('.gpu-journey').dataset.stage === stage, 'GPU stage did not change');
                assert(
                  find('.gpu-stage-status').textContent.trim().length > 20,
                  'GPU explanation missing',
                );
              }
            }
            if (group === 'compute10' && panel === 'limits') {
              await click('[data-group="workers"][data-id="8"]');
              await click('[data-group="gpuTransfer"][data-id="16"]');
              assert(
                find('.cost-chart').getAttribute('aria-label').includes('35'),
                'Full GPU time did not include both transfers',
              );
              assert(
                find('.depth-result').textContent.includes('反而更慢'),
                'Slow overall result missing',
              );
            }
          }
          if (width < 780 || height <= 480) {
            for (const view of ['explain', 'evidence']) {
              await click(`[data-group="depth-${group}"][data-id="${view}"]`);
              assert(
                visible(find(view === 'explain' ? '.depth-explanation' : '.depth-evidence')),
                'Reading layer not reachable',
              );
              bounds();
            }
            await click(`[data-group="depth-${group}"][data-id="exhibit"]`);
          }
        }
        assert(!depthFailures.length, depthFailures.join('; '));
      });
      await check(size + ' model labs: all eighteen panels and reading layers', async () => {
        const failures = [];
        for (const [hash, id, panels] of [
          ['act/2/0', 'token', ['split', 'encode', 'generate']],
          ['act/2/1', 'parameters', ['meaning', 'memory', 'precision']],
          ['act/2/2', 'context', ['pack', 'inspect', 'memory']],
          ['act/2/3', 'attention', ['weights', 'math', 'model']],
          ['act/3/0', 'evidence', ['claim', 'check', 'revise']],
          ['act/3/1', 'choice', ['quality', 'cost', 'control']],
        ]) {
          await route(hash);
          for (const panel of panels) {
            await click(`[data-group="lab-${id}"][data-id="${panel}"]`);
            if (width < 780 || height <= 480)
              await click(`[data-group="depth-lab-${id}"][data-id="exhibit"]`);
            bounds();
            for (const el of doc().querySelectorAll('.lab-main,.lab-visual')) {
              if (el.scrollHeight > el.clientHeight + 4 || el.scrollWidth > el.clientWidth + 4)
                failures.push(
                  `${id}/${panel} ${el.className}: ${el.scrollWidth}x${el.scrollHeight} > ${el.clientWidth}x${el.clientHeight}`,
                );
            }
            assert(find('.lab-outcome')?.textContent.length > 15, 'Result missing');
            if (width < 780 || height <= 480) {
              for (const view of ['explain', 'evidence']) {
                await click(`[data-group="depth-lab-${id}"][data-id="${view}"]`);
                assert(
                  visible(find(view === 'explain' ? '.depth-explanation' : '.depth-evidence')),
                  'Reading layer hidden',
                );
                assert(!visible(find('.lab-main')), 'Exhibit overlaps reading layer');
                bounds();
              }
              await click(`[data-group="depth-lab-${id}"][data-id="exhibit"]`);
            }
          }
        }
        assert(!failures.length, failures.join('; '));
      });
      await check(size + ' model inputs alter explanation and calculated result', async () => {
        await route('act/2/0');
        await click('[data-group="lab-token"][data-id="split"]');
        const input = find('#lab-token-input');
        input.value = '中文 <img> 😀 AI';
        input
          .closest('form')
          .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await settle();
        assert(!find('.lab-pieces img'), 'Input treated as HTML');
        assert(find('.lab-pieces').textContent.includes('<'), 'Input lost');
        bounds();
        const longInput = find('#lab-token-input');
        longInput.value = '这是一段用于检查换行与边界的教学输入'.repeat(3).slice(0, 45);
        longInput
          .closest('form')
          .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await settle();
        assert(find('.lab-outcome').textContent.includes('45'), 'Long input not counted');
        bounds();
        await click('[data-group="lab-token"][data-id="generate"]');
        await click('[data-group="labDraw"][data-id="0.6"]');
        await click('[data-group="labScene"][data-id="picnic"]');
        assert(find('.lab-next-token').textContent === '野餐', 'Wrong picnic choice');
        await click('[data-group="labScene"][data-id="deadline"]');
        assert(find('.lab-next-token').textContent === '加班', 'Scene had no effect');
        await route('act/2/1');
        await click('[data-group="lab-parameters"][data-id="memory"]');
        await click('[data-group="labParams"][data-id="7"]');
        await click('[data-group="labBits"][data-id="16"]');
        assert(find('.lab-outcome').textContent.includes('13.04'), 'Wrong GiB');
        bounds();
        await route('act/2/2');
        await click('[data-group="lab-context"][data-id="pack"]');
        await click('[data-group="labContext"][data-id="all"]');
        assert(find('.lab-outcome').textContent.includes('放不下'), 'Overflow unreported');
        await click('[data-group="labContext"][data-id="focused"]');
        assert(
          find('.lab-capacity-title').textContent.includes('8 / 12'),
          'Wrong compact capacity',
        );
        await click('[data-group="labContext"][data-id="lossy"]');
        assert(find('.lab-outcome').textContent.includes('丢了依据'), 'Loss of evidence hidden');
        bounds();
        await route('act/2/3');
        await click('[data-group="lab-attention"][data-id="weights"]');
        await click('[data-group="labQuery"][data-id="1"]');
        await click('[data-group="labMask"][data-id="on"]');
        assert(find('.lab-attention-bars').textContent.includes('已遮罩'), 'Future not masked');
        await click('[data-group="labMask"][data-id="off"]');
        assert(!find('.lab-attention-bars').textContent.includes('已遮罩'), 'Mask did not clear');
        bounds();
      });
      await check(size + ' evidence judgement and model tradeoffs respond', async () => {
        await route('act/3/0');
        await click('[data-group="lab-evidence"][data-id="check"]');
        await click('[data-group="labEvidenceCase"][data-id="logs"]');
        await click('[data-group="labClaim"][data-id="1"]');
        await click('[data-group="labVerdict-logs-1"][data-id="supported"]');
        const wrong = find('.lab-outcome').textContent;
        await click('[data-group="labVerdict-logs-1"][data-id="contradicted"]');
        assert(find('.lab-outcome').textContent !== wrong, 'Judgement has no feedback');
        bounds();
        await click('[data-group="labEvidenceCase"][data-id="report"]');
        bounds();
        await route('act/3/1');
        await click('[data-group="lab-choice"][data-id="quality"]');
        await click('[data-group="labTrial"][data-id="extraction"]');
        await click('[data-group="labGate"][data-id="95"]');
        assert(find('.lab-outcome').textContent.includes('B'), 'Quality gate result missing');
        await click('[data-group="lab-choice"][data-id="cost"]');
        await click('[data-group="labTrial"][data-id="reasoning"]');
        assert(
          find('.lab-cost-table').textContent.includes('101') &&
            find('.lab-cost-table').textContent.includes('120'),
          'Retry/review not in cost',
        );
        bounds();
      });
      await check(size + ' longer evidence cases remain readable and feedback fits', async () => {
        await route('act/3/0');
        for (const caseId of ['logs', 'study', 'report']) {
          await click(`[data-group="labEvidenceCase"][data-id="${caseId}"]`);
          for (const panel of ['claim', 'check', 'revise']) {
            await click(`[data-group="lab-evidence"][data-id="${panel}"]`);
            if (panel === 'check') {
              await click('[data-group="labClaim"][data-id="1"]');
              await click(`[data-group="labVerdict-${caseId}-1"][data-id="unknown"]`);
            }
            bounds();
            for (const el of doc().querySelectorAll(
              '.lab-main,.lab-visual,.lab-workspace,.lab-settings',
            )) {
              assert(
                el.scrollHeight <= el.clientHeight + 4 && el.scrollWidth <= el.clientWidth + 4,
                `${caseId}/${panel}: ${el.className} ${el.scrollWidth}x${el.scrollHeight} > ${el.clientWidth}x${el.clientHeight}`,
              );
            }
          }
        }
      });
      await check(size + ' learning train, infer, add samples', async () => {
        await route('act/1/2');
        await click('[data-group="learning10"][data-id="train"]');
        // Controls may be in a short-screen subpage; choose that page when needed.
        if (!visible(find('[data-do="learn-fit"]'))) {
          const pages = [...doc().querySelectorAll('.adaptive-nav button')];
          for (const page of pages) {
            page.click();
            await settle();
            if (visible(find('[data-do="learn-fit"]'))) break;
          }
        }
        await click('[data-do="learn-fit"]');
        assert(doc().body.textContent.includes('5.5 mm'), 'Wrong fitted threshold');
        bounds();
        await click('[data-group="learning10"][data-id="test"]');
        assert(find('.test-piece.incorrect'), 'Unseen error should be visible');
        if (!visible(find('[data-do="learn10-update"]'))) {
          for (const page of doc().querySelectorAll('.adaptive-nav button')) {
            page.click();
            await settle();
            if (visible(find('[data-do="learn10-update"]'))) break;
          }
        }
        await click('[data-do="learn10-update"]');
        assert(
          !find('.test-piece.incorrect'),
          'Boundary samples did not correct held-out examples',
        );
        bounds();
      });
      await check(size + ' CUDA roles and parallel jobs', async () => {
        await route('act/1/3');
        await click('[data-group="compute10"][data-id="roles"]');
        if (width < 780) {
          await click('[data-group="depth-compute10"][data-id="explain"]');
          for (const id of ['program', 'cuda', 'gpu']) {
            await click(`[data-group="computeRole"][data-id="${id}"]`);
            assert(visible(find('.flow-layer.' + id)), 'Selected layer is not visible');
            bounds();
          }
          await click('[data-group="depth-compute10"][data-id="exhibit"]');
        }
        await click('[data-group="compute10"][data-id="run"]');
        if (!visible(find('[data-group="workers"][data-id="8"]'))) {
          for (const page of doc().querySelectorAll('.adaptive-nav button')) {
            page.click();
            await settle();
            if (visible(find('[data-group="workers"][data-id="8"]'))) break;
          }
        }
        await click('[data-group="workers"][data-id="8"]');
        if (!visible(find('[data-do="jobs"]'))) {
          for (const page of doc().querySelectorAll('.adaptive-nav button')) {
            page.click();
            await settle();
            if (visible(find('[data-do="jobs"]'))) break;
          }
        }
        await click('[data-do="jobs"]');
        await waitFor(() => find('#task-status').textContent === '24 / 24', 'Jobs did not finish');
        bounds();
      });
      await check(size + ' news filter keeps keyboard focus', async () => {
        await route('news');
        await delay(250);
        const filter = find('#news-topic');
        filter.focus();
        filter.value = 'science';
        filter.dispatchEvent(new Event('change', { bubbles: true }));
        await settle();
        assert(doc().activeElement?.id === 'news-topic', 'Filter focus lost');
        if (width < 780) await click('.news-card');
        await click('[data-do="news-reading"][data-id="question"]');
        assert(visible(find('[data-do="news-save"]')), 'Save question unavailable');
        bounds();
      });
      await check(size + ' news links and return preserve context', async () => {
        await click('[data-do="news-reading"][data-id="related"]');
        assert(
          doc().querySelectorAll('.news-related button').length === 3,
          'Expected three related exhibits',
        );
        await click('.news-related button');
        assert(find('[data-do="research-return"]'), 'Return path missing');
        await click('[data-do="research-return"]');
        assert(find('#news-topic')?.value === 'science', 'News filter lost on return');
        bounds();
      });
    }
    await check('Question saving appends once and does not erase existing notes', async () => {
      if (win().innerWidth < 780 && visible(find('.news-card'))) await click('.news-card');
      await click('[data-do="news-reading"][data-id="question"]');
      const previous = JSON.parse(localStorage.getItem('zhixu-v07:notes') || '{}').question || '';
      await click('[data-do="news-save"]');
      const once = JSON.parse(localStorage.getItem('zhixu-v07:notes')).question;
      await click('[data-do="news-save"]');
      const twice = JSON.parse(localStorage.getItem('zhixu-v07:notes')).question;
      assert(once.startsWith(previous), 'Existing notes changed');
      assert(once === twice, 'Duplicate saved');
      assert(once.includes('https://'), 'Source URL missing from note');
    });
  } finally {
    if (oldLocale === null) localStorage.removeItem('zhixu-v07:locale');
    else localStorage.setItem('zhixu-v07:locale', oldLocale);
    if (oldNotes === null) localStorage.removeItem('zhixu-v07:notes');
    else localStorage.setItem('zhixu-v07:notes', oldNotes);
    const report = {
      version: '0.15.0',
      time: new Date().toISOString(),
      total: checks.length,
      passed: checks.filter((c) => c.passed).length,
      checks,
    };
    window.testReport = report;
    document.getElementById('status').textContent = `完成：${report.passed} / ${report.total}`;
    document.getElementById('run').disabled = false;
    document.getElementById('save').disabled = false;
  }
}
document.getElementById('run').onclick = () =>
  run().catch((error) => {
    document.getElementById('status').textContent = '测试中止：' + error.message;
  });
document.getElementById('save').onclick = () => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(window.testReport, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = 'browser-regression.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
