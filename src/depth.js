/* The main exhibit and its explanation share a desktop page; small screens switch views. */
const DepthAssets = { research: '{{RESEARCH_IMAGE}}' };
function depthShell(id, choices, selected, main, explain, evidence) {
  const view = U.panel['depth-' + id] || 'exhibit';
  const heading = explain.match(/^<h2>[\s\S]*?<\/h2>/)?.[0] || '';
  return `<section class="lesson-shell depth-lesson" data-lesson="${id}">${tabs(choices, id, selected, 'lesson-tabs')}
    <div class="depth-view-tabs">${tabs(
      [
        ['exhibit', '看展品'],
        ['explain', '读讲解'],
        ['evidence', '查资料'],
      ],
      'depth-' + id,
      view,
    )}</div>
    <div class="lesson-content depth-layout" data-depth-view="${view}"><section class="depth-main">${main}</section>
    <aside class="depth-explanation"><header class="reading-header"><span class="depth-kicker">深入挖掘</span>${heading}</header><div class="reading-body">${explain.slice(heading.length)}</div></aside>
    <div class="depth-evidence">${evidence}</div></div></section>`;
}
const depthIntro = (tag, title, text) =>
  `<header class="depth-intro"><span class="depth-kicker">${tag}</span><h2>${title}</h2><p>${text}</p></header>`;
const depthNote = (title, text) =>
  `<section class="depth-note"><h3>${title}</h3><p>${text}</p></section>`;
function depthSvg(id, title, desc, body, box = '0 0 720 280') {
  return `<svg class="depth-chart" viewBox="${box}" role="img" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">${title}</title><desc id="${id}-desc">${desc}</desc>${body}</svg>`;
}
const depthSources = (text, links) =>
  `<p>${text}</p><div class="depth-source-links">${links.map(([t, url]) => sourceLink(t, url)).join('')}</div>`;

// Measure real blocks inside a fixed reading area. Keep sources outside pagination.
const readingLayouts = new WeakMap();
function fitReadingSpread() {
  for (const aside of document.querySelectorAll('.depth-explanation')) {
    const body = aside.querySelector('.reading-body');
    if (!body) continue;
    const previous = readingLayouts.get(aside);
    if (
      !previous &&
      body.lastElementChild?.matches('.action') &&
      body.lastElementChild.previousElementSibling?.matches('.depth-callout')
    ) {
      const end = document.createElement('section');
      end.className = 'reading-end';
      const action = body.lastElementChild;
      end.append(action.previousElementSibling, action);
      body.append(end);
    }
    const nodes = previous?.nodes || [...body.children].filter((n) => !n.matches('a.source-link'));
    const active = previous?.active || 0;
    if (!previous) {
      const sources = [...body.querySelectorAll(':scope > a.source-link')];
      if (sources.length) {
        const foot = document.createElement('footer');
        foot.className = 'reading-sources';
        foot.append(...sources);
        aside.append(foot);
      }
    }
    aside.querySelector('.reading-pager')?.remove();
    body.replaceChildren(...nodes);
    aside.classList.remove('reading-compact', 'reading-paged');
    aside.scrollTop = 0;
    body.scrollTop = 0;
    const state = { nodes, active };
    readingLayouts.set(aside, state);
    if (innerWidth <= 1100 || innerHeight <= 480 || !aside.clientHeight) continue;
    const fits = (el) =>
      el.scrollHeight <= el.clientHeight + 1 &&
      [...el.children].every(
        (n) => n.getBoundingClientRect().bottom <= el.getBoundingClientRect().bottom + 1,
      );
    if (fits(body)) continue;
    aside.classList.add('reading-compact');
    if (fits(body)) continue;
    const nav = document.createElement('nav');
    nav.className = 'reading-pager';
    nav.setAttribute('aria-label', '读讲解');
    nav.innerHTML = '<button type="button" tabindex="-1">01</button>';
    aside.classList.add('reading-paged');
    aside.querySelector('.reading-header').append(nav);
    body.replaceChildren();
    const pages = [];
    const newPage = () => {
      const page = document.createElement('section');
      page.className = 'reading-page';
      pages.push(page);
      body.append(page);
      return page;
    };
    let page = newPage();
    for (const node of nodes) {
      page.append(node);
      if (!fits(page) && page.children.length > 1) {
        node.remove();
        page.hidden = true;
        page = newPage();
        page.append(node);
      }
    }
    const activate = (index) => {
      state.active = index;
      pages.forEach((p, i) => {
        p.hidden = i !== index;
        p.scrollTop = 0;
      });
      [...nav.children].forEach((b, i) => {
        if (i === index) b.setAttribute('aria-current', 'page');
        else b.removeAttribute('aria-current');
      });
    };
    nav.replaceChildren();
    pages.forEach((p, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = String(i + 1).padStart(2, '0');
      const heading = I18n.originalText(p.querySelector('h3,b')) || '读讲解';
      button.setAttribute('aria-label', '查看：' + heading);
      button.title = heading;
      button.onclick = () => activate(i);
      nav.append(button);
    });
    activate(Math.min(active, pages.length - 1));
  }
}
