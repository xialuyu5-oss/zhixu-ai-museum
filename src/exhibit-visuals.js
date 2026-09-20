/* Visual explanations use the same task, inputs and outputs across modes. */
function collaborationScene() {
  return `<figure class="collaboration-scene"><img src="{{WORKBENCH_IMAGE}}" alt="从原始材料、机器整理到人工核对的协作场景" decoding="async"><div class="collaboration-track" aria-hidden="true"><i></i><i></i><i></i></div><figcaption><span><b>01</b> 收集材料</span><span><b>02</b> 整理线索</span><span><b>03</b> 人工核对</span></figcaption><small>AI 生成的概念插画</small></figure>`;
}
const WorkflowSteps = [
  ['明确任务', '人来决定', '技术分享的想法', '目标与验收条件'],
  ['查阅依据', '程序与模型协作', '目标与验收条件', '带出处的候选资料'],
  ['起草内容', '程序与模型协作', '带出处的候选资料', '等待核对的提纲'],
  ['等待审批', '人来决定', '等待核对的提纲', '本次保存的许可'],
  ['保存产物', '受控执行', '本次保存的许可', '实际生成的文件'],
  ['独立验收', '独立检查', '实际生成的文件', '通过或未通过的记录'],
];
function workflowDrawers() {
  return `<div class="workflow-drawers">${WorkflowSteps.map(([title, role, input, output], i) => `<section class="workflow-drawer ${U.flow === i ? 'active' : ''}"><h3><button data-do="flow-step" data-id="${i}" id="workflow-tab-${i}" aria-expanded="${U.flow === i}" aria-controls="workflow-panel-${i}"><span class="seq">0${i + 1}</span><span>${title}</span><small>${role}</small><i aria-hidden="true">＋</i></button></h3><div class="workflow-reveal" id="workflow-panel-${i}" role="region" aria-labelledby="workflow-tab-${i}" ${U.flow === i ? '' : 'inert'}><div class="workflow-inner"><div class="workflow-handoff"><section><small>输入</small><strong>${input}</strong></section><span class="handoff-arrow" aria-hidden="true">→</span><section><small>输出</small><strong>${output}</strong></section></div><p>${flowText(i)}</p></div></div></section>`).join('')}</div>`;
}
function selectWorkflowStep(index) {
  U.flow = U.flow === index ? -1 : index;
  for (const [i, drawer] of [...document.querySelectorAll('.workflow-drawer')].entries()) {
    const active = i === U.flow;
    drawer.classList.toggle('active', active);
    drawer.querySelector('button').setAttribute('aria-expanded', String(active));
    drawer.querySelector('.workflow-reveal').toggleAttribute('inert', !active);
  }
}
function mcpConnectionMap(mode = 'mcp') {
  const mcp = mode === 'mcp';
  const endpoint = `<div class="connection-endpoints"><div>文档 API</div><div>日历 API</div></div>`;
  const host = `<div class="connection-host"><strong>AI 应用</strong><span>模型</span></div>`;
  const adapter = mcp
    ? `<div class="connection-client"><strong>MCP 客户端</strong><span>应用内的连接组件</span></div><div class="connection-server"><strong>MCP 服务端</strong><span>封装与适配</span></div>`
    : `<div class="connection-adapters"><div><b>文档专用适配</b></div><div><b>日历专用适配</b></div></div>`;
  return `<div class="connection-map ${mcp ? 'mcp' : 'direct'}" data-connection="${mode}" role="group" aria-label="${mcp ? 'MCP 连接' : '直接 API'}">${host}${adapter}${endpoint}</div>`;
}
function mcpExperiment() {
  const mcp = U.mcp,
    stage = +(U.panel.connectionStage || 0);
  const view = U.panel.connectionView || 'map';
  const steps = mcp
    ? ['发现可用工具', '按工具描述调用', '取得结构化结果']
    : ['查接口文档', '分别组织请求', '处理返回结果'];
  const detail = mcp
    ? [
        ['tools/list', '服务端返回工具名称、说明和参数结构。'],
        ['tools/call', '客户端按约定发送工具名和参数，服务端处理具体接口。'],
        ['result', '结果回到应用，仍需检查是否满足任务要求。'],
      ]
    : [
        ['GET /docs · GET /events', '开发者分别了解两个接口的地址、参数和返回格式。'],
        ['fetch(...)', '应用中的适配代码分别组装请求，并处理不同格式。'],
        ['response', '结果回到应用，仍需检查是否满足任务要求。'],
      ];
  return `<section class="connection-experiment" data-connection-view="${view}"><header class="connection-controls">${tabs(
    [
      ['direct', '直接 API'],
      ['mcp', 'MCP 连接'],
    ],
    'mcp-mode',
    mcp ? 'mcp' : 'direct',
  )}<div class="connection-view-tabs">${tabs(
    [
      ['map', '连接结构'],
      ['call', '调用过程'],
    ],
    'connectionView',
    view,
  )}</div></header><div class="connection-structure">${mcpConnectionMap(mcp ? 'mcp' : 'direct')}<p class="connection-caption">${mcp ? '示例中，一个 MCP 服务端封装两项能力；接口适配仍然存在。' : '直接 API 也可以封装复用；这里展示逐项适配的常见做法。'}</p></div><div class="connection-trace">${tabs(
    steps.map((s, i) => [String(i), s]),
    'connectionStage',
    String(stage),
  )}<div class="connection-message" aria-live="polite"><code>${detail[stage][0]}</code><p>${detail[stage][1]}</p></div></div><footer><span>两条路径都需要身份认证、授权与结果检查。</span>${actBtn('看看授权边界', 'go', 'data-route="act/5/2"')}</footer></section>`;
}
