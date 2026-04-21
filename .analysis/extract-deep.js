const fs = require('fs');
const path = require('path');

const root = process.cwd();
const backendSrc = path.join(root,'red-dog-radios-backend','src');
const frontendSrc = path.join(root,'red-dog-radios-frontend','src');

function walk(dir){
  let out=[];
  for(const name of fs.readdirSync(dir)){
    const p=path.join(dir,name);
    const st=fs.statSync(p);
    if(st.isDirectory()){
      if(['node_modules','.git','.next'].includes(name)) continue;
      out=out.concat(walk(p));
    } else out.push(p);
  }
  return out;
}
const files = walk(root);
const rel=(p)=>path.relative(root,p).replace(/\\/g,'/');

const appJs = fs.readFileSync(path.join(backendSrc,'app.js'),'utf8');
const mountMap = [...appJs.matchAll(/app\.use\(['"`]([^'"`]+)['"`],\s*([a-zA-Z0-9_]+)/g)].map(m=>({base:m[1], varName:m[2]}));

const modulesDir = path.join(backendSrc,'modules');
const moduleNames = fs.readdirSync(modulesDir).filter(n=>fs.statSync(path.join(modulesDir,n)).isDirectory()).sort();

const modules = [];
for(const mod of moduleNames){
  const dir = path.join(modulesDir,mod);
  const routePath = fs.readdirSync(dir).find(f=>f.endsWith('.route.js'));
  const controllerPath = fs.readdirSync(dir).find(f=>f.endsWith('.controller.js'));
  const servicePath = fs.readdirSync(dir).find(f=>f.endsWith('.service.js'));
  const schemaPath = fs.readdirSync(dir).find(f=>f.endsWith('.schema.js'));

  const routeFile = routePath ? path.join(dir,routePath) : null;
  const ctrlFile = controllerPath ? path.join(dir,controllerPath) : null;
  const svcFile = servicePath ? path.join(dir,servicePath) : null;
  const schFile = schemaPath ? path.join(dir,schemaPath) : null;

  let routeInfo = [];
  let routeVar = null;
  if(routeFile){
    const c = fs.readFileSync(routeFile,'utf8');
    const varMatch = c.match(/const\s+router\s*=\s*express\.Router\(/);
    const re = /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([\s\S]*?)\);/g;
    let m;
    while((m=re.exec(c))){
      const args = m[3].split(',').map(s=>s.trim()).filter(Boolean);
      routeInfo.push({method:m[1].toUpperCase(), path:m[2], chain:args, controller:args[args.length-1]||null, middlewares:args.slice(0,-1)});
    }
  }

  let controllerExports = [];
  if(ctrlFile){
    const c = fs.readFileSync(ctrlFile,'utf8');
    const objMatch = c.match(/module\.exports\s*=\s*\{([\s\S]*?)\};/);
    if(objMatch){
      controllerExports = objMatch[1].split(',').map(s=>s.trim()).filter(Boolean).map(s=>s.replace(/\s*:\s*.*/,'').replace(/\n/g,'').trim());
    }
  }

  let serviceExports = [];
  if(svcFile){
    const c = fs.readFileSync(svcFile,'utf8');
    const objMatch = c.match(/module\.exports\s*=\s*\{([\s\S]*?)\};/);
    if(objMatch){
      serviceExports = objMatch[1].split(',').map(s=>s.trim()).filter(Boolean).map(s=>s.replace(/\s*:\s*.*/,'').replace(/\n/g,'').trim());
    }
  }

  let schema = null;
  if(schFile){
    const c = fs.readFileSync(schFile,'utf8');
    const model = (c.match(/mongoose\.model\(['"`]([^'"`]+)['"`]/)||[])[1] || null;
    const idx = [...c.matchAll(/\.index\(([^\n]+)\)/g)].map(x=>x[1].trim());
    // Lightweight field extraction from top-level schema object
    const schemaDecl = c.match(/new\s+mongoose\.Schema\s*\(\s*\{([\s\S]*?)\}\s*,/);
    let fields=[];
    if(schemaDecl){
      const body = schemaDecl[1];
      const reField = /\n\s*([a-zA-Z0-9_]+)\s*:\s*([^,\n]+|\{[\s\S]*?\}|\[[\s\S]*?\])\s*,?/g;
      let fm;
      while((fm=reField.exec(body))){
        const name=fm[1];
        const def=fm[2].replace(/\s+/g,' ').trim();
        fields.push({name, def});
      }
    }
    schema = {file: rel(schFile), model, indexes: idx, fields};
  }

  modules.push({
    name: mod,
    files: fs.readdirSync(dir).map(f=>rel(path.join(dir,f))).sort(),
    routeFile: routeFile?rel(routeFile):null,
    controllerFile: ctrlFile?rel(ctrlFile):null,
    serviceFile: svcFile?rel(svcFile):null,
    schema,
    routes: routeInfo,
    controllerExports,
    serviceExports,
  });
}

const frontendPages = walk(path.join(frontendSrc,'app')).filter(f=>f.endsWith('page.tsx')).sort().map(f=>{
  const c=fs.readFileSync(f,'utf8');
  const apiCalls=[...c.matchAll(/\b(adminApi|api)\.(get|post|put|patch|delete)\(\s*([`'"].+?[`'"])/g)].map(m=>({client:m[1],method:m[2].toUpperCase(),target:m[3]}));
  const redirects=[...c.matchAll(/redirect\(\s*([`'"].+?[`'"])\s*\)/g)].map(m=>m[1]);
  return {file:rel(f),apiCalls,redirects};
});

const uiComponents = walk(path.join(frontendSrc,'components')).filter(f=>f.endsWith('.tsx')||f.endsWith('.ts')).map(rel).sort();

const envFiles = [
  'red-dog-radios-backend/.env.example',
  'red-dog-radios-backend/.env',
  'red-dog-radios-frontend/.env.example',
  'red-dog-radios-frontend/.env',
  'red-dog-radios-frontend/.env.local',
].filter(p=>fs.existsSync(path.join(root,p))).map(p=>({file:p,content:fs.readFileSync(path.join(root,p),'utf8')}));

const envKeys = new Set();
for(const f of walk(path.join(root,'red-dog-radios-backend')).concat(walk(path.join(root,'red-dog-radios-frontend')))){
  if(/node_modules|\.next|\.git/.test(f)) continue;
  const c = fs.readFileSync(f,'utf8');
  for(const m of c.matchAll(/process\.env\.([A-Z0-9_]+)/g)) envKeys.add(m[1]);
  for(const m of c.matchAll(/\b(NEXT_PUBLIC_[A-Z0-9_]+)\b/g)) envKeys.add(m[1]);
}

const output = {
  mountMap,
  modules,
  frontendPages,
  uiComponents,
  envFiles,
  envKeys:[...envKeys].sort(),
};

fs.writeFileSync(path.join(root,'.analysis','deep.json'), JSON.stringify(output,null,2));
console.log('deep.json written');
console.log('modules:',modules.length,'pages:',frontendPages.length);
