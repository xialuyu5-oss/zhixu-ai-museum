const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const ctx = vm.createContext({ U: { extra: false }, Revision: { threshold: 5.5 } });
vm.runInContext(
  ['core.js', 'depth.js', 'lessons.js']
    .map((n) => fs.readFileSync(path.join(root, 'src', n), 'utf8'))
    .join('\n'),
  ctx,
);
const results = [];
function check(name, fn) {
  try {
    fn();
    results.push({ name, passed: true });
  } catch (error) {
    results.push({ name, passed: false, error: error.message });
  }
}
const plain = (v) => JSON.parse(JSON.stringify(v));
check('Initial error chart agrees with independent seven-candidate table', () => {
  assert.deepEqual(plain(ctx.learningCandidates()), [
    { t: 1, errors: 3 },
    { t: 2.5, errors: 2 },
    { t: 3.5, errors: 1 },
    { t: 5.5, errors: 0 },
    { t: 7.5, errors: 1 },
    { t: 8.5, errors: 2 },
    { t: 10, errors: 3 },
  ]);
});
check('Distinct zero-training-error rules disagree on unseen 5.7 mm input', () => {
  assert.equal(ctx.learningErrors(5.5), 0);
  assert.equal(ctx.learningErrors(6), 0);
  assert.equal(ctx.learningErrors(5.5, [{ x: 5.7, y: 0 }]), 1);
  assert.equal(ctx.learningErrors(6, [{ x: 5.7, y: 0 }]), 0);
  assert.equal(ctx.learningErrors(4), 1);
  assert.equal(ctx.learningErrors(7), 0);
});
check('New training samples narrow the zero-error interval without inserting test samples', () => {
  ctx.U.extra = true;
  const samples = plain(ctx.learningSamples());
  assert.equal(samples.length, 8);
  assert(samples.some((s) => s.x === 5.8) && samples.some((s) => s.x === 6.2));
  assert(!samples.some((s) => s.x === 5.7 || s.x === 6.4));
  assert.equal(ctx.learningErrors(5.5), 1);
  assert.equal(ctx.learningErrors(6), 0);
  assert.equal(ctx.learningErrors(6.2), 0);
  assert.equal(ctx.learningErrors(5.8), 1);
  ctx.U.extra = false;
});
check('Chart marks and accessible description retain zero and nonzero scores', () => {
  const chart = ctx.lossPlot();
  assert(chart.includes('data-threshold="5.5" data-errors="0"'));
  assert(chart.includes('5.5毫米分界：0个分错'));
  assert(chart.includes('data-threshold="1" data-errors="3"'));
});
check('Fast GPU kernel can lose overall once two transfers are counted', () => {
  assert.deepEqual(plain(ctx.gpuTransferModel(24, 8, 1)), {
    cpu: 24,
    gpu: 5,
    transfer: 2,
    compute: 3,
  });
  assert.deepEqual(plain(ctx.gpuTransferModel(24, 8, 16)), {
    cpu: 24,
    gpu: 35,
    transfer: 32,
    compute: 3,
  });
  assert.deepEqual(plain(ctx.gpuTransferModel(25, 8, 1)), {
    cpu: 25,
    gpu: 6,
    transfer: 2,
    compute: 4,
  });
});
check('All supported transfer/concurrency settings fit the shared 56-step axis', () => {
  for (const w of [1, 4, 8])
    for (const t of [1, 8, 16]) {
      const cost = ctx.gpuTransferModel(24, w, t);
      assert.equal(cost.gpu, cost.transfer + cost.compute);
      assert(cost.gpu <= 56);
    }
});
check('Deployed artwork is byte-identical to the source artwork', () => {
  assert(
    fs
      .readFileSync(path.join(root, 'assets/research-workbench.png'))
      .equals(fs.readFileSync(path.join(root, 'deploy/site/assets/research-workbench.png'))),
  );
});
const report = {
  version: require('../package.json').version,
  time: new Date().toISOString(),
  total: results.length,
  passed: results.filter((r) => r.passed).length,
  checks: results,
};
fs.writeFileSync(
  path.join(root, 'docs/depth-regression.json'),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(JSON.stringify(report, null, 2));
if (report.passed !== report.total) process.exitCode = 1;
