const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const ctx = vm.createContext({});
vm.runInContext(
  ['core.js', 'model-core.js']
    .map((n) => fs.readFileSync(path.join(root, 'src', n), 'utf8'))
    .join('\n') + '\nthis.M = ModelLab; this.C = Core;',
  ctx,
);
const { M, C } = ctx;
const checks = [];
function check(name, fn) {
  try {
    fn();
    checks.push({ name, passed: true });
  } catch (e) {
    checks.push({ name, passed: false, error: e.message });
  }
}
const near = (a, b) => assert(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
check('Both teaching splits preserve text, spaces, punctuation and emoji', () => {
  for (const s of ['让 AI 帮我。', '<img src=x> 😀', 'a  b\n中文', '']) {
    assert.equal(C.tokenize(s).join(''), s);
    assert.equal(Array.from(s).join(''), s);
  }
});
check('Scene changes the same sampling interval result', () => {
  assert.equal(M.chooseToken('picnic', 0.6), '野餐');
  assert.equal(M.chooseToken('deadline', 0.6), '加班');
  assert.equal(M.chooseToken('picnic', 0.95), '加班');
  assert.equal(M.chooseToken('deadline', 0.95), '散步');
});
check('Cumulative intervals select boundary consistently', () => {
  assert.equal(M.chooseToken('picnic', 0), '散步');
  assert.equal(M.chooseToken('picnic', 0.55), '野餐');
  assert.equal(M.chooseToken('picnic', 0.91), '加班');
  for (const s of Object.values(M.continuations))
    near(
      s.options.reduce((n, [, p]) => n + p, 0),
      1,
    );
});
check('7B dense weights have independently calculated 4/8/16-bit storage', () => {
  near(C.weightGiB(7, 4), 3.259629011154175);
  near(C.weightGiB(7, 8), 6.51925802230835);
  near(C.weightGiB(7, 16), 13.0385160446167);
});
check('Two-bit quantization is exactly four levels including endpoints', () => {
  near(M.quantize(-0.82, 2), -1);
  near(M.quantize(-0.24, 2), -1 / 3);
  near(M.quantize(0.13, 2), 1 / 3);
  near(M.quantize(0.77, 2), 1);
  near(M.quantize(-2, 2), -1);
  near(M.quantize(2, 2), 1);
});
check('Capacity is separate from evidence preservation and output reservation', () => {
  let p = M.contextPlan('all');
  assert.equal(p.used, 16);
  assert.equal(p.overflow, 4);
  assert(p.evidence && p.output);
  p = M.contextPlan('focused');
  assert.equal(p.used, 8);
  assert.equal(p.spare, 4);
  assert(p.evidence);
  p = M.contextPlan('lossy');
  assert.equal(p.used, 5);
  assert.equal(p.overflow, 0);
  assert.equal(p.evidence, false);
});
check('Review and retry cost can reverse cost per accepted result', () => {
  const easyA = M.trialCost(M.trials.extraction.a),
    easyB = M.trialCost(M.trials.extraction.b);
  assert.equal(easyA.total, 48);
  assert.equal(easyB.total, 96);
  assert(easyA.perPass < easyB.perPass);
  const hardA = M.trialCost(M.trials.reasoning.a),
    hardB = M.trialCost(M.trials.reasoning.b);
  assert.equal(hardA.total, 101);
  assert.equal(hardB.total, 120);
  assert(hardA.total < hardB.total);
  assert(hardA.perPass > hardB.perPass);
});
check('Quality gate distinguishes 90 and 95 percent without changing trials', () => {
  const { a, b } = M.trials.extraction;
  near(a.passed / a.total, 0.9);
  near(b.passed / b.total, 0.95);
  assert(a.passed / a.total < 0.95);
  assert(b.passed / b.total >= 0.95);
});
const report = {
  version: '0.15.0',
  time: new Date().toISOString(),
  total: checks.length,
  passed: checks.filter((c) => c.passed).length,
  checks,
};
fs.writeFileSync(path.join(root, 'docs/model-regression.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.total !== report.passed) process.exitCode = 1;
