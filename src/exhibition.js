/* Exhibition composition. Functions share the existing app state and delegated actions. */
function tokenPieces(parts) {
  return parts
    .map(
      (t, i) =>
        `<span class="token"><span>${/^\s+$/.test(t) ? t.replace(/ /g, '␣').replace(/\n/g, '↵') : esc(t)}</span><small>${String(i + 1).padStart(2, '0')}</small></span>`,
    )
    .join('');
}
function tokenComparison() {
  const a = Core.tokenize(U.text),
    b = Array.from(U.text);
  return `<section class="token-lane"><header><span class="rule-letter">A</span><div><h3>连续英文合成一片</h3><p>英文片段、数字、空白与其余字符分别切分</p></div><strong id="token-count">${a.length}<small>片</small></strong></header><div class="tokens editable" id="token-display">${tokenPieces(a)}</div></section>
    <section class="token-lane"><header><span class="rule-letter">B</span><div><h3>逐个字符拆开</h3><p>包括空格与标点；组合字符也可能继续拆开</p></div><strong id="token-alt-count">${b.length}<small>片</small></strong></header><div class="tokens editable" id="token-alt-display">${tokenPieces(b)}</div></section>
    <div class="token-observation" id="token-observation">${tokenObservation(a, b)}</div>`;
}
function tokenObservation(a, b) {
  return a.length === b.length
    ? '这句话恰好得到相同数量。加入英文，再看规则怎样影响切分。'
    : `同一句话，得到 ${a.length} 与 ${b.length} 个片段。改变的是切分规则，原文没有改变。`;
}
function updateTokenComparison() {
  const a = Core.tokenize(U.text),
    b = Array.from(U.text);
  $('#token-display').innerHTML = tokenPieces(a);
  $('#token-count').innerHTML = a.length + '<small>片</small>';
  $('#token-alt-display').innerHTML = tokenPieces(b);
  $('#token-alt-count').innerHTML = b.length + '<small>片</small>';
  $('#token-observation').textContent = tokenObservation(a, b);
}
function exhibitToken() {
  const t = tabValue('concept-token'),
    panelTabs = tabs(
      [
        ['exhibit', '动手拆开'],
        ['boundary', '再想一层'],
        ['source', '出处'],
      ],
      'concept-token',
      t,
      'onpanel',
    );
  const b = getBasic('token');
  let body;
  if (t === 'source')
    body = sourceView([], articleSources(Catalog.articles.find((a) => a.id === 'tokens')?.sources));
  else if (t === 'boundary')
    body = `<div class="token-boundary"><span class="eyebrow">从片段，到编号</span><h2>分成几片，<br>还不是“理解”的全部。</h2><p>${esc(b.explain)}</p><div class="token-facts"><p><b>切分规则</b>决定文本如何变成离散单元。</p><p><b>词表编号</b>对应词表里的条目；本页小数字只标记位置。</p><p><b>实际计费</b>需要对应模型的真实 tokenizer，不能使用本页计数。</p></div>${link('继续读原理', 'reading', 'data-id="tokens"')}</div>`;
  else
    body = `<div class="token-instruction"><span class="eyebrow">一段原文 / 两种教学规则</span><p>改一句话，观察它怎样变成不同的片段。</p></div><label class="token-input"><span>你的句子</span><input id="token-text" value="${esc(U.text)}" maxlength="70" aria-describedby="token-limit"></label><div class="token-comparison">${tokenComparison()}</div><div class="row spaced"><span id="token-limit" class="fineprint">两种规则均为教学示例，不代表任何商业模型。最多 70 个输入字符。</span>${actBtn('换一个例子', 'token-example')}</div>`;
  return `<div class="token-exhibit"><section class="specimen token-panel">${panelTabs}<div class="spec-body">${body}</div></section></div>`;
}

function exhibitGallery() {
  const size = gallerySize(),
    q = U.query.toLowerCase().trim(),
    items = Basics.filter((b) =>
      [b.name, b.title, b.explain, b.id]
        .map((s) => I18n.search(s))
        .join(' ')
        .includes(q),
    ),
    total = Math.max(1, Math.ceil(items.length / size));
  U.page = Math.min(Math.max(0, U.page), total - 1);
  const visible = items.slice(U.page * size, (U.page + 1) * size);
  const highlight = U.page === 0 ? 'token' : U.page === 1 ? 'context' : 'agent';
  const lead = getBasic(highlight);
  const stage = `<aside class="gallery-feature"><span class="eyebrow">从一件展品开始</span><h2>${highlight === 'token' ? '一句话，<br>要怎样交给机器？' : lead.title}</h2><div class="feature-art">${paintSmall(lead.visual)}</div><p>${exhibitFirst(highlight)}</p>${actBtn('打开这件展品 ' + Arr, 'concept', `data-id="${highlight}"`, true)}<span class="feature-foot">不必按顺序。每一个问题，都可以是入口。</span></aside>`;
  const grid = `<div class="knowledge-board">${visible.map((b) => `<button class="knowledge-tile topic-${b.id}" data-do="concept" data-id="${b.id}"><span class="number">${String(Basics.indexOf(b) + 1).padStart(2, '0')} / ${b.id.toUpperCase()}</span><span class="tile-arrow" aria-hidden="true">↗</span><div class="mini-art" aria-hidden="true">${paintSmall(b.visual)}</div><h3>${esc(b.name)}</h3><p class="subtitle">${esc(b.hint)}</p></button>`).join('') || '<p class="feedback">没有找到匹配项，换一个词试试。</p>'}</div>`;
  deck(
    '把一个概念，拿在手里看。',
    '基础知识 / CONCEPT GALLERY',
    `<div class="gallery-layout ${q ? 'is-search' : ''}">${q ? '' : stage}${grid}</div>`,
    U.page,
    total,
    {
      nextLabel: U.page === total - 1 ? '完整资料' : '下一组',
      search: `<div class="index-top"><label class="searchbox"><span aria-hidden="true">⌕</span><input type="search" id="concept-search" value="${esc(U.query)}" placeholder="搜索 Token、算力、Agent…" aria-label="搜索基础概念"></label></div>`,
    },
  );
}

function readerVisualKey(id, isArticle = false) {
  const curated = {
    ai: 'map',
    learning: 'learn',
    tokens: 'tokens',
    parameters: 'memory',
    context: 'context',
    transformer: 'attention',
    cuda: 'compute',
    agent: 'flow',
    mcp: 'mcp',
    harness: 'harness',
  };
  const articles = { 'ai-map': 'map', tokens: 'tokens', parameters: 'memory', context: 'context' };
  return (isArticle ? articles : curated)[id] || null;
}
function exhibitReader() {
  if (!overlay || overlay.type !== 'reader') return;
  const layout = mobile() ? 'phone' : compact() ? 'compact' : 'desktop';
  if (overlay.layout !== layout && overlay.rawSections) {
    const label = overlay.parts[overlay.page]?.label,
      next = readerParts(overlay.title, overlay.rawSections, overlay.rawSources, overlay.visual);
    next.page = Math.max(
      0,
      next.parts.findIndex((p) => p.label === label),
    );
    next.originalLanguage = overlay.originalLanguage;
    overlay = next;
  }
  overlay.page = Math.max(0, Math.min(overlay.page, overlay.parts.length - 1));
  const p = overlay.parts[overlay.page],
    labels = [...new Set(overlay.parts.map((p) => p.label))];
  const nav = `<div class="tabs" role="tablist" aria-label="资料章节">${labels.map((l) => `<button role="tab" aria-selected="${l === p?.label}" tabindex="${l === p?.label ? 0 : -1}" class="${l === p?.label ? 'active' : ''}" data-do="reader-label" data-label="${esc(l)}">${esc(l)}</button>`).join('')}</div>`;
  const art = overlay.visual
    ? `<div class="reader-art" data-topic="${esc(overlay.visual)}">${paintSmall(overlay.visual)}<span>主题关系示意</span></div>`
    : '';
  const content = p?.sources
    ? `<div class="article-sources">${p.sources.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title || s.name)} ↗${s.date ? `<small>原核验日期 ${esc(s.date)}</small>` : ''}</a>`).join('')}</div><p class="fineprint">资料日期沿用原记录，未因界面改版重新核验。</p>`
    : `<p ${overlay.originalLanguage ? 'data-i18n-skip lang="zh-CN"' : ''}>${esc(p?.text || '暂无正文。')}</p>`;
  const readerKey = JSON.stringify([overlay.title, labels, !!overlay.originalLanguage]);
  const existing =
    $('#frame-layer')?.dataset.readerKey === readerKey && $('#frame-layer .native-reader');
  const html = layerHTML(
    overlay.title,
    '',
    `<section class="native-reader" style="--reader-tabs:${labels.length}">${overlay.originalLanguage ? '<p class="original-language-notice">中文原文 · 本篇馆藏正文尚未翻译。</p>' : ''}${nav}<div class="reader-part ${art ? 'with-art' : 'text-only'}"><aside class="reader-label"><span class="large-num">${String(overlay.page + 1).padStart(2, '0')}</span><h3>${esc(p?.label || '资料')}</h3>${art}</aside><div class="reader-body">${content}</div></div><div class="pager"><button class="action" data-do="reader-prev" ${overlay.page === 0 ? 'disabled' : ''}>← 上一段</button><span class="article-counter">${overlay.page + 1} / ${overlay.parts.length}</span><button class="action" data-do="reader-next">${overlay.page === overlay.parts.length - 1 ? '收起资料' : '下一段 →'}</button></div></section>`,
  );
  if (existing) {
    // Retain the overlay, its animation, title and tabs; only the reading panel changes.
    const focusedAction = document.activeElement?.dataset.do;
    const template = document.createElement('template');
    template.innerHTML = html;
    const next = template.content.querySelector('.native-reader');
    existing.querySelector('.reader-part').replaceWith(next.querySelector('.reader-part'));
    existing.querySelector('.pager').replaceWith(next.querySelector('.pager'));
    for (const button of existing.querySelectorAll('[data-do="reader-label"]')) {
      const active = button.dataset.label === p?.label;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    }
    I18n.apply();
    if (focusedAction === 'reader-prev' || focusedAction === 'reader-next')
      existing
        .querySelector(`[data-do="${focusedAction}"]:not(:disabled)`)
        ?.focus({ preventScroll: true });
  } else ensureLayer(html);
  $('#frame-layer').dataset.readerKey = readerKey;
  $('#slide')?.setAttribute('inert', '');
}

function exhibitReflection() {
  if (U.route === 'notes') return notesManager();
  return `<section class="coda"><div class="coda-light" aria-hidden="true"></div><span class="eyebrow">留给你的下一页</span><h2>当机器能做得更多，<br>你想把什么，<em>留给自己？</em></h2><p>你可以带着问题离开。也可以留下此刻的一点想法。</p><details class="coda-note"><summary>写下此刻的想法 <span aria-hidden="true">＋</span></summary><label><span>一个还想继续追问的问题</span><textarea class="notes-paper" data-note="question" maxlength="6000" aria-label="一个还想继续追问的问题" placeholder="不必现在就想明白。">${esc(Notes.question)}</textarea></label><div class="row spaced">${actBtn('带走手记', 'export-notes', '', true)}${link('我的手记', 'notes')}</div><small>只保存在当前浏览器，可自行导出。</small></details><span class="coda-signature">能力与选择 / 故事仍在继续</span></section>`;
}

function exhibitFit() {
  const page =
    U.route === 'concept'
      ? U.concept
      : U.route.startsWith('act/')
        ? Acts[+U.route.split('/')[1] - 1][U.page].id
        : '';
  $('#slide')?.setAttribute('data-exhibit', page);
  for (const body of $$('.spec-body')) body.classList.add('readable-workspace');
  if (U.route.startsWith('act/5')) $('#slide')?.classList.add('workbench-slide');
}
