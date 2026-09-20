/* Local, keyed language resources. No network or automatic translation service. */
const I18n = (() => {
  const normalize = (s) =>
    String(s ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  const data = JSON.parse(document.getElementById('locale-data').textContent);
  const supported = Object.keys(data);
  const zh = data['zh-CN'];
  const sourceIndex = new Map(Object.entries(zh).map(([key, s]) => [normalize(s), key]));
  const key = 'zhixu-v07:locale';
  let locale = 'zh-CN';
  try {
    const saved = localStorage.getItem(key);
    if (supported.includes(saved)) locale = saved;
  } catch {}
  const cache = new Map(),
    originals = new WeakMap(),
    attributes = new WeakMap(),
    missing = new Set();
  const escapeRE = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = Object.entries(zh)
    .filter(([, s]) => /\{\d+\}/.test(s) && /[\u3400-\u9fff]/.test(s))
    .map(([id, s]) => {
      const slots = [];
      let last = 0,
        body = '';
      for (const m of normalize(s).matchAll(/\{(\d+)\}/g)) {
        body += escapeRE(normalize(s).slice(last, m.index)) + '([\\s\\S]*?)';
        slots.push(m[1]);
        last = m.index + m[0].length;
      }
      body += escapeRE(normalize(s).slice(last));
      return {
        id,
        slots,
        re: new RegExp('^' + body + '$'),
        weight: s.replace(/\{\d+\}/g, '').length,
      };
    })
    .sort((a, b) => b.weight - a.weight);
  function t(source, params, depth = 0) {
    const raw = String(source ?? ''),
      text = normalize(raw);
    if (locale === 'zh-CN' && !Object.hasOwn(zh, raw) && !params) return raw;
    const id = Object.hasOwn(zh, source) ? source : sourceIndex.get(text);
    let out;
    if (id) {
      if (locale !== 'zh-CN' && !data[locale]?.[id]) missing.add(text);
      out = (data[locale]?.[id] ?? zh[id]).replace(/\{(\d+)\}/g, (m, n) =>
        params && Object.hasOwn(params, n) ? String(params[n]) : m,
      );
    } else if (locale === 'zh-CN' || !/[\u3400-\u9fff]/.test(text)) out = raw;
    else if (cache.has(text)) out = cache.get(text);
    else {
      if (
        depth < 6 &&
        text.includes('；') &&
        text.split('；').every((s) => /^\d+(?:\.\d+)?毫米分界：\d+个分错$/.test(s))
      )
        out = text
          .split('；')
          .map((s) => t(s, undefined, depth + 1))
          .join('; ');
      if (out === undefined && depth < 6)
        for (const p of patterns) {
          const match = text.match(p.re);
          if (!match || !data[locale]?.[p.id]) continue;
          const values = {};
          p.slots.forEach((slot, i) => (values[slot] = t(match[i + 1], undefined, depth + 1)));
          out = data[locale][p.id].replace(/\{(\d+)\}/g, (m, n) => values[n] ?? m);
          break;
        }
      // Match full messages before separating numeric labels or punctuation.
      if (out === undefined && depth < 6) {
        const suffix = text.match(/^(.*?)\s+([↗→←])$/),
          prefix = text.match(/^(\d+\s+(?:\/\s+)?)(.+)$/),
          count = text.match(/^(.+?)\s+(\d+)$/);
        if (suffix) out = t(suffix[1], undefined, depth + 1) + ' ' + suffix[2];
        else if (prefix) out = prefix[1] + t(prefix[2], undefined, depth + 1);
        else if (count) out = t(count[1], undefined, depth + 1) + ' ' + count[2];
        else if (
          text.includes(' / ') ||
          text.includes(' · ') ||
          text.includes('；') ||
          text.includes('。 ')
        ) {
          const parts = text.split(/( \/ | · |；|。 )/);
          out = parts.map((s, i) => (i % 2 ? s : t(s, undefined, depth + 1))).join('');
        }
      }
      if (out === undefined) {
        out = raw;
        missing.add(text);
      }
      cache.set(text, out);
    }
    if (locale === 'zh-CN') return out;
    return raw.match(/^\s*/)[0] + out.trim() + raw.match(/\s*$/)[0];
  }
  const skip =
    'script,style,textarea,input,code,pre,[data-i18n-skip],.lab-pieces,.tokens,.token,[data-group=labTokenPick],[data-group=labQuery],.lab-prefix,.lab-generation .lab-bar-row b,.lab-attention-bars .lab-bar-row b,.lab-encoding article:first-child>strong,[lang="en"]:not(html)';
  const attrNames = ['aria-label', 'title', 'placeholder', 'alt', 'aria-description'];
  function originalText(el) {
    if (!el) return '';
    if (el.nodeType === 3) return originals.get(el)?.source ?? el.nodeValue;
    if (el.matches?.('input,textarea,[data-i18n-skip]')) return '';
    return (
      [...el.childNodes].map(originalText).find((s) => s.trim() && !/^[\s\d←→↗]+$/.test(s)) || ''
    );
  }
  let observer,
    queued = false;
  function translateNode(node) {
    if (!node.parentElement || node.parentElement.closest(skip)) return;
    const state = originals.get(node);
    const source = state && node.nodeValue === state.rendered ? state.source : node.nodeValue;
    const rendered = t(source);
    originals.set(node, { source, rendered });
    if (node.nodeValue !== rendered) node.nodeValue = rendered;
  }
  function apply(root = document) {
    observer?.disconnect();
    try {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) translateNode(node);
      for (const el of root.querySelectorAll?.(
        '[aria-label],[title],[placeholder],[alt],[aria-description]',
      ) || []) {
        if (el.closest('[data-i18n-skip]')) continue;
        const states = attributes.get(el) || {};
        for (const attr of attrNames) {
          if (!el.hasAttribute(attr)) continue;
          const current = el.getAttribute(attr),
            old = states[attr],
            source = old && old.rendered === current ? old.source : current,
            rendered = t(source);
          states[attr] = { source, rendered };
          if (rendered !== current) el.setAttribute(attr, rendered);
        }
        attributes.set(el, states);
      }
      document.documentElement.lang = locale;
      document.documentElement.dataset.locale = locale;
      const picker = document.getElementById('locale-picker');
      if (picker) picker.value = locale;
    } finally {
      observe();
    }
  }
  function observe() {
    observer?.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: attrNames,
    });
  }
  function set(next) {
    if (!supported.includes(next) || next === locale) return;
    locale = next;
    cache.clear();
    missing.clear();
    try {
      localStorage.setItem(key, locale);
    } catch {}
    apply();
    document.dispatchEvent(new CustomEvent('museum-locale-change', { detail: { locale } }));
  }
  function init() {
    observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        apply();
      });
    });
    document.addEventListener('change', (e) => {
      if (e.target.id === 'locale-picker') set(e.target.value);
    });
    apply();
  }
  document.documentElement.lang = locale;
  document.documentElement.dataset.locale = locale;
  return {
    t,
    set,
    apply,
    init,
    originalText,
    get locale() {
      return locale;
    },
    number: (n) => new Intl.NumberFormat(locale).format(n),
    date: (d, options) => new Intl.DateTimeFormat(locale, options).format(d),
    // Search includes original text even when a legacy article has no translation.
    // Looking it up is not the same as rendering an untranslated interface message.
    search: (s) => {
      const id = sourceIndex.get(normalize(s));
      return (String(s) + ' ' + (data[locale]?.[id] || '')).toLocaleLowerCase(locale);
    },
    diagnostics: () => ({ locale, missing: [...missing] }),
    resources: data,
    supported,
  };
})();
