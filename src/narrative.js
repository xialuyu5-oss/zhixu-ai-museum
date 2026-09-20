/* A visible story with labels, state changes and consequences. Not a social model. */
class NarrativeEngine {
  constructor(canvas, { mode = 0, motion = true, policy = 'balanced' } = {}) {
    this.canvas = canvas;
    this.c = canvas.getContext('2d');
    this.mode = mode;
    this.motion = motion;
    this.policy = policy;
    this.t = 1;
    this.last = 0;
    this.frame = 0;
    this.destroyed = false;
    this.sim = { snapshot: () => ({ mode: this.mode, policy: this.policy, time: this.t }) };
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
      d = Math.min(devicePixelRatio || 1, 2);
    this.w = r.width;
    this.h = r.height;
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
  setPolicy(p) {
    this.policy = p;
    this.draw();
  }
  schedule() {
    if (this.destroyed || this.frame || !this.motion || document.hidden) return;
    this.frame = requestAnimationFrame((ts) => {
      this.frame = 0;
      const dt = this.last ? Math.min(0.05, (ts - this.last) / 1000) : 0;
      this.last = ts;
      this.t += dt;
      this.draw();
      this.schedule();
    });
  }
  text(s, x, y, size = 15, color = this.ink, align = 'center') {
    const c = this.c;
    c.font = `${size >= 20 ? '500' : '400'} ${size}px "Microsoft YaHei",sans-serif`;
    c.fillStyle = color;
    c.textAlign = align;
    c.textBaseline = 'middle';
    c.fillText(s, x, y);
  }
  box(x, y, w, h, label, color, sub) {
    const c = this.c;
    c.beginPath();
    c.roundRect(x - w / 2, y - h / 2, w, h, 12);
    c.fillStyle = this.dark ? '#1d3d3b' : '#fffdf8';
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = color;
    c.stroke();
    this.text(
      label,
      x,
      y - (sub ? 9 : 0),
      Math.max(12, Math.min(17, (w - 16) / label.length)),
      color,
    );
    if (sub) this.text(sub, x, y + 15, 11, this.muted);
  }
  line(points, color, width = 3) {
    const c = this.c;
    c.beginPath();
    points.forEach((p, i) => (i ? c.lineTo(...p) : c.moveTo(...p)));
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.stroke();
  }
  dot(x, y, r, color) {
    const c = this.c;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = color;
    c.fill();
    c.beginPath();
    c.arc(x, y, r + 5, 0, Math.PI * 2);
    c.strokeStyle = color + '55';
    c.lineWidth = 2;
    c.stroke();
  }
  packet(a, b, u, color) {
    const p = Math.min(1, Math.max(0, u));
    this.dot(a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, 5, color);
  }
  draw() {
    if (!this.w || !this.h) return;
    const c = this.c,
      w = this.w,
      h = this.h;
    this.dark = document.documentElement.dataset.theme === 'dark';
    this.ink = this.dark ? '#e5f0e7' : '#173c3d';
    this.muted = this.dark ? '#a8c2b7' : '#59716b';
    this.teal = this.dark ? '#94d9be' : '#147b69';
    this.copper = this.dark ? '#e9b17f' : '#b76638';
    this.blue = this.dark ? '#a7cde3' : '#4f8099';
    c.clearRect(0, 0, w, h);
    const glow = c.createRadialGradient(w * 0.52, h * 0.5, 5, w * 0.52, h * 0.5, w * 0.55);
    glow.addColorStop(0, this.dark ? '#234b4240' : '#c9dedc65');
    glow.addColorStop(1, '#ffffff00');
    c.fillStyle = glow;
    c.fillRect(0, 0, w, h);
    let caption = '';
    if (this.mode === 0) caption = this.accumulation();
    else if (this.mode === 1) caption = this.confluence();
    else caption = this.tension();
    const el = document.getElementById('story-live');
    if (el && el.textContent !== caption) el.textContent = caption;
  }
  accumulation() {
    const c = this.c,
      w = this.w,
      h = this.h,
      small = w < 460,
      t = this.t,
      phase = Math.floor(t / 2) % 4;
    const center = [w * 0.58, h * 0.52],
      r = Math.min(w * 0.27, h * 0.3),
      left = w * 0.13;
    for (let j = 0; j < 4; j++) {
      c.beginPath();
      c.ellipse(
        center[0],
        center[1] + (j - 1.5) * r * 0.4,
        r * (0.7 + j * 0.1),
        r * 0.25,
        t * 0.07,
        0,
        Math.PI * 2,
      );
      c.strokeStyle = [this.teal, this.copper, this.blue, this.teal][j] + '80';
      c.lineWidth = 2.3;
      c.stroke();
    }
    const labels = ['提出问题', '进行尝试', '保留经验'];
    labels.forEach((s, i) => {
      const y = h * (0.19 + i * 0.3);
      this.box(
        left,
        y,
        small ? 72 : 98,
        small ? 42 : 52,
        s,
        [this.blue, this.copper, this.teal][i],
      );
      const target = [center[0] - r * 0.6, center[1] + (i - 1) * r * 0.5];
      this.line([[left + (small ? 36 : 49), y], target], this.muted + '45', 2);
      this.packet(
        [left + (small ? 36 : 49), y],
        target,
        (t * 0.36 + i * 0.3) % 1,
        [this.blue, this.copper, this.teal][i],
      );
    });
    const count = 7 + (Math.floor(t * 1.4) % 13);
    for (let i = 0; i < count; i++) {
      const a = i * 2.4 + t * 0.13,
        rad = r * (0.3 + (i % 4) * 0.18);
      this.dot(
        center[0] + Math.cos(a) * rad,
        center[1] + Math.sin(a) * rad * 0.55,
        3 + (i % 3),
        i % 5 === 0 ? this.copper : this.teal,
      );
    }
    this.box(w * 0.84, h * 0.83, small ? 92 : 130, 40, '可以继续使用', this.teal);
    this.line(
      [
        [center[0] + r * 0.4, center[1] + r * 0.45],
        [w * 0.84, h * 0.83 - 22],
      ],
      this.teal + '80',
      2,
    );
    const label = ['问题还没解决', '尝试一种办法', '失败，也留下线索', '经验让下一次不同'][phase];
    this.text(label, center[0], h * 0.09, small ? 14 : 17, this.ink);
    return [
      '先有人的问题，再开始尝试。',
      '新的尝试不断加入，不是每次都会成功。',
      '失败会改变下一次尝试，不是原地循环。',
      '留下来的方法与经验，让后来的探索有了起点。',
    ][phase];
  }
  confluence() {
    const w = this.w,
      h = this.h,
      small = w < 460,
      c = this.c,
      t = this.t,
      nodes = ['数据', '方法', '算力'],
      colors = [this.teal, this.copper, this.blue],
      cx = w * 0.52,
      cy = h * 0.49,
      r = Math.min(w * 0.13, h * 0.19);
    nodes.forEach((s, i) => {
      const a = [w * 0.16, h * (0.18 + i * 0.31)],
        b = [cx - r, cy];
      this.line([[a[0] + (small ? 33 : 47), a[1]], b], colors[i] + '8c', 3);
      for (let j = 0; j < 3; j++)
        this.packet(
          [a[0] + (small ? 33 : 47), a[1]],
          b,
          (t * 0.42 + j / 3 + i * 0.15) % 1,
          colors[i],
        );
      this.box(a[0], a[1], small ? 68 : 100, small ? 44 : 56, s, colors[i]);
    });
    c.beginPath();
    c.arc(cx, cy, r + 5 + Math.sin(t * 2) * 4, 0, Math.PI * 2);
    c.fillStyle = this.dark ? '#2b5c50' : '#d1e8de';
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = this.teal;
    c.stroke();
    this.text('模型', cx, cy - 9, small ? 20 : 28);
    this.text('共同配合', cx, cy + 20, 12, this.muted);
    ['语言', '图像', '行动'].forEach((s, i) => {
      const b = [w * 0.85, h * (0.22 + i * 0.28)],
        a = [cx + r, cy];
      this.line([a, [b[0] - 30, b[1]]], this.teal + '77', 2.5);
      this.packet(a, [b[0] - 30, b[1]], (t * 0.56 + i * 0.33) % 1, this.teal);
      this.box(b[0], b[1], small ? 60 : 86, 40, s, this.teal);
    });
    this.text('多条路径，汇成新的能力', w * 0.5, h * 0.95, small ? 13 : 16);
    return '单独增加数据、方法或算力都不够；它们配合，才让能力向外延伸。';
  }
  tension() {
    const c = this.c,
      w = this.w,
      h = this.h,
      small = w < 460,
      t = this.t,
      cx = w * 0.5,
      cy = h * 0.49,
      r = Math.min(w * 0.19, h * 0.24),
      p = this.policy;
    const weights =
      p === 'speed' ? [1.3, 0.3, 0.45] : p === 'privacy' ? [0.3, 1.3, 0.5] : [0.75, 0.75, 0.75];
    const anchors = [
        [w * 0.18, h * 0.18],
        [w * 0.83, h * 0.24],
        [w * 0.53, h * 0.84],
      ],
      colors = [this.copper, this.blue, this.teal],
      labels = ['尽快排定', '保护个人时间', '照顾不同时区'];
    anchors.forEach((a, i) => {
      const dx = a[0] - cx,
        dy = a[1] - cy,
        len = Math.hypot(dx, dy),
        end = [cx + (dx / len) * r * 0.75, cy + (dy / len) * r * 0.75];
      for (let k = -1; k <= 1; k++) {
        const pts = [];
        for (let j = 0; j <= 35; j++) {
          const u = j / 35,
            v = Math.sin(u * Math.PI) * Math.sin(u * 12 - t * 3 + i) * 5 * weights[i];
          pts.push([a[0] + (end[0] - a[0]) * u + k * 5 + v, a[1] + (end[1] - a[1]) * u]);
        }
        this.line(pts, colors[i] + (k === 0 ? 'dd' : '70'), k === 0 ? 3.8 : 1.7);
      }
      this.packet(a, end, (t * 0.45 + i * 0.27) % 1, colors[i]);
      this.box(a[0], a[1], small ? 94 : 126, small ? 42 : 54, labels[i], colors[i]);
    });
    c.beginPath();
    for (let j = 0; j <= 120; j++) {
      const a = (j / 120) * Math.PI * 2;
      let radius = r;
      anchors.forEach((pt, i) => {
        const aa = Math.atan2(pt[1] - cy, pt[0] - cx);
        radius += Math.pow(Math.max(0, Math.cos(a - aa)), 5) * r * 0.27 * weights[i];
      });
      radius += Math.sin(a * 5 - t * 2) * r * 0.04;
      const x = cx + Math.cos(a) * radius,
        y = cy + Math.sin(a) * radius;
      j ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.closePath();
    c.fillStyle = this.dark ? '#2b4b4470' : '#e6dfc775';
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = this.copper;
    c.stroke();
    this.text('共同的时间', cx, cy - 10, small ? 16 : 22);
    this.text('谁来让步？', cx, cy + 16, small ? 12 : 15, this.muted);
    return p === 'speed'
      ? 'AI 先排定会议，速度更快；但有人可能被安排在自己的休息时间。'
      : p === 'privacy'
        ? '每个人先确认自己的时间，边界更清楚；会议也可能迟迟排不下来。'
        : '让 AI 安排一次会议：效率、个人时间与不同时区会冲突，协商仍可能没有结果。';
  }
  destroy() {
    this.destroyed = true;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.ro.disconnect();
    document.removeEventListener('visibilitychange', this.visibility);
  }
}
