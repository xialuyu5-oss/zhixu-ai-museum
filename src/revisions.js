/* v0.10: guided explanations and resolution-aware exhibits. */
const Revision = {
  compare: 'share',
  learnStep: 0,
  libraryBranch: 0,
  policy: 'balanced',
  fitFrame: 0,
  subpages: {},
  visited: new Set(),
};
const sourceLink = (text, url) =>
  `<a class="source-link" href="${url}" target="_blank" rel="noopener noreferrer">${text} ↗</a>`;
function lessonShell(id, choices, selected, content, foot = '') {
  return `<section class="lesson-shell" data-lesson="${id}">${tabs(choices, id, selected, 'lesson-tabs')}<div class="lesson-content">${content}</div>${foot ? `<div class="lesson-foot">${foot}</div>` : ''}</section>`;
}
const BeforeAfter = {
  share: {
    label: '整理一次会议',
    task: '同样是一场会议，谁在做哪一段工作？',
    old: ['边听边记，容易遗漏。', '会后重听录音、整理重点。', '自己逐项找出待办与负责人。'],
    now: [
      '在获准记录的前提下，AI 辅助转写。',
      'AI 起草摘要、整理待办。',
      '人核对原话、确认负责人和承诺。',
    ],
    change: '从“逐字整理”转向“核对重点与确认责任”。',
    remain: '声音不清、语境含糊时仍会出错。最终确认不能省略。',
  },
  language: {
    label: '读一份外语资料',
    task: '同一份陌生语言的资料，怎样走近它？',
    old: ['查词典，逐句理解。', '借助翻译软件获得初稿。', '向熟悉领域的人确认术语。'],
    now: [
      'AI 先给摘要，并结合上下文解释。',
      '追问某一段，比较不同表达。',
      '对照原文核实数字、条款和术语。',
    ],
    change: '从“先跨过语言门槛”转向“更快定位值得深读的地方”。',
    remain: '过去也已有机器翻译和自动化；今天的区别是交互与组合能力，不是从零开始。',
  },
  logs: {
    label: '排查一次故障',
    task: '面对同一批日志，怎样找到可验证的线索？',
    old: ['人工搜索关键字、翻手册。', '靠经验提出可能的原因。', '设计试验，逐个排除。'],
    now: [
      'AI 辅助归纳时序、关联文档。',
      '提出候选解释和验证步骤。',
      '工程师复核证据，在授权范围内验证。',
    ],
    change: '从“花时间搜集与归纳”转向“把时间用在判断与验证”。',
    remain: '看起来合理的解释可能不成立。未经验证，不能说根因已经查明。',
  },
};
function needTen() {
  const id = U.panel.need10 || 'share',
    c = BeforeAfter[id],
    era = U.panel.era10 || 'before';
  const card = (now) =>
    `<article class="era-card ${now ? 'now' : 'before'}" data-era="${now ? 'after' : 'before'}"><header><span class="era-mark">${now ? '有 AI 辅助' : '主要靠人和既有工具'}</span><h2>${now ? '现在，可以这样配合。' : '过去，通常这样完成。'}</h2></header><ol>${(now ? c.now : c.old).map((s, i) => `<li><b>${i + 1}</b><span>${s}</span></li>`).join('')}</ol></article>`;
  if (
    document.documentElement.clientWidth < 780 ||
    (window.visualViewport?.height || innerHeight) < 470
  ) {
    const chosen =
      era === 'after'
        ? card(true)
        : era === 'outcome'
          ? `<div class="lesson-takeaway"><b>改变在哪里</b><p>${c.change}</p><span>${c.remain}</span></div>`
          : card(false);
    return lessonShell(
      'need10',
      Object.entries(BeforeAfter).map(([k, v]) => [k, v.label]),
      id,
      `<div class="era-mobile-controls">${tabs(
        [
          ['before', '过去怎么做'],
          ['after', '现在怎么做'],
          ['outcome', '改变在哪里'],
        ],
        'era10',
        era,
      )}</div>${chosen}`,
    );
  }
  return lessonShell(
    'need10',
    Object.entries(BeforeAfter).map(([k, v]) => [k, v.label]),
    id,
    `<section class="need-scenario" data-view="${U.panel.needView || 'compare'}"><div class="lesson-intro"><h2>${c.task}</h2><p>比较的是具体做事方式；AI 的辅助程度取决于任务和工具。</p></div><nav class="need-view-tabs">${tabs(
      [
        ['compare', '做法对比'],
        ['scene', '协作过程'],
      ],
      'needView',
      U.panel.needView || 'compare',
    )}</nav><div class="need-comparison"><div class="era-comparison">${card(false)}<span class="era-bridge" aria-hidden="true">→</span>${card(true)}</div><div class="lesson-takeaway"><b>改变在哪里</b><p>${c.change}</p><span>${c.remain}</span></div></div><div class="need-visual">${scenarioScene(id)}<p class="scenario-caption">${c.change}</p></div></section>`,
  );
}

function sampleComponent(x, pass, extra = '') {
  return `<div class="learn-sample ${extra}"><div class="sample-rod" style="--rod:${x * 7}px" aria-hidden="true"></div><strong>${x} mm</strong><span class="${pass ? 'sample-pass' : 'sample-fail'}">${pass ? '合格' : '不合格'}</span></div>`;
}
const ResearchPaths = [
  {
    name: '理解模型',
    question: '从“会回答”，走到“为什么会这样回答”？',
    desc: '沿着输入、学习、上下文与验证建立一张知识地图。',
    steps: [
      [
        '输入与学习',
        '先理解机器处理的是什么。',
        ['concept/token', 'concept/learning', 'article/tokens-context'],
      ],
      [
        '模型与上下文',
        '把参数、注意力和证据放到各自的位置。',
        ['concept/parameters', 'concept/context', 'concept/attention'],
      ],
      [
        '能力与选择',
        '带着自己的任务比较，而非只看排行榜。',
        ['models', 'model-api', 'local-models'],
      ],
    ],
    branches: ['vectors', 'benchmarks', 'articles'],
  },
  {
    name: '使用 AI',
    question: '我有一件工作，怎样选择工具并检查结果？',
    desc: '从任务出发，连接产品、提示方法、费用与日常实践。',
    steps: [
      ['找到合适工具', '认识产品形态与使用方式。', ['apps', 'agents', 'resources']],
      [
        '说清任务与资料',
        '让输入、范围与完成条件更清楚。',
        ['playbook', 'concept/context', 'concept/retrieval'],
      ],
      ['比较使用成本', '订阅、API 和服务条件分别看。', ['pricing', 'subscriptions', 'model-api']],
    ],
    branches: ['projects', 'troubleshoot', 'news'],
  },
  {
    name: '设计与实现',
    question: '怎样把一次回答，变成一个能完成工作的助手？',
    desc: '先画清任务，再设计工具、边界、反馈和验收。',
    steps: [
      [
        '理解执行链',
        '分清模型、工具与运行系统。',
        ['concept/agent', 'concept/mcp', 'concept/harness'],
      ],
      ['设计并试运行', '动手定义目标、权限和验收。', ['act/5/0', 'harness', 'harness-lab']],
      [
        '验证与改进',
        '从故障、失败案例和可复现项目反查设计。',
        ['projects', 'troubleshoot', 'benchmarks'],
      ],
    ],
    branches: ['git', 'licenses', 'vectors'],
  },
  {
    name: '工程与部署',
    question: '从本机跑通，到可维护地交付，还差什么？',
    desc: '把部署、版本、许可和运行责任连起来看。',
    steps: [
      ['准备运行环境', '了解基础设施与本地资源。', ['vps', 'providers', 'local-models']],
      ['组织代码与授权', '建立版本和分发边界。', ['git', 'licenses', 'openpath']],
      [
        '部署与回查',
        '读部署说明，回到验证方法。',
        ['article/n-deploy-cn', 'troubleshoot', 'sources'],
      ],
    ],
    branches: ['projects', 'model-api', 'concept/harness'],
  },
  {
    name: '继续观察',
    question: '新消息出现时，怎样更新自己的判断？',
    desc: '观察变化，回到来源，再重新检查原来的理解。',
    steps: [
      ['追踪变化', '读来源动态，再回到原文与相关知识。', ['news', 'people', 'resources']],
      ['回到原始依据', '检查日期、出处与不同观点。', ['sources', 'articles', 'openpath']],
      ['形成自己的问题', '把能力、规则与共同生活放在一起。', ['act/6/0', 'act/6/1', 'act/6/4']],
    ],
    branches: ['apps', 'models', 'licenses'],
  },
];
function resourceMeta(route) {
  const custom = {
    'act/5/0': ['设计你的助手', '五步工坊'],
    'act/6/0': ['能力与约束', '回到第六幕'],
    'act/6/1': ['丰裕之后', '思想实验'],
    'act/6/4': ['留下自己的问题', '参观手记'],
  };
  if (custom[route]) return { route, title: custom[route][0], type: custom[route][1] };
  if (route.startsWith('concept/')) {
    const b = getBasic(route.split('/')[1]);
    return { route, title: b.name, type: b.hint };
  }
  if (route.startsWith('article/')) {
    const a = Catalog.articles.find((a) => a.id === route.split('/')[1]);
    if (a) return { route, title: a.title, type: '馆藏文章 · 中文原文' };
  }
  const l = LibraryGroups.flatMap((g) => g[1]).find((a) => a[0] === route);
  return l
    ? { route, title: l[1], type: l[2] }
    : ArchiveIndex.find((a) => a.route === route) || { route, title: route, type: '馆藏资料' };
}
function researchResource(route) {
  const r = resourceMeta(route);
  return `<button class="research-resource ${Revision.visited.has(route) ? 'visited' : ''}" data-do="research-open" data-route="${esc(route)}"><span><strong>${esc(r.title)}</strong><small>${esc(r.type)}</small></span><span class="resource-arrow" aria-hidden="true">→</span></button>`;
}
function libraryTen() {
  const p = ResearchPaths[U.libGroup],
    step = Math.max(0, Math.min(2, U.libraryStep || 0)),
    cur = p.steps[step],
    q = U.query.trim().toLowerCase();
  const all = [
    ...Basics.map((b) => ({ route: 'concept/' + b.id, title: b.name, type: b.hint })),
    ...ArchiveIndex,
  ];
  const matches = all.filter(
    (r, i, a) =>
      (I18n.search(r.title) + ' ' + I18n.search(r.type)).includes(q) &&
      a.findIndex((x) => x.route === r.route) === i,
  );
  const size = document.documentElement.dataset.density === 'tight' ? 3 : 5,
    total = Math.max(1, Math.ceil(matches.length / size));
  U.listPage = Math.min(U.listPage, total - 1);
  $('#main').innerHTML =
    `<section class="research-hub"><header class="research-header"><div><span class="eyebrow">资料室 / 探索中心${Revision.libraryReturn === 'news' ? '<button class="library-news-back" data-do="research-return">← 返回新闻</button>' : ''}</span><h1>沿着一个问题，深入整座馆。</h1></div><label class="research-search"><span>搜索全部馆藏</span><input id="library-search" type="search" placeholder="概念、文章、模型、工具…" value="${esc(U.query)}" aria-label="搜索馆藏资料"></label></header><div class="research-layout ${Revision.libraryBranch ? 'branch-open' : ''}"><nav class="research-paths" aria-label="五条探索路径"><label class="research-path-select"><span>探索路径</span><select id="research-path-select" aria-label="选择探索路径">${ResearchPaths.map((r, i) => `<option value="${i}" ${i === U.libGroup ? 'selected' : ''}>${r.name}</option>`).join('')}</select></label>${ResearchPaths.map((r, i) => `<button class="${i === U.libGroup ? 'active' : ''}" data-do="research-path" data-id="${i}" aria-current="${i === U.libGroup ? 'step' : 'false'}"><span>0${i + 1}</span><strong>${r.name}</strong></button>`).join('')}<div class="research-count"><b>${Catalog.articles.length}</b> 篇文章 · <b>${Basics.length}</b> 个概念实验<br>资料、实践与来源在这里汇聚。</div></nav><section class="research-core">${
      q
        ? `<div class="research-topic"><span class="eyebrow">检索结果 / ${matches.length} 项</span><h2>与“${esc(U.query)}”相关</h2></div><div class="research-results">${
            matches
              .slice(U.listPage * size, (U.listPage + 1) * size)
              .map((r) => researchResource(r.route))
              .join('') || '<p>没有匹配结果，试试更短的关键词。</p>'
          }</div><div class="research-progress">${actBtn('上一组', 'research-results-prev', U.listPage === 0 ? 'disabled' : '')}<span>${U.listPage + 1} / ${total}</span>${actBtn('下一组', 'research-results-next', U.listPage >= total - 1 ? 'disabled' : '')}</div>`
        : `<div class="research-topic"><span class="eyebrow">${p.name}</span><h2>${p.question}</h2><p>${p.desc}</p></div><nav class="research-spine" aria-label="当前路径的步骤">${p.steps.map((s, i) => `<button class="${i === step ? 'active' : ''}" data-do="research-step" data-id="${i}" aria-current="${i === step ? 'step' : 'false'}"><span>${i + 1}</span><b>${s[0]}</b></button>`).join('')}</nav><div class="research-station"><header><span>当前这一站</span><h3>${cur[0]}</h3><p>${cur[1]}</p></header><nav class="station-view" aria-label="页内视角">${['resources', 'insight'].map((v, i) => `<button data-do="research-station-view" data-id="${v}" aria-pressed="${(U.panel.stationView || 'resources') === v}">${['查资料', '读讲解'][i]}</button>`).join('')}</nav><div class="station-body" data-view="${U.panel.stationView || 'resources'}"><div class="station-resources">${cur[2].map(researchResource).join('')}</div>${researchInsight(U.libGroup, step)}</div></div><div class="research-progress"><button class="branch-toggle" data-do="research-branch">展开支线</button><span>第 ${step + 1} / 3 站 · 可自由跳转</span>${actBtn(step < 2 ? '沿主线：' + p.steps[step + 1][0] : '继续：' + ResearchPaths[(U.libGroup + 1) % 5].name, 'research-next', '', true)}</div>`
    }</section><aside class="research-branches"><button class="branch-toggle" data-do="research-branch">返回主线</button><span class="eyebrow">从这里展开</span><h2>再看一个方向</h2><div>${p.branches.map(researchResource).join('')}</div><p>打开资料留在当前区域。收起后，继续刚才的探索位置。</p>${actBtn('全部馆藏文章', 'archive', 'data-route="articles" data-title="完整知识文章"')}</aside></div></section>`;
  scheduleAdaptive();
}
function researchOpen(route) {
  Revision.visited.add(route);
  if (route.startsWith('concept/') || route.startsWith('act/')) {
    Revision.libraryReturn = location.hash.slice(1);
    go(route);
  } else if (route.startsWith('library/')) {
    Revision.libraryReturn = location.hash.slice(1);
    go(route);
  } else openArchive(route, resourceMeta(route).title);
}

function entranceTen() {
  Revision.collision = null;
  const p = U.phase,
    headline = [
      '积累：今天的能力，来自漫长的探索。',
      '汇流：不同突破相遇，新的能力开始出现。',
      '交织与碰撞：能力进入生活，分歧也随之出现。',
    ],
    description = [
      '每次尝试都会留下线索，下一次从这里出发。',
      '开关三路条件，观察缺少一路时发生什么。',
      '一份方案里，交付速度与证据核验发生了冲突。',
    ];
  $('#main').innerHTML =
    `<section class="entrance-ten"><div class="entrance-ten-copy"><span class="eyebrow">知序特别展 / 能力与选择</span><h1>我们为什么 <br>需要机器的<em>能力？</em></h1><p>过去，我们怎样做事？ <br>今天，又能一起做到什么？</p><div class="entrance-ten-actions">${actBtn('从人的需要开始', 'go', 'data-route="act/1/0"', true)}${actBtn('进入资料室', 'library')}</div><button class="entrance-news-link" data-do="go" data-route="news">AI 观察站 · 看看正在发生什么 ↗</button></div><div class="story-exhibit">${narrativeLegend(p)}<div class="story-stage"><canvas id="story-canvas" role="img" aria-label="${description[p]}"></canvas><div id="collision-panel" class="collision-panel" hidden></div></div><div class="story-caption"><strong>${headline[p]}</strong><span id="story-live" role="status">${narrativeResult(p)}</span></div><div class="narrative-controls" aria-label="改变故事条件">${narrativeControls(p)}</div><div class="story-modes" role="tablist" aria-label="序厅故事">${['积累', '汇流', '交织与碰撞'].map((s, i) => `<button role="tab" aria-selected="${p === i}" tabindex="${p === i ? 0 : -1}" data-do="phase" data-id="${i}"><span>0${i + 1}</span><strong>${s}</strong></button>`).join('')}</div><small class="story-boundary">教学故事 · 试着改变条件；动画不是历史统计或模型实测。</small></div></section>`;
  scene = new NarrativeEngine($('#story-canvas'), { mode: p, motion: U.motion });
  scheduleAdaptive();
}

function viewportProfile() {
  const w = document.documentElement.clientWidth,
    h = window.visualViewport?.height || innerHeight;
  document.documentElement.style.setProperty('--app-height', Math.floor(h) + 'px');
  document.documentElement.dataset.density = h < 800 ? 'tight' : h < 920 ? 'medium' : 'roomy';
  document.documentElement.dataset.narrow = w < 780 ? 'yes' : 'no';
}
function scheduleAdaptive() {
  I18n.apply();
  cancelAnimationFrame(Revision.fitFrame);
  document.getElementById('main').dataset.layout = 'pending';
  Revision.fitFrame = requestAnimationFrame(() => {
    viewportProfile();
    adaptiveExhibits();
    fitReadingSpread();
    document.getElementById('main').dataset.layout = 'ready';
  });
  clearTimeout(Revision.readingSettle);
  Revision.readingSettle = setTimeout(fitReadingSpread, 220);
}
function adaptiveExhibits() {
  const page =
    U.route === 'concept'
      ? U.concept
      : U.route.startsWith('act/')
        ? Acts[+U.route.split('/')[1] - 1][U.page].id
        : '';
  $('#slide')?.setAttribute('data-exhibit', page);
  if (U.route.startsWith('act/5')) $('#slide')?.classList.add('workbench-slide');
  for (const body of $$('.spec-body,.lesson-content')) {
    if (
      !body.getClientRects().length ||
      body.dataset.adaptive ||
      body.classList.contains('depth-layout') ||
      body.querySelector('.runtime-panel,.goal-editor,.need-scenario,.connection-experiment')
    )
      continue;
    if (body.scrollHeight <= body.clientHeight + 3) continue;
    if (body.clientHeight < 80) continue;
    const boxStyle = getComputedStyle(body);
    const available =
      body.clientHeight - parseFloat(boxStyle.paddingTop) - parseFloat(boxStyle.paddingBottom) - 60;
    const unpack = (n) => {
      if (n.hidden || !n.getClientRects().length) return [n];
      if (
        n.getBoundingClientRect().height > available &&
        n.children.length &&
        n.matches(
          '.training-lab,.form-board,.thought-doors,.choice-space,.workflow,.sample-board,.history-event,.history-today,.proposal-core,.compute-runtime,.compute-explain,.history-sources,.era-comparison,.era-card,.lesson-takeaway,article',
        )
      )
        return [...n.children].flatMap(unpack);
      return [n];
    };
    let nodes = [...body.children].flatMap(unpack);
    if (nodes.length < 2) continue;
    const groups = [];
    let group = document.createElement('section');
    group.className = 'adaptive-page';
    groups.push(group);
    const nav = document.createElement('nav');
    nav.className = 'adaptive-nav';
    nav.setAttribute('aria-label', '展品内容');
    const stage = document.createElement('div');
    stage.className = 'adaptive-stage';
    body.replaceChildren(nav, stage);
    body.classList.add('adaptive-body');
    body.dataset.adaptive = 'true';
    stage.append(group);
    for (const node of nodes) {
      group.append(node);
      const used = node.getBoundingClientRect().bottom - group.getBoundingClientRect().top + 2;
      if (used > stage.clientHeight - 10 && group.children.length > 1 && !node.hidden) {
        node.remove();
        group = document.createElement('section');
        group.className = 'adaptive-page';
        stage.append(group);
        groups.push(group);
        group.append(node);
      }
    }
    if (groups.length === 1) {
      nav.hidden = true;
      continue;
    }
    const captions = groups.map((g, i) => {
      const h = g.querySelector('h2,h3,label,button,.eyebrow,.source-line');
      let text =
        I18n.originalText(h?.querySelector('strong,b,span') || h)
          .trim()
          .replace(/\s+/g, ' ') ||
        (body.querySelector('.meaning-reflection')
          ? '继续思考'
          : ['内容概览', '继续阅读', '查看结果', '深入了解'][i]) ||
        '更多内容';
      text = I18n.t(text);
      const limit = ['en', 'de', 'fr', 'ru'].includes(I18n.locale) ? 24 : 12;
      return text.length > limit ? text.slice(0, limit - 1) + '…' : text;
    });
    const key = partKey + '|' + JSON.stringify(U.panel) + '|' + U.mobile;
    const activate = (i) => {
      Revision.subpages[key] = i;
      groups.forEach((g, j) => {
        g.hidden = i !== j;
        g.setAttribute('role', 'tabpanel');
      });
      [...nav.children].forEach((b, j) => {
        b.classList.toggle('active', i === j);
        b.setAttribute('aria-selected', String(i === j));
        b.tabIndex = i === j ? 0 : -1;
      });
    };
    nav.setAttribute('role', 'tablist');
    captions.forEach((s, i) => {
      const b = document.createElement('button');
      b.textContent = s;
      b.setAttribute('data-i18n-skip', '');
      b.setAttribute('aria-label', I18n.t('查看：{0}', { 0: s }));
      b.setAttribute('role', 'tab');
      b.onclick = () => activate(i);
      nav.append(b);
    });
    activate(Math.min(Revision.subpages[key] || 0, groups.length - 1));
  }
}
