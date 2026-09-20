/* Six connected exhibits: representation -> generation -> evaluation. */
const LabSources = {
  token: [
    [
      '分词算法 / Hugging Face',
      'https://huggingface.co/docs/transformers/main/en/tokenizer_summary',
    ],
  ],
  language: [
    [
      '语言模型与上下文 / Google',
      'https://developers.google.com/machine-learning/crash-course/llm',
    ],
  ],
  attention: [['Attention Is All You Need / 原论文', 'https://arxiv.org/html/1706.03762v7']],
  quant: [
    [
      '量化概念 / Hugging Face',
      'https://huggingface.co/docs/transformers/quantization/concept_guide',
    ],
  ],
  risk: [['生成式 AI 风险说明 / NIST', 'https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf']],
};
function labTabs(group, items, value) {
  return `<div class="lab-controls">${tabs(items, group, String(value))}</div>`;
}
function labNotes(title, notes, question) {
  return `<h2>${title}</h2>${notes.map(([a, b]) => depthNote(a, b)).join('')}<div class="depth-callout"><b>带着这个问题继续</b><p>${question}</p></div>`;
}
function labShell(id, panels, active, main, explain, sourceText, sources) {
  const fragment = document.createElement('template');
  fragment.innerHTML = main;
  const parts = [...fragment.content.children];
  const intro = parts.find((el) => el.matches('.depth-intro'));
  const visual = parts.find((el) => el.matches('.lab-visual'));
  const result = parts.find((el) => el.matches('.lab-outcome'));
  const settings = parts.filter((el) => ![intro, visual, result].includes(el));
  main = `${intro.outerHTML}<div class="lab-workspace"><div class="lab-settings">${settings.map((el) => el.outerHTML).join('')}</div><div class="lab-stage">${visual.outerHTML}</div>${result.outerHTML}</div>`;
  if (id === 'token' || id === 'attention')
    sourceText += ' 教学例句保留中文，便于对照同一套词表和计算。';
  return depthShell('lab-' + id, panels, active, main, explain, depthSources(sourceText, sources))
    .replace('lesson-shell depth-lesson', 'lesson-shell depth-lesson model-lesson')
    .replace('class="depth-main"', 'class="depth-main lab-main"');
}
function labBar(label, value, max, text, accent = false) {
  return `<div class="lab-bar-row"><b>${label}</b><div class="lab-bar-track"><span style="width:${Math.max(0, Math.min(100, (value / max) * 100))}%" class="${accent ? 'accent' : ''}"></span></div><output>${text}</output></div>`;
}
function labSummary(value, label, detail) {
  return `<div class="lab-outcome" role="status"><strong>${value}</strong><span>${label}</span><p>${detail}</p></div>`;
}

function tokenLab() {
  const view = U.panel['lab-token'] || 'split';
  let main, explain;
  if (view === 'split') {
    const a = Core.tokenize(U.text),
      b = Array.from(U.text);
    main =
      depthIntro(
        '表示 / 先把文本变成单元',
        'Token 为什么不是“一个字”？',
        '输入一句短话，比较两套教学切分规则。空格也保留下来。',
      ) +
      `<form class="lab-input" data-lab-token><label for="lab-token-input">试一句话</label><input id="lab-token-input" aria-label="试一句话" maxlength="45" value="${esc(U.text)}"><button class="action primary" type="submit">观察切分</button></form><div class="lab-token-lanes lab-visual"><section><header><b>A / 连续英文合为一片</b><output>${a.length} 片</output></header><div class="lab-pieces">${a.map((t, i) => `<span style="--order:${Math.min(i, 8)}">${esc(t.replace(/ /g, '␣').replace(/\n/g, '↵'))}</span>`).join('')}</div></section><section><header><b>B / 按 Unicode 码点拆开</b><output>${b.length} 片</output></header><div class="lab-pieces">${b.map((t) => `<span>${esc(t.replace(/ /g, '␣').replace(/\n/g, '↵'))}</span>`).join('')}</div></section></div>` +
      labSummary(
        `${a.length} / ${b.length}`,
        '同一原文，不同片数',
        '两组片段都能拼回原文；这里的计数不能用于模型计费。',
      );
    explain = labNotes(
      '为什么机器需要切分？',
      [
        [
          '文字先变成离散单元',
          '模型接收数值输入。Tokenizer 先把文本转成词表中的单元，再映射到编号；一个单元可能覆盖词、子词、标点或其他片段。',
        ],
        [
          '规则是模型配套的一部分',
          '词表与切分算法不同，同一句话的 token 数可能不同。本页两种规则用于观察这种区别，不复现真实 BPE、Unigram 或任何商业分词器。',
        ],
        [
          '不要把片数当成信息量',
          '更多 token 会影响处理长度与资源，但不等于包含更多知识。后面的表示与计算决定模型怎样使用这些输入。',
        ],
      ],
      '“AI”是一片还是两片，能单凭屏幕上有几个字母判断吗？',
    );
  } else if (view === 'encode') {
    const ids = [7, 2, 5, 9],
      selected = +(U.panel.labTokenPick || 0),
      id = ids[selected],
      vector = ModelLab.embeddings[id];
    main =
      depthIntro(
        '表示 / 编号与向量',
        '编号只是索引，向量才进入计算。',
        '点选一个教学 token，沿着同一条链查看它的表示。',
      ) +
      labTabs(
        'labTokenPick',
        ['让', 'AI', '帮', '我'].map((t, i) => [String(i), t]),
        selected,
      ) +
      `<div class="lab-encoding lab-visual"><article><small>文本片段</small><strong>${ModelLab.vocabulary[id]}</strong><p>位置 ${selected + 1}</p></article><span class="lab-connector" aria-hidden="true">→</span><article><small>词表索引</small><strong>${id}</strong><p>词表第 ${id} 号</p></article><span class="lab-connector" aria-hidden="true">→</span><article class="lab-vector"><small>查表得到的向量</small><strong>[${vector.join(', ')}]</strong>${vector.map((v, i) => labBar('维度 ' + (i + 1), v, 1, v.toFixed(1))).join('')}</article></div>` +
      labSummary(
        '位置 ≠ 编号',
        '编号 ≠ 含义分数',
        '同一个 token 换了位置，词表索引仍相同；位置信息另行进入计算。',
      );
    explain = labNotes(
      '每一步，保留了什么？',
      [
        [
          '词表编号用来查找',
          '这里“让”的索引是 7，“AI”是 2。大小顺序没有“更重要”或“更聪明”的含义。教学词表仅为演示设定。',
        ],
        [
          '向量是一组可计算的数',
          '真实模型的嵌入通常由训练得到，维度远不止两个。不要把每一维都解释成一个明确的人类概念。',
        ],
        [
          '同一个词，在不同句子里会变化',
          '初始表示随后与位置和上下文结合，经过多层计算得到新的表示。初始嵌入与最终输出之间还有很多步骤。',
        ],
      ],
      '看到一串数字时，先分清它是位置、编号，还是表示中的一个数。',
    );
  } else {
    const scene = U.panel.labScene || 'picnic',
      row = ModelLab.continuations[scene],
      draw = +(U.panel.labDraw || 0.6),
      chosen = ModelLab.chooseToken(scene, draw);
    main =
      depthIntro(
        '生成 / 一步一步续写',
        '它先产生候选，再选择下一片。',
        '改变前文，观察教学概率表；再换一个固定抽样点。',
      ) +
      labTabs(
        'labScene',
        [
          ['picnic', '准备出游'],
          ['deadline', '临近交稿'],
        ],
        scene,
      ) +
      `<div class="lab-generation lab-visual"><div class="lab-prefix">${row.prefix}<b class="lab-next-token">${chosen}</b></div><div class="lab-bars">${row.options.map(([t, p]) => labBar(t, p, 1, `${Math.round(p * 100)}%`, t === chosen)).join('')}</div></div>` +
      labTabs(
        'labDraw',
        [
          ['0.2', '抽样点 0.20'],
          ['0.6', '抽样点 0.60'],
          ['0.95', '抽样点 0.95'],
        ],
        draw,
      ) +
      labSummary(
        `<span data-i18n-skip>${esc(chosen)}</span>`,
        '本轮选出的片段',
        '按列表顺序累加概率区间；固定抽样点让结果可复现。',
      );
    explain = labNotes(
      '“预测下一片”怎样形成长回答？',
      [
        [
          '生成结果又成为输入',
          '自回归生成把刚选中的 token 接到前文，再计算下一步，直到结束标记或长度等条件触发。',
        ],
        [
          '概率高，和事实正确是两回事',
          '概率表示模型在当前条件下倾向怎样续写；它本身不是事实核验，也不能直接当作答案正确率。',
        ],
        [
          '本图刻意停在一步',
          '两套概率是手工教学数据，候选合计为 100%。真实词表大得多，数值由模型计算；不同解码方法也会改变最终选择。',
        ],
      ],
      '一段回答很自然，只能说明它自然，还是已经证明它有可靠依据？',
    );
  }
  return labShell(
    'token',
    [
      ['split', '① 切成片段'],
      ['encode', '② 变成数值'],
      ['generate', '③ 生成下一个词元'],
    ],
    view,
    main,
    explain,
    '词表、向量、概率均为自建教学数据；不调用真实模型。',
    [...LabSources.token, ...LabSources.language],
  );
}

function parametersLab() {
  const view = U.panel['lab-parameters'] || 'meaning',
    gain = +(U.panel.labGain || 1),
    input = 2,
    result = input * gain;
  let main, explain;
  if (view === 'meaning') {
    main =
      depthIntro(
        '参数 / 改变计算的数',
        '同一份输入，参数改变了结果。',
        '先看一个只有一个可调参数的小规则：输出 = 输入 × 权重。',
      ) +
      labTabs(
        'labGain',
        [
          ['0.5', '权重 0.5'],
          ['1', '权重 1'],
          ['2', '权重 2'],
        ],
        gain,
      ) +
      `<div class="lab-calculation lab-visual"><div><small>输入</small><strong>${input}</strong></div><span>×</span><div class="lab-weight"><small>参数</small><strong>${gain}</strong></div><span>=</span><div><small>输出</small><strong>${result}</strong></div></div>` +
      labSummary(
        '只改一个数',
        '结果随之改变',
        '这是一条标量计算规则，用于认识参数；不是完整神经网络。',
      );
    explain = labNotes(
      '参数与资料，怎样区分？',
      [
        [
          '训练会调整参数',
          '在训练中，优化方法依据目标和样本改变许多数，使模型的输出更符合目标。这里由你手动改一个权重，观察作用。',
        ],
        [
          '问一次问题，通常不等于再训练',
          '普通推理使用已加载的参数处理当前输入。把文件放进上下文，通常不会自动把这些内容写入参数。',
        ],
        [
          '参数不是逐页存放的百科全书',
          '训练可能形成广泛能力，也可能记住片段，但无法用“一个参数等于一条知识”来计数。查来源与更新事实仍需要另行处理。',
        ],
      ],
      '如果问题需要今天刚发生的事实，参数多一些是否就能解决？',
    );
  } else if (view === 'memory') {
    const count = +(U.panel.labParams || 7),
      bits = +(U.panel.labBits || 4),
      size = Core.weightGiB(count, bits);
    main =
      depthIntro(
        '存储 / 理论权重体积',
        '参数量与精度，共同决定基础体积。',
        '比较同一参数量下的 4、8、16 bit 表示。横轴统一为 140 GiB。',
      ) +
      labTabs(
        'labParams',
        [
          ['1', '1 B'],
          ['7', '7 B'],
          ['32', '32 B'],
          ['70', '70 B'],
        ],
        count,
      ) +
      `<div class="lab-bars lab-visual">${[4, 8, 16].map((bit) => labBar(bit + ' bit', Core.weightGiB(count, bit), 140, Core.weightGiB(count, bit).toFixed(2) + ' GiB', bit === bits)).join('')}</div>` +
      labTabs(
        'labBits',
        [
          ['4', '查看 4 bit'],
          ['8', '查看 8 bit'],
          ['16', '查看 16 bit'],
        ],
        bits,
      ) +
      labSummary(
        size.toFixed(2) + ' GiB',
        '仅理论权重体积',
        `${count} × 10⁹ × ${bits} ÷ 8 ÷ 2³⁰；B 表示十亿个参数。`,
      );
    explain = labNotes(
      '这还不是“需要多少显存”的答案',
      [
        [
          '权重只是其中一项',
          '运行还可能需要缓存、中间结果、框架开销及量化元数据；训练还需要梯度与优化器等状态。不能只拿左侧数字购买硬件。',
        ],
        [
          '同样总参数量，也可能算得不同',
          '模型结构、激活的参数、输入长度、批量和执行方式都会影响资源与延迟。总参数量不能单独排出速度或质量。',
        ],
        [
          '量化改变表示精度',
          '低 bit 通常降低权重存储，但具体方法、硬件支持和任务质量都要验证。左侧只是位数乘法，不是任何模型的实测。',
        ],
      ],
      '硬件装得下权重，就一定能流畅运行你的完整任务吗？',
    );
  } else {
    const bits = +(U.panel.labQuant || 2),
      values = [-0.82, -0.24, 0.13, 0.77],
      rounded = values.map((v) => ModelLab.quantize(v, bits)),
      mae = values.reduce((s, v, i) => s + Math.abs(v - rounded[i]), 0) / values.length;
    main =
      depthIntro(
        '精度 / 观察舍入',
        '格子变少，同一个数会落在哪里？',
        '在 [-1, 1] 固定范围上，使用等间隔的教学量化网格。',
      ) +
      labTabs(
        'labQuant',
        [
          ['2', '2 bit / 4 格'],
          ['3', '3 bit / 8 格'],
          ['4', '4 bit / 16 格'],
        ],
        bits,
      ) +
      `<div class="lab-quant-table lab-visual"><div class="lab-table-heading"><span>原始值</span><span>表示后的值</span><span>绝对误差</span></div>${values.map((v, i) => `<div><b>${v.toFixed(2)}</b><strong>${rounded[i].toFixed(3)}</strong><span>${Math.abs(v - rounded[i]).toFixed(3)}</span></div>`).join('')}</div>` +
      labSummary(
        mae.toFixed(3),
        '这四个数的平均绝对误差',
        '多一些格子不代表每个数的误差都必然更小；具体位置也有影响。',
      );
    explain = labNotes(
      '少占空间，付出了什么？',
      [
        [
          '有限网格代替连续取值',
          '这里把范围分成 2ᵇ 个可表示值，选取最近的一格。数值可能发生变化；表格展示这些变化，并不测量回答质量。',
        ],
        [
          '数值误差不等于任务误差',
          '某个权重变化一点，最终回答是否受影响，取决于模型和任务。不能把左侧平均误差读成“准确率损失”。',
        ],
        [
          '真实量化方法更复杂',
          '真实系统可能按组选择尺度、使用不同数值格式或校准方法。这个固定范围实验只解释精度和舍入的基本关系。',
        ],
      ],
      '如果压缩后只在少数关键任务上失误，平均分会不会掩盖问题？',
    );
  }
  return labShell(
    'parameters',
    [
      ['meaning', '① 参数做什么'],
      ['memory', '② 占多少空间'],
      ['precision', '③ 精度的代价'],
    ],
    view,
    main,
    explain,
    '计算由页面实时完成。容量图只含权重；量化网格是教学模型。',
    [...LabSources.quant, ...LabSources.language],
  );
}

function contextLab() {
  const view = U.panel['lab-context'] || 'pack',
    strategy = U.panel.labContext || 'all',
    plan = ModelLab.contextPlan(strategy),
    selected = U.panel.labMaterial || 'goal';
  let main, explain;
  if (view === 'pack') {
    main =
      depthIntro(
        '上下文 / 一次请求的工作空间',
        '不是放得越多，回答就越有依据。',
        '12 格教学容量，同时容纳输入与输出预留。试着换一种准备方法。',
      ) +
      labTabs(
        'labContext',
        [
          ['all', '全部塞入'],
          ['focused', '保留关键依据'],
          ['lossy', '过度压缩'],
        ],
        strategy,
      ) +
      `<div class="lab-context-pack lab-visual"><div class="lab-capacity-title"><b>${plan.used} / ${plan.capacity} 格</b><span>${plan.overflow ? '超出 ' + plan.overflow + ' 格' : '剩余 ' + plan.spare + ' 格'}</span></div><div class="lab-capacity">${Array.from(
        { length: Math.max(12, plan.used) },
        (_, i) => {
          let n = 0;
          const id = plan.ids.find((k) => (n += ModelLab.contextItems[k].size) > i);
          return `<span class="${id || 'empty'} ${i >= 12 ? 'overflow' : ''}" title="${id ? ModelLab.contextItems[id].title : '空余'}">${i >= 12 ? '×' : i + 1}</span>`;
        },
      ).join(
        '',
      )}</div><div class="lab-capacity-key">${plan.ids.map((id) => `<span><i class="${id}"></i>${ModelLab.contextItems[id].title} ${ModelLab.contextItems[id].size}</span>`).join('')}</div></div>` +
      labSummary(
        plan.overflow ? '放不下' : plan.evidence ? '有依据，也有余量' : '放得下，但丢了依据',
        '当前准备结果',
        plan.overflow
          ? '本例停止组装，不擅自截掉资料。'
          : plan.evidence
            ? '保留原始记录和输出空间，仍需检查回答。'
            : '容量合格不能补回已经被摘要删掉的事实。',
      );
    explain = labNotes(
      '先决定放什么，再谈窗口多大',
      [
        [
          '窗口是有限的当前输入',
          '系统规则、用户问题、材料、历史与工具结果都可能占用上下文。具体模型的计数与输出限制需看对应说明。',
        ],
        [
          '放得下只是第一关',
          '材料需要相关、准确、可追溯；填满窗口不能保证模型使用了关键内容。这里用“格”讲容量，不计算真实 token。',
        ],
        [
          '超限处理由系统决定',
          '可能报错、截断、摘要或重选材料，不存在统一的“自动记住重要部分”。本展品明确停下，让你选择。',
        ],
      ],
      '如果必须拿走一份材料，依据是什么，而不只是“它最长”？',
    );
  } else if (view === 'inspect') {
    const item = ModelLab.contextItems[selected] || ModelLab.contextItems.goal;
    main =
      depthIntro(
        '材料 / 看见摘要丢掉什么',
        '压缩文本，也可能压缩掉关键条件。',
        '比较原始记录、带出处摘要和失真摘要。',
      ) +
      labTabs(
        'labMaterial',
        [
          ['evidence', '原始记录'],
          ['summary', '带出处摘要'],
          ['poor', '失真摘要'],
        ],
        selected === 'goal' ? 'evidence' : selected,
      ) +
      `<div class="lab-document lab-visual"><span>材料 / ${selected === 'goal' ? '原始记录' : item.title}</span><blockquote>${selected === 'goal' ? ModelLab.contextItems.evidence.detail : item.detail}</blockquote><div class="lab-document-lines" aria-hidden="true"><i></i><i></i><i></i></div></div>` +
      labSummary(
        selected === 'poor' ? '复位动作已丢失' : '保留可追溯的过程',
        '问：设备是否自行恢复？',
        selected === 'poor'
          ? '仅凭“后来好了”，不能确认恢复原因。'
          : '时间先后可以观察；因果仍需结合其他证据。',
      );
    explain = labNotes(
      '摘要应该保留什么？',
      [
        [
          '围绕当前任务取舍',
          '如果任务是解释恢复过程，“谁在何时做了什么”就很重要。若任务换成统计月份，所需信息又会不同。',
        ],
        [
          '压缩要留下回去的路',
          '原始记录编号、时间与未确认项能帮助复核。摘要不是来源的替身，重要判断需要回查原文。',
        ],
        [
          '看见不是相信',
          '把资料放进上下文，只表示模型可使用它。资料本身可能错误，生成结果也可能误读。下一幕继续拆开主张与依据。',
        ],
      ],
      '要验证一句话，眼前的摘要是否足够，还是必须打开原始记录？',
    );
  } else {
    main =
      depthIntro(
        '记忆 / 三种容易混淆的东西',
        '当前看见、长期保存、训练学到。',
        '点击一种“记得”，看它保存在哪里、怎样变化。',
      ) +
      labTabs(
        'labMemory',
        [
          ['context', '当前上下文'],
          ['store', '外部存储'],
          ['weights', '模型参数'],
        ],
        U.panel.labMemory || 'context',
      );
    const mode = U.panel.labMemory || 'context',
      rows = {
        context: [
          '这一轮的材料',
          '请求中提供的文字与其他输入',
          '下一轮是否还在，取决于应用怎样组装。',
        ],
        store: [
          '应用保存的记录',
          '文件、数据库或产品记忆功能',
          '需要保存、检索与权限，取出的片段才能再次送入模型。',
        ],
        weights: [
          '训练形成的参数',
          '模型计算中的大量数值',
          '通常通过训练或微调更新，不是聊天即自动写入。',
        ],
      },
      r = rows[mode];
    main +=
      `<div class="lab-memory-map lab-visual"><div class="lab-memory-core"><small>${r[0]}</small><h3>${r[1]}</h3><p>${r[2]}</p></div><div class="lab-memory-route">应用选择材料 <span>→</span> 当前请求 <span>→</span> 模型计算</div></div>` +
      labSummary(
        '“上次告诉过它”',
        '仍要检查这次输入',
        '产品可能保存历史，但不等于每次都完整地送入模型。',
      );
    explain = labNotes(
      '把“记忆”拆开，才能排查问题',
      [
        ['参数没有这条事实', '如果事实很新，可能需要查资料；增加聊天历史不能改变训练截止的事实。'],
        [
          '应用保存了，却没有取出',
          '可能是检索、权限、摘要或组装问题。应检查本次实际使用了哪些材料。',
        ],
        [
          '材料已放入，却使用错误',
          '这时要检查冲突信息、任务要求与生成结果。加大容量不是通用修复。',
        ],
      ],
      '它说“不记得”时，你会先检查哪一个环节？',
    );
  }
  return labShell(
    'context',
    [
      ['pack', '① 安排容量'],
      ['inspect', '② 检查材料'],
      ['memory', '③ 分清记忆'],
    ],
    view,
    main,
    explain,
    '容量格、设备记录和摘要均为教学情境；不是模型真实窗口或诊断结论。',
    LabSources.language,
  );
}

function attentionLab() {
  const view = U.panel['lab-attention'] || 'weights',
    q = +(U.panel.labQuery ?? 1),
    mask = (U.panel.labMask || 'on') === 'on',
    temp = +(U.panel.labAttentionTemp || 1),
    r = Core.attention(q, temp, mask),
    words = ['让', 'AI', '帮', '我'];
  let main, explain;
  const controls =
    labTabs(
      'labQuery',
      words.map((s, i) => [String(i), `${i + 1} ${s}`]),
      q,
    ) +
    labTabs(
      'labMask',
      [
        ['on', '只看当前位置及之前'],
        ['off', '取消遮罩作比较'],
      ],
      mask ? 'on' : 'off',
    );
  if (view === 'weights') {
    main =
      depthIntro(
        '注意力 / 信息怎样汇合',
        '选一个位置，看信息来自哪里。',
        '展示一个注意力头的教学权重。百分比来自下面同一套数值计算。',
      ) +
      controls +
      `<div class="lab-attention-bars lab-bars lab-visual">${words.map((s, i) => labBar(`${i + 1} ${s}`, r.weights[i], 1, mask && i > q ? '已遮罩' : (r.weights[i] * 100).toFixed(1) + '%', i === q)).join('')}</div>` +
      labSummary(
        '合计 ' + (r.weights.reduce((a, b) => a + b, 0) * 100).toFixed(0) + '%',
        '这一位置的信息混合权重',
        '权重不是“理解程度”，也不是答案正确概率。',
      );
    explain = labNotes(
      '“看向哪里”是计算，不是目光',
      [
        [
          '先产生匹配分数',
          '查询向量 Q 与各位置的 K 做匹配，随后归一化。本页向量手工设定，真实模型会通过训练形成相关变换。',
        ],
        [
          '遮罩阻止偷看未来',
          '生成式模型中的因果注意力不使用后面的 token。取消遮罩用于比较机制，不表示生成时真的拿到了未来的答案。',
        ],
        [
          '只展示一个局部',
          '多头、多层、残差与前馈等计算共同作用。单张权重图不能完整解释模型为什么作出某个判断。',
        ],
      ],
      '某个位置权重最高，能否据此宣布它就是回答的唯一原因？',
    );
  } else if (view === 'math') {
    main =
      depthIntro(
        '计算 / 从匹配分数到混合',
        '同一组数字，走完三个步骤。',
        '先算 Q·K / √2，再归一化，最后按权重混合 V。',
      ) +
      controls +
      `<div class="lab-attention-table lab-visual"><div class="lab-table-heading"><span>位置</span><span>分数</span><span>权重</span><span>内容 V</span></div>${words.map((s, i) => `<div><b data-i18n-skip>${s}</b><span>${Number.isFinite(r.logits[i]) ? r.logits[i].toFixed(3) : '−∞'}</span><strong>${r.weights[i].toFixed(3)}</strong><span>[${r.v[i].join(', ')}]</span></div>`).join('')}</div>` +
      labSummary(
        `[${r.result.map((x) => x.toFixed(3)).join(', ')}]`,
        '加权求和后的二维结果',
        `查询 Q = [${r.q[q]}]；表中每个 V 乘对应权重，再逐维相加。`,
      );
    explain = labNotes(
      '三个步骤，各自解决什么？',
      [
        [
          '① 匹配：这里用了点积',
          `取 Q 与每个 K 的对应分量相乘并相加，再除以 √2。本例 Q=[${r.q[q]}]，四个 K 依次为 [1,0]、[0,1]、[1,1]、[1.5,0.5]。−∞ 遮掉未来位置。`,
        ],
        [
          '② 归一化：变成可混合的权重',
          'Softmax 将可见分数转成非负权重，总和为 1。实现中先减去最大分数，避免指数运算溢出。',
        ],
        [
          '③ 聚合：按权重混合 V',
          '每个 V 乘以自己的权重再相加。输出是一组表示，不是直接得到一段自然语言答案。',
        ],
      ],
      '如果某个位置被遮罩，它的内容还能经这一注意力头直接参与求和吗？',
    );
  } else {
    main =
      depthIntro(
        '连接 / 从一个模块回到模型',
        '注意力完成的，只是其中一步。',
        '点击一层关系，区分输入表示、信息混合和输出候选。',
      ) +
      labTabs(
        'labAttentionStep',
        [
          ['0', '输入表示'],
          ['1', '多层处理'],
          ['2', '输出候选'],
        ],
        U.panel.labAttentionStep || '1',
      ) +
      `<div class="lab-transformer lab-visual">${[
        ['Token 与位置', '文字编号转为向量，并加入位置信息。'],
        ['注意力 + 其他计算', '不同位置交换信息，前馈等计算进一步变换表示。'],
        ['词表分数与选择', '输出层形成候选分布，解码方法选择下一 token。'],
      ]
        .map(
          ([h, p], i) =>
            `<section class="${+(U.panel.labAttentionStep || 1) === i ? 'active' : ''}"><b>0${i + 1}</b><div><h3>${h}</h3><p>${p}</p></div></section>`,
        )
        .join('')}</div>` +
      labSummary(
        '模块能组合',
        '解释也需要分层',
        '这是一条简化的生成式 Transformer 路线，不代表所有 AI 架构。',
      );
    explain = labNotes(
      '为什么局部实验仍然有用？',
      [
        [
          '把名词放回关系中',
          'Token 负责表示入口，参数规定运算，上下文提供当前材料，注意力参与信息混合。它们不是互相替代的东西。',
        ],
        [
          '会续写，可以支持许多任务',
          '训练与后续适配能使模型执行翻译、总结、问答等任务；实际能力必须在对应输入与验收条件下评估。',
        ],
        [
          '下一幕，换一把尺子',
          '理解它怎样产生回答后，再检查回答是否受证据支持。机制说明不能代替事实核验。',
        ],
      ],
      '哪些问题可以通过改输入解决，哪些需要换模型、补工具或重新验收？',
    );
  }
  return labShell(
    'attention',
    [
      ['weights', '① 看权重'],
      ['math', '② 算一遍'],
      ['model', '③ 回到完整模型'],
    ],
    view,
    main,
    explain,
    '四个 token 的 Q/K/V 为手工二维数据；按实际公式计算，不是商用模型的可视化。',
    LabSources.attention,
  );
}

const EvidenceLabCases = {
  logs: {
    label: '设备记录',
    title: '恢复了，等于自行恢复了吗？',
    draft: '设备后来恢复运行，全程没有人工操作，以后可以关闭这类告警。',
    records: [
      ['10:00', '设备报出告警 E17。'],
      ['10:02', '操作记录：人工执行复位。'],
      ['10:03', '设备回到运行状态；未提供原因分析。'],
    ],
    claims: [
      ['设备后来恢复运行', 'supported', '记录直接支持状态变化。'],
      ['恢复前没有人工操作', 'contradicted', '10:02 有人工复位记录，与“没有人工操作”直接冲突。'],
      ['以后可以关闭告警', 'unknown', '缺少根因、影响和复发资料，无法据此决定。'],
    ],
    revised:
      '记录显示，设备在人工复位后恢复运行。现有记录不足以确定告警根因，也不支持直接关闭告警。',
    next: '检查复位前后的完整记录、触发条件及复发情况。',
  },
  study: {
    label: '学习助手',
    title: '答对这几题，就掌握了吗？',
    draft: '你这次五题全对，已经完全掌握，可以不再复习。',
    records: [
      ['测验 A', '5 道已练习过的题，答对 5 道。'],
      ['测验 B', '未提供新题或迁移任务的表现。'],
      ['一周后', '未检查延迟回忆与遗忘情况。'],
    ],
    claims: [
      ['这次五题全部答对', 'supported', '成绩直接支持这次表现。'],
      ['所有同类新题都能答对', 'unknown', '已有题的成功不能证明所有新题表现。'],
      ['可以永久停止复习', 'unknown', '缺少保持程度与目标要求的信息。'],
    ],
    revised:
      '这次五道练习题全部答对。可以再用未做过的题和隔一段时间的回忆检查，判断是否能迁移和保持。',
    next: '换一个例子，换一种问法，并在之后重新检查。',
  },
  report: {
    label: '工作报告',
    title: '速度提高了，工作就更有效吗？',
    draft: '草稿时间从 30 分钟降到 10 分钟，所以总效率提高了三倍。',
    records: [
      ['写草稿', '原来 30 分钟，现在 10 分钟。'],
      ['检查修改', '原来 5 分钟，现在 20 分钟。'],
      ['比较条件', '同样数量的报告；尚未比较内容质量。'],
    ],
    claims: [
      ['草稿环节快了三倍', 'supported', '单看草稿耗时：30 ÷ 10 = 3。'],
      ['整体耗时也缩短为三分之一', 'contradicted', '完整耗时从 35 到 30 分钟，不能套用局部倍数。'],
      ['内容质量已经提高', 'unknown', '材料没有提供质量评估。'],
    ],
    revised:
      '草稿时间减少了 20 分钟，但检查修改增加了 15 分钟；总耗时从 35 降到 30 分钟。质量变化还需要独立评估。',
    next: '把人工检查、重试和交付验收纳入同一统计边界。',
  },
};
function evidenceLab() {
  const view = U.panel['lab-evidence'] || 'claim',
    caseId = U.panel.labEvidenceCase || 'logs',
    c = EvidenceLabCases[caseId],
    pick = +(U.panel.labClaim || 0),
    claim = c.claims[pick],
    answer = U.panel['labVerdict-' + caseId + '-' + pick];
  const cases = labTabs(
    'labEvidenceCase',
    Object.entries(EvidenceLabCases).map(([k, v]) => [k, v.label]),
    caseId,
  );
  let main;
  if (view === 'claim')
    main =
      depthIntro(
        '判断 / 把流畅回答拆开',
        c.title,
        '同一段话可能混有观察、解释和行动建议。逐句看它要求什么证据。',
      ) +
      cases +
      `<div class="lab-claim-sheet lab-visual"><blockquote>${c.draft}</blockquote><div class="lab-claims">${c.claims.map(([s], i) => `<button data-do="tab" data-group="labClaim" data-id="${i}" aria-pressed="${pick === i}"><span>0${i + 1}</span>${s}</button>`).join('')}</div></div>` +
      labSummary('主张 ' + (pick + 1), '先明确要核验哪句话', claim[0]);
  else if (view === 'check')
    main =
      depthIntro(
        '核验 / 对照材料',
        '来源在这里，结论能走多远？',
        '先读三条记录，再对当前主张作出判断。',
      ) +
      cases +
      `<div class="lab-evidence-records lab-visual">${c.records.map(([date, text]) => `<article><span>${date}</span><p>${text}</p></article>`).join('')}</div>` +
      labTabs(
        'labClaim',
        c.claims.map((_, i) => [String(i), '主张 ' + (i + 1)]),
        pick,
      ) +
      `<p class="lab-current-claim">${claim[0]}</p>` +
      labTabs(
        'labVerdict-' + caseId + '-' + pick,
        [
          ['supported', '材料支持'],
          ['contradicted', '材料冲突'],
          ['unknown', '证据不足'],
        ],
        answer || '',
      ) +
      labSummary(
        answer ? (answer === claim[1] ? '判断一致' : '再对照一次') : '先做判断',
        '本馆对材料的解读',
        answer ? claim[2] : '不根据语气、篇幅或引用数量给结论评分。',
      );
  else
    main =
      depthIntro(
        '表达 / 把结论收回证据范围',
        '修正的不只是语气，还有结论边界。',
        '保留已知事实，明确未知，提出可以补证的下一步。',
      ) +
      cases +
      `<div class="lab-rewrite lab-visual"><article><span>原先的说法</span><p>${c.draft}</p></article><article><span>有证据支持的表述</span><p>${c.revised}</p></article></div>` +
      labSummary('下一步查什么', '把“不知道”变成可执行的问题', c.next);
  const explain = labNotes(
    '不要让一个引用承担三种证明',
    [
      [
        '观察：记录里实际出现什么',
        '先核对对象、时间、原文和统计边界。材料支持一句观察，不等于支持由它推出的全部解释。',
      ],
      [
        '解释：还有没有另一种原因',
        '先后发生不自动证明因果；局部成功也不能保证推广。寻找可能推翻当前结论的反例与缺失条件。',
      ],
      [
        '行动：谁来承担错误后果',
        '行动还依赖目标、授权与可逆性。证据薄弱时，可以缩小动作、补查或交给适当的人判断。',
      ],
    ],
    '你现在能指出“哪句话、哪份证据、还缺什么”，而不只是说“可能有幻觉”吗？',
  );
  return labShell(
    'evidence',
    [
      ['claim', '① 拆开主张'],
      ['check', '② 对照依据'],
      ['revise', '③ 修正表达'],
    ],
    view,
    main,
    explain,
    '三个案例全部为预写教学材料，不是真实设备诊断、客户数据或模型实测。',
    LabSources.risk,
  );
}

function choiceLab() {
  const view = U.panel['lab-choice'] || 'quality',
    task = U.panel.labTrial || 'extraction',
    t = ModelLab.trials[task],
    a = ModelLab.trialCost(t.a),
    b = ModelLab.trialCost(t.b),
    threshold = +(U.panel.labGate || 90);
  const taskTabs = labTabs(
    'labTrial',
    [
      ['extraction', '提取字段'],
      ['reasoning', '综合判断'],
    ],
    task,
  );
  let main, explain;
  if (view === 'quality') {
    main =
      depthIntro(
        '比较 / 把模型放进同一个任务',
        '换一个任务，优势还一样吗？',
        'A、B 是虚构方案，使用相同的 20 个教学任务与验收口径。',
      ) +
      taskTabs +
      `<div class="lab-bars lab-visual">${labBar('方案 A', t.a.passed, 20, `${t.a.passed} / 20`)}${labBar('方案 B', t.b.passed, 20, `${t.b.passed} / 20`, true)}</div>` +
      labTabs(
        'labGate',
        [
          ['90', '门槛 90%'],
          ['95', '门槛 95%'],
        ],
        threshold,
      ) +
      labSummary(
        `A ${(t.a.passed / 20) * 100 >= threshold ? '达标' : '未达标'} · B ${(t.b.passed / 20) * 100 >= threshold ? '达标' : '未达标'}`,
        '先检查最低质量条件',
        `本组门槛 ${threshold}%；样本很小，不代表稳定的真实成功率。`,
      );
    explain = labNotes(
      '评测先固定什么？',
      [
        [
          '输入、要求和验收一致',
          '同题、同资料、同输出要求；保留失败记录。不要只挑各自最好看的一个答案作比较。',
        ],
        [
          '关键错误可能需要单独设门槛',
          '总通过数会掩盖某类集中失败。重要字段、来源准确性或权限违规，可能需要逐项检查。',
        ],
        [
          '门槛来自任务，而不是排行榜',
          '如果两种方案都不达标，应调整流程、缩小范围或继续验证。成本低不能抵消不可接受的错误。',
        ],
      ],
      '你的实际任务里，哪一种错误不能被其他九次成功抵消？',
    );
  } else if (view === 'cost') {
    main =
      depthIntro(
        '代价 / 看完整工作量',
        '调用便宜，总成本就低吗？',
        '教学成本单位：A 每次 1，B 每次 4；每分钟人工检查计 2。',
      ) +
      taskTabs +
      `<div class="lab-cost-table lab-visual"><div class="lab-table-heading"><span>方案</span><span>调用成本</span><span>人工检查</span><span>合计</span></div>${[
        ['A', t.a, a],
        ['B', t.b, b],
      ]
        .map(
          ([name, r, c]) =>
            `<div><b>${name}</b><span>${r.calls} × ${r.unit} = ${c.model}</span><span>${r.review} × 2 = ${c.human}</span><strong>${c.total}</strong></div>`,
        )
        .join(
          '',
        )}<div class="lab-bars">${labBar('A / 通过一项', a.perPass, 12, a.perPass.toFixed(2))}${labBar('B / 通过一项', b.perPass, 12, b.perPass.toFixed(2), true)}</div></div>` +
      labSummary(
        a.total < b.total ? 'A 合计更低' : 'B 合计更低',
        '教学成本，须与质量一起判断',
        '包含重试后的调用次数与人工检查；不含搭建、维护等额外成本。',
      );
    explain = labNotes(
      '两种分母，回答两种问题',
      [
        [
          '合计：这批任务花了多少',
          '调用次数已包括重试；人工检查包括所有任务。一次调用单价不足以描述完成工作的总成本。',
        ],
        [
          '每个通过项：合计除以通过数',
          '这项指标把失败任务的成本也算进去，但不意味着失败已被消除。仍应先过质量门槛。',
        ],
        [
          '真实价格需要重新取证',
          '这里没有使用任何厂商报价。真实估算要分别核对输入、输出、缓存、工具、计费单位与人工时间。',
        ],
      ],
      '省下的生成时间，会不会被重试和人工修正重新花掉？',
    );
  } else {
    const scenario = U.panel.labControl || 'public';
    main =
      depthIntro(
        '控制权 / 把不可妥协的条件列出来',
        '有些条件，不能用平均分抵消。',
        '对比公开资料摘要与受限制资料的处理要求。',
      ) +
      labTabs(
        'labControl',
        [
          ['public', '公开资料'],
          ['restricted', '受限制资料'],
        ],
        scenario,
      ) +
      `<div class="lab-boundary-list lab-visual">${(scenario === 'public'
        ? [
            ['资料去向', '确认服务如何处理输入、日志与保留。'],
            ['许可与来源', '公开可读不等于可以任意转载或再分发。'],
            ['结果验收', '检查出处与事实，不把服务品牌当作证明。'],
          ]
        : [
            ['外部传输', '先确认数据是否允许离开当前环境。'],
            ['运行与访问', '本地运行仍需要权限、更新和运维安排。'],
            ['保存与追踪', '明确谁能读取日志，保留多久，如何撤回访问。'],
          ]
      )
        .map(
          ([h, p], i) =>
            `<article><span>0${i + 1}</span><div><h3>${h}</h3><p>${p}</p></div></article>`,
        )
        .join('')}</div>` +
      labSummary(
        '先满足边界',
        '再比较质量与成本',
        '开放权重、开源许可、本地部署、服务承诺是不同问题。',
      );
    explain = labNotes(
      '选择是条件判断，不是固定冠军',
      [
        [
          '服务方式改变责任分配',
          '托管服务和本地运行把维护、升级与数据处理放在不同位置。应按实际条件核对，而不是只看宣传标签。',
        ],
        [
          '设计可以是组合方案',
          '不同环节可选不同工具或模型；但每次交接都要保持资料范围、来源和验收条件清楚。',
        ],
        [
          '把比较结果带进工坊',
          '下一幕会把目标、资料、工具和授权接起来。选择模型只是完成任务系统中的一个决定。',
        ],
      ],
      '哪一个约束一旦改变，就会让你重新选择方案？',
    );
  }
  return labShell(
    'choice',
    [
      ['quality', '① 质量门槛'],
      ['cost', '② 完整代价'],
      ['control', '③ 控制边界'],
    ],
    view,
    main,
    explain,
    'A/B 成绩、调用次数、时间与成本全部为教学数据，不代表真实产品排名或报价。',
    LabSources.risk,
  );
}

function modelLab(id) {
  return {
    token: tokenLab,
    parameters: parametersLab,
    context: contextLab,
    attention: attentionLab,
  }[id]?.();
}
document.addEventListener('submit', (event) => {
  if (!event.target.matches('[data-lab-token]')) return;
  event.preventDefault();
  U.text = document.getElementById('lab-token-input').value.slice(0, 45);
  renderCurrentSlide();
  document.querySelector('[data-lab-token] button')?.focus({ preventScroll: true });
});
