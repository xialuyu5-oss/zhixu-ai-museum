"""Import reviewed [inventory index, English, Japanese] rows into stable-key catalogs."""
from pathlib import Path
import json,sys,re
root=Path(__file__).resolve().parents[1]/'src/locales'
messages=json.loads((root/'messages.json').read_text(encoding='utf-8'))
rows=json.load(sys.stdin)
catalogs={lang:json.loads((root/f'{lang}.json').read_text(encoding='utf-8')) if (root/f'{lang}.json').exists() else {} for lang in ('en','ja')}
for index,en,ja in rows:
    source=messages[index]
    slots=set(re.findall(r'\{\d+\}',source['zh']))
    for lang,value in [('en',en),('ja',ja)]:
        assert value and set(re.findall(r'\{\d+\}',value))==slots,(index,lang,slots,value)
        catalogs[lang][source['id']]=value
for lang,catalog in catalogs.items(): (root/f'{lang}.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(root/'zh-CN.json').write_text(json.dumps({e['id']:e['zh'] for e in messages},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Imported {len(rows)} rows; translated keys: {len(catalogs["en"])}')
