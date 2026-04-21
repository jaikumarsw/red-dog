const fs = require('fs');
const path = require('path');

const root = process.cwd();
const outDir = path.join(root, '.analysis');

function walk(dir, exts){
  const out=[];
  for(const name of fs.readdirSync(dir)){
    const p=path.join(dir,name);
    const st=fs.statSync(p);
    if(st.isDirectory()){
      if(['node_modules','.git','.next','data'].includes(name)) continue;
      out.push(...walk(p,exts));
    } else {
      if(exts.some(e=>p.endsWith(e))) out.push(p);
    }
  }
  return out;
}

function rel(p){return path.relative(root,p).replace(/\\/g,'/');}

const backendRoot = path.join(root,'red-dog-radios-backend');
const frontendRoot = path.join(root,'red-dog-radios-frontend');

const backendFiles = walk(path.join(backendRoot,'src'), ['.js']);
const frontendFiles = walk(path.join(frontendRoot,'src'), ['.ts','.tsx','.js','.jsx','.d.ts']);

// Read every file content once (explicit full pass)
const allContents = new Map();
for (const f of [...backendFiles, ...frontendFiles]) {
  allContents.set(f, fs.readFileSync(f, 'utf8'));
}

// Route extraction
const routeFiles = backendFiles.filter(f=>f.endsWith('.route.js'));
const routes=[];
for(const f of routeFiles){
  const c = allContents.get(f);
  const baseMatch = c.match(/@route\s+([^\n*]+)/g) || [];
  const methodRe = /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]\s*(?:,\s*([^\)]*))?\)/g;
  let m;
  while((m=methodRe.exec(c))){
    const method = m[1].toUpperCase();
    const subPath = m[2];
    const args = m[3] || '';
    const middleware = args.split(',').map(s=>s.trim()).filter(Boolean);
    routes.push({file: rel(f), method, subPath, middleware});
  }
}

// Schema extraction
const schemaFiles = backendFiles.filter(f=>f.endsWith('.schema.js'));
const schemas=[];
for(const f of schemaFiles){
  const c = allContents.get(f);
  const modelMatch = c.match(/mongoose\.model\(['"`]([^'"`]+)['"`]/);
  const indexes = [...c.matchAll(/\.index\(([^\n]+)\)/g)].map(x=>x[1].trim());
  schemas.push({file: rel(f), model: modelMatch?modelMatch[1]:null, indexes, content:c});
}

// ENV extraction
const envRefs = [];
for(const [f,c] of allContents.entries()){
  for(const m of c.matchAll(/process\.env\.([A-Z0-9_]+)/g)){
    envRefs.push({file: rel(f), key: m[1]});
  }
}
const envKeys = [...new Set(envRefs.map(x=>x.key))].sort();

// Frontend pages
const pageFiles = frontendFiles.filter(f=>/src\\app\\.*page\.tsx$/.test(f));
const pages=[];
for(const f of pageFiles){
  const c = allContents.get(f);
  const apiCalls = [...c.matchAll(/\b(adminApi|api)\.(get|post|put|patch|delete)\(\s*([`'"].+?[`'"])/g)].map(x=>({client:x[1], method:x[2].toUpperCase(), path:x[3]}));
  const redirects = [...c.matchAll(/redirect\(\s*([`'"].+?[`'"])\s*\)/g)].map(x=>x[1]);
  pages.push({file: rel(f), apiCalls, redirects});
}

// TODO/stub markers
const markers=[];
for(const [f,c] of allContents.entries()){
  const re = /(TODO|FIXME|stub|placeholder|not implemented)/ig;
  let m;
  while((m=re.exec(c))){
    markers.push({file: rel(f), marker:m[1]});
  }
}

const result = {
  generatedAt: new Date().toISOString(),
  fileCounts: { backend: backendFiles.length, frontend: frontendFiles.length, total: backendFiles.length + frontendFiles.length },
  backendFiles: backendFiles.map(rel),
  frontendFiles: frontendFiles.map(rel),
  routes,
  schemas,
  envKeys,
  envRefs,
  pages,
  markers,
};

fs.writeFileSync(path.join(outDir,'inventory.json'), JSON.stringify(result,null,2));

// Also output directory trees
function tree(dir, prefix=''){
  const entries = fs.readdirSync(dir).filter(n=>!['node_modules','.git','.next'].includes(n)).sort();
  let lines=[];
  for(let i=0;i<entries.length;i++){
    const n=entries[i];
    const p=path.join(dir,n);
    const isLast = i===entries.length-1;
    const connector = isLast ? '+-- ' : '+-- ';
    const st=fs.statSync(p);
    lines.push(prefix + connector + n + (st.isDirectory()?'/':''));
    if(st.isDirectory()){
      lines.push(...tree(p, prefix + (isLast ? '    ' : '¦   ')));
    }
  }
  return lines;
}

const backendTree = ['red-dog-radios-backend/'].concat(tree(backendRoot));
const frontendTree = ['red-dog-radios-frontend/'].concat(tree(frontendRoot));
fs.writeFileSync(path.join(outDir,'backend-tree.txt'), backendTree.join('\n'));
fs.writeFileSync(path.join(outDir,'frontend-tree.txt'), frontendTree.join('\n'));

console.log('OK');
console.log(JSON.stringify(result.fileCounts));
