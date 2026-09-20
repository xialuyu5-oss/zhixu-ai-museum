/* Each control changes a visible cause, not just the speed of an ornament. */
const NarrativeState = { attempts: 1, inputs: [true, true, true], review: false };
function narrativeResult(mode) {
  if (mode === 0)
    return `第 ${NarrativeState.attempts} 次尝试 · ${NarrativeState.attempts % 3 === 0 ? '这次没有成功，但失败条件留下了。' : '留下一个可供下一次使用的线索。'}`;
  if (mode === 1) {
    const absent = ['数据', '方法', '算力'].filter((_, i) => !NarrativeState.inputs[i]);
    return absent.length
      ? `关闭了${absent.join('、')}：这条教学流程无法完成，其他两路仍在。`
      : '三路接通：样本、学习方法与计算共同支持一次识别。';
  }
  return NarrativeState.review
    ? '先检查：找不到引用依据，草稿退回修改。多了一步，错误没有直接交出去。'
    : '直接采用：草稿很快交付，但未核实的引用也一起交出去了。';
}
function narrativeControls(mode) {
  if (mode === 0)
    return `<button class="action primary" data-do="narrative-attempt">再试一次 · 留下线索</button><button class="action" data-do="narrative-reset">重新观察</button>`;
  if (mode === 1)
    return ['数据', '方法', '算力']
      .map(
        (name, i) =>
          `<button class="narrative-switch" data-do="narrative-input" data-id="${i}" aria-pressed="${NarrativeState.inputs[i]}"><i style="--input-color:${['var(--teal)', 'var(--copper)', 'var(--signal)'][i]}"></i>${name} · ${NarrativeState.inputs[i] ? '接通' : '关闭'}</button>`,
      )
      .join('');
  return `<button class="narrative-switch" data-do="narrative-review" data-id="fast" aria-pressed="${!NarrativeState.review}">直接采用</button><button class="narrative-switch" data-do="narrative-review" data-id="check" aria-pressed="${NarrativeState.review}">先检查依据</button><button class="action" data-do="collision" data-id="0">继续追问 →</button>`;
}
function narrativeAction(action, id) {
  if (action === 'narrative-attempt')
    NarrativeState.attempts = Math.min(12, NarrativeState.attempts + 1);
  if (action === 'narrative-reset') NarrativeState.attempts = 1;
  if (action === 'narrative-input') NarrativeState.inputs[+id] = !NarrativeState.inputs[+id];
  if (action === 'narrative-review') NarrativeState.review = id === 'check';
  const mode = U.phase;
  document.querySelector('.narrative-legend').outerHTML = narrativeLegend(mode);
  document.querySelector('#story-live').textContent = narrativeResult(mode);
  document.querySelector('.narrative-controls').innerHTML = narrativeControls(mode);
  I18n.apply();
  scene?.draw();
  const target = document.querySelector(
    `[data-do="${action}"]${id == null ? '' : `[data-id="${id}"]`}`,
  );
  target?.focus();
}
class NarrativeEngine {
  constructor(canvas, { mode = 0, motion = true } = {}) {
    this.canvas = canvas;
    this.c = canvas.getContext('2d');
    this.mode = mode;
    this.motion = motion;
    this.t = 2.1;
    this.last = 0;
    this.frame = 0;
    this.destroyed = false;
    this.sim = { snapshot: () => ({ mode: this.mode, time: this.t, motion: this.motion }) };
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.visibility = () => {
      this.last = 0;
      if (!document.hidden) this.schedule();
    };
    document.addEventListener('visibilitychange', this.visibility);
    this.resize();
    this.schedule();
  }
  resize() {
    const r = this.canvas.getBoundingClientRect(),
      d = Math.min(devicePixelRatio || 1, 1.5);
    if (this.w === r.width && this.h === r.height && this.dpr === d) return;
    this.w = r.width;
    this.h = r.height;
    this.dpr = d;
    this.canvas.width = Math.round(r.width * d);
    this.canvas.height = Math.round(r.height * d);
    this.c.setTransform(d, 0, 0, d, 0, 0);
    this.draw();
  }
  setMotion(v) {
    this.motion = v;
    this.last = 0;
    if (!v && this.frame) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
    this.draw();
    this.schedule();
  }
  schedule() {
    if (this.destroyed || this.frame || !this.motion || document.hidden) return;
    this.frame = requestAnimationFrame((ts) => {
      this.frame = 0;
      this.t += this.last ? Math.min(0.05, (ts - this.last) / 1000) : 0;
      this.last = ts;
      this.draw();
      this.schedule();
    });
  }
  path(points, color, width = 2) {
    const c = this.c;
    c.beginPath();
    points.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.stroke();
  }
  dot(p, r, color) {
    const c = this.c;
    c.beginPath();
    c.arc(p[0], p[1], r, 0, Math.PI * 2);
    c.fillStyle = color;
    c.fill();
  }
  draw() {
    if (!this.w || !this.h) return;
    this.dark = document.documentElement.dataset.theme === 'dark';
    this.colors = this.dark ? ['#79a5ff', '#ffc58c', '#69dff1'] : ['#2855d9', '#985123', '#087b90'];
    this.c.clearRect(0, 0, this.w, this.h);
    if (this.mode < 2) this.rings();
    else this.collisions();
  }
  rings() {
    const c = this.c, w = this.w, h = this.h;
    const scale = Math.min(w / 780, h / 320), cx = w * 0.5, cy = h * 0.5;
    const point = (x, y) => [cx + x * scale, cy + y * scale];
    // Five translucent sections share a fixed projection. Only the signals move;
    // no per-frame depth sort, DOM writes, glow filters or text on the canvas.
    for (let layer = 4; layer >= 0; layer--) {
      const x = -205 + layer * 97, y = -12 + layer * 6;
      const poly = [point(x - 28, y - 90), point(x + 48, y - 115),
        point(x + 48, y + 90), point(x - 28, y + 115)];
      c.beginPath();
      poly.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p));
      c.closePath();
      c.fillStyle = this.colors[layer % 3] + (this.dark ? '0d' : '09');
      c.fill();
      this.path([...poly, poly[0]], this.colors[layer % 3] + '65', 1);
      this.path([poly[0], poly[3]], this.colors[layer % 3] + 'bb', 1.5);
    }
    for (let lane = 0; lane < 3; lane++) {
      const active = this.mode === 0 || NarrativeState.inputs[lane];
      const route = (u) => point(-300 + 600 * u,
        (lane - 1) * 78 * (this.mode === 1 ? Math.pow(1 - u, 1.2) : 0.62)
        + Math.sin(u * Math.PI) * 12);
      const vertices = Array.from({length: 33}, (_, i) => route(i / 32));
      const color = this.colors[lane];
      this.path(vertices, color + (active ? '60' : '18'), 1.2);
      this.dot(route(0), 4 * scale, color + (active ? 'ff' : '40'));
      if (active) {
        // Continuous time and position keep motion independent of refresh rate.
        for (let n = 0; n < 2; n++) {
          const u = (this.t * 0.12 + lane * 0.11 + n * 0.5) % 1;
          this.path([route(Math.max(0, u - 0.035)), route(u)], color, 2.5);
          this.dot(route(u), 3.2 * scale, color);
        }
      }
      if (this.mode === 0) {
        const retained = Math.ceil(Math.max(0, NarrativeState.attempts - lane) / 3);
        for (let n = 0; n < retained; n++)
          this.dot(point(248 + (n % 2) * 20, (lane - 1) * 48 + Math.floor(n / 2) * 14),
            3.5 * scale, color);
      }
    }
    if (this.mode === 1) {
      const ready = NarrativeState.inputs.every(Boolean), p = point(300, 0);
      this.dot(p, 15 * scale, this.dark ? '#101c30' : '#ffffff');
      c.beginPath(); c.arc(...p, 15 * scale, 0, Math.PI * 2);
      c.strokeStyle = ready ? this.colors[2] : this.colors[1]; c.lineWidth = 1.5; c.stroke();
      if (ready) this.dot(p, 5 * scale, this.colors[2]);
      else this.path([point(293, 0), point(307, 0)], this.colors[1], 2);
    }
  }
  collisions() {
    const c = this.c,
      w = this.w,
      h = this.h,
      small = w < 480,
      check = NarrativeState.review;
    const top = [w * 0.1, h * 0.22],
      lower = [w * 0.1, h * 0.78],
      center = [w * 0.56, h * 0.5],
      end = [w * 0.9, h * 0.5];
    const curve = (start, bend, u) => [
      start[0] + (center[0] - start[0]) * u,
      start[1] + (center[1] - start[1]) * u + Math.sin(u * Math.PI) * bend,
    ];
    for (const [i, start, bend] of [
      [0, top, h * 0.16],
      [1, lower, -h * 0.16],
    ]) {
      const points = Array.from({ length: 49 }, (_, j) => curve(start, bend, j / 48));
      this.path(points, this.colors[i] + '25', small ? 13 : 20);
      this.path(points, this.colors[i] + 'bb', 2);
      // Continuous position along the curve; never round to a sampled path index.
      for (let n = 0; n < 3; n++) {
        const u = (this.t * 0.16 + n / 3) % 1;
        this.dot(curve(start, bend, u), small ? 3 : 4.5, this.colors[i]);
      }
    }
    this.path([center, end], this.colors[check ? 0 : 1] + '35', small ? 12 : 18);
    this.path([center, end], check ? '#80908a55' : this.colors[1], 2);
    if (!check) {
      const u = (this.t * 0.23) % 1;
      this.dot([center[0] + (end[0] - center[0]) * u, end[1]], small ? 4 : 6, this.colors[1]);
    } else {
      const u = (this.t * 0.16) % 1;
      this.dot(curve(lower, -h * 0.16, 1 - u), small ? 4 : 6, this.colors[0]);
    }
    const radius = small ? 21 : 32;
    c.beginPath();
    c.arc(...center, radius, 0, Math.PI * 2);
    c.fillStyle = this.dark ? '#101c30' : '#ffffff';
    c.fill();
    c.strokeStyle = this.colors[1];
    c.lineWidth = 2;
    c.stroke();
    // A document icon keeps the moving area free of text. The explanation lives above/below.
    this.path(
      [
        [center[0] - 9, center[1] - 13],
        [center[0] + 9, center[1] - 13],
        [center[0] + 9, center[1] + 13],
        [center[0] - 9, center[1] + 13],
        [center[0] - 9, center[1] - 13],
      ],
      this.colors[1],
      1.5,
    );
    for (let y = -5; y <= 5; y += 5)
      this.path(
        [
          [center[0] - 5, center[1] + y],
          [center[0] + 5, center[1] + y],
        ],
        this.colors[1],
        1.5,
      );
  }
  destroy() {
    this.destroyed = true;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.ro.disconnect();
    document.removeEventListener('visibilitychange', this.visibility);
  }
}

const CollisionStories = [
  {
    name: '工作',
    title: '做得更快，责任由谁承担？',
    gain: 'AI 起草一份客户方案，原本的整理工作更快了。',
    conflict: '如果方案引用了错误数据，节省的时间不能代替人的核验与负责。',
    question: '哪些工作可以交出？哪些确认必须由人完成？',
    route: 'act/3/0',
  },
  {
    name: '学习',
    title: '有了答案，还需要怎样学习？',
    gain: 'AI 可以随时解释一道难题，学习的入口更多了。',
    conflict: '如果直接照抄答案，眼前的任务完成了，自己的理解却可能没有前进。',
    question: '让 AI 给答案，还是让它帮助自己学会提问和验证？',
    route: 'act/5/0',
  },
  {
    name: '创作',
    title: '更多人能创作，新的分歧也来了。',
    gain: '一句描述就能成为图像，表达想法的门槛降低了。',
    conflict: '训练材料、创作者署名与收益如何安排，仍存在不同主张。',
    question: '能力更普及时，怎样尊重人的贡献与选择？',
    route: 'act/6/0',
  },
];
function showCollision(id) {
  const s = CollisionStories[id];
  if (!s) return;
  Revision.collision = id;
  scene?.setMotion(false);
  $('#collision-panel').innerHTML =
    `<article class="collision-detail"><header><span>碰撞 0${id + 1} / ${s.name}</span><button data-do="collision-close" aria-label="返回动画">×</button></header><div class="collision-related" aria-label="更多领域的分歧">${CollisionStories.map((item, i) => `<button data-do="collision" data-id="${i}" aria-pressed="${i === id}">${item.name}</button>`).join('')}</div><h2>${s.title}</h2><div class="collision-detail-copy"><p><b>新的可能</b>${s.gain}</p><p><b>仍需面对</b>${s.conflict}</p><p class="collision-question">${s.question}</p></div><button class="action" data-do="go" data-route="${s.route}">带着问题继续探索 →</button></article>`;
  $('#collision-panel').hidden = false;
  $('#collision-panel button').focus();
}
function closeCollision() {
  const id = Revision.collision;
  Revision.collision = null;
  $('#collision-panel').hidden = true;
  $('#collision-panel').innerHTML = '';
  scene?.setMotion(U.motion);
  $(`[data-do=collision][data-id="${id}"]`)?.focus();
}
