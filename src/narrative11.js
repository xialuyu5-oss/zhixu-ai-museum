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
          `<button class="narrative-switch" data-do="narrative-input" data-id="${i}" aria-pressed="${NarrativeState.inputs[i]}"><i style="--input-color:${['#147763', '#b96738', '#457a9b'][i]}"></i>${name} · ${NarrativeState.inputs[i] ? '接通' : '关闭'}</button>`,
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
  orbit(i, u) {
    const a = u * Math.PI * 2 + this.t * (this.mode === 0 ? 0.13 : 0.27),
      tilt = [-0.7, 0.4, 1.3][i] + Math.sin(this.t * 0.24) * 0.1,
      r = Math.min(this.w * 0.3, this.h * 0.42),
      x = Math.cos(a) * r,
      y = Math.sin(a) * r * (this.mode === 0 ? 0.42 : 0.54);
    return [
      this.w * 0.5 + x * Math.cos(tilt) - y * Math.sin(tilt),
      this.h * 0.5 + x * Math.sin(tilt) + y * Math.cos(tilt),
      Math.sin(a),
    ];
  }
  draw() {
    if (!this.w || !this.h) return;
    this.dark = document.documentElement.dataset.theme === 'dark';
    this.colors = this.dark ? ['#84cbb3', '#edb181', '#89b9d6'] : ['#147763', '#b96738', '#457a9b'];
    this.c.clearRect(0, 0, this.w, this.h);
    if (this.mode < 2) this.rings();
    else this.collisions();
  }
  rings() {
    const segments = [],
      count = 96,
      small = this.w < 480;
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < count; j++) {
        if (this.mode === 0 && j % 12 > Math.min(11, 2 + NarrativeState.attempts)) continue;
        const p = this.orbit(i, j / count),
          q = this.orbit(i, (j + 1) / count);
        segments.push({ p, q, z: p[2], i });
      }
    segments
      .sort((a, b) => a.z - b.z)
      .forEach((s) => {
        const near = (s.z + 1) / 2,
          active = this.mode === 0 || NarrativeState.inputs[s.i];
        this.path(
          [s.p, s.q],
          active ? this.colors[s.i] + (near > 0.4 ? 'cc' : '50') : '#80908a30',
          this.mode === 0 ? 2 + near * 3 : 3 + near * 6,
        );
      });
    for (let i = 0; i < 3; i++)
      for (let n = 0; n < 6; n++) {
        if (this.mode === 1 && !NarrativeState.inputs[i]) continue;
        const u = (this.t * 0.085 + n / 6 + i * 0.2) % 1;
        this.dot(this.orbit(i, u), small ? 3 : 4, this.colors[i]);
        if (this.mode === 1) {
          const p = this.orbit(i, u),
            k = (this.t * 0.22 + n / 6) % 1;
          this.dot(
            [p[0] + (this.w * 0.5 - p[0]) * k, p[1] + (this.h * 0.5 - p[1]) * k],
            2.5,
            this.colors[i],
          );
        }
      }
    if (this.mode === 1)
      this.dot(
        [this.w * 0.5, this.h * 0.5],
        14,
        NarrativeState.inputs.every(Boolean) ? this.colors[0] : '#788682',
      );
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
    c.fillStyle = this.dark ? '#203f3b' : '#fffdf7';
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
