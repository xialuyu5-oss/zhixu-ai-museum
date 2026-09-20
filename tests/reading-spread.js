/* Local layout checks; no news refresh and no change to saved user preferences. */
const frame = document.querySelector('#app'),
  rows = [];
const d = () => frame.contentDocument,
  w = () => frame.contentWindow;
const settle = () => new Promise((r) => setTimeout(r, 480));
function inspectContent(main) {
  const errors = [];
  const visible = (e) => e.getClientRects().length && !e.closest('[hidden]');
  for (const box of main.querySelectorAll(
    '.test-comparison,.depth-tests,.sample-group,.sample-row',
  )) {
    if (
      visible(box) &&
      (box.scrollHeight > box.clientHeight + 3 || box.scrollWidth > box.clientWidth + 3)
    )
      errors.push('inner overflow: ' + box.className);
  }
  for (const parent of [
    main,
    ...main.querySelectorAll('.sample-row,.sample-group,.then-now,.test-piece,.source-ledger'),
  ]) {
    const children = [...parent.children].filter(visible);
    for (let i = 0; i < children.length; i++)
      for (let j = i + 1; j < children.length; j++) {
        const a = children[i].getBoundingClientRect(),
          b = children[j].getBoundingClientRect();
        if (
          Math.min(a.right, b.right) - Math.max(a.left, b.left) > 3 &&
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 3
        )
          errors.push('overlap: ' + children[i].className + ' / ' + children[j].className);
      }
  }
  for (const p of main.querySelectorAll(
    '.then-now p,.sample-group strong,.test-piece dd,.source-ledger p',
  )) {
    const range = d().createRange();
    range.selectNodeContents(p);
    const r = range.getBoundingClientRect(),
      box = p.parentElement.getBoundingClientRect();
    if (r.bottom > box.bottom + 2 || r.right > box.right + 2)
      errors.push('text outside: ' + p.textContent.slice(0, 35));
  }
  return errors;
}
async function run() {
  const key = 'zhixu-v07:locale',
    saved = localStorage.getItem(key);
  rows.length = 0;
  document.querySelector('#run').disabled = true;
  try {
    frame.src = '../deploy/site/index.html?spread=' + Date.now();
    await new Promise((r) => (frame.onload = r));
    const sizes = [
      [1920, 887],
      [1536, 710],
      [1366, 768],
      [1280, 720],
      [1440, 900],
    ];
    const focus = new URLSearchParams(location.search).get('size');
    for (const [width, height] of sizes.filter((s) => !focus || s.join('x') === focus)) {
      frame.style.width = width + 'px';
      frame.style.height = height + 'px';
      await settle();
      for (const lang of ['zh-CN', 'zh-TW', 'en', 'ja']) {
        const picker = d().querySelector('#locale-picker');
        picker.value = lang;
        picker.dispatchEvent(new (w().Event)('change', { bubbles: true }));
        await d().fonts.ready;
        await settle();
        for (const route of [
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
          w().location.hash = route;
          await settle();
          const tabs = [...d().querySelectorAll('.lesson-tabs button')].map((e) => [
            e.dataset.group,
            e.dataset.id,
          ]);
          for (const [group, id] of tabs) {
            d().querySelector(`[data-group="${group}"][data-id="${id}"]`).click();
            await settle();
            const a = d().querySelector('.depth-explanation'),
              e = d().querySelector('.depth-evidence'),
              m = d().querySelector('.depth-main');
            const ar = a.getBoundingClientRect(),
              er = e.getBoundingClientRect(),
              mr = m.getBoundingClientRect();
            const before = JSON.stringify(w().AtlasMuseum.getState());
            let pageOverflow = false;
            const readingBody = a.querySelector('.reading-body');
            const pageButtons = [...a.querySelectorAll('.reading-pager button')];
            for (const button of pageButtons) {
              button.click();
              const page = a.querySelector('.reading-page:not([hidden])');
              if (
                !page ||
                page.scrollHeight > page.clientHeight + 2 ||
                readingBody.scrollHeight > readingBody.clientHeight + 2
              )
                pageOverflow = true;
            }
            if (pageButtons.length) pageButtons[0].click();
            rows.push({
              lang,
              width,
              height,
              route,
              view: id,
              readingHeight: a.clientHeight,
              readingContent: a.scrollHeight,
              scroll: a.scrollHeight > a.clientHeight + 2,
              compact: a.classList.contains('reading-compact'),
              pages: pageButtons.length || 1,
              pageOverflow,
              bodyOverflow: readingBody.scrollHeight > readingBody.clientHeight + 2,
              contentFailures: inspectContent(m),
              leftScroll: m.scrollHeight > m.clientHeight + 3,
              leftOverflowPixels: Math.max(0, m.scrollHeight - m.clientHeight),
              pagerAtTop:
                !pageButtons.length ||
                a.querySelector('.reading-pager').getBoundingClientRect().bottom <
                  a.querySelector('.reading-body').getBoundingClientRect().top,
              statePreserved: before === JSON.stringify(w().AtlasMuseum.getState()),
              sourcesLeft: er.right <= ar.left + 12,
              taller: ar.bottom > mr.bottom + 15,
              documentFits:
                d().documentElement.scrollHeight <= height + 2 &&
                d().documentElement.scrollWidth <= width + 2,
            });
          }
        }
        document.querySelector('#status').textContent = rows.length + ' 个画面已检查';
      }
    }
  } finally {
    if (saved === null) localStorage.removeItem(key);
    else localStorage.setItem(key, saved);
    frame.src = 'about:blank';
    const result = {
      time: new Date().toISOString(),
      total: rows.length,
      scrolling: rows.filter((r) => r.scroll || r.pageOverflow || r.bodyOverflow),
      contentFailures: rows.filter((r) => r.contentFailures.length),
      leftScrolling: rows.filter((r) => r.leftScroll),
      placementFailures: rows.filter(
        (r) => !r.sourcesLeft || !r.taller || !r.documentFits || !r.statePreserved || !r.pagerAtTop,
      ),
      rows,
    };
    document.querySelector('#report').textContent = JSON.stringify(result, null, 2);
    document.querySelector('#status').textContent =
      `完成 ${rows.length}，右侧滚动 ${result.scrolling.length}，左侧滚动 ${result.leftScrolling.length}，内容重叠 ${result.contentFailures.length}，结构错误 ${result.placementFailures.length}`;
    document.querySelector('#run').disabled = false;
  }
}
document.querySelector('#run').onclick = () =>
  run().catch((e) => (document.querySelector('#status').textContent = e.message));
