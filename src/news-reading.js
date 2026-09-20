/* Reading support is separate from publisher facts and never fills missing summaries. */
const NewsRoutes = {
  'concept/parameters': '参数：能力存在哪里',
  'concept/attention': '注意力：信息怎样关联',
  'concept/context': '上下文：这一刻能看见什么',
  'concept/agent': 'Agent：从回答到行动',
  'concept/mcp': '工具连接：能接上不等于能完成',
  'act/5/0': '工坊：设计并验收一次任务',
  'act/3/0': '证据：说得顺，是否值得相信',
  'concept/learning': '训练：规律怎样从样本中来',
  'act/3/1': '比较：按任务检查能力与成本',
  'act/1/0': '人的需要：过去与现在怎样做事',
  'library/1/0': '实践路径：选择工具并检查结果',
  'act/6/0': '约束：谁能决定、谁能退出',
  'act/6/2': '共生：不同未来如何选择',
  'act/6/4': '留白：写下自己的问题',
};
const NewsDefaultRoutes = {
  models: ['concept/parameters', 'concept/attention', 'concept/context'],
  agents: ['concept/agent', 'concept/mcp', 'act/5/0'],
  science: ['act/3/0', 'concept/learning', 'act/3/1'],
  applications: ['act/1/0', 'act/3/0', 'library/1/0'],
  society: ['act/6/0', 'act/6/2', 'act/6/4'],
};

function newsClassification(item) {
  const c = item.classification || {};
  if (c.method === 'editorial') return '馆内分类校正 · ' + (c.reason || '');
  if (c.method === 'headline' || c.method === 'summary')
    return `${c.method === 'headline' ? '按标题线索归类' : '按摘要线索归类'} · ${NewsTopics[item.topic] || NewsTopics.applications}`;
  return '暂归应用实践 · 尚未匹配明确的主题线索';
}

function newsText(item, original = false) {
  const source = item.translationSource,
    copy = item.translations?.[I18n.locale],
    valid =
      source?.title === item.title &&
      source?.summary === (item.summary || '') &&
      typeof copy?.title === 'string' &&
      copy.title.trim() &&
      typeof copy.summary === 'string' &&
      Boolean(copy.summary.trim()) === Boolean(item.summary);
  if (!original && valid) return { ...copy, lang: I18n.locale, translated: true, available: true };
  return {
    title: item.title,
    summary: item.summary || '',
    lang: item.sourceLanguage || 'en',
    translated: false,
    available: Boolean(valid),
  };
}

function newsQuestion(item) {
  const lens = NewsLenses[item.topic] || NewsLenses.applications;
  return [item.editorial?.question || lens[0], item.editorial?.readingHint || lens[1]];
}

function newsDetail(item) {
  if (!item) return '<h2>这个筛选下还没有动态。</h2><p>试试其他主题或来源。</p>';
  const view = News.reading || 'summary';
  const copy = newsText(item, News.original),
    translationNote = copy.translated
      ? copy.quality === 'machine-draft'
        ? '机器译稿，尚未人工审校；请结合原文阅读。'
        : '译文供阅读参考；以来源原文为准。'
      : I18n.locale !== copy.lang && !copy.available
        ? '这条消息暂无当前语言译文，暂时显示来源原文。'
        : '当前显示来源原文。';
  const [question, hint] = newsQuestion(item);
  const related = (
    item.relatedRoutes ||
    NewsDefaultRoutes[item.topic] ||
    NewsDefaultRoutes.applications
  )
    .filter((route) => NewsRoutes[route])
    .slice(0, 3);
  const content =
    view === 'summary'
      ? `<div class="news-read-panel"><span class="news-panel-kicker">${copy.translated ? '来源摘要的译文' : '来源提供的摘要'}</span><p class="news-excerpt" ${copy.summary ? `lang="${esc(copy.lang)}" data-i18n-skip` : ''}>${esc(copy.summary || '该来源没有提供摘要。请先打开原文；本馆不会根据标题补写一段新闻。')}</p><p class="news-source-note">${translationNote}<br>其中的主张尚未由本馆独立核验。</p></div>`
      : view === 'question'
        ? `<div class="news-read-panel"><span class="news-panel-kicker">馆内阅读提示 · 不是新闻事实摘要</span><h3>${esc(question)}</h3><p>${esc(hint)}</p></div>`
        : `<div class="news-read-panel"><span class="news-panel-kicker">从消息回到原理 · 选择一个入口</span><div class="news-related">${related.map((route, i) => `<button data-do="research-open" data-route="${route}"><span>0${i + 1}</span><strong>${NewsRoutes[route]}</strong><b aria-hidden="true">→</b></button>`).join('')}</div><p class="news-source-note">这些是主题相关的展品，不是这则消息的证据来源。返回后保留当前阅读位置。</p></div>`;
  return `<div class="news-detail-head"><span>${esc(NewsTopics[item.topic] || '动态')}</span><span>${esc(item.sourceName)} · ${newsTime(item.publishedAt)}</span></div>
    <h2 lang="${esc(copy.lang)}" data-i18n-skip tabindex="-1">${esc(copy.title)}</h2>
    <nav class="news-reading-tabs" aria-label="阅读步骤">${[
      ['summary', '① 读消息'],
      ['question', '② 找依据'],
      ['related', '③ 回馆内'],
    ]
      .map(
        ([key, label]) =>
          `<button data-do="news-reading" data-id="${key}" aria-pressed="${key === view}">${label}</button>`,
      )
      .join(
        '',
      )}${copy.available ? `<button class="news-original-toggle" data-do="news-original" aria-pressed="${Boolean(News.original)}">${News.original ? '返回译文' : '查看原文'}</button>` : ''}</nav>
    ${content}<div class="news-detail-bottom">${view === 'question' ? '<button class="action" data-do="news-save">记下这个问题</button>' : `<p class="news-classification">${esc(newsClassification(item))}</p>`}<a class="action primary" href="${newsURL(item.url)}" target="_blank" rel="noopener noreferrer">打开来源原文 ↗</a></div>`;
}

function saveNewsQuestion() {
  const item = newsData().items.find((i) => i.id === News.selected);
  if (!item) return;
  const block = `${I18n.t(newsQuestion(item)[0])}\n${I18n.t('来自：')}${newsText(item).title}\n${item.url}`;
  if (Notes.question.includes(item.url)) {
    notify('这个问题已在手记里。');
    return;
  }
  const next = [Notes.question, block].filter(Boolean).join('\n\n');
  if (next.length > 6000) {
    notify('手记已接近容量，请先导出或整理已有内容。');
    return;
  }
  if (!setStore('notes', { ...Notes, question: next })) {
    notify('浏览器未能保存，请把问题复制到自己的笔记。');
    return;
  }
  Notes.question = next;
  notify('问题与原文链接已存入“我的手记”，只保存在当前浏览器。');
}

function captureNewsFocus() {
  const el = document.activeElement;
  if (!el?.closest('.news-room')) return null;
  return { id: el.id, action: el.dataset.do, item: el.dataset.id };
}
function restoreNewsFocus(key) {
  if (!key) return;
  const controls = [...document.querySelectorAll('.news-room button,.news-room select')];
  const target = key.id
    ? document.getElementById(key.id)
    : controls.find((el) => el.dataset.do === key.action && el.dataset.id === key.item);
  target?.focus({ preventScroll: true });
}
