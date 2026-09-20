"""Build two products from the editable sources, without third-party packages.

- index.html          single-file offline bundle; double-click still works, the archive is embedded as base64.
- deploy/site/        lean static site: index.html (no embedded archive) + archive.html + news.json.
"""
from pathlib import Path
import base64, json, hashlib, re, shutil, html
from tools.news_localization import localize_snapshot
ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'src'
SITE = ROOT / 'deploy/site'
MARKERS = re.compile(r'\{\{(?:STYLE|NEWS|DATA|CATALOG|ARCHIVE_INDEX|ARCHIVE|LOCALES|LOCALE_OPTIONS|CODE)\}\}')
# Only these catalog collections are read by the page scripts; the other tables live inside the archive pages.
EMBEDDED_CATALOG = ('articles', 'sources')
def embedded_json(text):
    return text.replace('</', '<\\/')
def catalog_json():
    catalog = json.loads((SRC/'catalog.json').read_text(encoding='utf-8'))
    return json.dumps({k: catalog[k] for k in EMBEDDED_CATALOG}, ensure_ascii=False, separators=(',', ':'))
def render(template, replacements):
    # Expand template markers once, never reinterpret text inside a feed entry.
    return MARKERS.sub(lambda m: replacements[m.group(0)], template)
def report(path):
    print(f'{path.relative_to(ROOT)}: {path.stat().st_size:,} bytes; SHA256 {hashlib.sha256(path.read_bytes()).hexdigest()}')
def build():
    news_path = ROOT/'data/news.json'
    news = localize_snapshot(json.loads(news_path.read_text(encoding='utf-8')))
    news_path.write_text(json.dumps(news, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    template = (SRC/'shell.html').read_text(encoding='utf-8')
    archive_b64 = (SRC/'archive.b64').read_text().strip()
    languages = json.loads((SRC/'locales/manifest.json').read_text(encoding='utf-8'))
    locales = {l['id']:json.loads((SRC/'locales'/f"{l['id']}.json").read_text(encoding='utf-8')) for l in languages}
    assert len(locales)==len(languages) and 'zh-CN' in locales and 'en' in locales
    active=set(locales['en'])
    for lang, catalog in locales.items():
        if lang=='zh-CN': continue
        assert set(catalog)==active, f'{lang}: translated key coverage differs'
        for key,value in catalog.items():
            assert isinstance(value,str) and value.strip(), f'{lang}/{key}: empty translation'
            assert set(re.findall(r'\{\d+\}',value))==set(re.findall(r'\{\d+\}',locales['zh-CN'][key])), f'{lang}/{key}: placeholder mismatch'
    common = {
        '{{LOCALES}}': embedded_json(json.dumps(locales,ensure_ascii=False,separators=(',',':'))),
        '{{LOCALE_OPTIONS}}': ''.join(f'<option value="{html.escape(l["id"])}">{html.escape(l["name"])}</option>' for l in languages),
        '{{STYLE}}': '\n'.join((SRC/n).read_text(encoding='utf-8') for n in ['fonts.css','style.css','exhibition.css','revisions.css','news.css','lessons.css','depth.css','model-lab.css','i18n.css','reading-spread.css','typography.css','exhibit-visuals.css','usability.css']),
        '{{NEWS}}': embedded_json((ROOT/'data/news.json').read_text(encoding='utf-8')),
        '{{DATA}}': embedded_json((SRC/'data.json').read_text(encoding='utf-8')),
        '{{CATALOG}}': embedded_json(catalog_json()),
        '{{ARCHIVE_INDEX}}': embedded_json((SRC/'archive-index.json').read_text(encoding='utf-8')),
        '{{CODE}}': '\n'.join((SRC/n).read_text(encoding='utf-8') for n in ['i18n.js','core.js','story.js','exhibition.js','narrative11.js','journey.js','revisions.js','depth.js','history.js','lessons.js','model-core.js','model-lab.js','news-reading.js','news.js','exhibit-visuals.js','usability.js','app.js'])
    }
    asset = ROOT/'assets/research-workbench.png'
    image_data = 'data:image/png;base64,' + base64.b64encode(asset.read_bytes()).decode()
    single = render(template, {**common, '{{ARCHIVE}}': archive_b64, '{{CODE}}': common['{{CODE}}'].replace('{{RESEARCH_IMAGE}}', image_data)})
    for font in (ROOT/'assets/fonts').glob('*.woff2'):
        single = single.replace('assets/fonts/'+font.name, 'data:font/woff2;base64,'+base64.b64encode(font.read_bytes()).decode())
    lean = render(template.replace('<html ', '<html data-archive="external" ', 1), {**common, '{{ARCHIVE}}': '', '{{CODE}}': common['{{CODE}}'].replace('{{RESEARCH_IMAGE}}', 'assets/research-workbench.png')})
    workbench = ROOT/'assets/human-ai-workbench.png'
    single = single.replace('{{WORKBENCH_IMAGE}}', 'data:image/png;base64,' + base64.b64encode(workbench.read_bytes()).decode())
    lean = lean.replace('{{WORKBENCH_IMAGE}}', 'assets/human-ai-workbench.png')
    (ROOT/'index.html').write_text(single, encoding='utf-8', newline='\n')
    SITE.mkdir(parents=True, exist_ok=True)
    (SITE/'assets').mkdir(exist_ok=True)
    shutil.copyfile(asset, SITE/'assets/research-workbench.png')
    shutil.copyfile(workbench, SITE/'assets/human-ai-workbench.png')
    shutil.copytree(ROOT/'assets/fonts', SITE/'assets/fonts', dirs_exist_ok=True)
    (SITE/'index.html').write_text(lean, encoding='utf-8', newline='\n')
    (SITE/'archive.html').write_bytes(base64.b64decode(archive_b64))
    (SITE/'news.json').write_bytes((ROOT/'data/news.json').read_bytes())
    for name in ('index.html', 'deploy/site/index.html', 'deploy/site/archive.html', 'deploy/site/news.json'):
        report(ROOT/name)
if __name__ == '__main__': build()
