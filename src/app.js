'use strict';
const D = JSON.parse(document.getElementById('museum-data').textContent);
const Catalog = JSON.parse(document.getElementById('catalog-data').textContent);
const ArchiveIndex = JSON.parse(document.getElementById('archive-index').textContent);
const $ = (s, r = document) => r.querySelector(s),
  $$ = (s, r = document) => [...r.querySelectorAll(s)],
  esc = Core.esc;
const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)');
const compact = () => innerHeight < 500 && innerWidth >= 600;
const mobile = () => innerWidth <= 760 && !compact();
function getStore(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem('zhixu-v07:' + key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function setStore(key, value) {
  try {
    localStorage.setItem('zhixu-v07:' + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
const rawNotes = getStore('notes', {}),
  Notes = {
    why: typeof rawNotes.why === 'string' ? rawNotes.why.slice(0, 3000) : '',
    keep: typeof rawNotes.keep === 'string' ? rawNotes.keep.slice(0, 3000) : '',
    question: typeof rawNotes.question === 'string' ? rawNotes.question.slice(0, 6000) : '',
    need: D.needs.some((n) => n.id === rawNotes.need) ? rawNotes.need : 'time',
  };
const U = {
  phase: 0,
  motion: !prefersReduced.matches,
  theme: getStore('theme', 'dark') === 'light' ? 'light' : 'dark',
  route: 'entrance',
  page: 0,
  panel: {},
  mobile: 'exhibit',
  concept: 'token',
  need: Notes.need,
  rule: 'color',
  extra: false,
  tested: false,
  workers: 4,
  jobs: 0,
  jobRunning: false,
  text: '让 AI 帮我。',
  params: 7,
  bits: 4,
  budget: [800, 2400, 1200, 1600],
  q: 3,
  temp: 1,
  mask: true,
  train: 0,
  vector: '天气',
  caseId: 'share',
  evidence: 0,
  flow: 0,
  mcp: true,
  spec: Core.defaultSpec(),
  run: null,
  checkpoint: null,
  event: null,
  query: '',
  libGroup: 0,
  listPage: 0,
  futureView: 0,
  autonomy: 'draft',
  scope: true,
  appeal: true,
  noteTab: 'why',
  permissionTab: 0,
};
let scene = null,
  jobTimer = null,
  trainTimer = null,
  toastTimer = null,
  frameFocus = null,
  overlay = null,
  decodedArchive = null,
  resizeTimer = null,
  partKey = '';
U.spec.goal = I18n.t(U.spec.goal);
U.spec.criterion = I18n.t(U.spec.criterion);
document.documentElement.dataset.theme = U.theme;
document.documentElement.dataset.motion = U.motion ? 'on' : 'off';
const Arr = '<span class="arrow" aria-hidden="true">→</span>';
const actBtn = (label, doName, attr = '', primary = false) =>
  `<button class="action ${primary ? 'primary magnetic' : ''}" data-do="${doName}" ${attr}>${label}</button>`;
const link = (label, doName, attr = '') =>
  `<button class="link" data-do="${doName}" ${attr}>${label} ${Arr}</button>`;
function notify(text) {
  $('#toast').textContent = text;
  $('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3600);
}
function download(name, text, type = 'text/plain;charset=utf-8') {
  const u = URL.createObjectURL(new Blob([text], { type })),
    a = document.createElement('a');
  a.href = u;
  a.download = I18n.t(name);
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
function sourceURLs(ids) {
  return ids.map((id) => D.sources[id]).filter(Boolean);
}
function sourceView(ids, extra = []) {
  const sources = [...sourceURLs(ids), ...extra];
  return `<div class="source-box"><span class="eyebrow">原始资料</span>${sources.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title || s.name)} ↗</a>`).join('') || '<p class="micro-note">本页是人为设定的教学实验，步骤与数据可以在源码中检查。</p>'}<p class="fineprint">外部资料需要联网。展品中的手工数字与情境，不是商业模型的实测成绩。</p></div>`;
}
function go(hash) {
  if (location.hash.slice(1) === hash) render();
  else location.hash = hash;
}
function readRoute() {
  const h = location.hash.slice(1) || 'entrance',
    a = h.split('/');
  if (a[0] === 'act' && +a[1] >= 1 && +a[1] <= 6) {
    U.route = 'act/' + a[1];
    U.page = Math.max(0, Math.min(Acts[+a[1] - 1].length - 1, +a[2] || 0));
  } else if (a[0] === 'concept' && Basics.some((b) => b.id === a[1])) {
    U.route = 'concept';
    U.concept = a[1];
    U.page = Basics.findIndex((b) => b.id === a[1]);
  } else if (a[0] === 'basics') {
    U.route = 'basics';
    U.page = +a[1] || 0;
  } else if (a[0] === 'library') {
    U.route = 'library';
    U.libGroup = Math.max(0, Math.min(4, +a[1] || 0));
    U.page = U.libGroup;
    U.libraryStep = Math.max(0, Math.min(2, +a[2] || 0));
  } else if (a[0] === 'news') {
    U.route = 'news';
    U.page = 0;
  } else if (a[0] === 'notes') {
    U.route = 'notes';
    U.page = 0;
  } else {
    U.route = 'entrance';
    U.page = 0;
  }
}
function setTop() {
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', U.theme === 'dark' ? '#080f1f' : '#eff4fc');
  $('#motion').textContent = U.motion ? 'Ⅱ' : '▷';
  $('#motion').setAttribute('aria-label', U.motion ? '暂停动效' : '播放动效');
  $('#motion').setAttribute('aria-pressed', String(U.motion));
  $('#theme').setAttribute('aria-label', U.theme === 'light' ? '切换深色主题' : '切换浅色主题');
  $$('.topnav button').forEach((n) =>
    n.classList.toggle(
      'active',
      (n.dataset.do === 'basics' && ['basics', 'concept'].includes(U.route)) ||
        (n.dataset.do === 'library' && U.route === 'library') ||
        (n.dataset.route === 'news' && U.route === 'news'),
    ),
  );
  const n = +U.route.split('/')[1];
  $('#journey').innerHTML =
    `<span class="journey-label"><strong>能力与选择</strong><span>一页一问，继续探索</span></span><nav class="journey-nav" aria-label="六幕展览">${D.acts.map((a) => `<button data-do="go" data-route="act/${a.id}/0" class="${n === a.id ? 'active' : ''}" ${n === a.id ? 'aria-current="step"' : ''}><i aria-hidden="true"></i>${esc(a.short)}</button>`).join('')}</nav><span class="journey-right">${U.route === 'entrance' ? 'EXHIBITION / 15' : '←  →  翻页'}</span>`;
}
function cleanScene() {
  Revision.collision = null;
  scene?.destroy();
  scene = null;
  clearInterval(jobTimer);
  jobTimer = null;
  U.jobRunning = false;
  clearInterval(trainTimer);
  trainTimer = null;
}
function render() {
  clearTimeout(searchTimer);
  viewportProfile();
  cleanScene();
  overlay = null;
  readRoute();
  U.mobile = 'exhibit';
  if (U.route === 'entrance') renderEntrance();
  else if (U.route === 'basics') renderBasics();
  else if (U.route === 'concept') renderConcept();
  else if (U.route === 'library') renderLibrary();
  else if (U.route === 'news') renderNews();
  else if (U.route === 'notes') renderNotes();
  else renderAct();
  setTop();
  document.title =
    (U.route === 'entrance'
      ? '能力与选择'
      : U.route === 'concept'
        ? '基础知识 · ' + Basics[U.page].name
        : U.route === 'basics'
          ? '基础知识展柜'
          : U.route === 'library'
            ? '资料室'
            : U.route === 'news'
              ? 'AI 观察站'
              : U.route === 'notes'
                ? '我的手记'
                : D.acts[+U.route.split('/')[1] - 1].label) + ' · 知序 AI 科技馆';
  $('#main').setAttribute('data-route', U.route);
  scheduleAdaptive();
}
function tabs(options, group, current, extra = '') {
  return `<div class="tabs ${extra}" role="tablist" aria-label="页内视角">${options.map(([id, l]) => `<button role="tab" aria-selected="${String(current === id)}" tabindex="${current === id ? 0 : -1}" data-do="tab" data-group="${group}" data-id="${id}" class="${current === id ? 'active' : ''}">${l}</button>`).join('')}</div>`;
}
function tabValue(key, def = 'exhibit') {
  return U.panel[key] || def;
}
function specimen(body, { tabsHTML = '', foot = '', stamp = '', title = '' } = {}) {
  return `<section class="specimen">${tabsHTML || `<div class="spec-head"><strong>${title || '看一眼，再试试看'}</strong><span class="stamp">${stamp || 'INTERACTIVE EXHIBIT'}</span></div>`}<div class="spec-body">${body}</div>${foot ? `<div class="spec-foot">${foot}</div>` : ''}</section>`;
}
function split(meta, body) {
  return `<div class="slide-split" data-mobile="${U.mobile}"><div class="mobile-layer" role="group" aria-label="手机阅读视图"><button data-do="mobile-layer" data-id="exhibit" class="${U.mobile === 'exhibit' ? 'active' : ''}">继续操作</button><button data-do="mobile-layer" data-id="read" class="${U.mobile === 'read' ? 'active' : ''}">展开讲解</button></div><section class="copy"><div class="micro-index">${esc(meta.label || '从现象，到理解')}</div><h2>${meta.question}</h2><p class="lead">${meta.explain}</p><p class="question">${meta.think}</p><div class="copy-footer">${meta.links || ''}</div></section>${body}</div>`;
}
function pager(page, total, { labels = [], nextLabel = '下一页', type = 'deck' } = {}) {
  return `<div class="pager"><button class="action" data-do="prev" ${page === 0 && U.route === 'basics' ? 'disabled' : ''} aria-label="上一页"><span class="arrow" aria-hidden="true">←</span> 上一页</button><div class="page-selector"><span>选择页面</span><div class="dots" role="group" aria-label="本组页面">${Array.from({ length: total }, (_, i) => `<button data-do="page" data-id="${i}" class="${page === i ? 'active' : ''}" aria-label="${esc(labels[i] || '第 ' + (i + 1) + ' 页')}" ${page === i ? 'aria-current="page"' : ''}><span>${String(i + 1).padStart(2, '0')}</span></button>`).join('')}</div></div><div class="pager-right"><span class="pager-label">${String(page + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span><button class="action" data-do="next" aria-label="${nextLabel}">${nextLabel} ${Arr}</button></div></div>`;
}
function deck(title, kicker, html, page, total, options = {}) {
  $('#main').innerHTML =
    `<article class="deck"><header class="deck-head"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1>${options.search || ''}</div><div class="deck-position"><span class="num">${String(page + 1).padStart(2, '0')}</span><span>/ ${String(total).padStart(2, '0')}</span>${options.exit ? link(options.exit[0], options.exit[1]) : ''}${Revision.libraryReturn ? '<button class="back-research" data-do="research-return">返回探索路径</button>' : ''}</div></header><div class="slide" id="slide">${html}</div>${pager(page, total, options)}</article>`;
}
const Acts = [
  [
    { id: 'need', title: 'AI时代，我们做事的方式发生了哪些变化？' },
    { id: 'history', title: '1955，一份提案打开了什么？' },
    { id: 'learning', title: '机器怎样从例子中学会判断？' },
    { id: 'compute', title: '程序、CUDA 与 GPU，各做什么？' },
  ],
  [
    { id: 'token', title: '一句话，要怎样交给机器？' },
    { id: 'parameters', title: '参数，不是一叠知识卡片。' },
    { id: 'context', title: '它眼前，究竟放得下什么？' },
    { id: 'attention', title: '这一刻，它在看向哪里？' },
  ],
  [
    { id: 'evidence', title: '它说得很好。然后呢？' },
    { id: 'choice', title: '最强的模型，一定最合适吗？' },
  ],
  [
    { id: 'flow', title: '请帮我，把这件事做完。' },
    { id: 'mcp', title: '连接，不等于授权。' },
    { id: 'verify', title: '“完成了”，就真的完成了吗？' },
  ],
  [
    { id: 'goal', title: '给它一份具体的工作。' },
    { id: 'materials', title: '它应该依据什么？' },
    { id: 'permissions', title: '给它能力，也给它边界。' },
    { id: 'run', title: '运行一次，看事情怎样发生。' },
    { id: 'export', title: '把设计，带回真实的生活。' },
  ],
  [
    { id: 'bounds', title: '能力越强，越该交出决定吗？' },
    { id: 'abundance', title: '如果已经足够丰富，然后呢？' },
    { id: 'coexist', title: '共同生活，不等于没有分歧。' },
    { id: 'conclusion', title: '结语：回到最初的问题。' },
    { id: 'reflection', title: '留一个，还没有答案的问题。' },
  ],
];
const Basics = [
  {
    id: 'ai',
    name: '人工智能',
    title: '智能，不止一个聊天窗口。',
    question: '如果不说话，<br>它还是 AI 吗？',
    explain:
      '识别异常、预测温度、生成文字，是不同的任务。AI 是一个研究与工程领域，大语言模型只是一条路径。',
    think: '先问要解决什么，再问是否需要大模型。',
    visual: 'map',
    reading: 'ai',
    sources: ['dartmouth'],
    hint: '把任务放回技术地图',
  },
  {
    id: 'learning',
    name: '学习与训练',
    title: '机器怎样从例子中学会判断？',
    question: '它学到了标准，<br>还是碰巧相同的外表？',
    explain:
      '从样本中找规律，不等于获得了适用于所有情况的真理。新的反例，能暴露旧样本没有覆盖的边界。',
    think: '当训练样本都来自同一种环境，会漏掉什么？',
    visual: 'learn',
    reading: 'learning',
    sources: [],
    hint: '让反例改变一个判断',
  },
  {
    id: 'token',
    name: 'Token',
    title: '一句话，要怎样交给机器？',
    question: '它先看见的，<br>不是你眼里的整句话。',
    explain:
      '文本先被切成离散单元，再映射为编号。一个 Token 不一定对应一个汉字、一个词，或一个完整概念。',
    think: '同一段文字，为什么不同模型可能计数不同？',
    visual: 'tokens',
    reading: 'tokens',
    sources: [],
    hint: '亲手拆开一句话',
  },
  {
    id: 'parameters',
    name: '参数与量化',
    title: '参数，不是一叠知识卡片。',
    question: '装进去的，<br>是一组可以调整的数。',
    explain:
      '训练调整大量数值，让它们共同影响信息变换。参数量不能单独代表能力，也不能把每个参数对应成一条事实。',
    think: '把数值表示变小，省下的空间换来了什么？',
    visual: 'memory',
    reading: 'parameters',
    sources: [],
    hint: '调节纯权重体积',
  },
  {
    id: 'context',
    name: '上下文',
    title: '它眼前，究竟放得下什么？',
    question: '不是永久记忆，<br>更像临时的工作台。',
    explain:
      '目标、证据、历史和输出需要共享本次请求的空间。把所有东西塞进来，不等于关键资料会被正确使用。',
    think: '删去噪音，与扩大工作台，哪一个先做？',
    visual: 'context',
    reading: 'context',
    sources: ['harness'],
    hint: '给重要证据留位置',
  },
  {
    id: 'vector',
    name: '向量表示',
    title: '意思接近，可以怎样计算？',
    question: '把关系，<br>放进一组坐标里。',
    explain:
      '向量是数值表示。语义模型可以让某些相关内容在向量空间更接近，但相似并不自动意味着正确、相同或可信。',
    think: '找到相似的资料，是否就找到了答案？',
    visual: 'vector',
    reading: null,
    sources: [],
    hint: '观察距离与相关性',
  },
  {
    id: 'retrieval',
    name: '知识库与检索',
    title: '找到了资料，还差哪一步？',
    question: '找得到，<br>不等于能据此下结论。',
    explain:
      '知识问答可以先查找材料，再组织回答。解析、分块、检索、权限、来源与验证都会影响最后的结果。',
    think: '当资料过时或证据缺失，系统能不能停下来？',
    visual: 'retrieval',
    reading: null,
    sources: [],
    hint: '查找证据，而不是借口',
  },
  {
    id: 'attention',
    name: 'Transformer',
    title: '这一刻，它在看向哪里？',
    question: '让一处信息，<br>有选择地汇集其他位置。',
    explain:
      '注意力根据查询与键的匹配计算权重，再汇集值向量。Transformer 还包括其他运算；眼前只是其中一个小环节。',
    think: '权重大的位置，能直接证明答案正确吗？',
    visual: 'attention',
    reading: 'transformer',
    sources: ['transformer'],
    hint: '计算一次微型注意力',
  },
  {
    id: 'compute',
    name: '算力与 CUDA',
    title: '程序、CUDA 与 GPU，各做什么？',
    question: '不是让一件事更着急，<br>而是安排多件事一起做。',
    explain:
      'GPU 提供计算硬件，CUDA 提供使用 NVIDIA GPU 的软件平台与工具。程序、数据和硬件要共同配合。',
    think: '任务之间相互等待时，增加并行数量还有效吗？',
    visual: 'compute',
    reading: 'cuda',
    sources: ['cuda'],
    hint: '安排一批并行任务',
  },
  {
    id: 'agent',
    name: 'Agent',
    title: '会回答，也能够行动吗？',
    question: '先有一件工作，<br>再有“智能体”这个名字。',
    explain:
      '模型根据目标与反馈选择部分下一步，程序执行工具并检查结果。步骤已经明确的任务，也可能只需要脚本或工作流。',
    think: '究竟是哪一步，需要让模型自己决定？',
    visual: 'flow',
    reading: 'agent',
    sources: ['agents'],
    hint: '区分建议、行动与验证',
  },
  {
    id: 'mcp',
    name: 'MCP 与 Tools',
    title: '连接，不等于授权。',
    question: '看得见一把钥匙，<br>不代表可以打开所有门。',
    explain:
      'MCP 是连接外部工具与资源的一种协议。它不替代参数校验、身份认证或权限控制，也不是智能体本身。',
    think: '工具被发现时，谁同意它执行这一次动作？',
    visual: 'mcp',
    reading: 'mcp',
    sources: ['mcp'],
    hint: '连接层与权限层分开看',
  },
  {
    id: 'harness',
    name: 'Harness',
    title: '让任务接得上，也停得下。',
    question: '谁保证它没有越权，<br>也没有把失败当作成功？',
    explain:
      'Harness 组织任务状态、上下文、权限、预算、检查点与验收。模型的能力只是整个执行系统的一部分。',
    think: '中断之后恢复的，是一句总结还是可核查的状态？',
    visual: 'harness',
    reading: 'harness',
    sources: ['harness'],
    hint: '把运行的边界显露出来',
  },
];
const LibraryGroups = [
  [
    '理解模型',
    [
      ['knowledge', '基础知识 · 可视化展柜', '从一个问题进入原理'],
      ['models', '模型图鉴与开放程度', '能力、许可与官方入口'],
      ['local-models', '本地小模型', '部署路径与资源边界'],
      ['model-api', '模型 API 价格', '沿用资料的原核验日期'],
      ['vectors', '知识库与向量工具', '方案、实验与来源'],
      ['articles', '完整知识文章', '108 篇馆藏 · 逐段阅读'],
    ],
  ],
  [
    '使用 AI',
    [
      ['apps', 'AI / Agent App', '官方 URL 与用途'],
      ['pricing', '同产品订阅档位', '个人与团队分别比较'],
      ['subscriptions', '订阅与支付', '资格与渠道核对'],
      ['playbook', '提示词与上下文', '方法、模板与检查'],
      ['agents', 'Agent 与框架', '产品、框架与协议'],
      ['resources', '网站与 GitHub', '分类入口与来源'],
    ],
  ],
  [
    '设计与实现',
    [
      ['harness', 'Harness 系列', '任务系统如何接得上'],
      ['harness-lab', '运行沙盒', '错误、恢复与审批'],
      ['projects', '可复现实战', '示例数据与程序'],
      ['troubleshoot', '故障排查', '症状、验证与修复'],
      ['benchmarks', '同题与失败案例', '教学样例不是实测成绩'],
      ['git', 'Git / GitHub', '分支、审查与恢复'],
    ],
  ],
  [
    '工程与部署',
    [
      ['vps', 'VPS 与建站', '基础设施与连接'],
      ['licenses', '开源软件协议', '商业使用与分发边界'],
      ['openpath', '开源与闭源', '控制权与维护责任'],
      ['article/n-deploy-cn', '国内部署说明', '沿用原资料条件'],
      ['providers', 'VPS 供应商', '原版资料与比较'],
      ['sources', '资料来源', '核验日期与原始 URL'],
    ],
  ],
  [
    '继续观察',
    [
      ['news', 'AI 新闻 · 观察站', '来源动态 · 6 小时检查 · 关联馆藏'],
      ['people', '人物与频道', '主页 / X / YouTube'],
      ['resources', '社区与网站', '官方资料与开发资源'],
      ['apps', '应用入口', '前往产品与文档'],
      ['sources', '核验记录', '来源日期与资料边界'],
      ['reflection', '把一个问题带走', '不要求今天就想明白'],
    ],
  ],
];
function getBasic(id) {
  return Basics.find((b) => b.id === id);
}
function renderAct() {
  const n = +U.route.split('/')[1],
    pages = Acts[n - 1],
    page = pages[U.page];
  partKey = U.route + '/' + U.page;
  let html = renderPage(page.id);
  deck(page.title, `第 ${n} 幕 · ${D.acts[n - 1].label}`, html, U.page, pages.length, {
    labels: pages.map((p) => p.title),
    nextLabel: U.page === pages.length - 1 ? (n === 6 ? '回到序厅' : '下一幕') : '下一页',
  });
  bindAfter(page.id);
}
function renderConcept() {
  const b = Basics[U.page];
  partKey = 'concept/' + b.id;
  deck(b.title, '基础知识 · ' + b.name, conceptSlide(b.id), U.page, Basics.length, {
    labels: Basics.map((b) => b.name),
    nextLabel: U.page === Basics.length - 1 ? '回到展柜' : '下个概念',
    exit: ['展柜', 'basics'],
  });
  bindAfter(b.id);
}
function renderCurrentSlide() {
  viewportProfile();
  if (U.route === 'concept') {
    $('#slide').innerHTML = conceptSlide(U.concept);
    bindAfter(U.concept);
  } else if (U.route.startsWith('act/')) {
    const p = Acts[+U.route.split('/')[1] - 1][U.page];
    $('#slide').innerHTML = renderPage(p.id);
    bindAfter(p.id);
  }
}
function renderPage(id) {
  if (getBasic(id)) return conceptSlide(id);
  return (
    {
      need: needSlide,
      history: historySlide,
      evidence: evidenceLab,
      choice: choiceLab,
      flow: flowSlide,
      verify: verifySlide,
      goal: goalSlide,
      materials: materialsSlide,
      permissions: permissionsSlide,
      run: runSlide,
      export: exportSlide,
      bounds: boundsSlide,
      abundance: abundanceSlide,
      coexist: coexistSlide,
      conclusion: conclusionSlide,
      reflection: reflectionSlide,
    }[id] || (() => '')
  )();
}
function paintSmall(type) {
  if (type === 'mcp') return mcpConnectionMap();
  const svg = (s) =>
    `<svg class="diagram" viewBox="0 0 400 220" role="img" aria-label="${esc(type)} 概念示意">${s}</svg>`;
  const node = (x, y, w, h, text, cls = 'node') =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" class="${cls}"/><text ${['让', '帮', '我'].includes(text) ? 'data-i18n-skip' : ''} x="${x + w / 2}" y="${y + h / 2 + 5}" text-anchor="middle">${text}</text>`;
  if (type === 'map')
    return svg(
      `<rect x="30" y="24" width="340" height="177" rx="26" class="node"/><text x="52" y="51">人工智能</text><rect x="76" y="72" width="274" height="111" rx="22" class="accent-node"/><text x="95" y="98">机器学习</text><rect x="186" y="115" width="146" height="48" rx="14" class="warm-node"/><text x="259" y="145" text-anchor="middle">大语言模型</text><text x="52" y="214" class="mono-label">NOT ALL AI NEEDS TO SPEAK</text>`,
    );
  if (type === 'tokens')
    return svg(
      `${node(23, 35, 354, 48, '把一句话，拆成可以处理的单元')}<path d="M200 83V113M58 114H342M58 114V137M152 114V137M248 114V137M342 114V137" class="flow"/>${['让', 'AI', '帮', '我'].map((t, i) => node(26 + i * 94, 138, 68, 50, t, i % 2 ? 'warm-node' : 'accent-node')).join('')}`,
    );
  if (type === 'memory')
    return svg(
      `${Array.from({ length: 18 }, (_, i) => `<rect x="${30 + i * 19}" y="${177 - (35 + i * 7)}" width="12" height="${35 + i * 7}" rx="3" fill="${i < 9 ? 'var(--teal)' : 'var(--soft)'}" stroke="var(--line)"/>`).join('')}<text x="26" y="209" class="mono-label">PARAMETERS × BITS / 8</text>`,
    );
  if (type === 'context')
    return svg(
      `${node(35, 30, 330, 155, '', 'node')}${[0, 1, 2, 3].map((i) => `<rect x="${50 + i * 77}" y="45" width="66" height="125" rx="5" fill="${['var(--teal)', 'var(--signal)', 'var(--copper)', 'var(--muted)'][i]}" opacity=".6"/><text x="${83 + i * 77}" y="199" text-anchor="middle" style="font-size:12px">${['目标', '证据', '历史', '输出'][i]}</text>`).join('')}`,
    );
  if (type === 'attention')
    return svg(
      `${[0, 1, 2, 3].map((i) => `<path d="M200 54 Q${70 + i * 85} 80 ${55 + i * 95} 151" class="flow" style="stroke-width:${i + 1};opacity:${0.3 + i * 0.2}"/>${node(27 + i * 95, 150, 56, 41, ['让', 'AI', '帮', '我'][i])}`).join('')}${node(166, 15, 68, 44, '查询', 'accent-node')}`,
    );
  if (type === 'compute')
    return svg(
      `${node(134, 16, 132, 43, '程序 / CUDA', 'accent-node')}<path d="M200 60V83M60 83H340" class="flow"/>${Array.from({ length: 24 }, (_, i) => `<rect x="${47 + (i % 8) * 40}" y="${100 + Math.floor(i / 8) * 30}" width="26" height="22" rx="3" fill="${i < 12 ? 'var(--teal)' : 'var(--paper)'}" stroke="var(--line)"/>`).join('')}`,
    );
  if (type === 'retrieval')
    return svg(
      `${node(18, 77, 85, 64, '提问', 'accent-node')}<path d="M105 108H155M249 108H303" class="flow"/><rect x="155" y="43" width="87" height="102" rx="8" class="node"/><rect x="169" y="57" width="87" height="102" rx="8" class="node"/><path d="M181 84H235M181 99H232M181 114H223" class="wire"/>${node(303, 77, 81, 64, '核对', 'warm-node')}<text x="210" y="183" text-anchor="middle">资料是证据，不是指令</text><text x="76" y="212" class="mono-label">RETRIEVE · CITE · VERIFY</text>`,
    );
  if (type === 'vector')
    return svg(
      `<path d="M30 192H365M60 20V198" class="wire"/>${[
        [130, 62],
        [153, 80],
        [96, 99],
        [241, 149],
        [290, 162],
        [281, 91],
      ]
        .map(
          ([x, y], i) =>
            `<circle cx="${x}" cy="${y}" r="${i === 2 ? 10 : 6}" fill="${i < 3 ? 'var(--teal)' : 'var(--copper)'}" opacity=".75"/>`,
        )
        .join(
          '',
        )}<circle cx="140" cy="89" r="47" fill="none" stroke="var(--teal)" stroke-dasharray="3 5"/><text x="198" y="54" class="mono-label">SIMILAR ≠ TRUE</text>`,
    );
  if (type === 'learn')
    return svg(
      `<path d="M35 184H368M75 20V190M210 23V180" class="wire"/>${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${94 + i * 45}" cy="${[135, 112, 137, 69, 55, 34][i]}" r="7" fill="${i < 3 ? 'var(--copper)' : 'var(--teal)'}"/>`).join('')}<path d="M72 163L326 40" class="flow"/><text x="212" y="207" class="mono-label">LEARN · TEST · REVISE</text>`,
    );
  return svg(
    `<path d="M106 110H163M238 110H295M328 146V184H74V148" class="flow"/>${node(16, 76, 91, 66, '任务')}${node(155, 64, 90, 87, type === 'harness' ? '校验' : '模型', 'accent-node')}${node(294, 76, 91, 66, '工具', 'warm-node')}<text x="203" y="209" text-anchor="middle" class="mono-label">${type === 'mcp' ? 'CONNECT ≠ AUTHORIZE' : 'ACT · OBSERVE · VERIFY'}</text>`,
  );
}
function conceptSlide(id) {
  if (['token', 'parameters', 'context', 'attention'].includes(id)) return modelLab(id);
  if (id === 'learning') return learningTen();
  if (id === 'compute') return computeTen();
  const b = getBasic(id),
    key = 'concept-' + id,
    t = tabValue(key);
  const panelTabs = tabs(
    [
      ['exhibit', '先看一眼'],
      ['try', '试一试'],
      ['boundary', '再想一层'],
      ['source', '出处'],
    ],
    key,
    t,
    'onpanel',
  );
  let content;
  if (t === 'source') {
    const match = Catalog.articles.find(
      (a) =>
        ({ ai: 'ai-map', token: 'tokens', context: 'context', parameters: 'parameters' })[id] ===
        a.id,
    );
    const refs = (match?.sources || [])
      .map((k) => Catalog.sources.find((s) => s.id === k))
      .filter(Boolean);
    content = sourceView(b.sources, refs);
  } else if (t === 'boundary') {
    const paras = (b.reading ? D.readings[b.reading]?.paras : []) || [];
    const text =
      paras[2] ||
      {
        vector:
          '图上的坐标与相似度都是教学数据。真实向量模型需要训练和验证；二维投影也可能让高维关系看起来失真。',
        retrieval:
          '检索到的文字不是系统指令，也不自动构成结论的证据。真实服务需要在服务端执行身份与权限过滤。',
      }[id] ||
      b.think;
    content = `<div class="source-line">一个容易忽略的边界</div><h3 class="spec-title">${esc(b.think)}</h3><p class="micro-note">${esc(text)}</p><div class="tagline">改变输入条件，再检查原来的解释是否仍然成立。</div>${b.reading ? link('继续读原文说明', 'reading', `data-id="${b.reading}"`) : ''}`;
  } else if (t === 'try') content = conceptExperiment(id);
  else
    content = `<div class="art-frame">${paintSmall(b.visual)}</div><h3 class="spec-title">${esc(b.hint)}</h3><p class="micro-note">${esc(exhibitFirst(id))}</p><div class="row">${actBtn('动手试一试 ' + Arr, 'tab', `data-group="${key}" data-id="try"`, true)}</div>`;
  const foot = {
    learning: '最小分类器 · 在当前浏览器计算，不是神经网络训练。',
    token: '教学切分 · 编号只表示本页顺序，不是模型词表 ID。',
    parameters: '只算纯权重 · 不含缓存、激活、量化元数据与运行时。',
    context: 'Token 数由滑杆手工设置，不是对文字的真实计费统计。',
    attention: '固定手工 Q / K / V · 本地真实计算，非模型内部可视化。',
    compute: '24 个独立任务 · 固定教学节拍，不是硬件测速。',
    vector: '自建二维向量 · 余弦相似度实际计算，非真实 Embedding。',
    retrieval: '自建教学资料 · 角色切换不构成生产权限控制。',
    ai: '技术地图是简化示意，不是穷尽所有研究分支。',
    agent: '任务运行示意 · 不调用真实模型，也不操作外部账户。',
    mcp: 'MCP 负责连接；认证、授权与动作校验仍需单独设计。',
    harness: '本地教学系统 · 真实上线仍需身份、隔离、日志与治理。',
  }[id];
  return split(
    {
      ...b,
      label: '基础知识 / ' + b.name,
      links:
        link('全部知识展柜', 'basics') +
        (id === 'harness' || id === 'agent'
          ? link('进入设计工坊', 'go', 'data-route="act/5/0"')
          : ''),
    },
    specimen(content, { tabsHTML: panelTabs, foot }),
  );
}
function exhibitFirst(id) {
  return {
    ai: '聊天、视觉、预测、控制可以属于不同的系统。先从任务看技术，而不是从最热的名词看任务。',
    learning: '一条装配线只按尺寸判断合格。早期样本却让“颜色”看起来也很可靠。试着送进反例。',
    token: '把你的一句话放进去，看文本怎样成为离散片段。再想想：为什么这还不等于模型已经理解？',
    parameters: '改变参数数量和数值位数，观察存储变化。装得下、跑得动、用得好，是三个问题。',
    context: '任务、证据、历史与输出共用一张工作台。资源紧张时，哪些东西不应该先被挤走？',
    vector: '选择“天气”或“设备”，让查询靠近不同的资料。相似的方向，是一个查找线索。',
    retrieval: '换一个提问，看资料排序怎样改变；再改变可见范围，观察哪些材料不应当进入答案。',
    attention: '点选一个位置，计算它对其他位置的权重。遮住后面的词，再看看它能使用的范围。',
    compute:
      '让 24 项独立任务按不同的并行数量执行。软件如何组织计算，比“芯片会思考”更接近真实过程。',
    agent: '准备一场技术分享，经历收集、起草、审批与验收。每一步由谁决定，又由谁执行？',
    mcp: '工具可被连接，不表示它已经获得修改资料的许可。先看接口，再看这一次动作的授权。',
    harness: '任务合同、权限、检查点与验收把一次执行围起来。少一个条件，系统可能在不同的位置停下。',
  }[id];
}
function conceptExperiment(id) {
  if (id === 'ai') {
    const choices = [
      ['异常检测', '模型识别与规则阈值可以一起使用。', '预测、识别'],
      ['整理会议纪要', '语音转写与文本归纳可以协作，仍需人检查。', '感知、生成'],
      ['固定时间关灯', '明确的规则就能实现，不必引入生成式模型。', '规则自动化'],
    ];
    const i = U.aiCase || 0;
    return `${tabs(
      choices.map((c, j) => [String(j), c[0]]),
      'aiCase',
      String(i),
    )}<div class="art-frame">${paintSmall('map')}</div><div class="feedback">${choices[i][1]}</div><div class="tiny">这里给出方案思路，不是唯一实现方式。</div>`;
  }
  if (id === 'learning') {
    const samples = [
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
      { x: 7, y: 1 },
      { x: 8, y: 1 },
      { x: 9, y: 1 },
      ...(U.extra
        ? [
            { x: 5.8, y: 0 },
            { x: 6.2, y: 1 },
          ]
        : []),
    ];
    const tr = Core.learnThreshold(samples);
    const pieces = [
      { x: 3, color: 'teal' },
      { x: 8, color: 'copper' },
      { x: 5.7, color: 'teal' },
    ];
    return `${tabs(
      [
        ['color', '只看颜色'],
        ['threshold', '从尺寸学习'],
      ],
      'rule',
      U.rule,
    )}<div class="sample-tray">${samples.map((s, i) => `<div class="sample ${s.y ? '' : 'copper'}"><i></i>${s.x}mm · ${s.y ? '合格' : '不合格'}</div>`).join('')}</div><p class="micro-note">${U.rule === 'color' ? '当前方法：青色就判合格。' : `从样本得到的分界：<b>${tr.threshold.toFixed(1)} mm</b>。`}</p>${
      U.tested
        ? `<div class="test-results">${pieces
            .map((p) => {
              const pass = U.rule === 'color' ? p.color === 'teal' : p.x >= tr.threshold,
                ok = pass === p.x >= 6;
              return `<div class="test-result ${ok ? '' : 'wrong'}"><strong>${p.x}</strong><div>预测 ${pass ? '合格' : '不合格'}</div><div>${ok ? '符合标准' : '出现反例'}</div></div>`;
            })
            .join('')}</div>`
        : '<div class="tagline">把没有见过的零件送进来，会发生什么？</div>'
    }<div class="row">${actBtn('送入反例', 'test-rule', '', true)}${actBtn(U.extra ? '已补充边界样本' : '补充边界样本', 'extra-sample', U.extra ? 'disabled' : '')}</div><p class="fineprint">本例标准：尺寸 ≥ 6 mm 合格，颜色无关。补样后仍须用未参与训练的数据检验。</p>`;
  }
  if (id === 'token') {
    const tokens = Core.tokenize(U.text);
    return `<label class="field">放入一句话<input id="token-text" value="${esc(U.text)}" maxlength="70"></label><div class="tokens editable" id="token-display">${tokens.map((t, i) => `<span class="token" style="animation-delay:${Math.min(i, 12) * 25}ms">${t === ' ' ? '␣' : esc(t)}<small>${String(i + 1).padStart(2, '0')}</small></span>`).join('')}</div><div class="row spaced"><span class="micro-note" id="token-count">${tokens.length} 个教学片段 · 可以拼回原文</span>${actBtn('换一个例子', 'token-example')}</div><p class="fineprint">这里按英文连续片段、数字、空白和其余字符切分，不能代替任何模型的真实分词器。</p>`;
  }
  if (id === 'parameters')
    return `<div><span class="eyebrow">THEORETICAL WEIGHTS</span><div class="huge" id="weight-value">${Core.weightGiB(U.params, U.bits).toFixed(2)}<small>GiB</small></div></div><div class="memory-graph" id="weight-graph">${Array.from({ length: 20 }, (_, i) => `<i style="--h:${24 + i * 3.4}%" class="${i < Math.ceil((U.params / 70) * 20) ? 'on' : ''}"></i>`).join('')}</div><div class="field"><label for="param-range">总参数量<output id="param-value">${U.params} B</output></label><input type="range" id="param-range" min="1" max="70" step="1" value="${U.params}"></div>${tabs(
      [
        ['4', '4 bit'],
        ['8', '8 bit'],
        ['16', '16 bit'],
      ],
      'bits',
      String(U.bits),
    )}<p class="formula" id="weight-formula">${U.params} × 10⁹ × ${U.bits} ÷ 8 ÷ 2³⁰</p>`;
  if (id === 'context')
    return `<div id="context-result">${contextResult()}</div><div class="context-controls">${['目标与规则', '资料与证据', '历史与工具', '输出预留'].map((t, i) => `<div class="field"><label for="budget-${i}">${t}<output id="budget-out-${i}">${U.budget[i]}</output></label><input id="budget-${i}" data-budget="${i}" type="range" min="0" max="7000" step="100" value="${U.budget[i]}"></div>`).join('')}</div>`;
  if (id === 'attention') {
    const r = Core.attention(U.q, U.temp, U.mask);
    return `<div class="attention-tokens" role="group" aria-label="选择查询位置">${['让', 'AI', '帮', '我'].map((l, i) => `<button data-i18n-skip data-do="query" data-id="${i}" aria-pressed="${U.q === i}" class="${U.q === i ? 'active' : ''}">${l}</button>`).join('')}</div><div id="attention-result">${attentionResult(r)}</div><div class="field"><label for="attention-temp">分布温度<output id="attention-temp-out">${U.temp.toFixed(1)}</output></label><input type="range" id="attention-temp" min="0.2" max="3" step="0.1" value="${U.temp}"></div><label class="row micro-note"><input type="checkbox" id="mask" ${U.mask ? 'checked' : ''}>只允许看当前位置及之前</label>`;
  }
  if (id === 'compute')
    return `<div class="compute-stack"><span>程序</span><span>CUDA</span><span>GPU</span></div>${tabs(
      [
        ['1', '逐项'],
        ['4', '4 项并行'],
        ['8', '8 项并行'],
      ],
      'workers',
      String(U.workers),
    )}<div class="tasks-grid" id="tasks">${taskHTML()}</div><div class="row spaced"><span class="mono tiny" id="task-status">${U.jobs} / 24</span><div class="row">${actBtn('运行一批任务', 'jobs', '', true)}${actBtn('重置', 'jobs-reset')}</div></div>`;
  if (id === 'vector' || id === 'retrieval') {
    const data = vectorData();
    if (id === 'vector')
      return `${tabs(
        [
          ['天气', '天气'],
          ['设备', '设备'],
        ],
        'vector',
        U.vector,
      )}<div class="vector-points">${data.docs.map((d, i) => `<span class="vector-point" style="left:${15 + d.v[0] * 65}%;top:${80 - d.v[1] * 60}%">${d.name}</span>`).join('')}<span class="vector-point query" style="left:${15 + data.q[0] * 65}%;top:${80 - data.q[1] * 60}%">查询</span></div><div class="doc-results">${data.ranked
        .slice(0, 2)
        .map(
          (d) =>
            `<div class="doc-result relevant"><span>${d.name}</span><b>${d.sim.toFixed(3)}</b></div>`,
        )
        .join('')}</div><div class="formula">cos(q,d) = q·d / (‖q‖ × ‖d‖)</div>`;
    return `${tabs(
      [
        ['天气', '周末天气'],
        ['设备', '设备报错'],
      ],
      'vector',
      U.vector,
    )}<label class="field">允许检索的教学资料<select id="ret-role"><option value="public" ${U.retRole !== 'internal' ? 'selected' : ''}>公开资料</option><option value="internal" ${U.retRole === 'internal' ? 'selected' : ''}>已授权的内部资料</option></select></label><div class="doc-results">${data.ranked
      .filter((d) => d.access === 'public' || U.retRole === 'internal')
      .slice(0, 3)
      .map(
        (d) =>
          `<div class="doc-result ${d.sim > 0.8 ? 'relevant' : ''}"><span>${d.name}<small class="tiny" style="display:block">${d.access === 'public' ? '公开' : '内部'}</small></span><b>${d.sim.toFixed(3)}</b></div>`,
      )
      .join(
        '',
      )}</div><div class="feedback">${U.vector === '设备' && U.retRole !== 'internal' ? '关键诊断资料不在可见范围内。相似的公开材料，不能替代缺失的证据。' : '检索只交付候选资料；结论还要检查内容、日期与来源。'}</div>`;
  }
  if (id === 'mcp') return mcpExperiment();
  if (id === 'agent') return workflowDrawers();
  return `<div class="art-frame">${paintSmall('harness')}</div><div class="pair"><div class="metric"><label>模型负责</label><p>提出候选下一步</p></div><div class="metric"><label>运行系统负责</label><p>权限、执行、恢复与验收</p></div></div>${actBtn('亲手运行一次', 'go', 'data-route="act/5/3"', true)}`;
}
function contextResult() {
  const total = U.budget.reduce((a, b) => a + b, 0),
    limit = 8192,
    over = total > limit;
  return `<div class="row spaced"><span class="mono">${I18n.number(total)} / ${I18n.number(limit)}</span><span class="tiny">手工预算 · Token</span></div><div class="budget-bars">${U.budget.map((n, i) => `<span style="width:${(n / Math.max(limit, total)) * 100}%">${n > 900 ? n : ''}</span>`).join('')}</div><div class="${over ? 'rust' : 'teal'} tiny" style="margin-top:7px">${over ? '超出 ' + (total - limit) + '。缩减材料，或调整任务。' : '还有 ' + (limit - total) + ' 的余量；有空间不等于资料一定有效。'}</div>`;
}
function attentionResult(r) {
  return `<div class="attention-bars">${r.weights.map((v, i) => `<div class="attention-bar ${v === 0 ? 'masked' : ''}" style="--bar:${v * 100}%"><span>${v === 0 ? '遮住' : (v * 100).toFixed(1) + '%'}</span><i></i></div>`).join('')}</div><div class="formula" style="margin-top:12px">加权结果 = [${r.result.map((n) => n.toFixed(3)).join(', ')}]</div>`;
}
function vectorData() {
  const docs = [
      { name: '天气预报', v: [0.95, 0.1], access: 'public' },
      { name: '雨天安排', v: [0.75, 0.25], access: 'public' },
      { name: '设备说明', v: [0.12, 0.92], access: 'public' },
      { name: '内部诊断', v: [0.06, 0.98], access: 'internal' },
    ],
    q = U.vector === '天气' ? [1, 0.08] : [0.05, 1];
  return {
    q,
    docs,
    ranked: docs
      .map((d) => ({
        ...d,
        sim: (q[0] * d.v[0] + q[1] * d.v[1]) / (Math.hypot(...q) * Math.hypot(...d.v)),
      }))
      .sort((a, b) => b.sim - a.sim),
  };
}
function taskHTML() {
  return Array.from(
    { length: 24 },
    (_, i) =>
      `<div class="task-unit ${i < U.jobs ? 'done' : U.jobRunning && i < U.jobs + U.workers ? 'busy' : ''}">${String(i + 1).padStart(2, '0')}</div>`,
  ).join('');
}
function bindAfter(id) {
  fitExhibit();
}
function needArt(id) {
  if (id === 'time')
    return `<svg class="diagram" viewBox="0 0 400 220" role="img" aria-label="时间与选择"><circle cx="200" cy="104" r="75" class="node"/><circle cx="200" cy="104" r="55" fill="none" stroke="var(--teal)" stroke-dasharray="2 11"/><path d="M200 57V104L239 126" fill="none" stroke="var(--copper)" stroke-width="3"/><circle cx="200" cy="104" r="5" fill="var(--teal)"/><text x="200" y="207" text-anchor="middle" class="mono-label">TIME FOR WHAT MATTERS</text></svg>`;
  return paintSmall(id === 'reach' ? 'vector' : id === 'risk' ? 'harness' : 'attention');
}
function evidenceSlide() {
  const c = D.cases.find((c) => c.id === U.caseId) || D.cases[0];
  const t = tabValue('evidence', 'draft');
  return split(
    {
      label: '03 / 把回答放回现场',
      question: '一句很肯定的话，<br>需要多强的证据？',
      explain: c.request,
      think: c.question,
      links: link('切换工作 / 生活案例', 'case-next'),
    },
    specimen(
      `${tabs(
        D.cases.map((c) => [
          c.id,
          c.id === 'share' ? '技术分享' : c.id === 'logs' ? '设备日志' : '家庭安排',
        ]),
        'case',
        U.caseId,
      )}${t === 'draft' ? `<div class="quote-display">${esc(c.answer.replace(/[“”]/g, ''))}</div><div class="source-line">预写教学初稿 · 不是模型实测输出</div>` : t === 'evidence' ? `<div class="source-line">回到材料本身</div><div class="evidence-card">${esc(c.evidence)}</div><div class="tagline">材料没有支持的那一部分，还能说得这么确定吗？</div>` : `<div class="source-line">把结论收回证据允许的范围</div><div class="evidence-card">${esc(c.revised)}</div><p class="micro-note">不是让回答更好听，而是把观察、推断与行动建议分开。</p>`}`,
      {
        tabsHTML: tabs(
          [
            ['draft', '先看回答'],
            ['evidence', '打开依据'],
            ['revised', '重新表述'],
          ],
          'evidence',
          t,
          'onpanel',
        ),
        foot: '同一情境的三个视角；没有访问真实日志或个人安排。',
      },
    ),
  );
}
function choiceSlide() {
  const t = tabValue('choice', 'task');
  const views = {
    task: [
      '先拿自己的任务来比较',
      '同一输入、同一要求、同一验收；记录失败与人工修正，而不只是挑一张漂亮截图。',
      'benchmarks',
      '同题评测与失败案例',
    ],
    cost: [
      '一次成功任务，花了多少？',
      '输入、输出、缓存、重试与工具可能共同构成成本。订阅额度与 API 费用不是同一份账单。',
      'model-api',
      'API 费用比较',
    ],
    control: [
      '谁能够看见、运行和修改？',
      '闭源服务、开放权重和本地部署各有边界。权重能下载，不等于没有许可证与维护条件。',
      'models',
      '模型图鉴与开放程度',
    ],
  };
  const v = views[t];
  return split(
    {
      label: '比较，不是追榜',
      question: '模型是选择，<br>任务才是起点。',
      explain:
        '先定义什么算完成，再比较质量、代价和控制权。一个维度领先，不代表所有条件下都值得采用。',
      think: '你的工作里，哪一种失败最不能接受？',
      links: link(
        '适合本地的小模型',
        'archive',
        'data-route="local-models" data-title="本地小模型"',
      ),
    },
    specimen(
      `<div class="art-frame">${paintSmall(t === 'cost' ? 'memory' : t === 'control' ? 'harness' : 'learn')}</div><h3 class="spec-title">${v[0]}</h3><p class="micro-note">${v[1]}</p>${actBtn(v[3] + ' ↗', 'archive', `data-route="${v[2]}" data-title="${v[3]}"`, true)}`,
      {
        tabsHTML: tabs(
          [
            ['task', '任务'],
            ['cost', '代价'],
            ['control', '控制权'],
          ],
          'choice',
          t,
          'onpanel',
        ),
        foot: '资料表保留原核验日期；不把旧快照当成实时价格或排名。',
      },
    ),
  );
}
function flowText(i) {
  return [
    '先把目标和完成条件说清楚。否则“做完”只是一个模糊承诺。',
    '选择与任务相关的依据；资料不足时保留缺口。',
    '生成可检查的草稿。草稿还不是已获准对外发送的内容。',
    '由你决定是否允许这一次保存。授权不会自动扩大到未来动作。',
    '程序真正创建产物；工具回复“成功”还不够。',
    '检查产物是否存在、是否符合要求，再报告任务状态。',
  ][i];
}
function flowSlide() {
  return split(
    {
      label: '从计划到行动',
      question: '同一件事，<br>为什么还需要这么多环节？',
      explain:
        '准备技术分享，不只要一份好看的提纲。它还需要资料、可用工具，以及能证明结果存在的检查。',
      think: '哪些步骤可以写死，哪些才需要模型选择？',
      links: link('Agent 与工作流', 'concept', 'data-id="agent"'),
    },
    specimen(workflowDrawers(), {
      title: '沿着任务，往前走一步',
      foot: '流程示意；智能体可以在边界内选择下一步，但不能绕过授权。',
    }),
  );
}
function verifySlide() {
  return split(
    {
      label: '听见一句承诺，还是看见一个结果？',
      question: '谁来发现，<br>“成功”其实没有发生？',
      explain: '让工具故意报告成功，却不生成产物。只有独立检查实际状态，才能发现这次失败。',
      think: '如果所有环节都相信上一句“没问题”，错误会到哪里停下？',
      links: link('了解 Harness', 'concept', 'data-id="harness"'),
    },
    specimen(
      `<div class="art-frame">${paintSmall('harness')}</div><div class="pair"><div class="metric"><label>工具返回</label><strong class="teal">成功</strong><p>只是一条消息</p></div><div class="metric"><label>实际产物</label><strong class="rust">不存在</strong><p>独立验收发现差异</p></div></div>${actBtn('在工坊里试一次', 'fault-demo', '', true)}`,
      { title: '一句话与一件事实之间', foot: '确定性教学故障，不是任何厂商产品的失败记录。' },
    ),
  );
}
function workshopMeta(question, explain, think) {
  return {
    label: '第五幕 / 设计你的助手',
    question,
    explain,
    think,
    links: link('查看 Harness 原理', 'reading', 'data-id="harness"'),
  };
}
function changeSpec(k, v) {
  U.spec[k] = v;
  U.run = null;
  U.event = null;
}
function goalSlide() {
  return split(
    workshopMeta(
      '先说清一件事，<br>再让它行动。',
      '把“帮我做一下”变成目标与完成条件。允许先写一个不完美的版本，运行之后再修改。',
      '你会依据什么，认为这次工作已经完成？',
    ),
    specimen(goalEditor(), {
      title: '给它一份工作',
      stamp: '01 / BRIEF',
      foot: '没有需要通过的测验；引导只指出设计里的缺口。',
    }),
  );
}
function checkSpec(k, title, desc) {
  return `<label class="check-row"><input type="checkbox" data-spec="${k}" ${U.spec[k] ? 'checked' : ''}><span><strong>${title}</strong><small>${desc}</small></span></label>`;
}
function materialsSlide() {
  return split(
    workshopMeta(
      '它不能靠语气，<br>补齐缺少的事实。',
      '选择这次任务可以使用的教学资料。相关证据和无关文字不是同一种东西。',
      '没有足够依据时，它能不能说“还不知道”？',
    ),
    specimen(
      `<div class="form-board">${checkSpec('evidence', '资料 A / B：与任务相关', '只在本次教学环境内读取，保留来源标记。')}${checkSpec('irrelevant', '一份与任务无关的材料', '更多文字不等于更多证据，执行器不会把它当作依据。')}<div class="feedback ${U.spec.evidence ? '' : 'warn'}" id="materials-feedback">${U.spec.evidence ? '有相关资料。下一步要约定它可以做什么。' : '缺少相关资料；试运行会停下来，而不是编造。'}</div></div>`,
      {
        title: '证据，而不是填满窗口',
        stamp: '02 / CONTEXT',
        foot: '所有资料与任务均为本页自建教学数据。',
      },
    ),
  );
}
function permissionsSlide() {
  const t = tabValue('permissions', 'access');
  return split(
    workshopMeta(
      '能调用工具，<br>不等于能随意使用。',
      '允许读取资料和允许修改资料，是不同的权限。保存一份草稿，也不等于同意把它发给别人。',
      '你愿意省下哪一次确认，又想保留哪一道边界？',
    ),
    specimen(
      t === 'access'
        ? `<div class="form-board">${checkSpec('read', '允许读取教学资料', '无读取权限时，任务在开始阶段停止。')}${checkSpec('write', '允许保存教学草稿', '只保存到页面内存，不写入真实文件系统。')}${checkSpec('approval', '保存前必须由我确认', '审批只对应这一次任务与参数。')}</div>`
        : `<div class="form-board">${checkSpec('verify', '检查实际产物', '没有独立验收时，不把工具回复当作最终完成。')}${checkSpec('checkpoint', '允许保留检查点', '只在当前会话保存；恢复时核对任务是否改变。')}<div class="field"><label for="step-budget">最大执行步数<output id="step-budget-out">${U.spec.budget} 步</output></label><input id="step-budget" type="range" min="2" max="15" step="1" data-spec="budget" value="${U.spec.budget}"></div></div>`,
      {
        tabsHTML: tabs(
          [
            ['access', '工具与授权'],
            ['guard', '验收与恢复'],
          ],
          'permissions',
          t,
          'onpanel',
        ),
        foot: '浏览器内的安全示意不能替代生产系统的权限和沙箱。',
      },
    ),
  );
}
function currentEvent() {
  if (!U.run) return null;
  return U.run.events[
    U.event == null ? U.run.events.length - 1 : Math.min(U.event, U.run.events.length - 1)
  ];
}
function runSlide() {
  const r = U.run,
    e = currentEvent(),
    stage = r?.stage || 'READY',
    terminal = ['DONE', 'FAILED', 'BLOCKED', 'UNVERIFIED', 'STOPPED'].includes(stage);
  return split(
    workshopMeta(
      '让边界，<br>在一次运行中显现。',
      '逐步推进，观察任务在哪一步停下。你可以拒绝保存、制造一次假成功，或者尝试在中断后恢复。',
      '“安全停止”也可能是一种合理结果，而不是失败。',
    ),
    specimen(runtimePanel(), {
      title: '执行、反馈、再决定',
      stamp: '04 / RUNTIME',
      foot: '动作由本地规则提出，不调用大模型；产物只存在于当前页面内存。',
    }),
  );
}
function blueprintText() {
  const label = (s) => I18n.t(s);
  const row = (k, v) => `${label(k)}: ${v}`;
  return [
    '# ' + label('我的助手设计'),
    '',
    row('目标', U.spec.goal),
    '',
    row('验收', U.spec.criterion),
    '',
    '## ' + label('资料与权限'),
    ...[
      ['相关资料', U.spec.evidence],
      ['允许读取', U.spec.read],
      ['允许保存', U.spec.write],
      ['人工审批', U.spec.approval],
      ['独立验收', U.spec.verify],
      ['检查点', U.spec.checkpoint],
      ['步数预算', U.spec.budget],
    ].map(([k, v]) => row(k, typeof v === 'boolean' ? label(v ? '是' : '否') : v)),
    '',
    '## ' + label('运行状态'),
    U.run?.stage || label('尚未运行'),
    '',
    ...(U.run?.events || []).map((e) => `${e.seq}. ${e.type} — ${label(e.text)}`),
    '',
    label('这是教学设计，尚未接入真实模型。'),
    '',
  ].join('\n');
}

function exportSlide() {
  return split(
    workshopMeta(
      '把一个小设计，<br>带回真实的任务。',
      '这份方案已经说明目标、资料、权限和完成条件。真实实现还要补充身份认证、服务端执行、日志与安全测试。',
      '换一个使用者，原来的权限边界还合适吗？',
    ),
    specimen(
      `<div class="blueprint-sheet"><span class="eyebrow">YOUR FIRST BLUEPRINT</span><div><strong>目标</strong><span data-i18n-skip>${esc(U.spec.goal)}</span></div><div><strong>验收</strong><span data-i18n-skip>${esc(U.spec.criterion)}</span></div><div><strong>权限</strong>${U.spec.read ? '可读' : '不可读'} / ${U.spec.write ? '可存草稿' : '不可保存'} / ${U.spec.approval ? '需审批' : '跳过审批'}</div><div><strong>结果</strong>${U.run?.stage || '尚未运行'}${U.run?.artifact ? ' · 有内存产物' : ''}</div></div><div class="row">${actBtn('导出设计 · Markdown', 'export-spec', '', true)}${actBtn('运行记录 · JSON', 'export-run')}${U.run?.stage === 'DONE' && U.run.artifact ? actBtn('带走产物', 'export-artifact') : ''}</div>`,
      {
        title: '设计仍然可以继续修改',
        stamp: '05 / TAKE IT WITH YOU',
        foot: '不是能力认证，也不是已经上线的助手。',
      },
    ),
  );
}
function boundsSlide() {
  const t = tabValue('bounds', 'autonomy');
  return split(
    {
      label: '第六幕 / 从能力回到选择',
      question: '两种合理的愿望，<br>也可能互相冲突。',
      explain:
        '一个家庭共用行程助手。有人希望提高效率，有人不愿共享私人日程，还有人认为自己的需要从未被听见。',
      think: '当决定开始影响别人，谁有权说“不”？',
      links: link('约束不只是一道开关', 'reading', 'data-id="governance"'),
    },
    specimen(
      t === 'autonomy'
        ? `<div class="choice-space">${[
            ['suggest', '只给建议', '每个人保留决定，也需要更多沟通。'],
            ['draft', '提出共享草案', '把冲突摆在一起，但要决定谁来审批。'],
            ['act', '直接修改安排', '更少来回确认，也可能越过未表达的需要。'],
          ]
            .map(
              ([k, l, d]) =>
                `<button class="choice-tile ${U.autonomy === k ? 'active' : ''}" data-do="autonomy" data-id="${k}"><span>${l}<small class="detail">${d}</small></span><span>${U.autonomy === k ? '●' : '○'}</span></button>`,
            )
            .join('')}</div>`
        : `<div class="form-board"><label class="check-row"><input type="checkbox" id="scope" ${U.scope ? 'checked' : ''}><span><strong>允许自己选择共享范围</strong><small>不共享的人仍应被考虑，而不是从系统中消失。</small></span></label><label class="check-row"><input type="checkbox" id="appeal" ${U.appeal ? 'checked' : ''}><span><strong>保留申诉与退出的机会</strong><small>有技术记录，不代表决定就没有争议。</small></span></label><div class="feedback ${!U.scope || !U.appeal ? 'warn' : ''}">${!U.scope ? '被迫共享的人，是否有平等参与的机会？' : !U.appeal ? '不同意结果的人，还能改变或者退出吗？' : '有了协商空间，也未必能让所有愿望同时实现。'}</div></div>`,
      {
        tabsHTML: tabs(
          [
            ['autonomy', '交出多少决定'],
            ['participation', '谁能参与'],
          ],
          'bounds',
          t,
          'onpanel',
        ),
        foot: '预写情境，用于讨论取舍；不会修改任何真实日历。',
      },
    ),
  );
}
function abundanceSlide() {
  const key = 'abundance',
    t = tabValue(key, 'time');
  const options = {
    time: [
      '时间终于属于自己了吗？',
      '当基本需要更容易满足，注意力与完整的时间会不会仍然稀缺？',
      '少一些重复之后，你最想认真投入哪件事？',
    ],
    fairness: [
      '总量充裕，是否等于人人都能获得？',
      '拥有能力的机构与个人，可能仍有很不相同的机会。丰裕不能自动回答分配的问题。',
      '谁没有出现在这幅“丰裕”的图景里？',
    ],
    meaning: [
      '当物质不再让我们发愁，精神世界能支撑生活吗？',
      '如果不再需要为生计奔忙，我们是否仍能感到被需要、找到值得投入的事，并与他人建立真实的连接？物质的充裕，是否也能带来内心的充实？',
      '当“怎样活下去”不再是难题，“为什么而活”会更容易回答吗？',
    ],
  };
  const c = options[t];
  return split(
    {
      label: '一个思想实验，不是未来预报',
      question: '如果已经足够丰富，<br>我们还在追求什么？',
      explain:
        '暂时设想基本物质需要更容易满足。把“怎样更快”放到一边，看那些不能被简单增加产量解决的需要。',
      think: '你愿意把什么，当作比效率更重要的目标？',
      links: link('继续这个思想实验', 'reading', 'data-id="abundance"'),
    },
    specimen(
      `${t === 'meaning' ? meaningReflection() : `<div class="art-frame">${needArt(t === 'time' ? 'time' : 'reach')}</div>`}<h3 class="spec-title">${c[0]}</h3><p class="micro-note">${c[1]}</p><div class="tagline">${c[2]}</div>`,
      {
        tabsHTML: tabs(
          [
            ['time', '时间'],
            ['fairness', '分配'],
            ['meaning', '意义'],
          ],
          key,
          t,
          'onpanel',
        ),
        foot: '这是一个开放问题；AI 不被假定必然带来物质丰裕。',
      },
    ),
  );
}
function coexistSlide() {
  const t = tabValue('coexist', 'open');
  const texts = {
    open: [
      '开放或封闭，谁保留什么？',
      '本地运行可以增加控制，也带来维护与验证负担。服务方便，也可能让关键能力依赖少数提供者。',
      'open',
    ],
    agi: [
      '更广泛的能力，不是所有问题的答案。',
      '任务广度、表现水平、自治程度、意识与权利，不能被一个“AGI”标签合并回答。',
      'agi',
    ],
    tension: [
      '共同生活，不要求意见相同。',
      '收益与风险不会总是落在同一群人身上。制度、技术与日常协商，都在影响能力的去向。',
      'governance',
    ],
  };
  const c = texts[t];
  return split(
    {
      label: '还没有写完的未来',
      question: '让分歧留下来，<br>也让改变仍然可能。',
      explain:
        '我们不只是在设计更有能力的机器，也在形成与能力共同生活的方式。不同的人，可能看见不同的未来。',
      think: '未来由谁讲述，又由谁承担讲述之外的代价？',
      links: link('回到“交织”的现场', 'home-conflict'),
    },
    specimen(
      `<div class="art-frame">${paintSmall(t === 'open' ? 'mcp' : t === 'agi' ? 'map' : 'harness')}</div><h3 class="spec-title">${c[0]}</h3><p class="micro-note">${c[1]}</p>${actBtn('进一步了解', 'reading', `data-id="${c[2]}"`)}`,
      {
        tabsHTML: tabs(
          [
            ['open', '控制与依赖'],
            ['agi', '能力与 AGI'],
            ['tension', '分歧与共生'],
          ],
          'coexist',
          t,
          'onpanel',
        ),
        foot: '不预测一个必然结局，也不要求你选择同一个答案。',
      },
    ),
  );
}
function notesManager() {
  const prompts = {
    why: '我想把什么交给机器？',
    keep: '我想保留给人的事。',
    question: '一个还想继续追问的问题。',
  };
  return split(
    {
      label: '一页私人的留白',
      question: '答案可以晚一点。<br>问题，先带走。',
      explain: '从为什么需要机器的能力，走到怎样共同生活。此刻的想法，不必成为你永远的结论。',
      think: '下一次回来，你会怎样修改今天的问题？',
      links: link('回到序厅', 'go', 'data-route="entrance"'),
    },
    specimen(
      `<div class="notes-prompt">${prompts[U.noteTab]}</div><textarea class="notes-paper" data-note="${U.noteTab}" maxlength="${U.noteTab === 'question' ? 6000 : 3000}" aria-label="${prompts[U.noteTab]}" placeholder="不必现在就想明白。">${esc(Notes[U.noteTab])}</textarea><div class="row">${actBtn('带走手记', 'export-notes', '', true)}${actBtn('备份', 'backup-notes')}${actBtn('导入', 'import-notes')}<input type="file" id="notes-file" accept="application/json,.json" hidden></div>`,
      {
        tabsHTML: tabs(
          [
            ['why', '交给机器'],
            ['keep', '留给自己'],
            ['question', '继续追问'],
          ],
          'noteTab',
          U.noteTab,
          'onpanel',
        ),
        foot: '只在浏览器本地保存，不上传。不评分，也不评判。',
      },
    ),
  );
}
function renderNotes() {
  partKey = 'notes';
  deck('把一个问题带走。', '手记 / PRIVATE REFLECTION', reflectionSlide(), 0, 1, {
    nextLabel: '回到展览',
  });
  fitExhibit();
}
function noteMarkdown() {
  const t = I18n.t;
  return [
    '# ' + t('能力与选择') + ' · ' + t('我的手记'),
    '',
    '## ' + t('我想把什么交给机器？'),
    Notes.why || t('（留白）'),
    '',
    '## ' + t('我想保留给人的事。'),
    Notes.keep || t('（留白）'),
    '',
    '## ' + t('一个还想继续追问的问题。'),
    Notes.question || t('（留白）'),
    '',
    t('知序 AI 科技馆') + ' · v0.15.0',
    t('不必现在就想明白。'),
    '',
  ].join('\n');
}

function gallerySize() {
  return 4;
}
function updateSim(s) {
  if ($('#sim-event')) $('#sim-event').textContent = s.message;
  if ($('#sim-meters'))
    $('#sim-meters').textContent = `本地示意 / 已处理 ${s.served}   ·   等候 ${s.waiting}`;
}
function storyPopup(i) {
  const arr =
    U.phase === 0
      ? [
          ['一个问题，先于技术', '如果不用重复整理资料，省下来的时间会真正回到你手里吗？'],
          [
            '尝试，并不沿着直线',
            '方法可能失败，也可能在新条件下重新获得意义。历史不是自动向前的进度条。',
          ],
          [
            '记录，让探索不从零开始',
            '哪些经验值得留下？没有被记录的声音，也可能没有进入后来者的判断。',
          ],
        ]
      : U.phase === 1
        ? [
            ['资料的来处', '数据怎样采集、谁被代表，都会影响模型看见的世界。'],
            ['方法的变化', '更好的信息组织方式，可能改变相同计算资源能完成的事。'],
            ['能力的代价', '计算需要时间、设备与能源。这些代价和收益，由谁承担？'],
          ]
        : [
            ['效率，与谁的时间', '更多任务被更快处理，不保证每个人都少了负担。谁被不断挤到队尾？'],
            ['照顾，也会发生冲突', '有人希望系统照顾少数人的需要，也有人认为自己承担了更多等待。'],
            [
              '自主，不是拒绝一切联系',
              '一个人能否拒绝共享或退出？没有同意的连接，不应被画成顺畅的合作。',
            ],
          ];
  const [title, text] = arr[i];
  scene?.setMotion(false);
  $('#story-pop-slot').innerHTML =
    `<section class="story-pop"><button class="icon close" data-do="story-close" aria-label="收起故事">×</button><h3>${title}</h3><p>${text}</p>${link('继续这个问题', 'go', `data-route="act/${U.phase === 2 ? 6 : 1}/0"`)}</section>`;
}
function nextPage(direction) {
  if (U.route === 'news') {
    newsAction(direction > 0 ? 'news-next' : 'news-prev');
    return;
  }
  if (U.route === 'library' && !overlay) {
    if (direction > 0) {
      if ((U.libraryStep || 0) < 2) go('library/' + U.libGroup + '/' + ((U.libraryStep || 0) + 1));
      else go('library/' + ((U.libGroup + 1) % 5) + '/0');
    } else if ((U.libraryStep || 0) > 0) go('library/' + U.libGroup + '/' + (U.libraryStep - 1));
    else if (U.libGroup > 0) go('library/' + (U.libGroup - 1) + '/2');
    return;
  }
  if (overlay) return moveOverlay(direction);
  if (U.route.startsWith('act/')) {
    const n = +U.route.split('/')[1],
      size = Acts[n - 1].length,
      next = U.page + direction;
    if (next < 0) go(n === 1 ? 'entrance' : `act/${n - 1}/${Acts[n - 2].length - 1}`);
    else if (next >= size) go(n === 6 ? 'entrance' : `act/${n + 1}/0`);
    else go(`act/${n}/${next}`);
  } else if (U.route === 'concept') {
    const next = U.page + direction;
    if (next < 0 || next >= Basics.length) go('basics');
    else go('concept/' + Basics[next].id);
  } else if (U.route === 'basics') {
    const size = gallerySize(),
      total = Math.max(
        1,
        Math.ceil(
          Basics.filter((b) =>
            [b.name, b.title, b.explain, b.id]
              .map((s) => I18n.search(s))
              .join(' ')
              .includes(U.query.toLowerCase().trim()),
          ).length / size,
        ),
      );
    if (U.page + direction >= total) {
      U.query = '';
      go('library');
    } else go('basics/' + Math.max(0, U.page + direction));
  } else if (U.route === 'library') {
    const entries = U.query
        ? ArchiveIndex.filter((r) =>
            [r.title, r.type, r.tags || '']
              .map((s) => I18n.search(s))
              .join(' ')
              .includes(U.query.toLowerCase().trim()),
          )
        : LibraryGroups[U.libGroup][1],
      total = Math.max(1, Math.ceil(entries.length / (mobile() || compact() ? 4 : 6)));
    U.listPage += direction;
    if (U.listPage >= total) {
      U.listPage = 0;
      go('library/' + ((U.libGroup + 1) % 5));
    } else if (U.listPage < 0) {
      U.listPage = 0;
      if (U.libGroup > 0) go('library/' + (U.libGroup - 1));
      else go('basics');
    } else renderLibrary();
  } else if (U.route === 'notes') go('act/6/4');
  else go('act/1/0');
}
function goPage(i) {
  if (overlay) {
    overlay.page = i;
    renderReader();
    return;
  }
  if (U.route.startsWith('act/')) go(U.route + '/' + i);
  else if (U.route === 'concept') go('concept/' + Basics[i].id);
  else if (U.route === 'basics') go('basics/' + i);
  else if (U.route === 'library') {
    U.listPage = i;
    renderLibrary();
  }
}
function showGuide() {
  const d = $('#guide');
  d.innerHTML = `<div class="dialog-head"><div><span class="eyebrow">每一站，都可以是起点</span><h2 id="guide-title">选择你的起点</h2></div><button class="icon" data-do="close-guide" aria-label="关闭导览">×</button></div><div class="guide-grid">${D.acts.map((a) => `<button class="guide-item" data-do="go" data-route="act/${a.id}/0"><span class="num">0${a.id}</span><span><strong>${esc(a.label)}</strong><small>${['需要、来路、学习与算力', 'Token、参数、上下文与注意力', '工作、生活、证据与选择', '工具、连接、行动与反馈', '目标、资料、边界与试运行', '约束、丰裕、分歧与留白'][a.id - 1]}</small></span></button>`).join('')}</div><div class="guide-foot">${link('基础知识展柜', 'basics')}${link('完整资料室', 'library')}${link('我的手记', 'notes')}${link('回到序厅', 'go', 'data-route="entrance"')}</div>`;
  d.showModal();
}
// Native reader. A section is divided into readable pages rather than inserted below.
function splitText(s, max = 220) {
  const text = String(s || '');
  if (text.length <= max) return [text];
  const sentences = text.match(/[^。！？\n]+[。！？\n]?/g) || [text];
  const parts = [];
  let part = '';
  for (let line of sentences) {
    while (line.length > max) {
      if (part) {
        parts.push(part);
        part = '';
      }
      parts.push(line.slice(0, max));
      line = line.slice(max);
    }
    if ((part + line).length > max) {
      parts.push(part);
      part = '';
    }
    part += line;
  }
  if (part) parts.push(part);
  return parts;
}
function readerParts(title, sections, sources = [], visual = null) {
  let parts = [];
  const layout = mobile() ? 'phone' : compact() ? 'compact' : 'desktop',
    max = mobile() ? 190 : compact() ? 155 : 290;
  for (const sec of sections) {
    if (!sec.text) continue;
    for (const text of splitText(sec.text, max)) parts.push({ label: sec.label, text });
  }
  const batch = compact() ? 1 : 2;
  for (let i = 0; i < sources.length; i += batch)
    parts.push({ label: '出处', sources: sources.slice(i, i + batch) });
  return {
    title,
    parts,
    page: 0,
    type: 'reader',
    rawSections: sections,
    rawSources: sources,
    layout,
    visual,
  };
}
function openReading(id) {
  const r = D.readings[id];
  if (!r) return;
  openReader(
    readerParts(
      r.title,
      r.paras.map((t, i) => ({ label: ['先理解', '看机制', '看边界'][i] || '继续思考', text: t })),
      sourceURLs(r.source),
      readerVisualKey(id),
    ),
  );
}
function articleSources(ids) {
  return (ids || [])
    .map((k) => Catalog.sources.find((s) => s.id === k))
    .filter(Boolean)
    .map((s) => ({ title: s.name || s.title, url: s.url, date: s.checked }));
}
function openArticle(id) {
  const a = Catalog.articles.find((a) => a.id === id);
  if (!a) return false;
  const sections = [
    ['先理解', 'intro'],
    ['看机制', 'mechanism'],
    ['动手试', 'practice'],
    ['如何检查', 'check'],
    ['易错点', 'pitfall'],
  ].map(([label, k]) => ({ label, text: a[k] }));
  openReader({
    ...readerParts(a.title, sections, articleSources(a.sources), readerVisualKey(id, true)),
    originalLanguage: true,
  });
  return true;
}
function openReader(item) {
  if (!overlay) frameFocus = document.activeElement;
  overlay = item;
  scene?.setMotion(false);
  renderReader();
}
function layerHTML(title, sub, content) {
  return `<section id="frame-layer"><header class="layer-head"><div><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div><div class="row"><button class="back" data-do="close-layer">← 回到展品</button><button class="icon" data-do="close-layer" aria-label="关闭资料层">×</button></div></header><div class="layer-content">${content}</div></section>`;
}
function ensureLayer(html) {
  $('#frame-layer')?.remove();
  $('#main').insertAdjacentHTML('beforeend', html);
  $('#frame-layer').setAttribute('tabindex', '-1');
  $('#frame-layer').focus({ preventScroll: true });
}
function moveOverlay(d) {
  if (overlay?.type === 'reader') {
    if (overlay.page + d >= overlay.parts.length) {
      closeLayer();
      return;
    }
    overlay.page = Math.max(0, overlay.page + d);
    renderReader();
  } else if (overlay?.type === 'articles') {
    overlay.page = Math.max(0, overlay.page + d);
    renderArticleIndex();
  }
}
function closeLayer() {
  $('#slide')?.removeAttribute('inert');
  overlay = null;
  $('#frame-layer')?.remove();
  scene?.setMotion(U.motion);
  if (frameFocus?.isConnected) frameFocus.focus({ preventScroll: true });
  frameFocus = null;
}
function renderArticleIndex() {
  const max = mobile() || compact() ? 4 : 6,
    list = Catalog.articles.filter((a) =>
      (I18n.search(a.title) + ' ' + I18n.search(a.intro)).includes(
        (overlay.query || '').toLowerCase(),
      ),
    ),
    total = Math.max(1, Math.ceil(list.length / max));
  overlay.page = Math.min(overlay.page, total - 1);
  const items = list.slice(overlay.page * max, (overlay.page + 1) * max);
  ensureLayer(
    layerHTML(
      '完整知识文章',
      '全部 ' + Catalog.articles.length + ' 篇原有文章 · 新的逐段阅读界面',
      `<div class="native-reader"><label class="searchbox"><span>⌕</span><input id="article-search" type="search" value="${esc(overlay.query || '')}" placeholder="搜索馆藏文章…" aria-label="搜索馆藏文章"></label><div class="result-list">${items.map((a) => `<button class="search-result" data-do="article" data-id="${a.id}"><span>${esc(a.title)}</span><small>${esc(a.level || '馆藏')} ↗</small></button>`).join('') || '<p>没有找到这个词。</p>'}</div><div class="pager"><button class="action" data-do="article-prev" ${overlay.page === 0 ? 'disabled' : ''}>← 上一组</button><span class="tiny">${overlay.page + 1} / ${total}</span><button class="action" data-do="article-next" ${overlay.page === total - 1 ? 'disabled' : ''}>下一组 →</button></div></div>`,
    ),
  );
}
// The single-file bundle embeds the archive as base64; the multi-file site ships it as archive.html and fetches it once.
let archivePromise = null;
function archiveExternal() {
  const node = $('#archive-data');
  return (
    document.documentElement.dataset.archive === 'external' || !node || !node.textContent.trim()
  );
}
function loadArchive() {
  if (decodedArchive) return Promise.resolve(decodedArchive);
  if (!archivePromise) {
    const source = archiveExternal()
      ? location.protocol === 'file:'
        ? Promise.reject(new Error('offline'))
        : fetch('archive.html', { cache: 'force-cache' }).then((r) => {
            if (!r.ok) throw new Error(String(r.status));
            return r.text();
          })
      : Promise.resolve().then(() =>
          new TextDecoder().decode(
            Uint8Array.from(atob($('#archive-data').textContent.trim()), (c) => c.charCodeAt(0)),
          ),
        );
    archivePromise = source.then(
      (text) => {
        decodedArchive = text;
        return text;
      },
      (error) => {
        archivePromise = null;
        throw error;
      },
    );
  }
  return archivePromise;
}
function archiveNotice(text) {
  const dark = U.theme === 'dark';
  return `<body style="margin:0;padding:28px 24px;font:15px/1.7 'Microsoft YaHei',sans-serif;color:${dark ? '#a3b3ce' : '#526581'};background:${dark ? '#101c30' : '#ffffff'}">${esc(I18n.t(text))}</body>`;
}
function openArchive(route, title) {
  if (route === 'news') {
    closeLayer();
    go('news');
    return;
  }
  if (route === 'knowledge' || route === 'museum' || route === 'library') {
    closeLayer();
    U.query = '';
    go('basics');
    return;
  }
  if (route === 'reflection') {
    closeLayer();
    go('act/6/4');
    return;
  }
  if (route === 'articles') {
    frameFocus = document.activeElement;
    overlay = { type: 'articles', page: 0, query: '' };
    renderArticleIndex();
    return;
  }
  if (route.startsWith('article/') && openArticle(route.split('/')[1])) return;
  if (route.startsWith('harness-lesson/') && openArticle(route.split('/')[1])) return;
  if (!/^[a-z0-9-]+(?:\/[a-zA-Z0-9_-]+)?(?:\?[^<>]*)?$/.test(route)) {
    notify('无法识别这项馆藏地址。');
    return;
  }
  frameFocus = document.activeElement;
  overlay = { type: 'tool', route, title };
  scene?.setMotion(false);
  ensureLayer(
    layerHTML(
      title || '馆藏工具',
      '中文馆藏工具 · 保留原核验日期 · 长表格可在区域内滚动',
      `<iframe lang="zh-CN" id="archive-frame" title="馆藏工具：${esc(title || route)}" sandbox="allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox allow-modals" referrerpolicy="no-referrer"></iframe>`,
    ),
  );
  const css = `<style>html,body{margin:0;background:var(--bg)!important}.sidebar,.topbar,.footer,.m-resource-band,.m-header-actions,.skip-link{display:none!important}.app-shell{margin:0!important}#main{padding:18px!important;min-height:0!important;max-width:1500px!important;margin:0!important}.m-main{padding:18px!important}.m-article-layout{display:block!important}.catalog-table td{font-size:12px!important;line-height:1.8!important}.page-heading h1{font-size:26px!important}.article-layout,.h-lesson-layout{display:block!important}.article-aside,.h-lesson-aside{display:none!important}.article-main{padding:20px!important}@media(max-width:760px){#main,.m-main{padding:12px!important}.catalog-table td{font-size:11px!important}}</style>`;
  const bridge = `<script>(function(){function move(){const hash=location.hash.slice(1);if(hash==='knowledge'||hash.startsWith('article/')||hash.startsWith('harness-lesson/'))parent.postMessage({kind:'museum-v08-native',route:hash},'*');}addEventListener('hashchange',move);addEventListener('load',move);addEventListener('message',e=>{if(e.source!==parent)return;if(e.data?.kind==='museum-theme')document.documentElement.dataset.theme=e.data.theme;});document.documentElement.dataset.theme=${JSON.stringify(U.theme)};})();<\/script>`;
  const frame = $('#archive-frame'),
    apply = (html) => {
      if ($('#archive-frame') === frame)
        frame.srcdoc = html
          .replace(
            '</head>',
            css + `<script>location.hash=${JSON.stringify(route)};<\/script></head>`,
          )
          .replace('</body>', bridge + '</body>');
    };
  if (decodedArchive) apply(decodedArchive);
  else {
    frame.srcdoc = archiveNotice('正在读取馆藏工具…');
    loadArchive().then(apply, () => {
      if ($('#archive-frame') === frame)
        frame.srcdoc = archiveNotice(
          location.protocol === 'file:'
            ? '这份多文件部署版把馆藏工具放在 archive.html 中，直接打开文件时无法读取。请访问网站，或使用根目录的单文件 index.html / start-local.cmd。'
            : '馆藏工具暂时无法读取，请稍后重试。',
        );
    });
  }
}
function applyTab(group, id) {
  if (group === 'storyPolicy') {
    Revision.policy = id;
    scene?.setPolicy(id);
    $$('[data-group=storyPolicy]').forEach((b) => {
      b.classList.toggle('active', b.dataset.id === id);
      b.setAttribute('aria-selected', String(b.dataset.id === id));
      b.tabIndex = b.dataset.id === id ? 0 : -1;
    });
    return;
  }
  if (group === 'conflictRule') {
    U.conflictRule = id;
    scene?.setRule(id);
    $$('[data-group=conflictRule]').forEach((b) => {
      const active = b.dataset.id === id;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
      b.tabIndex = active ? 0 : -1;
    });
    $('[data-do=grant]').hidden = id !== 'consent';
    return;
  }
  const direct = {
    rule: 'rule',
    need: 'need',
    vector: 'vector',
    case: 'caseId',
    noteTab: 'noteTab',
    timeChoice: 'timeChoice',
  };
  if (direct[group]) {
    U[direct[group]] = id;
    if (group === 'need') {
      Notes.need = id;
      setStore('notes', Notes);
    }
  } else if (group === 'bits') U.bits = +id;
  else if (group === 'workers') {
    clearInterval(jobTimer);
    U.workers = +id;
    U.jobs = 0;
    U.jobRunning = false;
  } else if (group === 'aiCase') U.aiCase = +id;
  else if (group === 'mcp-mode') U.mcp = id === 'mcp';
  else if (group === 'libGroup') {
    U.query = '';
    U.listPage = 0;
    go('library/' + id);
    return;
  } else U.panel[group] = id;
  if (U.route === 'notes') {
    renderNotes();
  } else if (
    ['mcp-mode', 'connectionStage', 'connectionView'].includes(group) &&
    $('.connection-experiment')
  ) {
    $('.connection-experiment').outerHTML = mcpExperiment();
    scheduleAdaptive();
  } else renderCurrentSlide();
  const target = $(`[data-group="${group}"][data-id="${id}"]`);
  target?.focus({ preventScroll: true });
}
function runJobs() {
  if (U.jobRunning) return;
  U.jobs = 0;
  U.jobRunning = true;
  const update = () => {
    if (!$('#tasks')) {
      clearInterval(jobTimer);
      U.jobRunning = false;
      return;
    }
    $('#tasks').innerHTML = taskHTML();
    $('#task-status').textContent = U.jobs + ' / 24';
  };
  update();
  clearInterval(jobTimer);
  jobTimer = setInterval(() => {
    U.jobs = Math.min(24, U.jobs + U.workers);
    if (U.jobs === 24) {
      U.jobRunning = false;
      clearInterval(jobTimer);
    }
    update();
  }, 350);
}
function renderResultOnly() {
  U.event = null;
  renderCurrentSlide();
}
function choosePreset(id) {
  const defs = {
    share: ['给新同事准备一份 10 分钟的技术分享提纲', '保留资料来源；没有依据的说法标为待确认'],
    logs: ['阅读教学设备日志，整理一次排查报告', '区分观察与推断；不自动修改设备设置'],
    family: ['起草一次家庭出行安排', '保留休息与确认环节；开放预约状态待核对'],
    study: ['围绕一道题提供渐进的学习提示', '先检查题面；不在缺少条件时编造答案'],
  };
  if (!defs[id]) return;
  U.spec.kind = id;
  U.spec.goal = I18n.t(defs[id][0]);
  U.spec.criterion = I18n.t(defs[id][1]);
  U.run = null;
  renderCurrentSlide();
}
function handleDo(b) {
  const a = b.dataset.do,
    id = b.dataset.id;
  if (a.startsWith('narrative-')) {
    narrativeAction(a, id);
    return;
  }
  if (a.startsWith('news-')) {
    newsAction(a, id);
    return;
  }
  switch (a) {
    case 'collision':
      showCollision(+id);
      break;
    case 'collision-close':
      closeCollision();
      break;
    case 'lesson-next':
      U.panel.learning10 = id;
      renderCurrentSlide();
      break;
    case 'compute-next':
      U.panel.compute10 = id;
      renderCurrentSlide();
      break;
    case 'learn-threshold':
      Revision.threshold = +id;
      renderCurrentSlide();
      break;
    case 'learn-fit':
      Revision.threshold = Core.learnThreshold(learningSamples()).threshold;
      renderCurrentSlide();
      break;
    case 'learn10-update':
      U.extra = !U.extra;
      Revision.threshold = Core.learnThreshold(learningSamples()).threshold;
      renderCurrentSlide();
      break;
    case 'research-path':
      U.query = '';
      U.listPage = 0;
      Revision.libraryBranch = 0;
      go('library/' + id + '/0');
      break;
    case 'research-station-view':
      U.panel.stationView = id;
      libraryTen();
      $(`[data-do="research-station-view"][data-id="${id}"]`)?.focus({ preventScroll: true });
      break;
    case 'research-step':
      go('library/' + U.libGroup + '/' + id);
      break;
    case 'research-next':
      nextPage(1);
      break;
    case 'research-open':
      researchOpen(b.dataset.route);
      break;
    case 'research-branch':
      Revision.libraryBranch = 1 - Revision.libraryBranch;
      renderLibrary();
      break;
    case 'research-results-prev':
      U.listPage = Math.max(0, U.listPage - 1);
      renderLibrary();
      break;
    case 'research-results-next':
      U.listPage++;
      renderLibrary();
      break;
    case 'research-return':
      go(Revision.libraryReturn || 'library');
      break;
    case 'go':
      $('#guide').close();
      U.query = '';
      go(b.dataset.route);
      break;
    case 'guide':
      showGuide();
      break;
    case 'close-guide':
      $('#guide').close();
      break;
    case 'basics':
      $('#guide').close();
      U.query = '';
      go('basics');
      break;
    case 'library':
      $('#guide').close();
      U.query = '';
      U.listPage = 0;
      Revision.libraryBranch = 0;
      go('library');
      break;
    case 'notes':
      $('#guide').close();
      go('notes');
      break;
    case 'concept':
      U.panel['concept-' + id] = 'exhibit';
      go('concept/' + id);
      break;
    case 'home-conflict':
      U.phase = 2;
      go('entrance');
      break;
    case 'motion':
      U.motion = !U.motion;
      document.documentElement.dataset.motion = U.motion ? 'on' : 'off';
      scene?.setMotion(U.motion && Revision.collision == null);
      setTop();
      if ($('[data-do=sim-step]')) $('[data-do=sim-step]').hidden = U.motion;
      break;
    case 'theme':
      U.theme = U.theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = U.theme;
      setStore('theme', U.theme);
      setTop();
      scene?.draw();
      $('#archive-frame')?.contentWindow.postMessage({ kind: 'museum-theme', theme: U.theme }, '*');
      break;
    case 'phase':
      Revision.collision = null;
      U.phase = +id;
      cleanScene();
      renderEntrance();
      break;
    case 'burst':
      scene?.burst();
      break;
    case 'grant':
      scene?.grant();
      break;
    case 'sim-step':
      scene?.step();
      break;
    case 'story':
      storyPopup(+id);
      break;
    case 'story-close':
      $('#story-pop-slot').innerHTML = '';
      scene?.setMotion(U.motion);
      break;
    case 'next':
      nextPage(1);
      break;
    case 'prev':
      nextPage(-1);
      break;
    case 'page':
      goPage(+id);
      break;
    case 'mobile-layer':
      U.mobile = id;
      $('.slide-split')?.setAttribute('data-mobile', id);
      $$('[data-do=mobile-layer]').forEach((b) =>
        b.classList.toggle('active', b.dataset.id === id),
      );
      break;
    case 'tab':
      applyTab(b.dataset.group, id);
      break;
    case 'reading':
      openReading(id);
      break;
    case 'archive':
      openArchive(b.dataset.route, b.dataset.title);
      break;
    case 'article':
      openArticle(id);
      break;
    case 'close-layer':
      closeLayer();
      break;
    case 'reader-prev':
      moveOverlay(-1);
      break;
    case 'reader-next':
      moveOverlay(1);
      break;
    case 'reader-label':
      overlay.page = overlay.parts.findIndex((p) => p.label === b.dataset.label);
      renderReader();
      break;
    case 'article-prev':
      moveOverlay(-1);
      break;
    case 'article-next':
      moveOverlay(1);
      break;
    case 'test-rule':
      U.tested = true;
      renderCurrentSlide();
      break;
    case 'extra-sample':
      U.extra = true;
      U.rule = 'threshold';
      U.tested = true;
      renderCurrentSlide();
      break;
    case 'query':
      U.q = +id;
      renderCurrentSlide();
      break;
    case 'token-example':
      U.text = U.text.startsWith('让') ? 'AI can help. 2026' : '让 AI 帮我理解世界。';
      renderCurrentSlide();
      break;
    case 'jobs':
      runJobs();
      break;
    case 'jobs-reset':
      clearInterval(jobTimer);
      U.jobs = 0;
      U.jobRunning = false;
      renderCurrentSlide();
      break;
    case 'case-next':
      U.caseId = D.cases[(D.cases.findIndex((c) => c.id === U.caseId) + 1) % D.cases.length].id;
      renderCurrentSlide();
      break;
    case 'flow-step':
      selectWorkflowStep(+id);
      break;
    case 'preset':
      choosePreset(id);
      break;
    case 'fault-demo':
      U.spec = Core.defaultSpec();
      U.spec.fault = 'false-success';
      U.run = null;
      go('act/5/3');
      break;
    case 'run-next':
      if (!U.spec.goal.trim()) {
        notify('先给助手一个具体目标，再开始试运行。');
        go('act/5/0');
        return;
      }
      if (!U.run) U.run = Core.newRun(U.spec);
      U.panel.runtimeView = 'process';
      U.run = Core.advance(U.run);
      renderResultOnly();
      break;
    case 'approve':
      U.panel.runtimeView = 'process';
      if (U.run) U.run = Core.approve(U.run, true);
      renderResultOnly();
      break;
    case 'deny':
      U.panel.runtimeView = 'process';
      if (U.run) U.run = Core.approve(U.run, false);
      renderResultOnly();
      break;
    case 'run-reset':
      U.panel.runtimeView = 'process';
      U.run = null;
      U.event = null;
      renderCurrentSlide();
      break;
    case 'event':
      U.event = +id;
      renderCurrentSlide();
      break;
    case 'checkpoint':
      if (U.run && U.spec.checkpoint) {
        U.checkpoint = JSON.stringify(U.run);
        notify('保存了当前任务与状态；仅留在本次页面会话。');
        renderCurrentSlide();
      }
      break;
    case 'pause-run':
      if (U.run) {
        U.run.stage = 'PAUSED';
        notify('任务已中断。只能恢复已经保存的状态。');
        renderCurrentSlide();
      }
      break;
    case 'restore':
      try {
        U.run = Core.validateCheckpoint(JSON.parse(U.checkpoint), U.spec);
        U.event = null;
        notify('已恢复保存时的状态，尚未假定后续任务已完成。');
        renderCurrentSlide();
      } catch (e) {
        notify('未恢复：' + e.message);
      }
      break;
    case 'export-spec':
      download('我的助手设计.md', blueprintText(), 'text/markdown;charset=utf-8');
      break;
    case 'export-run':
      download(
        '助手设计与教学运行.json',
        JSON.stringify(
          { version: '0.16.0', teachingOnly: true, spec: U.spec, run: U.run },
          null,
          2,
        ),
        'application/json',
      );
      break;
    case 'export-artifact':
      if (U.run?.stage === 'DONE' && U.run.artifact)
        download(
          '已验收教学产物.json',
          JSON.stringify({ teachingOnly: true, ...U.run.artifact }, null, 2),
          'application/json',
        );
      break;
    case 'autonomy':
      U.autonomy = id;
      renderCurrentSlide();
      break;
    case 'export-notes':
      download('能力与选择-我的手记.md', noteMarkdown(), 'text/markdown;charset=utf-8');
      break;
    case 'backup-notes':
      download(
        '知序-手记备份.json',
        JSON.stringify({ version: 1, notes: Notes }, null, 2),
        'application/json',
      );
      break;
    case 'import-notes':
      $('#notes-file').click();
      break;
  }
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-do]');
  if (b && !b.disabled) handleDo(b);
});
let searchTimer;
function preserveSearch(id, fn) {
  const value = $(id)?.value,
    sel = $(id)?.selectionStart;
  fn();
  const el = $(id);
  if (el) {
    el.focus({ preventScroll: true });
    try {
      el.setSelectionRange(sel, sel);
    } catch {}
  }
}
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.id === 'token-text') {
    U.text = el.value;
    updateTokenComparison();
  } else if (el.id === 'param-range') {
    U.params = +el.value;
    $('#param-value').textContent = U.params + ' B';
    $('#weight-value').innerHTML =
      Core.weightGiB(U.params, U.bits).toFixed(2) + '<small>GiB</small>';
    $('#weight-formula').textContent = `${U.params} × 10⁹ × ${U.bits} ÷ 8 ÷ 2³⁰`;
    $$('#weight-graph i').forEach((n, i) =>
      n.classList.toggle('on', i < Math.ceil((U.params / 70) * 20)),
    );
  } else if (el.dataset.budget != null) {
    U.budget[+el.dataset.budget] = +el.value;
    $('#budget-out-' + el.dataset.budget).textContent = el.value;
    $('#context-result').innerHTML = contextResult();
  } else if (el.id === 'attention-temp') {
    U.temp = +el.value;
    $('#attention-temp-out').textContent = U.temp.toFixed(1);
    $('#attention-result').innerHTML = attentionResult(Core.attention(U.q, U.temp, U.mask));
  } else if (el.dataset.spec && el.type !== 'checkbox') {
    changeSpec(el.dataset.spec, el.dataset.spec === 'budget' ? +el.value : el.value);
    if (el.dataset.spec === 'budget') $('#step-budget-out').textContent = el.value + ' 步';
    if ($('#spec-feedback'))
      $('#spec-feedback').textContent = U.spec.goal.trim()
        ? '已记录。继续选择依据与边界，也可以稍后修改。'
        : '目标还空着，先给它一件具体的工作。';
  } else if (el.dataset.note) {
    Notes[el.dataset.note] = el.value.slice(0, el.dataset.note === 'question' ? 6000 : 3000);
    if (!setStore('notes', Notes) && !U.storageWarned) {
      U.storageWarned = true;
      notify('此环境无法保存手记，请使用导出或备份。');
    }
  } else if (el.id === 'concept-search') {
    U.query = el.value;
    U.page = 0;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      if (U.route === 'basics') preserveSearch('#concept-search', renderBasics);
    }, 200);
  } else if (el.id === 'library-search') {
    U.query = el.value;
    U.listPage = 0;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      if (U.route === 'library') preserveSearch('#library-search', renderLibrary);
    }, 200);
  } else if (el.id === 'article-search') {
    overlay.query = el.value;
    overlay.page = 0;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      if (overlay?.type === 'articles') preserveSearch('#article-search', renderArticleIndex);
    }, 200);
  }
});
document.addEventListener('change', async (e) => {
  const el = e.target;
  if (el.id === 'research-path-select') {
    U.query = '';
    U.listPage = 0;
    Revision.libraryBranch = 0;
    go('library/' + el.value + '/0');
  } else if (el.id === 'mask') {
    U.mask = el.checked;
    $('#attention-result').innerHTML = attentionResult(Core.attention(U.q, U.temp, U.mask));
  } else if (el.id === 'ret-role') {
    U.retRole = el.value;
    renderCurrentSlide();
  } else if (el.dataset.spec && el.type === 'checkbox') {
    changeSpec(el.dataset.spec, el.checked);
    if ($('#materials-feedback')) {
      $('#materials-feedback').textContent = U.spec.evidence
        ? '有相关资料。下一步要约定它可以做什么。'
        : '缺少相关资料；试运行会停止，不会编造。';
      $('#materials-feedback').classList.toggle('warn', !U.spec.evidence);
    }
  } else if (el.id === 'fault') {
    U.panel.runtimeView = 'process';
    changeSpec('fault', el.value);
    U.event = null;
    renderCurrentSlide();
  } else if (el.id === 'scope' || el.id === 'appeal') {
    U[el.id] = el.checked;
    renderCurrentSlide();
  } else if (el.id === 'notes-file') {
    const f = el.files?.[0];
    if (!f) return;
    try {
      if (f.size > 100000) throw Error('文件过大。');
      const d = JSON.parse(await f.text());
      if (
        d.version !== 1 ||
        !d.notes ||
        !['why', 'keep', 'question'].every(
          (k) =>
            typeof d.notes[k] === 'string' && d.notes[k].length <= (k === 'question' ? 6000 : 3000),
        )
      )
        throw Error('不是可识别的手记备份。');
      for (const k of ['why', 'keep', 'question']) Notes[k] = d.notes[k];
      setStore('notes', Notes);
      if (U.route === 'notes') renderNotes();
      else renderCurrentSlide();
      notify('已导入手记；只留在当前浏览器。');
    } catch (err) {
      notify('未导入：' + err.message);
    }
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && U.route === 'entrance' && Revision.collision != null) {
    closeCollision();
    return;
  }
  if (e.key === 'Escape') {
    if (overlay) {
      e.preventDefault();
      closeLayer();
      return;
    }
    if ($('#story-pop-slot')?.children.length) {
      $('#story-pop-slot').innerHTML = '';
      scene?.setMotion(U.motion);
      return;
    }
  }
  if (e.target.closest('input,textarea,select,[contenteditable]') || $('#guide').open) return;
  const t = e.target.closest('[role=tab]');
  if (t && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
    e.preventDefault();
    const list = $$('[role=tab]', t.closest('[role=tablist]')),
      i = list.indexOf(t),
      n =
        e.key === 'Home'
          ? 0
          : e.key === 'End'
            ? list.length - 1
            : (i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length;
    list[n].click();
    if (list[n].isConnected) list[n].focus();
    return;
  }
  if (e.key === 'ArrowRight' || e.key === 'PageDown') {
    e.preventDefault();
    nextPage(1);
  } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
    e.preventDefault();
    nextPage(-1);
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    U.query = '';
    go('library');
    setTimeout(() => $('#library-search')?.focus(), 40);
  }
});
let touchStart = null;
document.addEventListener('pointerdown', (e) => {
  if (
    e.pointerType !== 'touch' ||
    e.target.closest('input,textarea,select,button,a,canvas,iframe,[role=tablist]') ||
    overlay ||
    $('#guide').open
  )
    return;
  touchStart = { x: e.clientX, y: e.clientY, t: performance.now() };
});
document.addEventListener('pointerup', (e) => {
  if (!touchStart) return;
  const dx = e.clientX - touchStart.x,
    dy = e.clientY - touchStart.y,
    elapsed = performance.now() - touchStart.t;
  touchStart = null;
  if (Math.abs(dx) > 65 && Math.abs(dy) < 45 && elapsed < 1100) nextPage(dx < 0 ? 1 : -1);
});
document.addEventListener('pointercancel', () => (touchStart = null));
document.addEventListener('pointermove', (e) => {
  const b = e.target.closest('.magnetic');
  if (!b || e.pointerType !== 'mouse' || !U.motion) return;
  const r = b.getBoundingClientRect();
  b.style.transform = `translate(${((e.clientX - r.left - r.width / 2) / r.width) * 5}px,${((e.clientY - r.top - r.height / 2) / r.height) * 4}px)`;
});
document.addEventListener('pointerout', (e) => {
  const b = e.target.closest('.magnetic');
  if (b && !b.contains(e.relatedTarget)) b.style.transform = '';
});
$('#guide').addEventListener('click', (e) => {
  if (e.target !== $('#guide')) return;
  const r = e.target.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
    e.target.close();
});
window.addEventListener('message', (e) => {
  const f = $('#archive-frame');
  if (
    !f ||
    e.source !== f.contentWindow ||
    e.data?.kind !== 'museum-v08-native' ||
    typeof e.data.route !== 'string'
  )
    return;
  openArchive(e.data.route, e.data.route);
});
prefersReduced.addEventListener('change', (e) => {
  U.motion = !e.matches;
  document.documentElement.dataset.motion = U.motion ? 'on' : 'off';
  scene?.setMotion(U.motion && Revision.collision == null);
  setTop();
});
window.addEventListener('hashchange', render);
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (overlay?.type === 'reader') renderReader();
    else if (U.route === 'basics') renderBasics();
    else if (U.route === 'library') renderLibrary();
    else if (U.route === 'news') renderNews();
    else if (U.route === 'notes') renderNotes();
    else if (U.route !== 'entrance') renderCurrentSlide();
    viewportProfile();
    scheduleAdaptive();
  }, 120);
});
window.AtlasMuseum = Object.freeze({
  version: '0.16.0',
  core: Core,
  conflict: FrictionModel,
  i18n: Object.freeze({
    supported: Object.freeze([...I18n.supported]),
    translate: I18n.t,
    diagnostics: I18n.diagnostics,
    get locale() {
      return I18n.locale;
    },
  }),
  getState: () =>
    JSON.parse(
      JSON.stringify({
        route: U.route,
        page: U.page,
        phase: U.phase,
        motion: U.motion,
        concept: U.concept,
        panel: U.panel,
        params: U.params,
        bits: U.bits,
        spec: U.spec,
        run: U.run,
        checkpoint: !!U.checkpoint,
        notes: Notes,
        overlay: overlay
          ? {
              type: overlay.type,
              title: overlay.title,
              page: overlay.page,
              total: overlay.parts?.length,
            }
          : null,
        sim: scene?.sim.snapshot(),
      }),
    ),
  pages: Acts.map((a) => a.length),
  concepts: Basics.map((b) => b.id),
});

function renderEntrance() {
  entranceTen();
}
function renderLibrary() {
  libraryTen();
}
function historySlide() {
  return historyTen();
}
function renderBasics() {
  exhibitGallery();
}
function renderReader() {
  exhibitReader();
}
function reflectionSlide() {
  return exhibitReflection();
}
function needSlide() {
  return needTen();
}
function fitExhibit() {
  scheduleAdaptive();
}

document.addEventListener('museum-locale-change', () => {
  // Language is presentation state: do not reset the route, forms, simulation or checkpoint.
  for (const body of document.querySelectorAll('.adaptive-body')) {
    const nodes = [...body.querySelectorAll('.adaptive-page')].flatMap((p) => [...p.children]);
    body.replaceChildren(...nodes);
    body.classList.remove('adaptive-body');
    delete body.dataset.adaptive;
  }
  if (U.route === 'news') {
    News.original = false;
    renderNews();
  }
  scene?.draw();
  scheduleAdaptive();
});
I18n.init();
viewportProfile();
render();
// Archive bytes are fetched only when a visitor opens an archive tool.
window.visualViewport?.addEventListener('resize', scheduleAdaptive);
new ResizeObserver(() => scheduleAdaptive()).observe(document.getElementById('main'));
function fontsReady() {
  scheduleAdaptive();
  scene?.draw();
}
document.fonts?.ready.then(fontsReady);
document.fonts?.addEventListener('loadingdone', fontsReady);
