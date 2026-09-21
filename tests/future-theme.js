/* Real rendered pages, both themes and eight languages. No remote calls or user data. */
const frame = document.querySelector('#app'), rows = [];
const wait = (ms = 110) => new Promise(resolve => setTimeout(resolve, ms));
const d = () => frame.contentDocument, w = () => frame.contentWindow;
function background(element) {
  const layers = [];
  for (let e = element; e; e = e.parentElement) {
    const values = w().getComputedStyle(e).backgroundColor.match(/[\d.]+/g).map(Number);
    layers.push([values[0], values[1], values[2], values[3] ?? 1]);
    if ((values[3] ?? 1) === 1) break;
  }
  let rgb = [255, 255, 255];
  for (const [r, g, b, a] of layers.reverse()) rgb = [r, g, b].map((v, i) => v * a + rgb[i] * (1-a));
  return 'rgb(' + rgb.join(',') + ')';
}
function contrast(a, b) {
  const luminance = (s) => {
    const parts = s.match(/[\d.]+/g).slice(0, 3).map(Number).map(n => {
      const v = n / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
    });
    return parts[0] * .2126 + parts[1] * .7152 + parts[2] * .0722;
  };
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
async function run() {
  const saved = new Map(['theme', 'locale'].map(k => [k, localStorage.getItem('zhixu-v07:' + k)]));
  const params = new URLSearchParams(location.search);
  rows.length = 0;
  document.querySelector('#run').disabled = true;
  try {
    frame.src = '../deploy/site/index.html?theme-check=' + Date.now();
    await new Promise(resolve => frame.onload = resolve);
    // Measure the settled layout, not the slide's temporary entrance transform.
    if (d().documentElement.dataset.motion !== 'off') d().querySelector('#motion').click();
    const routes = ['entrance', ...[4,4,2,3,5,5].flatMap((n, a) => Array.from({length:n}, (_, p) => `act/${a+1}/${p}`)),
      ...w().AtlasMuseum.concepts.map(id => 'concept/' + id), 'basics', 'library', 'news', 'notes'];
    const sizes = [[1920,887], [1280,720], [390,844], [844,390]];
    for (const [width, height] of sizes) {
      if (params.has('size') && params.get('size') !== width + 'x' + height) continue;
      frame.style.width = width + 'px'; frame.style.height = height + 'px'; await wait(180);
      for (const locale of (params.has('lang') ? [params.get('lang')] : width > 1000 ? w().AtlasMuseum.i18n.supported : ['zh-CN', 'en', 'ja'])) {
        const picker = d().querySelector('#locale-picker');
        picker.value = locale; picker.dispatchEvent(new (w().Event)('change', {bubbles:true}));
        await d().fonts.ready; await wait();
        for (const theme of ['dark', 'light']) {
          if (d().documentElement.dataset.theme !== theme) d().querySelector('#theme').click();
          for (const route of routes) {
            w().location.hash = route; await wait();
            const errors = [], root = d().documentElement;
            const css = w().getComputedStyle(root);
            if (css.getPropertyValue('--bg').trim() !== (theme === 'dark' ? '#080f1f' : '#eff4fc')) errors.push('wrong palette');
            if (root.scrollWidth > width + 2 || root.scrollHeight > height + 2) errors.push('document overflow');
            const selectors = '#main,.deck,.pager,.page-selector,.story-exhibit,.research-core,.lesson-content';
            for (const box of d().querySelectorAll(selectors)) {
              if (!box.getClientRects().length || box.closest('[hidden]')) continue;
              if (box.scrollWidth > box.clientWidth + 4 || box.scrollHeight > box.clientHeight + 4)
                errors.push('overflow ' + (box.className || box.id) + ' ' + [box.clientWidth,box.scrollWidth,box.clientHeight,box.scrollHeight]);
            }
            for (const button of d().querySelectorAll('.action.primary,.pager .dots button.active')) {
              if (!button.getClientRects().length || button.closest('[hidden]')) continue;
              const s = w().getComputedStyle(button);
              if (contrast(s.color, background(button)) < 4.5) errors.push('primary contrast');
            }
            rows.push({name:[width+'x'+height, locale, theme, route].join('/'), errors});
            document.querySelector('#status').textContent = rows.length + ' checks';
          }
        }
      }
    }
  } catch (e) { rows.push({name:'harness',errors:[String(e)]}); }
  finally {
    for (const [key, value] of saved) {
      if (value === null) localStorage.removeItem('zhixu-v07:' + key);
      else localStorage.setItem('zhixu-v07:' + key,value);
    }
    frame.src = 'about:blank';
    const result = {total:rows.length,passed:rows.filter(r=>!r.errors.length).length,failures:rows.filter(r=>r.errors.length)};
    document.querySelector('#report').textContent = JSON.stringify(result,null,2);
    document.querySelector('#status').textContent = 'DONE '+result.passed+'/'+result.total;
    document.querySelector('#run').disabled = false;
  }
}
document.querySelector('#run').onclick = run;
