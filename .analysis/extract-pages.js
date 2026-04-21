const fs=require('fs');
const path=require('path');
const root=process.cwd();
const appDir=path.join(root,'red-dog-radios-frontend','src','app');
function walk(d){let o=[]; for(const n of fs.readdirSync(d)){const p=path.join(d,n); const s=fs.statSync(p); if(s.isDirectory())o=o.concat(walk(p)); else if(p.endsWith('page.tsx')) o.push(p);} return o;}
function routeFromFile(f){
  let r=path.relative(appDir,f).replace(/\\/g,'/').replace(/\/page\.tsx$/,'');
  if(r==='page.tsx'||r==='') return '/';
  return '/'+r;
}
const rows=[];
for(const f of walk(appDir).sort()){
  const c=fs.readFileSync(f,'utf8');
  const imports=[...c.matchAll(/import\s+([^;]+)\s+from\s+['\"]([^'\"]+)['\"]/g)].map(m=>({what:m[1].trim(),from:m[2]}));
  const redirects=[...c.matchAll(/redirect\(([^\)]+)\)/g)].map(m=>m[1].trim());
  const apis=[...c.matchAll(/\b(adminApi|api)\.(get|post|put|patch|delete)\(([^\)]*)\)/g)].map(m=>`${m[1]}.${m[2]}(${m[3].trim().slice(0,60)})`);
  rows.push({file:path.relative(root,f).replace(/\\/g,'/'), route:routeFromFile(f), imports, redirects, apis});
}
fs.writeFileSync(path.join(root,'.analysis','frontend-pages.json'),JSON.stringify(rows,null,2));
console.log('pages',rows.length);
