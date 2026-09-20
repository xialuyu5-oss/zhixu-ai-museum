/* Pure, deterministic teaching data. No commercial model or price is represented. */
const ModelLab = (() => {
  const vocabulary = ['<结束>', '请', 'AI', '今天', '给', '帮', '资料', '让', '总结', '我'];
  const embeddings = { 7: [0.2, 0.8], 2: [0.7, 0.1], 5: [0.4, 0.6], 9: [0.9, 0.3] };
  const continuations = {
    picnic: {
      prefix: '天气晴朗，我们去',
      options: [
        ['散步', 0.55],
        ['野餐', 0.35],
        ['加班', 0.1],
      ],
    },
    deadline: {
      prefix: '今晚交稿，我们去',
      options: [
        ['加班', 0.7],
        ['讨论', 0.2],
        ['散步', 0.1],
      ],
    },
  };
  function chooseToken(scene, draw) {
    let cumulative = 0;
    return (
      (continuations[scene] || continuations.picnic).options.find(([, p]) => {
        cumulative += p;
        return draw < cumulative;
      })?.[0] || null
    );
  }
  function quantize(value, bits) {
    const levels = 2 ** bits - 1;
    return (Math.round(((Math.max(-1, Math.min(1, value)) + 1) / 2) * levels) / levels) * 2 - 1;
  }
  const contextItems = {
    goal: { title: '任务与规则', size: 2, detail: '给新同事解释停机记录；未知项要保留。' },
    evidence: { title: '原始记录', size: 3, detail: '10:00 告警；10:02 操作者复位；10:03 恢复。' },
    history: {
      title: '完整聊天历史',
      size: 6,
      detail: '包含多次已改过的计划和与当前问题无关的讨论。',
    },
    noise: { title: '无关资料', size: 3, detail: '另一台设备的营销介绍，不支持当前诊断。' },
    summary: {
      title: '带出处摘要',
      size: 1,
      detail: '保留时间线和原始记录编号，压缩过程不能省去未知项。',
    },
    poor: { title: '失真摘要', size: 1, detail: '只剩“设备后来好了”，复位动作和时间线已丢失。' },
    output: { title: '输出预留', size: 2, detail: '留给回答；不能当成已经放入的证据。' },
  };
  const contextSets = {
    all: ['goal', 'evidence', 'history', 'noise', 'output'],
    focused: ['goal', 'evidence', 'summary', 'output'],
    lossy: ['goal', 'poor', 'output'],
  };
  function contextPlan(name, capacity = 12) {
    const ids = contextSets[name] || contextSets.all;
    const used = ids.reduce((n, id) => n + contextItems[id].size, 0);
    return {
      ids,
      used,
      capacity,
      overflow: Math.max(0, used - capacity),
      spare: Math.max(0, capacity - used),
      evidence: ids.includes('evidence'),
      output: ids.includes('output'),
    };
  }
  const trials = {
    extraction: {
      title: '从原文提取字段',
      a: { passed: 18, total: 20, calls: 24, unit: 1, review: 12 },
      b: { passed: 19, total: 20, calls: 21, unit: 4, review: 6 },
    },
    reasoning: {
      title: '多条件综合判断',
      a: { passed: 12, total: 20, calls: 31, unit: 1, review: 35 },
      b: { passed: 18, total: 20, calls: 23, unit: 4, review: 14 },
    },
  };
  function trialCost(r) {
    return {
      model: r.calls * r.unit,
      human: r.review * 2,
      total: r.calls * r.unit + r.review * 2,
      perPass: (r.calls * r.unit + r.review * 2) / r.passed,
    };
  }
  return {
    vocabulary,
    embeddings,
    continuations,
    chooseToken,
    quantize,
    contextItems,
    contextSets,
    contextPlan,
    trials,
    trialCost,
  };
})();
