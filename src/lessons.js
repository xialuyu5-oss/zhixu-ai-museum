/* One dataset drives the samples, error chart, predictions, and explanatory text. */
function learningSamples() {
  return [
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
}
function learningErrors(t, samples = learningSamples()) {
  return samples.filter((s) => Number(s.x >= t) !== s.y).length;
}
function learningCandidates(samples = learningSamples()) {
  const xs = [...new Set(samples.map((s) => s.x))].sort((a, b) => a - b);
  return [xs[0] - 1, ...xs.slice(1).map((x, i) => (x + xs[i]) / 2), xs.at(-1) + 1].map((t) => ({
    t,
    errors: learningErrors(t, samples),
  }));
}
function samplePlot(threshold, showTruth = false) {
  const compact = typeof window !== 'undefined' && window.innerWidth < 780;
  const samples = learningSamples(),
    left = compact ? 25 : 64,
    span = compact ? 310 : 592,
    x = (v) => left + (v / 10) * span;
  const points = samples
    .map(
      (s) =>
        `<g class="sample-point ${s.y ? 'pass' : 'fail'}"><circle cx="${x(s.x)}" cy="${s.y ? 88 : 152}" r="${compact ? 8 : 12}"/><text x="${x(s.x)}" y="${s.y ? 60 : 188}" text-anchor="middle">${s.x}</text>${Number(s.x >= threshold) !== s.y ? `<circle class="error-ring" cx="${x(s.x)}" cy="${s.y ? 88 : 152}" r="${compact ? 13 : 19}"/>` : ''}</g>`,
    )
    .join('');
  if (compact)
    return depthSvg(
      'sample',
      '样本与尺寸分界',
      `分界 ${threshold.toFixed(1)} mm，${samples.length} 个训练样本中 ${learningErrors(threshold)} 个分错。空心为不合格，实心为合格。`,
      `<rect class="plot-fail" x="25" y="28" width="${x(threshold) - 25}" height="100"/><rect class="plot-pass" x="${x(threshold)}" y="28" width="${335 - x(threshold)}" height="100"/><text x="25" y="19">○ 不合格</text><text x="335" y="19" text-anchor="end">● 合格</text><path class="chart-axis" d="M25 128H335"/>${[0, 2, 4, 6, 8, 10].map((v) => `<text x="${x(v)}" y="149" text-anchor="middle">${v}</text>`).join('')}<g class="threshold-marker"><path d="M${x(threshold)} 28V128"/></g>${samples.map((s) => `<g class="sample-point ${s.y ? 'pass' : 'fail'}"><circle cx="${x(s.x)}" cy="${s.y ? 61 : 102}" r="7"/><text x="${x(s.x)}" y="${s.y ? 47 : 91}" text-anchor="middle">${s.x}</text>${Number(s.x >= threshold) !== s.y ? `<circle class="error-ring" cx="${x(s.x)}" cy="${s.y ? 61 : 102}" r="12"/>` : ''}</g>`).join('')}<text x="335" y="175" text-anchor="end">尺寸 / mm · 虚线是分界</text>`,
      '0 0 360 184',
    );
  return depthSvg(
    'sample',
    '样本与尺寸分界',
    `分界 ${threshold.toFixed(1)} mm，${samples.length} 个训练样本中 ${learningErrors(threshold)} 个分错。空心为不合格，实心为合格。`,
    `<rect class="plot-fail" x="${left}" y="32" width="${x(threshold) - left}" height="176" rx="4"/><rect class="plot-pass" x="${x(threshold)}" y="32" width="${left + span - x(threshold)}" height="176" rx="4"/>
    <text x="${left}" y="20">预测：不合格</text><text x="${left + span}" y="20" text-anchor="end">预测：合格</text>
    <path class="chart-axis" d="M${left} 208H${left + span}"/>${[0, 2, 4, 6, 8, 10].map((v) => `<path class="chart-axis" d="M${x(v)} 208V216"/><text x="${x(v)}" y="240" text-anchor="middle">${v}</text>`).join('')}
    ${showTruth ? `<path class="truth-line" d="M${x(6)} 32V208"/><text class="truth-text" x="${x(6) + 8}" y="200">工厂标准 6</text>` : ''}
    <g class="threshold-marker"><path d="M${x(threshold)} 32V208"/><rect x="${x(threshold) - 36}" y="248" width="72" height="28" rx="4"/><text x="${x(threshold)}" y="268" text-anchor="middle">${threshold.toFixed(1)} mm</text></g>${points}`,
    compact ? '0 0 360 280' : '0 0 720 280',
  );
}
function lossPlot() {
  const cs = learningCandidates(),
    active = Revision.threshold ?? 8,
    max = learningSamples().length;
  if (typeof window !== 'undefined' && window.innerWidth < 780) {
    return depthSvg(
      'loss',
      '每条候选规则分错多少',
      cs.map((c) => `${c.t}毫米分界：${c.errors}个分错`).join('；'),
      `<text x="12" y="16">分界 / mm</text><text x="330" y="16" text-anchor="end">分错数</text>${cs.map((c, i) => `<g class="loss-bar ${Math.abs(c.t - active) < 0.001 ? 'chosen' : ''}" data-threshold="${c.t}" data-errors="${c.errors}"><text x="60" y="${43 + i * 23}" text-anchor="end">${Number(c.t.toFixed(2))}</text><rect x="80" y="${30 + i * 23}" width="${Math.max(2, (c.errors / max) * 220)}" height="16" rx="3"/><text x="${92 + (c.errors / max) * 220}" y="${43 + i * 23}">${c.errors}</text></g>`).join('')}`,
      `0 0 350 ${cs.length * 23 + 32}`,
    );
  }
  const slot = 584 / cs.length,
    body = cs
      .map((c, i) => {
        const x = 84 + i * slot,
          h = (c.errors / max) * 144;
        return `<g class="loss-bar ${Math.abs(c.t - active) < 0.001 ? 'chosen' : ''}" data-threshold="${c.t}" data-errors="${c.errors}"><rect x="${x}" y="${188 - h}" width="${Math.min(40, slot - 12)}" height="${Math.max(2, h)}" rx="3"/><text x="${x + 16}" y="${176 - h}" text-anchor="middle">${c.errors}</text><text x="${x + 16}" y="216" text-anchor="middle">${Number(c.t.toFixed(2))}</text></g>`;
      })
      .join('');
  return depthSvg(
    'loss',
    '每条候选规则分错多少',
    cs.map((c) => `${c.t}毫米分界：${c.errors}个分错`).join('；'),
    `<text x="64" y="24">训练样本分错数（越少越好）</text><path class="chart-axis" d="M64 40V188H680"/>${body}<text x="680" y="252" text-anchor="end">候选分界 / mm</text>`,
  );
}
function learningExplain(step, t, errors) {
  const interval = U.extra ? '5.8 < 分界 ≤ 6.2' : '4 < 分界 ≤ 7';
  if (step === 'samples')
    return `<h2>机器拿到了什么？</h2>${depthNote('一个输入，一份标注', '尺寸是输入，检验员的合格／不合格记录是标注。算法用这些记录寻找规则，工厂的 6 mm 标准没有作为规则直接交给算法。')}${depthNote('从规则到学习', '直接写“尺寸 ≥ 6 即合格”，答案由人给定；从例子找分界，则把选择哪个数交给算法。本例只允许它选择一个阈值。')}${depthNote('这些样本有一个缺口', '4 mm 与 7 mm 之间没有初始样本。仅靠已有记录，无法知道真实分界恰好是 6 mm。')}<div class="depth-callout"><b>先预测再操作</b><p>把分界放在 5 mm 或 6 mm，现有样本会给出不同的分数吗？</p></div>`;
  if (step === 'train')
    return `<h2>分界是怎样选出来的？</h2>${depthNote('① 用同一条规则逐个预测', '尺寸 ≥ 分界就预测合格，否则预测不合格。预测与标注不同，就计一次错误。')}${depthNote('② 比较候选，而非猜中答案', `目前这条规则分错 ${errors} 个。算法枚举相邻尺寸的中点及两端候选，选择分错最少的一条。这里的“训练”就是这次搜索。`)}${depthNote('③ 零错误并不只有一个解', `${interval} 都能解释现有训练样本。算法选中 ${Core.learnThreshold(learningSamples()).threshold.toFixed(1)} mm，来自候选规则，不是读取到了工厂标准。`)}<div class="depth-callout"><b>训练的目标是什么？</b><p>这个例子最小化“分错数”。更复杂的模型会使用适合其任务的损失函数；优化一个数字，不等于保证现实中永远正确。</p></div>`;
  if (step === 'test')
    return `<h2>训练全对，就不会判断错吗？</h2>${depthNote('先固定，再检查', `这轮沿用 ${t.toFixed(1)} mm 分界，对 5.7 和 6.4 mm 两个新零件作预测。预测时不修改规则。`)}${depthNote('缺口里的差异终于出现', '例如 5.5 mm 与 6.0 mm 都能分对最初六个样本，却会给 5.7 mm 不同的答案。测试暴露了训练样本未约束的部分。')}${depthNote('补充信息，再训练', '加入另两个带标注样本：5.8 mm 不合格、6.2 mm 合格，候选中点变为 6.0 mm。两个测试零件仍不加入训练。')}<div class="depth-callout"><b>反复调试后的限制</b><p>看过这两个测试结果再改模型，它们就成为诊断反馈。正式评估还应保留另一份从未用来调试的测试数据。</p></div>`;
  return `<h2>从一个阈值，理解模型参数</h2>${depthNote('这个实验学到的是一个阈值', '可调的数就是参数；规则加上参数构成这个小模型。参数不是它保存的每条知识，也不是越多就必然越可靠。')}${depthNote('真实任务通常不只看一个尺寸', '若还需看形状、纹理、材料，输入可以有多个特征。神经网络用多层计算组合这些信号，并调整许多参数。')}${depthNote('寻找方法也会变化', '这里枚举少量候选。大模型无法试遍所有参数组合，通常通过优化方法逐步减小训练损失。小实验解释基本关系，不复现神经网络。')}<div class="depth-callout"><b>可迁移的一条认识</b><p>训练数据、优化目标与评估方式，共同决定“学得好”究竟是什么意思。</p></div>`;
}
function learningTen() {
  const step = U.panel.learning10 || 'samples',
    t = Revision.threshold ?? 8,
    samples = learningSamples(),
    errors = learningErrors(t);
  let main;
  if (step === 'samples')
    main =
      depthIntro(
        '实验 01 / 输入与标注',
        '给例子，能学到检验标准吗？',
        '工厂实际标准：尺寸 ≥ 6 mm。算法先只能看到这些带答案的零件。',
      ) +
      `<div class="sample-board depth-samples">${[0, 1]
        .map(
          (y) =>
            `<section class="sample-group"><h3>${y ? '● 合格' : '○ 不合格'} / 检验员标注</h3><div class="sample-row" style="--samples:${samples.filter((s) => s.y === y).length}">${samples
              .filter((s) => s.y === y)
              .map((s) => sampleComponent(s.x, !!s.y))
              .join('')}</div></section>`,
        )
        .join('')}</div>
    <div class="sample-gap"><span>4 mm</span><div><b>这一段，初始样本没有告诉我们</b><i aria-hidden="true"></i></div><span>7 mm</span></div><div class="depth-actions">${actBtn('试着找到一条分界 →', 'lesson-next', 'data-id="train"', true)}<p>下一步：改变规则，再看哪些零件被分错。</p></div>`;
  else if (step === 'train')
    main =
      depthIntro(
        '实验 02 / 让结果决定规则',
        '移动分界，错误跟着改变。',
        '铜色空心是实际不合格；绿色实心是实际合格；外圈标出判断错误。',
      ) +
      `<div class="depth-plot">${samplePlot(t)}</div><div class="threshold-controls">${[4, 5.5, 8].map((v) => `<button data-do="learn-threshold" data-id="${v}" aria-pressed="${t === v}">${v} mm</button>`).join('')}${actBtn('自动找分界', 'learn-fit', '', true)}</div><div class="depth-result" role="status"><strong>${errors} / ${samples.length}</strong><span>训练样本分错</span><b>当前分界 ${t.toFixed(1)} mm</b></div><div class="depth-actions">${actBtn('固定规则，测新零件 →', 'lesson-next', 'data-id="test"')}<span>每次调整，都使用同一批训练样本评分。</span></div>`;
  else if (step === 'test') {
    const tests = [
      { x: 5.7, y: 0 },
      { x: 6.4, y: 1 },
    ];
    main =
      depthIntro(
        '实验 03 / 独立输入',
        '训练时没见过，现在怎样判断？',
        `固定 ${t.toFixed(1)} mm 分界，用检验员的答案核对预测。`,
      ) +
      `<nav class="test-view-tabs">${tabs(
        [
          ['chart', '看分界'],
          ['results', '核对结果'],
        ],
        'testView',
        U.panel.testView || 'chart',
      )}</nav><div class="test-comparison" data-view="${U.panel.testView || 'chart'}"><div class="test-boundaries">${testBoundaryPlot(t)}</div><div class="test-pieces depth-tests">${tests
        .map((s) => {
          const prediction = s.x >= t,
            ok = prediction === !!s.y;
          return `<article class="test-piece ${ok ? 'correct' : 'incorrect'}"><span class="piece-icon" aria-hidden="true" style="--rod:${s.x * 10}px"></span><strong>${s.x} <small>mm</small></strong><dl><div><dt>机器预测</dt><dd>${prediction ? '合格' : '不合格'}</dd></div><div><dt>实际检验</dt><dd>${s.y ? '合格' : '不合格'}</dd></div></dl><b>${ok ? '✓ 一致' : '× 误判'}</b></article>`;
        })
        .join(
          '',
        )}</div></div><div class="depth-result"><strong>${learningErrors(t, tests)} / 2</strong><span>新零件判断错误</span></div><div class="depth-actions">${actBtn(U.extra ? '恢复初始样本' : '补入边界样本，再训练', 'learn10-update', '', true)}<p>${U.extra ? '新增训练样本：5.8 mm 不合格、6.2 mm 合格。' : '补入的是另两个零件，保留这两个测试输入。'}</p></div>`;
  } else
    main =
      depthIntro(
        '实验 04 / 把“学得好”画出来',
        '不只看选中了谁，也看为什么。',
        '图中每根柱子是一个候选分界；柱高来自当前样本的实际分错数。',
      ) +
      `<div class="depth-plot loss-plot">${lossPlot()}</div><div class="depth-actions">${actBtn(U.extra ? '比较原来的样本' : '加入边界样本后比较', 'learn10-update')}<b>最少错误：${Math.min(...learningCandidates().map((c) => c.errors))} 个错误</b></div><div class="parameter-bridge"><span>样本</span><i>→</i><span>预测</span><i>→</i><span>计算误差</span><i>→</i><strong>调整参数</strong></div>`;
  return depthShell(
    'learning10',
    [
      ['samples', '① 看样本'],
      ['train', '② 调分界'],
      ['test', '③ 测新零件'],
      ['meaning', '再想一层'],
    ],
    step,
    main,
    learningExplain(step, t, errors),
    depthSources(
      '数据与图表为教学示例，误判数实时计算；本例是阈值分类器，并非神经网络。',
      [
        [
          '训练与泛化',
          'https://developers.google.com/machine-learning/crash-course/overfitting/generalization',
        ],
        [
          '训练、验证与测试集',
          'https://developers.google.com/machine-learning/crash-course/overfitting/dividing-datasets',
        ],
      ],
    ),
  );
}
function testBoundaryPlot(t) {
  return `<div class="test-ruler" role="img" aria-label="机器分界与检验标准"><div class="test-rule-band" style="background:linear-gradient(90deg,color-mix(in srgb,var(--copper) 12%,var(--paper)) ${t * 10}%,var(--soft) ${t * 10}%)"></div><div class="test-rule" data-threshold="${t}" style="left:${t * 10}%"><span>${t.toFixed(1)} mm · 机器分界</span></div><div class="test-truth" style="left:60%"><span>6 mm · 检验标准</span></div><div class="test-point point-a" style="left:57%"><b>5.7</b></div><div class="test-point point-b" style="left:64%"><b>6.4</b></div><div class="test-ruler-ticks">${[0, 2, 4, 8, 10].map((v) => `<span style="left:${v * 10}%">${v}</span>`).join('')}</div></div>`;
}

const ComputeLayers = [
  [
    'program',
    '01',
    '程序',
    '任务代码',
    '把这 24 个数，分别乘以 2。',
    'CPU 上的程序准备数据、安排计算并接收结果。',
  ],
  [
    'cuda',
    '02',
    'CUDA',
    '软件平台',
    '表达、编译与启动 GPU 任务。',
    '提供 NVIDIA GPU 编程模型、工具及运行接口；它不是芯片。',
  ],
  [
    'gpu',
    '03',
    'GPU',
    '硬件',
    '许多计算单元执行相同操作。',
    '数据要能被 GPU 访问，任务也要适合分配给多个线程。',
  ],
];
function gpuTransferModel(n = 24, workers = 8, transfer = 1) {
  return {
    cpu: n,
    gpu: 2 * transfer + Math.ceil(n / workers),
    transfer: 2 * transfer,
    compute: Math.ceil(n / workers),
  };
}
function gpuDiagram() {
  const stage = +(U.panel.gpuStage || 0),
    labels = ['准备输入', '搬入数据', 'GPU 计算', '取回结果'];
  const payloads = ['[1, 2, 3, 4]', '[1, 2, 3, 4]', '×2  ×2  ×2  ×2', '[2, 4, 6, 8]'];
  const compact = typeof window !== 'undefined' && window.innerWidth < 780;
  const mobileDiagram = compact
    ? depthSvg(
        'gpu-flow',
        '一批数据经过 CPU 与 GPU',
        `当前 ${labels[stage]}。蓝色是 CPU 程序，铜色是 CUDA 软件接口，绿色是 GPU 硬件。`,
        `<rect class="cpu-node ${stage === 0 || stage === 3 ? 'active' : ''}" x="8" y="14" width="132" height="100" rx="8"/><text x="74" y="40" text-anchor="middle">① 程序 / CPU</text><text x="74" y="70" text-anchor="middle">${stage === 3 ? '2, 4, 6, 8' : '1, 2, 3, 4'}</text><text x="74" y="98" text-anchor="middle">准备与接收</text><rect class="gpu-node ${stage === 2 ? 'active' : ''}" x="220" y="14" width="132" height="100" rx="8"/><text x="286" y="40" text-anchor="middle">③ GPU 硬件</text>${[0, 1, 2, 3].map((i) => `<rect class="gpu-core ${stage === 2 ? 'working' : ''}" x="${232 + i * 28}" y="52" width="24" height="25" rx="3"/><text x="${244 + i * 28}" y="71" text-anchor="middle">×2</text>`).join('')}<text x="286" y="98" text-anchor="middle">并行处理</text><path class="data-path" d="M145 54H215"/><text x="180" y="44" text-anchor="middle">搬入 →</text><path class="data-path return-path" d="M215 96H145"/><text x="180" y="85" text-anchor="middle">← 返回</text><rect class="cuda-label" x="32" y="134" width="296" height="36" rx="6"/><text x="180" y="158" text-anchor="middle">② CUDA 软件接口 · 组织 GPU 计算</text><circle class="flow-token stage-${stage}" style="--flow-distance:54px" cx="${stage === 3 ? 208 : 152}" cy="${stage === 3 ? 96 : 54}" r="5"/>`,
        '0 0 360 180',
      )
    : null;
  return `<div class="gpu-journey" data-stage="${stage}">${
    mobileDiagram ||
    depthSvg(
      'gpu-flow',
      '一批数据经过 CPU 与 GPU',
      `当前 ${labels[stage]}。CPU 准备输入，通过 CUDA 接口启动 GPU 计算，再取回结果。`,
      `<path class="data-path" d="M236 100H484"/><path class="data-path return-path" d="M484 192H236"/>
    <text x="360" y="76" text-anchor="middle">搬入 → 启动任务</text><text x="360" y="228" text-anchor="middle">← 取回结果</text>
    <rect class="cpu-node ${stage === 0 || stage === 3 ? 'active' : ''}" x="32" y="48" width="204" height="164" rx="8"/><text class="node-title" x="134" y="88" text-anchor="middle">① 程序 / CPU</text><text x="134" y="124" text-anchor="middle">主机数据与控制</text><text class="payload" x="134" y="168" text-anchor="middle">${stage === 3 ? payloads[3] : payloads[0]}</text>
    <rect class="gpu-node ${stage === 2 ? 'active' : ''}" x="484" y="48" width="204" height="164" rx="8"/><text class="node-title" x="586" y="84" text-anchor="middle">③ GPU / 硬件</text>${[0, 1, 2, 3].map((i) => `<rect class="gpu-core ${stage === 2 ? 'working' : ''}" x="${504 + i * 44}" y="108" width="32" height="40" rx="4"/><text x="${520 + i * 44}" y="134" text-anchor="middle">×2</text>`).join('')}<text x="586" y="184" text-anchor="middle">${stage === 3 ? '2, 4, 6, 8' : '并行线程执行'}</text>
    <rect class="cuda-label" x="280" y="124" width="160" height="44" rx="6"/><text x="360" y="152" text-anchor="middle">② CUDA 接口</text>
    <circle class="flow-token stage-${stage}" cx="${stage === 1 ? 264 : stage === 3 ? 456 : 360}" cy="${stage === 3 ? 192 : 100}" r="6" aria-hidden="true"/>`,
      '0 0 720 256',
    )
  }</div>
    <div class="gpu-stage-controls">${tabs(
      labels.map((s, i) => [
        String(i),
        `${i + 1} ${compact ? ['准备', '搬入', '计算', '取回'][i] : s}`,
      ]),
      'gpuStage',
      String(stage),
    )}</div><p class="gpu-stage-status" role="status">${['CPU 先准备输入，并决定要启动哪段 GPU 程序。', '示例把输入从主机内存复制到 GPU 可访问的内存。', '同一段计算由多个线程处理不同元素；CUDA 调用组织执行。', '等待本次计算完成，再把需要的结果交回 CPU 程序。'][stage]}</p>`;
}
function computeTen() {
  const step = U.panel.compute10 || 'roles',
    transfer = +(U.panel.gpuTransfer || 1),
    workers = U.workers || 8,
    cost = gpuTransferModel(24, workers, transfer);
  let main, explain;
  if (step === 'roles') {
    main =
      depthIntro(
        '系统图 / 一项任务的分工',
        '沿着数据走，分清软件与硬件。',
        '用“每个数乘以 2”观察一次交接。点击阶段，查看数据在哪里。',
      ) +
      gpuDiagram() +
      `<div class="compute-focus-tabs">${tabs(
        [
          ['program', '① 程序'],
          ['cuda', '② CUDA'],
          ['gpu', '③ GPU'],
        ],
        'computeRole',
        U.panel.computeRole || 'program',
      )}</div><div class="compute-flow depth-compute-flow" data-focus="${U.panel.computeRole || 'program'}">${ComputeLayers.map(([id, n, name, type, example, desc]) => `<article class="flow-layer ${id}"><header><span>${n} / ${type}</span><h3>${name}</h3></header><strong>${example}</strong><p>${desc}</p></article>`).join('')}</div>`;
    explain = `<h2>CUDA 为什么不画成一块芯片？</h2>${depthNote('它跨在程序与 GPU 之间', 'CUDA 是软件平台与编程模型。程序借助其工具、库和接口使用 NVIDIA GPU。图中铜色框表示软件作用，不是第三块处理器。')}${depthNote('CPU 与 GPU 分工协作', 'CPU 负责程序控制等工作，GPU 适合执行大量可并行计算。把某段计算交给 GPU，不等于整个程序都搬到了 GPU。')}${depthNote('“搬数据”也是工作', '本图选用显式复制来讲解。实际系统还可以使用统一内存等机制；无论接口如何，数据位置、带宽与等待都可能影响速度。')}<div class="depth-callout"><b>从这里连接到 AI</b><p>训练和推理常包含大量矩阵运算，适合映射到并行硬件；但不是每一段任务都能同样加速。</p></div>`;
    if (typeof window !== 'undefined' && window.innerWidth < 780) {
      const roleStart = main.indexOf('<div class="compute-focus-tabs">');
      explain = main.slice(roleStart) + explain;
      main = main.slice(0, roleStart);
    }
  } else if (step === 'run') {
    main =
      depthIntro(
        '实验 / 并行计算',
        '一批 24 项任务，可以几项一起做？',
        '改变并行数再运行：观察每个节拍完成多少任务。',
      ) +
      `<div class="compute-runtime depth-runtime"><div class="cuda-box"><span class="layer-badge">② CUDA / 提交计算</span><div class="row spaced"><span>教学并行数</span>${tabs(
        [
          ['1', '1 项'],
          ['4', '4 项'],
          ['8', '8 项'],
        ],
        'workers',
        String(U.workers),
      )}</div></div><div class="gpu-box"><header><span class="layer-badge">③ GPU / 执行任务</span><strong id="task-status">${U.jobs} / 24</strong></header><div class="tasks-grid" id="tasks">${taskHTML()}</div></div><div class="depth-actions">${actBtn('开始计算', 'jobs', '', true)}${actBtn('重新开始', 'jobs-reset')}</div></div><div class="depth-result"><strong>${Math.ceil(24 / U.workers)}</strong><span>个计算节拍 / 不含搬运</span><b>24 项 ÷ ${U.workers} 项并行，向上取整</b></div>`;
    explain = `<h2>这次加速依赖什么？</h2>${depthNote('任务之间没有前后依赖', '每个数乘以 2 不需要等待另一个数的结果，所以可以把不同元素分给不同线程。')}${depthNote('有足够多的任务可分', '若只有一项工作，多出的计算单元也不会自动产生收益。任务分配、访存和调度都会改变真实结果。')}${depthNote('这里先只数计算节拍', `${U.workers} 项并行处理 24 个独立任务，需要 ${Math.ceil(24 / U.workers)} 个节拍。本动画刻意没有把这些节拍叫作毫秒或真实跑分。`)}<div class="depth-callout"><b>下一步，补上被忽略的代价</b><p>如果数据搬运时间很长，多项一起计算，还能让整个任务更快吗？</p></div>${actBtn('比较完整耗时 →', 'tab', 'data-group="compute10" data-id="limits"', true)}`;
  } else {
    const scale = 56,
      bar = (v) => Math.min(100, (v / scale) * 100);
    main =
      depthIntro(
        '对比图 / 完整耗时',
        '计算更快，整个任务也更快吗？',
        '使用可计算的教学节拍，比较顺序处理和“搬入—并行—搬回”。',
      ) +
      `<div class="cost-controls"><label>每次搬运耗时</label>${tabs(
        [
          ['1', '1 节拍'],
          ['8', '8 节拍'],
          ['16', '16 节拍'],
        ],
        'gpuTransfer',
        String(transfer),
      )}<label>并行数</label>${tabs(
        [
          ['1', '1 项'],
          ['4', '4 项'],
          ['8', '8 项'],
        ],
        'workers',
        String(workers),
      )}</div><div class="cost-chart" role="img" aria-label="CPU ${cost.cpu} 节拍；GPU 路径 ${cost.gpu} 节拍"><div><b>CPU 顺序</b><span class="cost-track"><i class="cost-cpu" style="width:${bar(cost.cpu)}%">${cost.cpu}</i></span></div><div><b>GPU 路径</b><span class="cost-track"><i class="cost-copy" style="width:${bar(transfer)}%"></i><i class="cost-gpu" style="width:${bar(cost.compute)}%"></i><i class="cost-copy" style="width:${bar(transfer)}%"></i><em>${cost.gpu}</em></span></div><div class="cost-axis"><span>0</span><span>28</span><span>56 节拍</span></div></div><div class="cost-legend"><span>▧ 搬运 ${transfer} + ${transfer}</span><span>■ GPU 计算 ${cost.compute}</span></div><div class="depth-result"><strong>${(cost.cpu / cost.gpu).toFixed(2)}×</strong><span>CPU 耗时 ÷ GPU 路径耗时</span><b>${cost.gpu < cost.cpu ? '本组条件下整体更快' : cost.gpu > cost.cpu ? '本组条件下反而更慢' : '本组条件下耗时相同'}</b></div><p class="depth-formula">${transfer}（搬入）+ ${cost.compute}（计算）+ ${transfer}（搬回）= ${cost.gpu} 节拍</p>`;
    explain = `<h2>先问瓶颈在哪里</h2>${depthNote('本图只比较同一批任务', 'CPU 每节拍做一项，GPU 每节拍最多做所选并行数。搬入和搬回分别需要所选节拍，图中条形使用同一横轴。')}${depthNote('这是教学模型，不是性能预测', '忽略了启动、同步、缓存、CPU 并行、访存竞争等细节；真实系统可能让搬运与计算重叠，不能照本图估算显卡跑分。')}${depthNote('显存和依赖也可能成为限制', '模型和数据放不下，可能需要分批；前一步结果没出来，后一步必须等待。CUDA 本身不会让这些约束消失。')}<div class="depth-callout"><b>如何判断“加速”是否有意义？</b><p>它比较的是计算内核、一次推理，还是包含读写和通信的完整任务？统计边界不同，倍数也不同。</p></div>`;
  }
  return depthShell(
    'compute10',
    [
      ['roles', '① 分清三层'],
      ['run', '② 跑一次任务'],
      ['limits', '③ 理解边界'],
    ],
    step,
    main,
    explain,
    depthSources(
      '程序、CUDA、GPU 分别对应任务代码、软件平台与硬件。颜色配合编号阅读；动画与节拍均为教学示意。',
      [
        [
          'NVIDIA：编程模型',
          'https://docs.nvidia.com/cuda/cuda-programming-guide/01-introduction/programming-model.html',
        ],
        [
          'NVIDIA：性能与数据传输',
          'https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html#data-transfer-between-host-and-device',
        ],
      ],
    ),
  );
}
