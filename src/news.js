/* Read saved publisher data; refresh only via a same-origin, optional local service. */
const News = {
  data: null,
  topic: 'all',
  source: 'all',
  page: 0,
  selected: null,
  view: 'list',
  busy: false,
  message: '',
  mode: location.protocol === 'file:' ? 'offline' : 'snapshot',
  request: 0,
  timer: 0,
  loaded: 0,
};
const NewsLenses = {
  models: [
    '能力怎样被证明？',
    '新模型发布时，关注测试任务、比较条件与失败边界。一次演示不能说明所有场景。',
  ],
  agents: [
    '从回答到行动，还缺什么？',
    '阅读智能体案例时，寻找它用了哪些工具、给了哪些权限，以及怎样确认任务真的完成。',
  ],
  science: [
    '研究结果怎样走向现实？',
    '留意论文、实验条件与可复现证据，也留意研究成果距离实际应用还有哪些环节。',
  ],
  applications: [
    '谁的做事方式改变了？',
    '观察具体任务中，AI 做了什么、人仍需确认什么；把效果与适用条件一起看。',
  ],
  society: [
    '能力与约束，怎样一起讨论？',
    '检查这则消息涉及谁的权利、谁承担后果，以及规则由谁制定、能否申诉。',
  ],
};
const NewsTopics = {
  all: '全部动态',
  models: '模型与原理',
  agents: '智能体',
  science: '科学研究',
  applications: '应用实践',
  society: '安全与社会',
};
function newsData() {
  if (!News.data) {
    try {
      News.data = JSON.parse(document.getElementById('news-data').textContent);
    } catch {
      News.data = { items: [], sources: [] };
    }
  }
  return News.data;
}
function newsTime(s) {
  const d = new Date(s);
  return s && !isNaN(d)
    ? I18n.date(d, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '尚未成功更新';
}
function newsSize() {
  return innerWidth < 780
    ? innerHeight < 720
      ? 2
      : 3
    : innerHeight < 650
      ? 2
      : innerHeight < 800
        ? 3
        : 4;
}
function newsItems() {
  return newsData().items.filter(
    (i) =>
      (News.topic === 'all' || i.topic === News.topic) &&
      (News.source === 'all' || i.sourceId === News.source),
  );
}
function newsURL(u) {
  try {
    const p = new URL(u);
    return p.protocol === 'https:' && !p.username && !p.password ? esc(p.href) : '';
  } catch {
    return '';
  }
}
function newsSummary(s) {
  if (!s) return '该来源未提供摘要，请打开原文阅读。';
  return s.length > 360 ? s.slice(0, 360) + '…' : s;
}
function newsStatus() {
  const d = newsData(),
    old = !d.lastSuccessAt || Date.now() - new Date(d.lastSuccessAt) > 86400000,
    stale = old ? ' · 已超过 24 小时' : '';
  return News.busy
    ? '正在检查来源…'
    : News.readError
      ? '连接暂时不可用 · 显示已保存的新闻'
      : d.status === 'error'
        ? '本次检查失败 · 保留已有新闻' + stale
        : d.status === 'partial'
          ? '部分来源未更新 · 已保留旧内容' + stale
          : old
            ? '数据超过 24 小时未更新'
            : News.mode === 'local'
              ? '本地服务运行中 · 每 6 小时检查'
              : News.mode === 'preview'
                ? '本地预览 · 自动检查已暂停'
                : News.mode === 'offline'
                  ? '离线快照 · 启动本地服务可更新'
                  : newsPublisher()
                    ? `站点由 ${newsPublisher()} 每 ${newsInterval()} 小时更新`
                    : '站点数据快照';
}
function newsPublisher() {
  const p = newsData().publisher;
  return typeof p === 'string' && p.trim() ? p.trim().slice(0, 60) : '';
}
function newsInterval() {
  const n = Number(newsData().intervalHours);
  return Number.isInteger(n) && n > 0 ? n : 6;
}
function renderNews() {
  const focusKey = captureNewsFocus();
  const d = newsData(),
    items = newsItems(),
    size = newsSize(),
    pages = Math.max(1, Math.ceil(items.length / size));
  News.page = Math.max(0, Math.min(pages - 1, News.page));
  const shown = items.slice(News.page * size, (News.page + 1) * size);
  if (!shown.some((i) => i.id === News.selected)) News.selected = shown[0]?.id;
  const item = shown.find((i) => i.id === News.selected);
  const detail = newsDetail(item);
  const sources = `<div class="news-source-grid">${d.sources.map((s) => `<article><header><strong>${esc(s.name)}</strong><span class="${s.status === 'ok' ? '' : 'news-warning'}">${s.status === 'ok' ? '已取得数据' : '连接失败 · 使用旧数据'}</span></header><p>最近成功：${newsTime(s.lastSuccessAt)}</p><p>本次检查：${newsTime(s.checkedAt)} · ${s.count || 0} 条</p><a href="${newsURL(s.feedUrl)}" target="_blank" rel="noopener noreferrer">查看公开订阅源 ↗</a></article>`).join('')}</div><p class="news-source-note">公开来源自动汇集、去重；主题优先按标题线索归类，少量条目经馆内校正。详情标明分类依据，分类可能出错。这里只覆盖所列来源，Hugging Face 包含社区作者文章；并非全网新闻或人工核验简报。时间按当前设备时区显示。</p>`;
  $('#main').innerHTML =
    `<section class="news-room" data-view="${News.view}" data-reading="${News.reading || 'summary'}"><header class="news-room-head"><div><span class="eyebrow">资料室 / AI 观察站</span><h1>世界在变化，带着问题读新闻。</h1></div><div class="news-head-actions"><button class="action" data-do="go" data-route="library/4/0">返回探索路径</button><button class="action primary" data-do="news-refresh" ${News.busy ? 'disabled' : ''}>${News.busy ? '检查中…' : '检查更新'}</button></div></header><div class="news-status" role="status"><span class="news-status-dot"></span><strong>${esc(newsStatus())}</strong><span>最近成功 ${newsTime(d.lastSuccessAt)}</span><button data-do="news-sources">${News.view === 'sources' ? '返回新闻' : '来源与状态'}</button></div><div class="news-filter"><label><span>主题</span><select id="news-topic">${Object.entries(
      NewsTopics,
    )
      .map(
        ([id, label]) =>
          `<option value="${id}" ${News.topic === id ? 'selected' : ''}>${label}</option>`,
      )
      .join(
        '',
      )}</select></label><label><span>来源</span><select id="news-source"><option value="all">全部来源</option>${d.sources.map((s) => `<option value="${esc(s.id)}" ${News.source === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label><span>${items.length} 条 · 按发布时间排列</span><button class="news-mobile-back" data-do="news-list">← 返回列表</button></div><div class="news-content">${News.view === 'sources' ? `<section class="news-sources">${sources}</section>` : `<div class="news-list" aria-label="新闻列表">${shown.map((i, k) => `<button class="news-card ${i.id === News.selected ? 'active' : ''}" data-do="news-select" data-id="${i.id}" aria-pressed="${i.id === News.selected}"><span class="news-card-top"><span>${esc(i.sourceName)}</span><time>${newsTime(i.publishedAt)}</time></span><strong lang="${esc(newsText(i).lang)}" data-i18n-skip>${esc(newsText(i).title)}</strong><span class="news-card-topic">${esc(NewsTopics[i.topic])}<span aria-hidden="true">→</span></span></button>`).join('') || '<p class="news-empty">没有匹配的新闻。</p>'}</div><article class="news-detail">${detail}</article>`}</div><footer class="news-pagination"><button class="action" data-do="news-prev" ${News.page === 0 || News.view === 'sources' ? 'disabled' : ''}>← 上一组</button><span>${News.page + 1} / ${pages}</span><span class="news-notice" aria-live="polite">${esc(News.message || '从新消息，回到值得追问的原理。')}</span><button class="action" data-do="news-next" ${News.page >= pages - 1 || News.view === 'sources' ? 'disabled' : ''}>下一组 →</button></footer></section>`;
  $('#news-topic').onchange = (e) => {
    News.topic = e.target.value;
    News.page = 0;
    News.view = 'list';
    renderNews();
  };
  $('#news-source').onchange = (e) => {
    News.source = e.target.value;
    News.page = 0;
    News.view = 'list';
    renderNews();
  };
  restoreNewsFocus(focusKey);
  if (location.protocol !== 'file:' && Date.now() - News.loaded > 60000 && !News.busy) {
    News.loaded = Date.now();
    loadNews(false);
  }
}
async function newsFetch(path, options = {}) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(path, { cache: 'no-store', ...options, signal: controller.signal });
    if (!r.ok) throw new Error(String(r.status));
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}
async function loadNews(manual = false) {
  if (location.protocol === 'file:') {
    News.message = '当前是离线文件。双击 start-local.cmd，再访问本地网址即可更新。';
    renderNews();
    notify(News.message);
    return;
  }
  const request = ++News.request;
  News.loaded = Date.now();
  try {
    const data = await newsFetch('news.json');
    if (data.schemaVersion !== 1 || !Array.isArray(data.items) || !Array.isArray(data.sources))
      throw new Error('format');
    if (request !== News.request) return;
    News.data = data;
    News.readError = false;
    News.message = manual ? '已重新读取站点新闻数据。' : '';
    try {
      const service = await newsFetch('api/news/status');
      News.mode = service.autoUpdate === false ? 'preview' : 'local';
    } catch {
      News.mode = 'snapshot';
      if (manual)
        News.message = newsPublisher()
          ? `已重新读取站点数据。该站点由 ${newsPublisher()} 每 ${newsInterval()} 小时检查来源，页面本身不抓取。`
          : '已读取站点快照；此站点没有提供主动抓取服务。';
    }
  } catch {
    News.readError = true;
    News.message = '暂时无法读取新数据，继续显示已保存的新闻。';
  }
  if (U.route === 'news') {
    renderNews();
    if (manual) notify(News.message);
  }
}
async function refreshNews() {
  if (News.busy) return;
  if (location.protocol === 'file:') return loadNews(true);
  News.busy = true;
  News.message = '正在联系更新服务。';
  renderNews();
  try {
    const response = await newsFetch('api/news/refresh', {
      method: 'POST',
      headers: { 'X-Museum-Request': '1' },
    });
    News.mode = 'local';
    if (!response.started && !response.updating) {
      News.busy = false;
      await loadNews(false);
      News.message = '刚刚已检查过来源，请稍后再试。';
      return;
    }
    let done = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const status = await newsFetch('api/news/status');
      if (!status.updating) {
        done = true;
        break;
      }
    }
    News.busy = false;
    await loadNews(false);
    News.message = done
      ? newsData().status === 'ok'
        ? '来源检查已完成；下次自动检查在 6 小时后。'
        : newsData().status === 'partial'
          ? '部分来源连接失败，已保留该来源旧内容。'
          : '更新未成功，已保留旧内容。'
      : '更新仍在进行，稍后再次检查。';
  } catch {
    News.busy = false;
    await loadNews(true);
  } finally {
    News.busy = false;
    if (U.route === 'news') {
      renderNews();
      notify(News.message);
    }
  }
}
function newsAction(action, id) {
  if (action === 'news-save') {
    saveNewsQuestion();
    return;
  }
  if (action === 'news-reading') {
    News.reading = id;
    renderNews();
  } else if (action === 'news-original') {
    News.original = !News.original;
    renderNews();
  } else if (action === 'news-refresh') refreshNews();
  else if (action === 'news-select') {
    News.original = false;
    News.selected = id;
    News.view = 'detail';
    renderNews();
    $('.news-detail h2')?.setAttribute('tabindex', '-1');
    $('.news-detail h2')?.focus();
  } else if (action === 'news-sources') {
    News.view = News.view === 'sources' ? 'list' : 'sources';
    renderNews();
  } else if (action === 'news-list') {
    News.view = 'list';
    renderNews();
  } else {
    if (News.view === 'sources') return;
    News.page += action === 'news-next' ? 1 : -1;
    News.view = 'list';
    renderNews();
  }
}

// A tab left open also reads new server snapshots; it never starts a second scheduler.
setInterval(() => {
  if (U.route === 'news' && !document.hidden && !News.busy && location.protocol !== 'file:')
    loadNews(false);
}, 300000);
