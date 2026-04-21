const fs=require('fs');
const path=require('path');
const root=process.cwd();
const modulesDir=path.join(root,'red-dog-radios-backend','src','modules');
const baseByModule={auth:'/api/auth',organizations:'/api/organizations',opportunities:'/api/opportunities',matches:'/api/matches',applications:'/api/applications',agencies:'/api/agencies',alerts:'/api/alerts',outbox:'/api/outbox',digests:'/api/digests',ai:'/api/ai',dashboard:'/api/dashboard',onboarding:'/api/onboarding',settings:'/api/settings',funders:'/api/funders',wins:'/api/wins',outreach:'/api/outreach',followups:'/api/followups',tracker:'/api/tracker',ashleen:'/api/ashleen',admin:'/api/admin'};
const mods=fs.readdirSync(modulesDir).filter(n=>fs.statSync(path.join(modulesDir,n)).isDirectory());
const out=[];
for(const mod of mods){
  const routeFile=fs.readdirSync(path.join(modulesDir,mod)).find(f=>f.endsWith('.route.js'));
  if(!routeFile) continue;
  const p=path.join(modulesDir,mod,routeFile);
  const c=fs.readFileSync(p,'utf8');
  // router.METHOD('/x', ...)
  for(const m of c.matchAll(/router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([\s\S]*?)\);/g)){
    const method=m[1].toUpperCase(), sub=m[2], chain=m[3].split(',').map(s=>s.trim()).filter(Boolean);
    out.push({module:mod,method,path:(baseByModule[mod]||'')+(sub==='/'?'':sub),middlewares:chain.slice(0,-1),action:chain[chain.length-1]||''});
  }
  // router.route('/x').get(...).post(...)
  for(const m of c.matchAll(/router\.route\(\s*['"`]([^'"`]+)['"`]\s*\)([\s\S]*?);/g)){
    const sub=m[1], chainBlock=m[2];
    for(const mm of chainBlock.matchAll(/\.(get|post|put|patch|delete)\(([^\)]*)\)/g)){
      const method=mm[1].toUpperCase();
      const args=mm[2].split(',').map(s=>s.trim()).filter(Boolean);
      out.push({module:mod,method,path:(baseByModule[mod]||'')+(sub==='/'?'':sub),middlewares:args.slice(0,-1),action:args[args.length-1]||''});
    }
  }
}
out.sort((a,b)=>a.module.localeCompare(b.module)||a.path.localeCompare(b.path)||a.method.localeCompare(b.method));
fs.writeFileSync(path.join(root,'.analysis','routes-full.json'),JSON.stringify(out,null,2));
console.log('routes',out.length);
