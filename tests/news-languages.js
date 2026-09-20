const frame = document.querySelector('#app'),
  rows = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms)),
  doc = () => frame.contentDocument;
async function settle() {
  await doc().fonts.ready;
  await wait(130);
}
function check(label, errors) {
  rows.push({ label, passed: !errors.length, errors });
  document.querySelector('#status').textContent = rows.length + ' 组已检查';
}
async function language(lang) {
  const el = doc().querySelector('#locale-picker');
  el.value = lang;
  el.dispatchEvent(new frame.contentWindow.Event('change', { bubbles: true }));
  await settle();
}
async function run() {
  rows.length = 0;
  document.querySelector('#run').disabled = true;
  const key = 'zhixu-v07:locale',
    saved = localStorage.getItem(key);
  try {
    frame.src = '../deploy/site/index.html?news-test=' + Date.now() + '#news';
    await new Promise((r) => (frame.onload = r));
    await settle();
    const data = JSON.parse(doc().querySelector('#news-data').textContent),
      byId = Object.fromEntries(data.items.map((i) => [i.id, i]));
    for (const [width, height] of [
      [1920, 936],
      [1440, 900],
      [1366, 768],
      [1280, 720],
      [390, 844],
      [844, 390],
    ]) {
      frame.style.width = width + 'px';
      frame.style.height = height + 'px';
      await settle();
      for (const lang of ['zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'de', 'fr', 'ru']) {
        await language(lang);
        doc().querySelector('[data-do="news-list"]').click();
        await settle();
        const first = doc().querySelector('.news-card'),
          item = byId[first.dataset.id];
        first.click();
        await settle();
        const errors = [],
          title = doc().querySelector('.news-detail h2'),
          expected = lang === 'en' ? item : item.translations[lang];
        if (title.textContent !== expected.title || title.lang !== lang)
          errors.push('wrong displayed language');
        if (doc().querySelector('.news-excerpt').textContent !== expected.summary)
          errors.push('wrong summary');
        if (
          doc().documentElement.scrollWidth > width + 2 ||
          doc().documentElement.scrollHeight > height + 2
        )
          errors.push('document overflow');
        for (const el of doc().querySelectorAll(
          '.news-detail,.news-reading-tabs,.news-detail-bottom',
        )) {
          const s = frame.contentWindow.getComputedStyle(el);
          if (el.scrollWidth > el.clientWidth + 3 && !['auto', 'scroll'].includes(s.overflowX))
            errors.push(el.className + ' horizontal');
        }
        if (lang !== 'en') {
          doc().querySelector('[data-do="news-original"]').click();
          await settle();
          if (doc().querySelector('.news-detail h2').textContent !== item.title)
            errors.push('original not exact');
          doc().querySelector('[data-do="news-original"]').click();
          await settle();
          if (doc().querySelector('.news-detail h2').textContent !== expected.title)
            errors.push('translation not restored');
        }
        check(`${lang} ${width}x${height}`, errors);
      }
    }
    frame.style.width = '1440px';
    frame.style.height = '900px';
    await language('zh-CN');
    await settle();
    const seen = new Set();
    for (let page = 0; page < 80; page++) {
      for (const button of [...doc().querySelectorAll('.news-card')]) {
        const id = button.dataset.id,
          item = byId[id],
          current = doc().querySelector(`[data-do="news-select"][data-id="${id}"]`);
        current.click();
        await settle();
        const errors = [];
        if (doc().querySelector('.news-detail h2').textContent !== item.translations['zh-CN'].title)
          errors.push('untranslated title');
        const summary = doc().querySelector('.news-excerpt').textContent;
        if (
          item.summary
            ? summary !== item.translations['zh-CN'].summary
            : !summary.includes('没有提供摘要')
        )
          errors.push('summary mismatch');
        seen.add(id);
        check('Chinese item ' + id, errors);
      }
      const next = doc().querySelector('[data-do="news-next"]');
      if (next.disabled) break;
      next.click();
      await settle();
    }
    check(
      'All snapshot items covered',
      seen.size === data.items.length ? [] : [`${seen.size}/${data.items.length}`],
    );
  } finally {
    frame.src = 'about:blank';
    if (saved === null) localStorage.removeItem(key);
    else localStorage.setItem(key, saved);
    const report = {
      time: new Date().toISOString(),
      total: rows.length,
      passed: rows.filter((r) => r.passed).length,
      failures: rows.filter((r) => !r.passed),
    };
    document.querySelector('#report').textContent = JSON.stringify(report, null, 2);
    document.querySelector('#status').textContent = `完成 ${report.passed}/${report.total}`;
    document.querySelector('#run').disabled = false;
  }
}
document.querySelector('#run').onclick = () =>
  run().catch((e) => (document.querySelector('#status').textContent = e.message));
