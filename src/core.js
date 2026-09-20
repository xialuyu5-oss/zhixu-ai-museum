/* Pure teaching algorithms. No model, network or arbitrary code execution. */
const Core = (() => {
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const tokenize = (s) => String(s).match(/[A-Za-z]+|[0-9]+|\s+|[^\s]/gu) || [];
  const weightGiB = (b, bits) => (b * 1e9 * bits) / 8 / 2 ** 30;
  function learnThreshold(samples) {
    const xs = [...new Set(samples.map((s) => s.x))].sort((a, b) => a - b);
    const cand = [xs[0] - 1, ...xs.slice(1).map((x, i) => (x + xs[i]) / 2), xs.at(-1) + 1];
    return cand
      .map((t) => ({
        threshold: t,
        errors: samples.filter((s) => Number(s.x >= t) !== s.y).length,
      }))
      .sort((a, b) => a.errors - b.errors)[0];
  }
  function attention(query = 3, temp = 1, causal = true) {
    const q = [
        [1, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      k = [
        [1, 0],
        [0, 1],
        [1, 1],
        [1.5, 0.5],
      ],
      v = [
        [1, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ];
    const logits = k.map((r, i) =>
      causal && i > query
        ? -Infinity
        : (q[query][0] * r[0] + q[query][1] * r[1]) / Math.sqrt(2) / Math.max(0.1, temp),
    );
    const max = Math.max(...logits),
      ex = logits.map((n) => (Number.isFinite(n) ? Math.exp(n - max) : 0)),
      sum = ex.reduce((a, b) => a + b, 0),
      weights = ex.map((x) => x / sum);
    return {
      logits,
      weights,
      result: [0, 1].map((j) => v.reduce((n, x, i) => n + x[j] * weights[i], 0)),
      q,
      k,
      v,
    };
  }
  const defaultSpec = () => ({
    kind: 'share',
    goal: '给新同事准备一份 10 分钟的技术分享提纲',
    criterion: '保留资料来源；没有依据的说法标为待确认',
    evidence: true,
    irrelevant: false,
    read: true,
    write: true,
    approval: true,
    verify: true,
    checkpoint: true,
    budget: 9,
    fault: 'none',
  });
  function newRun(spec) {
    return {
      schema: 1,
      spec: JSON.parse(JSON.stringify(spec)),
      stage: 'READY',
      steps: 0,
      attempt: 0,
      events: [],
      draft: null,
      artifact: null,
      approved: null,
    };
  }
  function fingerprint(spec) {
    return JSON.stringify(spec);
  }
  function event(r, type, text) {
    r.events.push({ seq: r.events.length + 1, type, text });
  }
  function advance(old) {
    let r = JSON.parse(JSON.stringify(old)),
      s = r.spec;
    if (
      ['DONE', 'STOPPED', 'FAILED', 'BLOCKED', 'UNVERIFIED', 'PAUSED', 'WAIT_APPROVAL'].includes(
        r.stage,
      )
    )
      return r;
    if (r.steps >= s.budget) {
      r.stage = 'BLOCKED';
      event(r, 'BUDGET', '本次教学步数预算已用完；没有继续执行。');
      return r;
    }
    r.steps++;
    if (r.stage === 'READY') {
      if (!s.read) {
        r.stage = 'BLOCKED';
        event(r, 'DENIED', '未获准读取资料；先缩小任务或调整授权。');
      } else {
        r.stage = 'READ';
        event(r, 'START', '目标已固定；仅可使用当前选择的教学资料与工具。');
      }
    } else if (r.stage === 'READ') {
      if (!s.evidence) {
        r.stage = 'BLOCKED';
        event(r, 'NO_EVIDENCE', '缺少相关资料；没有把缺口编成答案。');
      } else if (s.fault === 'transient' && r.attempt === 0) {
        r.attempt++;
        event(r, 'RETRY', '模拟资料暂时不可用；消耗一次预算，下一次尝试重读。');
      } else {
        r.stage = 'DRAFT';
        event(r, 'READ', '读取本地教学资料 A、B；资料内的文字不构成额外授权。');
      }
    } else if (r.stage === 'DRAFT') {
      r.draft = {
        goal: s.goal,
        criterion: s.criterion,
        sources: ['教学资料 A', '教学资料 B'],
        body:
          s.kind === 'family'
            ? '家庭出行草案：每 40 分钟安排休息；开放与预约状态待核对。'
            : s.kind === 'logs'
              ? '报告草案：出现两次通信超时；不能凭日志断言电源损坏。'
              : s.kind === 'study'
                ? '学习草案：先补齐题面，再给一步提示；不编造最终答案。'
                : '分享提纲：能力与限制；引用检索到的材料；知识库不保证答案正确。',
        pending: ['需要人工核对的条件与实际来源'],
      };
      if (!s.write) {
        r.stage = 'UNVERIFIED';
        event(r, 'DRAFT_ONLY', '按只读边界停在草稿；未保存任何产物。');
      } else if (s.approval) {
        r.stage = 'WAIT_APPROVAL';
        event(r, 'WAIT', '保存草稿之前等待你确认；尚未保存。');
      } else {
        r.stage = 'WRITE';
        event(r, 'NO_GATE', '本次配置跳过人工审批。此处只写模拟工作区，不连接真实文件或服务。');
      }
    } else if (r.stage === 'WRITE') {
      if (s.approval && r.approved !== fingerprint(s)) {
        r.stage = 'BLOCKED';
        event(r, 'STALE_APPROVAL', '授权与当前任务不一致；需要重新确认。');
        return r;
      }
      r.artifact = s.fault === 'false-success' ? null : JSON.parse(JSON.stringify(r.draft));
      r.stage = 'VERIFY';
      event(
        r,
        'TOOL_RETURN',
        s.fault === 'false-success'
          ? '模拟工具返回“保存成功”，但没有创建产物。'
          : '工具已在模拟工作区保存草稿。',
      );
    } else if (r.stage === 'VERIFY') {
      if (!s.verify) {
        r.stage = 'UNVERIFIED';
        event(r, 'NO_VERIFY', '缺少独立验收；不能仅凭工具返回认定完成。');
      } else if (!r.artifact || JSON.stringify(r.artifact) !== JSON.stringify(r.draft)) {
        r.stage = 'FAILED';
        event(r, 'FAILED', '独立检查未发现匹配的产物；任务未完成。');
      } else {
        r.stage = 'DONE';
        event(r, 'VERIFIED', '核对产物存在、内容一致并保留来源。仅本地教学任务完成。');
      }
    }
    return r;
  }
  function approve(old, yes) {
    const r = JSON.parse(JSON.stringify(old));
    if (r.stage !== 'WAIT_APPROVAL') return r;
    if (yes) {
      r.approved = fingerprint(r.spec);
      r.stage = 'WRITE';
      event(r, 'APPROVE', '确认只保存这份草稿，不对外发送。');
    } else {
      r.stage = 'STOPPED';
      event(r, 'DENY', '你拒绝了保存，任务停止；没有写入产物。');
    }
    return r;
  }
  function validateCheckpoint(obj, spec) {
    const stages = [
      'READY',
      'READ',
      'DRAFT',
      'WAIT_APPROVAL',
      'WRITE',
      'VERIFY',
      'DONE',
      'STOPPED',
      'FAILED',
      'BLOCKED',
      'UNVERIFIED',
    ];
    if (
      !obj ||
      obj.schema !== 1 ||
      !stages.includes(obj.stage) ||
      !Number.isInteger(obj.steps) ||
      obj.steps < 0 ||
      obj.steps > 30 ||
      !Array.isArray(obj.events) ||
      obj.events.length > 80
    )
      throw Error('检查点格式不符合本馆教学运行器。');
    if (fingerprint(obj.spec) !== fingerprint(spec))
      throw Error('任务或权限已经改变，请开始一次新运行。');
    return JSON.parse(JSON.stringify(obj));
  }
  return {
    esc,
    tokenize,
    weightGiB,
    learnThreshold,
    attention,
    defaultSpec,
    newRun,
    advance,
    approve,
    validateCheckpoint,
    fingerprint,
  };
})();
