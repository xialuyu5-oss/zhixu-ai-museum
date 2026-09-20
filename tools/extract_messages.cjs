/* Development-only extraction. Runtime/build have no parser dependency. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const parser = require(process.argv[2]);
const root=path.resolve(__dirname,'..');
const entries=new Map();
const han=/[\u3400-\u9fff]/;
function add(text,file) {
  text=text.replace(/\s+/g,' ').trim();
  if(!han.test(text)||text.length<1||text.includes('{{'))return;
  if(!entries.has(text))entries.set(text,{id:'m_'+crypto.createHash('sha1').update(text).digest('hex').slice(0,12),zh:text,files:[]});
  const e=entries.get(text);if(!e.files.includes(file))e.files.push(file);
}
function collect(s,file) {
  if(!han.test(s))return;
  if(/<\/?[a-zA-Z][\s\S]*>/.test(s)) {
    const clean=s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
    for(const m of clean.matchAll(/(?:aria-label|title|placeholder|alt|content)=["']([^"']+)["']/g))add(m[1],file);
    for(const t of clean.replace(/<[^>]*>/g,'\n').split('\n'))add(t,file);
  } else add(s,file);
}
function visit(node,file) {
  if(!node||typeof node!=='object')return;
  if(node.type==='StringLiteral')collect(node.value,file);
  if(node.type==='TemplateLiteral')collect(node.quasis.map((q,i)=>(q.value.cooked??q.value.raw)+(i<node.expressions.length?'{'+i+'}':'')).join(''),file);
  if(node.type==='BinaryExpression'&&node.operator==='+') {
    const list=[];function parts(n){if(n.type==='BinaryExpression'&&n.operator==='+'){parts(n.left);parts(n.right);}else list.push(n);}
    parts(node);if(list.some(n=>n.type==='StringLiteral'&&han.test(n.value)))collect(list.map((n,i)=>n.type==='StringLiteral'?n.value:'{'+i+'}').join(''),file);
  }
  for(const [k,v] of Object.entries(node))if(!['loc','start','end','tokens','comments','extra'].includes(k)){if(Array.isArray(v))v.forEach(n=>visit(n,file));else if(v&&typeof v==='object')visit(v,file);}
}
function js(s,file){visit(parser.parsers.babel.parse(s),file);}
function data(v,file){if(typeof v==='string')collect(v,file);else if(v&&typeof v==='object')Object.values(v).forEach(x=>data(x,file));}
for(const file of fs.readdirSync(path.join(root,'src'))) {
  if(file.endsWith('.js'))js(fs.readFileSync(path.join(root,'src',file),'utf8'),file);
  if(['data.json','archive-index.json','catalog.json'].includes(file))data(JSON.parse(fs.readFileSync(path.join(root,'src',file),'utf8')),file);
}
collect(fs.readFileSync(path.join(root,'src/shell.html'),'utf8'),'shell.html');
const archive=Buffer.from(fs.readFileSync(path.join(root,'src/archive.b64'),'utf8'),'base64').toString('utf8');
for(const m of archive.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(m[1].includes('application/json')){try{data(JSON.parse(m[2]),'archive-data');}catch{}}else if(!m[1].includes('src=')){try{js(m[2],'archive');}catch(e){console.log('Archive parse skipped',e.message.slice(0,100));}}}
collect(archive.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''),'archive-html');
const all=[...entries.values()];
fs.mkdirSync(path.join(root,'src/locales'),{recursive:true});
fs.writeFileSync(path.join(root,'src/locales/messages.json'),JSON.stringify(all,null,2));
const groups={};for(const e of all){const g=e.files[0];groups[g]??={entries:0,chars:0};groups[g].entries++;groups[g].chars+=e.zh.length;}
console.log(JSON.stringify({total:all.length,chars:all.reduce((n,e)=>n+e.zh.length,0),groups},null,2));
