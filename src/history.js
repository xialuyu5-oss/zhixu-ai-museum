const HistoryQuestions = {
  language: {
    label: '使用语言',
    then: '让符号不只用于计算，也能表达问题和关系。',
    now: '机器翻译与语言生成',
    example:
      '2017 年 Transformer 论文以机器翻译实验展示了一条注意力机制路线。它是后来许多语言模型的技术基础之一。',
    limit: '译文或回答流畅，不代表事实、语境和引用都正确。',
    question: '面对一个新问题，怎样分清“接得顺”与“答得对”？',
    source: ['Transformer 原论文', 'https://arxiv.org/abs/1706.03762'],
    route: 'act/2/0',
  },
  concept: {
    label: '形成概念',
    then: '从具体事例中得到能够再次使用的抽象。',
    now: '从样本学习表示',
    example: '本馆下一件展品用几个零件学习一个分界。样本、规则和新情况之间的距离，可以直接观察。',
    limit: '在已见样本上成立的规则，到了新环境可能失效。',
    question: '机器学到的是可推广的规律，还是样本中的巧合？',
    source: [
      'Google：泛化与新数据',
      'https://developers.google.com/machine-learning/crash-course/overfitting/generalization',
    ],
    route: 'act/1/2',
  },
  problem: {
    label: '解决问题',
    then: '把原本依靠人的问题求解，变成机器可执行的步骤。',
    now: '在具体任务中取得进展',
    example: 'AlphaFold 以蛋白质结构预测为目标，将序列与结构信息用于一个有明确评估方式的科学任务。',
    limit: '一个任务上的突破，不证明同一系统能胜任所有任务。',
    question: '哪些结果能用独立证据检查？哪些只能暂时相信？',
    source: ['AlphaFold 研究论文', 'https://www.nature.com/articles/s41586-021-03819-2'],
    route: 'act/3/0',
  },
  improve: {
    label: '改进方法',
    then: '让解决问题的过程本身也能够被调整。',
    now: '生成、评估、再选择',
    example:
      '在我们的训练实验中，每条候选分界都会被评估，较少分错的规则被保留。这展示了受目标约束的改进。',
    limit: '谁设定目标、什么算“更好”、哪些方法允许尝试，仍需具体定义。',
    question: '如果分数提高了，真正想要的结果一定改善了吗？',
    source: [
      '1955 年研究提案',
      'https://www-formal.stanford.edu/jmc/history/dartmouth/dartmouth.html',
    ],
    route: 'act/5/0',
  },
};
function historyQuestionControls() {
  return tabs(
    Object.entries(HistoryQuestions).map(([k, v]) => [k, v.label]),
    'historyQuestion',
    U.panel.historyQuestion || 'language',
    'depth-topic-tabs',
  );
}
function historyTen() {
  const t = U.panel.history10 || 'event',
    q = HistoryQuestions[U.panel.historyQuestion || 'language'];
  let main, explain;
  if (t === 'event') {
    main =
      depthIntro(
        '1955 → 1956 / 研究的起点',
        '计算之外，机器还能做什么？',
        '四位研究者提出：把学习和智能拆成可以描述、编程与检验的问题。',
      ) +
      `<figure class="history-illustration"><img src="${DepthAssets.research}" alt="1950 年代研究情境插画：提案、笔记、打字机与早期电子计算机" loading="lazy"><figcaption>AI 生成的情境插画 · 非史料照片或提案原件</figcaption></figure>
      <div class="history-sequence"><article><span>1955 · 08.31</span><h3>提出研究计划</h3><p>提议次年暑期开展约两个月、十人参与的研究。</p></article><span class="sequence-track" aria-hidden="true"></span><article><span>1956 · 夏季</span><h3>在 Dartmouth 开展研究</h3><p>一个研究领域逐步形成，难题远未在一个夏天内解决。</p></article></div>`;
    explain = `<h2>这份提案改变了什么？</h2>${depthNote('先把问题变成研究对象', '“机器能思考吗”很大。提案尝试拆成语言、抽象、问题求解和自我改进等可以分别探索的方向。')}${depthNote('关键是一个猜想', '如果学习或智能能够被描述得足够精确，机器是否就能模拟它？这给出研究方向，也把证明的责任留给后来的实验。')}${depthNote('计划不等于成果', '1955 是提案时间，1956 是研究活动时间。它们是领域形成的重要节点，不是智能机器已经完成的日期。')}<div class="depth-callout"><b>留给今天的问题</b><p>某种能力已经做出来，是否就说明我们理解了智能的全部？带着这个问题看下一页。</p></div>${actBtn('了解核心猜想 →', 'tab', 'data-group="history10" data-id="claim"', true)}`;
  } else if (t === 'claim') {
    main =
      depthIntro(
        '研究猜想 / 本馆意译',
        '先描述清楚，再尝试让机器执行。',
        '点击一个研究方向，观察“怎样描述”如何变成一个可以检验的任务。',
      ) +
      historyQuestionControls() +
      `<div class="claim-steps">${['提出问题', '写成方法', '检验结果'].map((label, i) => `<button data-do="tab" data-group="claimStage" data-id="${i}" aria-pressed="${+(U.panel.claimStage || 0) === i}"><span>0${i + 1}</span><b>${label}</b>${i < 2 ? '<i aria-hidden="true">→</i>' : ''}</button>`).join('')}</div><div class="claim-detail"><span class="depth-kicker">${['从具体能力开始', '给出可执行的条件', '让结果接受检验'][+(U.panel.claimStage || 0)]}</span><h3>${[q.label, '输入、步骤、可检查的结果', '成功之后，还要看失败'][+(U.panel.claimStage || 0)]}</h3><p>${[q.then, '把任务、例子或规则交给程序，并说明怎样判断表现。', q.question][+(U.panel.claimStage || 0)]}</p></div>`;
    explain = `<h2>精确描述，难在哪里？</h2>${depthNote('词语相同，不代表任务相同', '“理解一句话”可以指翻译、找信息、判断隐含意思，或者在现实中正确行动。评价方式不同，答案也会不同。')}${depthNote('能模拟表现，还没有解释全部机制', '一个程序完成了某项任务，是能力证据。它是否像人一样完成、是否理解同样的东西，是另一些需要证据的问题。')}${depthNote('提案也在意计算的代价', '逐个试遍所有答案，可能在逻辑上可行，却在时间和资源上做不到。方法与算力始终相互制约。')}<div class="depth-callout"><b>把大问题变小</b><p>先定义要观察什么，再定义怎样失败。一个清晰的小实验，比一句无边界的“机器有智能”更容易讨论。</p></div>`;
  } else if (t === 'today') {
    main =
      depthIntro(
        '过去的问题 / 现在的证据',
        '有了局部答案，也看见新的难题。',
        '“今天的回答”按具体能力讨论；没有一条统一的百分比能代表智能完成了多少。',
      ) +
      historyQuestionControls() +
      `<div class="then-now"><section><span>当年的研究目标</span><h3>${q.label}</h3><p>${q.then}</p></section><section><span>今天的研究进展</span><h3>${q.now}</h3><p>${q.example}</p></section></div><footer class="history-today-footer"><div class="depth-callout depth-open"><b>仍未解决的问题</b><p>${q.limit}</p></div>${actBtn('探索相关展品 →', 'go', `data-route="${q.route}"`, true)}</footer>`;
    if (innerWidth < 780 || innerHeight <= 480) {
      const view = U.panel.historyCompare || 'now';
      const items = {
        then: ['当年的研究目标', q.label, q.then],
        now: ['今天的研究进展', q.now, q.example],
        limit: ['仍未解决的问题', q.label, q.limit],
      };
      const item = items[view];
      main =
        depthIntro('过去的问题 / 现在的证据', '有了局部答案，也看见新的难题。', '') +
        historyQuestionControls() +
        tabs(
          Object.entries(items).map(([k, v]) => [k, v[0]]),
          'historyCompare',
          view,
          'history-compare-tabs',
        ) +
        `<section class="history-mobile-answer"><h3>${item[1]}</h3><p>${item[2]}</p></section>` +
        actBtn('探索相关展品 →', 'go', `data-route="${q.route}"`);
    }
    explain = `<h2>怎样看待一项技术突破？</h2>${depthNote('先看任务与条件', '它用了哪些输入？面对哪些对象？结果在什么测试或实际环境中成立？')}${depthNote('再看检验与代价', '结果怎样核验？失败在哪里？需要多少时间、数据和计算资源？')}${depthNote('最后看能否推广', '原任务做得好，是继续探索的起点。换目标、换环境、换人群后，需要重新检查。')}<div class="depth-callout"><b>留一个自己的问题</b><p>${q.question}</p></div>${sourceLink(...q.source)}`;
  } else {
    main =
      depthIntro(
        '来源与读法',
        '原始材料，也值得慢慢读。',
        '区分提案中的猜想、后来的研究成果，以及本馆为帮助理解而设计的例子。',
      ) +
      `<div class="source-ledger"><article><span>01 / 原始提案</span><h3>作者、日期、核心猜想</h3><p>John McCarthy、Marvin Minsky、Nathaniel Rochester、Claude Shannon，1955 年 8 月 31 日。</p>${sourceLink('阅读 Stanford 保存的全文', 'https://www-formal.stanford.edu/jmc/history/dartmouth/dartmouth.html')}</article><article><span>02 / 研究活动</span><h3>1956 年与学科形成</h3><p>Dartmouth 对这次暑期研究的历史说明，可与提案中的计划相互对照。</p>${sourceLink('阅读 Dartmouth 的历史说明', 'https://home.dartmouth.edu/about/artificial-intelligence-ai-coined-dartmouth')}</article><article><span>03 / 教学设计</span><h3>图像与对照怎样使用</h3><p>插画是生成的历史情境；流程是讲解结构。它们帮助阅读，不代替原始证据。</p></article></div>`;
    explain = `<h2>读材料时，问三件事</h2>${depthNote('这是主张，还是观察？', '“我们猜想”给出方向；“我们测试得到”才对应一组具体证据。不要把前者读成后者。')}${depthNote('省略了什么条件？', '同一个词在不同年代、不同论文中，可能使用不同任务和检验标准。')}${depthNote('我能在哪里复核？', '回到原文的实验、数据或限制部分。来源存在，也不自动保证某种解释成立。')}`;
  }
  return depthShell(
    'history10',
    [
      ['event', '1955 年'],
      ['claim', '核心提案'],
      ['today', '今天的回答'],
      ['sources', '出处'],
    ],
    t,
    main,
    explain,
    depthSources('事实看原文，图解帮助阅读。提案核心为意译；现代例子与历史猜想分别呈现。', [
      ['1955 提案原文', 'https://www-formal.stanford.edu/jmc/history/dartmouth/dartmouth.html'],
      [
        '1956 研究活动',
        'https://home.dartmouth.edu/about/artificial-intelligence-ai-coined-dartmouth',
      ],
    ]),
  );
}
