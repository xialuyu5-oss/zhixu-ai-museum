/* Keep each explanation together with the interaction that gives it meaning. */
function narrativeLegend(mode) {
  const labels =
    mode === 0
      ? ['问题', '尝试', '经验']
      : mode === 1
        ? ['数据', '方法', '算力']
        : ['尽快交付', '引用有据', NarrativeState.review ? '暂停交付' : '草稿交出'];
  const title =
    mode === 0
      ? '一次次尝试，让经验留下来'
      : mode === 1
        ? '三路条件，共同支持一次识别'
        : '同一份方案，两种都重要的要求。';
  return `<div class="narrative-legend"><strong>${title}</strong><div>${labels.map((s, i) => `<span><i class="signal-${i}"></i>${s}</span>`).join('')}</div></div>`;
}

function scenarioScene(id) {
  if (id === 'share') return collaborationScene();
  const language = id === 'language';
  const labels = language
    ? ['外语原文', '解释与对照', '核对术语和数字']
    : ['设备日志', '候选原因', '设计验证试验'];
  const art = language
    ? `<svg viewBox="0 0 900 150" aria-hidden="true"><g class="scene-paper"><rect x="100" y="15" width="135" height="120" rx="9"/><path d="M120 45h70m-70 18h95m-95 18h85m-85 18h40"/></g><path class="scene-flow" d="M250 75H385M515 75H645"/><g class="scene-paper"><rect x="385" y="25" width="130" height="100" rx="10"/><path d="M408 49h84m-84 23h45m-45 23h84"/></g><g class="scene-paper"><rect x="665" y="15" width="135" height="120" rx="9"/><path d="M685 45h78m-78 24h85m-85 24h58"/><path class="scene-check" d="M755 108l12 12 28-34"/></g></svg>`
    : `<svg viewBox="0 0 900 150" aria-hidden="true"><g class="scene-paper"><rect x="70" y="25" width="185" height="100" rx="10"/><path d="M90 55h25m12 0h102M90 76h25m12 0h65M90 98h25m12 0h90"/></g><path class="scene-flow" d="M270 75h105m150 0h115"/><g class="scene-paper"><circle cx="450" cy="75" r="50"/><path d="M413 85l18-33 20 45 20-37 20 18"/></g><g class="scene-paper"><rect x="660" y="25" width="175" height="100" rx="10"/><path d="M681 95V50m0 45h128M695 87l25-9 24 5 20-33 28 13"/></g></svg>`;
  return `<figure class="scenario-scene ${id}">${art}<figcaption>${labels.map((s, i) => `<span><b>0${i + 1}</b>${s}</span>`).join('')}</figcaption></figure>`;
}

const GoalExamples = {
  share: [
    '帮我做个分享。',
    '给新同事准备一份 10 分钟的技术分享提纲',
    '保留资料来源；没有依据的说法标为待确认',
  ],
  logs: [
    '帮我看看设备哪里坏了。',
    '阅读教学设备日志，整理一次排查报告',
    '区分观察与推断；不自动修改设备设置',
  ],
  family: ['帮我安排出去玩。', '起草一次家庭出行安排', '保留休息与确认环节；开放预约状态待核对'],
  study: ['把这道题做了。', '围绕一道题提供渐进的学习提示', '先检查题面；不在缺少条件时编造答案'],
};
function goalEditor() {
  const example = GoalExamples[U.spec.kind] || GoalExamples.share;
  const view = U.panel.goalView || 'example';
  return `<section class="goal-editor" data-view="${view}"><div class="preset-grid">${[
    ['share', '技术分享'],
    ['logs', '设备日志'],
    ['family', '家庭安排'],
    ['study', '学习助手'],
  ]
    .map(
      ([k, t]) =>
        `<button class="preset ${U.spec.kind === k ? 'active' : ''}" data-do="preset" data-id="${k}">${t}</button>`,
    )
    .join('')}</div>${tabs(
    [
      ['example', '对比示例'],
      ['edit', '修改我的任务'],
    ],
    'goalView',
    view,
  )}<div class="goal-example" ${view === 'example' ? '' : 'hidden'}><article><span>不够明确</span><p>${example[0]}</p></article><article><span>更清楚的任务</span><p>${example[1]}</p><small>${example[2]}</small></article></div><div class="goal-fields" ${view === 'edit' ? '' : 'hidden'}><label class="field">任务目标<textarea data-spec="goal" rows="2" maxlength="240">${esc(U.spec.goal)}</textarea></label><label class="field">怎样才算完成？<textarea data-spec="criterion" rows="2" maxlength="260">${esc(U.spec.criterion)}</textarea></label></div><div class="feedback" id="spec-feedback">${view === 'example' ? '说清对象、任务和验收条件，助手才知道做到哪里。' : U.spec.goal.trim() ? '目标可以继续修改。下一页，选择它能依据的资料。' : '目标还空着，先给它一件具体的工作。'}</div></section>`;
}

function runtimePanel() {
  const r = U.run,
    e = currentEvent(),
    stage = r?.stage || 'READY';
  const stages = {
    READY: ['等待开始', '检查权限并开始'],
    READ: ['准备读取资料', '读取资料'],
    DRAFT: ['准备起草', '生成草稿'],
    WAIT_APPROVAL: ['等待你的确认', '等待审批'],
    WRITE: ['准备保存', '保存草稿'],
    VERIFY: ['准备验收', '检查产物'],
    DONE: ['任务完成', '任务完成'],
    FAILED: ['验收未通过', '运行已停止'],
    BLOCKED: ['条件不满足', '运行已停止'],
    STOPPED: ['已拒绝保存', '运行已停止'],
    UNVERIFIED: ['尚未验证', '运行已停止'],
    PAUSED: ['已暂停', '已暂停'],
  };
  const [status, next] = stages[stage];
  const terminal = ['DONE', 'FAILED', 'BLOCKED', 'STOPPED', 'UNVERIFIED', 'PAUSED'].includes(stage);
  const step =
    {
      READY: 0,
      READ: 1,
      DRAFT: 2,
      WAIT_APPROVAL: 3,
      WRITE: 4,
      VERIFY: 5,
      DONE: 6,
      FAILED: 5,
      STOPPED: 3,
    }[stage] ??
    {
      START: 1,
      READ: 2,
      RETRY: 1,
      NO_EVIDENCE: 1,
      DRAFT_ONLY: 2,
      WAIT: 3,
      APPROVE: 4,
      NO_GATE: 4,
      STALE_APPROVAL: 4,
      TOOL_RETURN: 5,
      NO_VERIFY: 5,
      VERIFIED: 6,
      FAILED: 5,
    }[[...(r?.events || [])].reverse().find((v) => v.type !== 'BUDGET')?.type] ??
    0;
  const labels = ['检查权限', '读取资料', '生成草稿', '人工确认', '保存草稿', '检查产物'];
  const view = U.panel.runtimeView || 'process';
  return `<section class="runtime-panel"><div class="runtime-top"><strong class="status-tag ${['FAILED', 'BLOCKED', 'STOPPED'].includes(stage) ? 'bad' : ''}" data-runtime-stage="${stage}">${status}</strong><label class="tiny runtime-fault"><span>故障情境</span><select id="fault">${[
    ['none', '正常执行'],
    ['transient', '资料暂时失败'],
    ['false-success', '工具假成功'],
  ]
    .map(([v, t]) => `<option value="${v}" ${U.spec.fault === v ? 'selected' : ''}>${t}</option>`)
    .join(
      '',
    )}</select></label></div><p class="runtime-goal"><span>当前任务</span><b data-i18n-skip>${esc(U.spec.goal)}</b></p><ol class="runtime-progress">${labels.map((t, i) => `<li class="${i < step ? 'done' : i === step ? 'current' : ''}" ${i === step ? 'aria-current="step"' : ''}><span>0${i + 1}</span>${t}</li>`).join('')}</ol>${tabs(
    [
      ['process', '执行过程'],
      ['artifact', '查看草稿'],
      ['events', '运行记录'],
    ],
    'runtimeView',
    view,
  )}<div class="runtime-detail" role="status">${view === 'process' ? `<span class="event-n">${e ? String(e.seq).padStart(2, '0') : '00'} / ${status}</span><p>${e ? esc(e.text) : '每点一次，执行一个环节。这里会说明做了什么、结果如何；保存前需要你确认。'}</p>` : view === 'artifact' ? (r?.draft ? `<span class="event-n">${r.artifact ? '产物已存在' : '尚未保存'}</span><p>${esc(r.draft.body)}</p><small>${esc(r.draft.sources.join(' · '))}</small>` : `<p>生成草稿后，可以在这里查看内容。</p>`) : `<div class="runtime-log">${(r?.events || []).map((v) => `<p><b>${String(v.seq).padStart(2, '0')}</b><span>${I18n.t(v.text)}</span></p>`).join('') || '<p>尚未运行</p>'}</div>`}</div><footer class="runtime-footer"><span class="tiny">${r?.steps || 0} / ${U.spec.budget} 教学步数 · ${r?.artifact ? '产物已存在' : '尚无产物'}</span><div class="run-controls">${stage === 'WAIT_APPROVAL' ? `<button data-do="approve" class="primary">同意保存这份草稿</button><button data-do="deny">拒绝</button>` : `<button data-do="run-next" class="primary" ${terminal ? 'disabled' : ''}>${next} →</button>`}<button data-do="run-reset">重新开始</button><details class="runtime-recovery"><summary>中断与恢复</summary><div><button data-do="checkpoint" ${!r || !U.spec.checkpoint || stage === 'PAUSED' ? 'disabled' : ''}>存检查点</button><button data-do="pause-run" ${!r || terminal ? 'disabled' : ''}>中断</button><button data-do="restore" ${!U.checkpoint ? 'disabled' : ''}>恢复</button></div></details></div></footer></section>`;
}
