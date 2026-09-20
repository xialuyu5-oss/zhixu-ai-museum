/* The conflict model is an illustrative resource-allocation system, not a forecast.
   Its counters describe this simulation only. Geometry does not measure society. */
class FrictionModel {
  constructor(seed = 2718) {
    this.seed = seed;
    this.rule = 'contest';
    this.reset();
  }
  random() {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  reset() {
    this.time = 0;
    this.tokens = [];
    this.ripples = [];
    this.cooldown = 0;
    this.spawnClock = 0;
    this.counter = 0;
    this.conflicts = 0;
    this.served = 0;
    this.turn = 0;
    this.capacity = 1;
    this.permission = 0;
    this.dropped = 0;
    this.message = '三个方向，正在靠近同一份有限资源。';
    for (let i = 0; i < 9; i++) this.spawn(i % 3, i * 0.018);
  }
  spawn(group = this.counter % 3, progress = 0) {
    if (this.tokens.length >= 45) {
      this.dropped++;
      this.message = '请求超过展品容量；新增任务被暂缓。';
      return;
    }
    const anchors = [
      [-0.84, -0.32],
      [0.82, -0.34],
      [0, 0.82],
    ];
    const a = anchors[group],
      v = 0.87 - progress;
    this.tokens.push({
      id: ++this.counter,
      g: group,
      x: a[0] * v + (this.random() - 0.5) * 0.08,
      y: a[1] * v + (this.random() - 0.5) * 0.08,
      vx: 0,
      vy: 0,
      wait: false,
      leaving: false,
      bump: 0,
      created: this.time,
      offset: this.random() * 6.28,
    });
  }
  burst() {
    for (let i = 0; i < 12; i++) this.spawn(i % 3, 0.06 + this.random() * 0.2);
    this.message = '新的请求同时进入；容量没有一起增加。';
    this.ripples.push({ x: 0, y: 0, age: 0, r: 0.09, shock: true });
  }
  setRule(rule) {
    if (!['contest', 'turns', 'consent'].includes(rule)) return;
    this.rule = rule;
    this.message =
      rule === 'contest'
        ? '同时争用：更积极的请求可能先占用资源。'
        : rule === 'turns'
          ? '轮流使用：减少抢占，但每一方仍需等待。'
          : '逐次授权：每次只放行一个请求，其他请求继续等待。';
  }
  grant() {
    this.permission++;
    this.message = '只放行当前一次分配；后续请求仍需授权。';
  }
  release(token) {
    token.wait = false;
    token.leaving = true;
    this.served++;
    this.cooldown = 1.15;
    this.turn = (token.g + 1) % 3;
    this.ripples.push({ x: 0, y: 0, age: 0, r: 0.03, good: true });
    if (this.rule === 'turns') this.message = '资源被轮流分配；等待与不一致的目标仍然存在。';
    else if (this.rule === 'consent') this.message = '这一次请求已经放行。剩余的需要仍在等待。';
    else this.message = '一个请求获得资源；其他请求继续等待或绕行。';
  }
  tick(dt) {
    dt = Math.min(0.05, Math.max(0, dt));
    this.time += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.spawnClock += dt;
    if (this.spawnClock > 0.65) {
      this.spawnClock = 0;
      this.spawn(this.random() < 0.45 ? 0 : Math.floor(this.random() * 3));
    }
    const waiting = this.tokens.filter((t) => t.wait && !t.leaving);
    if (this.cooldown <= 0 && waiting.length) {
      let token;
      if (this.rule === 'turns') {
        token = waiting.find((t) => t.g === this.turn) || waiting[0];
      } else token = waiting[0];
      if (this.rule !== 'consent' || this.permission > 0) {
        if (this.rule === 'consent') this.permission--;
        this.release(token);
      } else this.message = '等待你放行这一次请求；这不代表三方已经达成共识。';
    }
    const anchors = [
      [-0.84, -0.32],
      [0.82, -0.34],
      [0, 0.82],
    ];
    for (const t of this.tokens) {
      t.bump = Math.max(0, t.bump - dt);
      let tx = 0,
        ty = 0;
      if (t.leaving) {
        tx = -anchors[t.g][0] * 1.3;
        ty = -anchors[t.g][1] * 1.3;
      } else if (t.wait) {
        const order = waiting.indexOf(t),
          rad = 0.16 + Math.floor(Math.max(0, order) / 7) * 0.055,
          angle = t.g * 2.094 + Math.max(0, order) * 0.25 + this.time * 0.12;
        tx = Math.cos(angle) * rad;
        ty = Math.sin(angle) * rad;
      } else {
        tx = Math.sin(t.offset + this.time * 0.35) * 0.025;
        ty = Math.cos(t.offset) * 0.025;
      }
      const spring = t.wait ? 1.5 : 1.0;
      t.vx += (tx - t.x) * spring * dt;
      t.vy += (ty - t.y) * spring * dt;
      t.vx *= Math.pow(0.96, dt * 60);
      t.vy *= Math.pow(0.96, dt * 60);
      t.x += t.vx * dt * 9;
      t.y += t.vy * dt * 9;
      if (!t.wait && !t.leaving && Math.hypot(t.x, t.y) < 0.2) {
        t.wait = true;
        if (this.rule === 'contest' && (this.cooldown > 0.1 || waiting.length)) {
          this.conflicts++;
          this.ripples.push({ x: t.x, y: t.y, age: 0, r: 0.03 });
          t.x += anchors[t.g][0] * 0.08;
          t.y += anchors[t.g][1] * 0.08;
          this.message = '请求在入口相撞：相同的容量，承接不了同时到来的愿望。';
        }
      }
    }
    for (let i = 0; i < this.tokens.length; i++)
      for (let j = i + 1; j < this.tokens.length; j++) {
        const a = this.tokens[i],
          b = this.tokens[j];
        if (a.g === b.g || a.leaving || b.leaving) continue;
        const dx = b.x - a.x,
          dy = b.y - a.y,
          d = Math.hypot(dx, dy);
        if (d > 0.047 || d < 1e-5) continue;
        const push = (0.047 - d) * 0.4;
        a.x -= (dx / d) * push;
        a.y -= (dy / d) * push;
        b.x += (dx / d) * push;
        b.y += (dy / d) * push;
        if (this.rule === 'contest' && !a.bump && !b.bump) {
          a.bump = b.bump = 2;
          this.conflicts++;
          this.ripples.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, age: 0, r: 0.02 });
        }
      }
    this.tokens = this.tokens.filter((t) => !t.leaving || Math.hypot(t.x, t.y) < 1.14);
    this.ripples.forEach((r) => (r.age += dt));
    this.ripples = this.ripples.filter((r) => r.age < 1.35).slice(-15);
  }
  snapshot() {
    return {
      rule: this.rule,
      requests: this.tokens.length,
      waiting: this.tokens.filter((t) => t.wait && !t.leaving).length,
      served: this.served,
      conflicts: this.conflicts,
      message: this.message,
      dropped: this.dropped,
      time: this.time,
    };
  }
}
