"""Apply checked UI and terminology translations after importing a translation draft."""
from pathlib import Path
import csv,json,re
root=Path(__file__).resolve().parents[1]
folder=root/'src/locales'
catalogs={lang:json.loads((folder/f'{lang}.json').read_text(encoding='utf-8')) for lang in ['en','de','fr','ko','ru','zh-TW']}
for lang in ['de','fr','ko','ru']:
    catalogs[lang]={k:re.sub(' +',' ',v.replace('▁',' ')).strip() for k,v in catalogs[lang].items()}
reviewed={lang:set() for lang in ['de','fr','ko','ru']}
with (root/'tools/reviewed-locales.tsv').open(encoding='utf-8') as f:
    for row in csv.DictReader(f,delimiter='\t'):
        keys=[k for k,v in catalogs['en'].items() if v==row['English']]
        if not keys: print('Unused review phrase:',row['English'])
        for lang in reviewed:
            for key in keys:
                assert row[lang] and set(re.findall(r'\{\d+\}',row[lang]))==set(re.findall(r'\{\d+\}',catalogs['en'][key])),key
                catalogs[lang][key]=row[lang];reviewed[lang].add(key)
corrections=json.loads((root/'tools/locale-corrections.json').read_text(encoding='utf-8'))
for lang,rows in corrections.items():
    for source,value in rows.items():
        keys=[k for k,v in catalogs['en'].items() if v==source]
        assert keys, source
        assert set(re.findall(r'\{\d+\}',source))==set(re.findall(r'\{\d+\}',value)),source
        for key in keys: catalogs[lang][key]=value;reviewed[lang].add(key)
for key,value in catalogs['zh-TW'].items():
    for before,after in [('引數','參數'),('智慧體','AI 代理'),('視訊記憶體','顯示記憶體')]:value=value.replace(before,after)
    catalogs['zh-TW'][key]=value
for lang,data in catalogs.items():
    if lang!='en':(folder/f'{lang}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Reviewed keys:',{lang:len(keys) for lang,keys in reviewed.items()})
