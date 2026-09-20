"""Add messages from stdin: [{"zh-CN":"...", "zh-TW":"...", ...}]. All locales required."""
from pathlib import Path
import json,sys,hashlib,re
p=Path(__file__).resolve().parents[1]/'src/locales'
langs=[v['id'] for v in json.loads((p/'manifest.json').read_text(encoding='utf-8'))]
catalogs={k:json.loads((p/f'{k}.json').read_text(encoding='utf-8')) for k in langs}
messages=json.loads((p/'messages.json').read_text(encoding='utf-8'));keys={m['id'] for m in messages}
rows=json.load(sys.stdin)
for row in rows:
    assert isinstance(row,dict) and set(row)==set(langs), 'Supply every manifest language'
    assert all(isinstance(v,str) and v.strip() for v in row.values()), 'Empty translation'
    slots=lambda s:set(re.findall(r'\{\d+\}',s))
    assert all(slots(v)==slots(row['zh-CN']) for v in row.values()),row['zh-CN']
for row in rows:
    source=row['zh-CN']
    source=re.sub(r'\s+',' ',source).strip()
    key='m_'+hashlib.sha1(source.encode()).hexdigest()[:12]
    for lang,value in row.items():catalogs[lang][key]=source if lang=='zh-CN' else value
    if key not in keys:messages.append({'id':key,'zh':source,'files':['i18n-integration']});keys.add(key)
for k,v in catalogs.items():(p/f'{k}.json').write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(p/'messages.json').write_text(json.dumps(messages,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Translated keys:',len(catalogs['en']))
