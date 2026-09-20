const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const ctx = vm.createContext({ console });
vm.runInContext(
  fs.readFileSync(path.join(root, 'src/core.js'), 'utf8') +
    '\n' +
    fs.readFileSync(path.join(root, 'src/story.js'), 'utf8') +
    '\nthis.testCore=Core;this.testFriction=FrictionModel;',
  ctx,
);
const C = ctx.testCore,
  F = ctx.testFriction,
  checks = [];
function check(name, fn) {
  try {
    fn();
    checks.push({ name, passed: true });
  } catch (e) {
    checks.push({ name, passed: false, error: e.message });
  }
}
function run(patch = {}, approval = true) {
  let r = C.newRun({ ...C.defaultSpec(), ...patch });
  for (let i = 0; i < 25; i++) {
    r = C.advance(r);
    if (r.stage === 'WAIT_APPROVAL') r = C.approve(r, approval);
    if (['DONE', 'FAILED', 'BLOCKED', 'STOPPED', 'UNVERIFIED'].includes(r.stage)) break;
  }
  return r;
}
check('Token teaching split is reversible for multilingual, whitespace, emoji and markup', () => {
  for (const s of ['让 AI 帮我。', 'a  b\n🌱', '<img src=x>', '日本語 AI 2026', 'e\u0301', ''])
    assert.equal(C.tokenize(s).join(''), s);
});
check('Two teaching segmentations show a difference without altering text', () => {
  const s = 'AI helps us';
  assert.notEqual(C.tokenize(s).length, Array.from(s).length);
  assert.equal(Array.from(s).join(''), s);
});
check('Escaping prevents user markup execution', () => assert(!C.esc('<img src=x>').includes('<')));
check('Pure weight calculation', () =>
  assert(Math.abs(C.weightGiB(7, 4) - 3.259629011154175) < 1e-10),
);
check('Attention normalizes and masks future positions', () => {
  for (let q = 0; q < 4; q++) {
    const a = C.attention(q, 1, true);
    assert(Math.abs(a.weights.reduce((a, b) => a + b) - 1) < 1e-10);
    assert(a.weights.slice(q + 1).every((x) => x === 0));
  }
});
check('Harness completion requires an actual verified artifact', () => {
  const r = run();
  assert.equal(r.stage, 'DONE');
  assert(r.artifact);
});
check('Refusing approval produces no artifact', () => {
  const r = run({}, false);
  assert.equal(r.stage, 'STOPPED');
  assert(!r.artifact);
});
check('Missing evidence blocks', () => assert.equal(run({ evidence: false }).stage, 'BLOCKED'));
check('No read permission blocks', () => assert.equal(run({ read: false }).stage, 'BLOCKED'));
check('False tool success is detected', () =>
  assert.equal(run({ fault: 'false-success' }).stage, 'FAILED'),
);
check('Retry consumes steps', () => {
  const r = run({ fault: 'transient' });
  assert.equal(r.stage, 'DONE');
  assert(r.steps > run().steps);
});
check('Budget is enforced', () => assert.equal(run({ budget: 2 }).stage, 'BLOCKED'));
check('No verification never reports DONE', () =>
  assert.equal(run({ verify: false }).stage, 'UNVERIFIED'),
);
check('Read-only task creates no saved artifact', () => {
  const r = run({ write: false });
  assert.equal(r.stage, 'UNVERIFIED');
  assert(!r.artifact);
});
check('Checkpoint rejects changed permissions', () => {
  let s = C.defaultSpec(),
    r = C.newRun(s);
  for (let i = 0; i < 3; i++) r = C.advance(r);
  let cp = JSON.parse(JSON.stringify(r));
  assert.equal(C.validateCheckpoint(cp, s).stage, 'WAIT_APPROVAL');
  assert.throws(() => C.validateCheckpoint(cp, { ...s, write: false }));
});
check('Changed task invalidates approval', () => {
  let r = C.newRun(C.defaultSpec());
  for (let i = 0; i < 3; i++) r = C.advance(r);
  r = C.approve(r, true);
  r.spec.goal += 'changed';
  assert.equal(C.advance(r).stage, 'BLOCKED');
});
const ticks = (f, n) => {
  for (let i = 0; i < n; i++) f.tick(0.04);
};
check('Conflict replay deterministic', () => {
  const a = new F(99),
    b = new F(99);
  ticks(a, 180);
  ticks(b, 180);
  assert.equal(JSON.stringify(a.snapshot()), JSON.stringify(b.snapshot()));
});
check('No allocation before authorization; one grant means one allocation', () => {
  const c = new F();
  c.setRule('consent');
  ticks(c, 200);
  assert.equal(c.served, 0);
  c.grant();
  ticks(c, 100);
  assert.equal(c.served, 1);
});
check('Round robin still has a queue', () => {
  const c = new F();
  c.setRule('turns');
  ticks(c, 300);
  assert(c.served > 0 && c.snapshot().waiting > 0);
});
check('Burst remains bounded', () => {
  const c = new F();
  for (let i = 0; i < 10; i++) c.burst();
  assert(c.tokens.length <= 45 && c.dropped > 0);
});
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'src/catalog.json'), 'utf8'));
check('All 108 articles retained', () => assert.equal(catalog.articles.length, 108));
check('Training learns 5.5 and boundary samples change it to 6.0', () => {
  const s = [2, 3, 4, 7, 8, 9].map((x) => ({ x, y: x >= 6 ? 1 : 0 }));
  assert.equal(C.learnThreshold(s).threshold, 5.5);
  assert.equal(C.learnThreshold([...s, { x: 5.8, y: 0 }, { x: 6.2, y: 1 }]).threshold, 6);
});
check('The unseen 5.7 part exposes an error before boundary sampling', () => {
  const s = [2, 3, 4, 7, 8, 9].map((x) => ({ x, y: x >= 6 ? 1 : 0 }));
  assert.equal(5.7 >= C.learnThreshold(s).threshold, true);
  assert.equal(
    5.7 >= C.learnThreshold([...s, { x: 5.8, y: 0 }, { x: 6.2, y: 1 }]).threshold,
    false,
  );
});
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
vm.runInContext(
  app.slice(app.search(/const Acts\s*=/), app.indexOf('function getBasic')) +
    '\n' +
    fs.readFileSync(path.join(root, 'src/revisions.js'), 'utf8') +
    '\nthis.registry={Acts,Basics,LibraryGroups,ResearchPaths};',
  ctx,
);
const R = ctx.registry;
check('All 60 research pathway and branch references resolve', () => {
  let count = 0;
  for (const p of R.ResearchPaths)
    for (const r of [...p.steps.flatMap((s) => s[2]), ...p.branches]) {
      count++;
      if (r.startsWith('concept/'))
        assert(
          R.Basics.some((b) => b.id === r.split('/')[1]),
          r,
        );
      else if (r.startsWith('article/'))
        assert(
          catalog.articles.some((a) => a.id === r.split('/')[1]),
          r,
        );
      else if (r.startsWith('act/')) {
        const [, a, s] = r.split('/');
        assert(R.Acts[+a - 1][+s], r);
      } else
        assert(
          R.LibraryGroups.flatMap((g) => g[1]).some((l) => l[0] === r),
          r,
        );
    }
  assert.equal(count, 60);
});
check('Combined browser scripts parse', () => {
  new vm.Script(
    [
      'core.js',
      'story.js',
      'exhibition.js',
      'narrative11.js',
      'revisions.js',
      'depth.js',
      'history.js',
      'lessons.js',
      'model-core.js',
      'model-lab.js',
      'news-reading.js',
      'news.js',
      'app.js',
    ]
      .map((n) => fs.readFileSync(path.join(root, 'src', n), 'utf8'))
      .join('\n'),
  );
});
const bundle = fs.readFileSync(path.join(root, 'index.html'), 'utf8'),
  site = fs.readFileSync(path.join(root, 'deploy/site/index.html'), 'utf8'),
  archiveB64 = fs.readFileSync(path.join(root, 'src/archive.b64'), 'utf8').trim(),
  markers = /\{\{(?:STYLE|NEWS|DATA|CATALOG|ARCHIVE_INDEX|ARCHIVE|CODE|HERO_IMAGE)\}\}/;
check(
  'Root embeds archive and artwork; deploy ships external copies with otherwise identical content',
  () => {
    assert(!markers.test(bundle) && !markers.test(site));
    assert(bundle.includes(archiveB64));
    assert(!site.includes(archiveB64.slice(0, 120)));
    assert(site.includes('<html data-archive="external" '));
    assert(!bundle.includes('data-archive='));
    assert(
      Buffer.from(archiveB64, 'base64').equals(
        fs.readFileSync(path.join(root, 'deploy/site/archive.html')),
      ),
    );
    assert.equal(
      fs
        .readdirSync(path.join(root, 'assets/fonts'))
        .filter((f) => f.endsWith('.woff2'))
        .reduce(
          (html, file) =>
            html.replace(
              'data:font/woff2;base64,' +
                fs.readFileSync(path.join(root, 'assets/fonts', file)).toString('base64'),
              'assets/fonts/' + file,
            ),
          bundle,
        )
        .replace(archiveB64, '')
        .replace(
          'data:image/png;base64,' +
            fs.readFileSync(path.join(root, 'assets/research-workbench.png')).toString('base64'),
          'assets/research-workbench.png',
        )
        .replace(
          'data:image/png;base64,' +
            fs.readFileSync(path.join(root, 'assets/human-ai-workbench.png')).toString('base64'),
          'assets/human-ai-workbench.png',
        ),
      site.replace('<html data-archive="external" ', '<html '),
    );
  },
);
check('Embedded catalog keeps only the collections the page scripts read', () => {
  const embedded = JSON.parse(
    bundle
      .match(/<script type="application\/json" id="catalog-data">([\s\S]*?)<\/script>/)[1]
      .replace(/<\\\//g, '</'),
  );
  assert.deepEqual(Object.keys(embedded).sort(), ['articles', 'sources']);
  assert.equal(embedded.articles.length, catalog.articles.length);
  assert.equal(embedded.sources.length, catalog.sources.length);
});
check('Deploy news.json matches data/news.json', () =>
  assert(
    fs
      .readFileSync(path.join(root, 'data/news.json'))
      .equals(fs.readFileSync(path.join(root, 'deploy/site/news.json'))),
  ),
);
check('All editorial related links resolve to public exhibit routes', () => {
  const news = JSON.parse(fs.readFileSync(path.join(root, 'data/news.json'), 'utf8'));
  const routes = new Set();
  for (const item of news.items)
    for (const route of item.relatedRoutes || []) {
      routes.add(route);
      if (route.startsWith('concept/'))
        assert(
          R.Basics.some((b) => b.id === route.split('/')[1]),
          route,
        );
      else if (route.startsWith('act/')) {
        const [, act, page] = route.split('/');
        assert(R.Acts[+act - 1][+page], route);
      } else assert(/^library\/[0-4]\/[0-2]$/.test(route), route);
    }
  assert(routes.size >= 12);
});
const report = {
  version: '0.15.0',
  date: new Date().toISOString().slice(0, 10),
  scope:
    'Node pure-model and delivery regression; FrictionModel tests concern retained legacy engine, not the new homepage narrative',
  total: checks.length,
  passed: checks.filter((x) => x.passed).length,
  checks,
};
fs.writeFileSync(path.join(root, 'docs/core-regression.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.total !== report.passed) process.exitCode = 1;
