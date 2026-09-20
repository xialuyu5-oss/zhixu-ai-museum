"""Rebuild local WOFF2 assets from an explicitly supplied Google Fonts source directory.

Requires fonttools + brotli only for this optional asset preparation step.
Normal build.py does not require either dependency or an internet connection.
"""
from pathlib import Path
import argparse,hashlib,json,shutil
from fontTools import subset
from fontTools.ttLib import TTFont
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('sources',type=Path)
args=parser.parse_args()
target=ROOT/'assets/fonts';target.mkdir(parents=True,exist_ok=True)
licenses=target/'licenses';licenses.mkdir(exist_ok=True)
catalogs={p.stem:json.loads(p.read_text(encoding='utf-8')) for p in (ROOT/'src/locales').glob('*.json') if p.stem not in ['messages','manifest']}
news_file=ROOT/'data/news-translations.json'
news=json.loads(news_file.read_text(encoding='utf-8')).get('items',{}) if news_file.exists() else {}
for entry in news.values():
    for lang, copy in entry.get('locales',{}).items():
        catalogs[lang]['news:'+str(len(catalogs[lang]))]=copy['title']+' '+copy['summary']
families=[
 ('notosanssc','Atlas Sans SC',['zh-CN']),('notoserifsc','Atlas Serif SC',['zh-CN']),
 ('notosanstc','Atlas Sans TC',['zh-TW']),('notoseriftc','Atlas Serif TC',['zh-TW']),
 ('notosansjp','Atlas Sans JP',['ja']),('notoserifjp','Atlas Serif JP',['ja']),
 ('notosanskr','Atlas Sans KR',['ko']),
 ('sourcesans3','Atlas Sans Latin',['en','de','fr','ru']),('lora','Atlas Serif Latin',['en','de','fr','ru'])]
manifest=[];css=['/* Local, character-subset variable fonts. See assets/fonts/manifest.json and licenses/. */']
for folder,family,languages in families:
    source=next((args.sources/folder).glob('*.ttf'))
    font=TTFont(source,recalcTimestamp=False)
    chars=set(''.join(v for lang in languages for v in catalogs[lang].values()))
    # Basic punctuation, live numbers and user input have native fallbacks beyond this subset.
    codes={ord(c) for c in chars}|set(range(32,383))|set(range(0x2000,0x2070))
    available=set(font.getBestCmap());selected=codes&available
    options=subset.Options();options.flavor='woff2';options.name_IDs=['*'];options.name_legacy=True;options.name_languages=['*']
    subsetter=subset.Subsetter(options=options);subsetter.populate(unicodes=selected);subsetter.subset(font)
    for record in font['name'].names:
        if record.nameID in [1,3,4,6,16,21]:
            name=family.replace(' ','') if record.nameID in [3,6] else family
            record.string=name.encode(record.getEncoding(),errors='replace')
    font.flavor='woff2';out=target/(folder+'.woff2');font.save(out)
    shutil.copyfile(args.sources/folder/'OFL.txt',licenses/(folder+'-OFL.txt'))
    axis=next(a for a in font['fvar'].axes if a.axisTag=='wght')
    css.append("@font-face { font-family: '%s'; src: url('assets/fonts/%s') format('woff2'); font-style: normal; font-weight: %s %s; font-display: swap; }"%(family,out.name,int(axis.minValue),int(axis.maxValue)))
    manifest.append({'family':family,'file':out.name,'languages':languages,'source':'https://github.com/google/fonts/tree/main/ofl/'+folder,'sourceFile':source.name,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'bytes':out.stat().st_size,'glyphCodepoints':len(selected),'license':'licenses/'+folder+'-OFL.txt','missingCatalogCharacters':''.join(sorted(c for c in chars if ord(c) not in available and not c.isspace()))})
    print(out.name,out.stat().st_size,flush=True)
(target/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(ROOT/'src/fonts.css').write_text('\n'.join(css)+'\n',encoding='utf-8')
