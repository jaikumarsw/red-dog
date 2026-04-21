const fs=require('fs');
const path=require('path');
const root=process.cwd();
let md=fs.readFileSync(path.join(root,'PROJECT_SUMMARY.md'),'utf8');
const routes=JSON.parse(fs.readFileSync(path.join(root,'.analysis','routes-full.json'),'utf8'));
// rebuild section 10
const sec10Start=md.indexOf('## 10. API Reference');
const sec11Start=md.indexOf('## 11. Frontend Pages & Components');
if(sec10Start===-1||sec11Start===-1){throw new Error('Sections not found');}
let sec10='## 10. API Reference\n\n';
sec10+='| Module | Method | Path | Middleware | Controller Action |\n|---|---|---|---|---|\n';
for(const r of routes){
  sec10+=`| ${r.module} | ${r.method} | ${r.path} | ${r.middlewares.join(', ')||'none'} | ${r.action||'n/a'} |\n`;
}
sec10+='\n';
md=md.slice(0,sec10Start)+sec10+md.slice(sec11Start);
// rebuild backend module endpoints in section 6 to ensure full coverage
const sec6Start=md.indexOf('## 6. All Modules & Features');
const sec7Start=md.indexOf('## 7. Database Schema');
if(sec6Start===-1||sec7Start===-1){throw new Error('section 6/7 missing');}
const deep=JSON.parse(fs.readFileSync(path.join(root,'.analysis','deep.json'),'utf8'));
const pages=JSON.parse(fs.readFileSync(path.join(root,'.analysis','frontend-pages.json'),'utf8'));
const byMod={};
for(const r of routes){(byMod[r.module]||(byMod[r.module]=[])).push(r);} 
function roleFromRoute(route){if(route.startsWith('/admin')) return 'Admin'; if(['/login','/signup','/forgot-password','/otp-verification','/create-password','/'].includes(route)) return 'Public'; return 'Agency';}
function purposeFromRoute(route){const map={'/':'Root redirect to login','/login':'Agency login','/signup':'Agency signup','/forgot-password':'Password reset start','/otp-verification':'OTP verification','/create-password':'Create/reset password','/dashboard':'Agency dashboard','/opportunities':'Browse opportunities','/matches':'Match list','/applications':'Application list','/alerts':'Alerts center','/funders':'Funders list','/tracker':'Application tracker','/wins':'Wins and insights','/weekly-summary':'Weekly digest view','/settings':'User and org settings','/settings/agency':'Agency profile settings','/outreach':'Outreach list','/outreach/[id]':'Outreach editor','/followups':'Follow-up queue','/onboarding':'Onboarding welcome'}; if(map[route]) return map[route]; if(route.includes('/admin/')) return 'Admin panel view'; if(route.includes('/onboarding/step')) return 'Onboarding step form'; if(route.includes('/applications/[id]')) return 'Application detail/builder'; if(route.includes('/funders/[id]')) return 'Funder detail'; return 'Page route';}
let sec6='## 6. All Modules & Features\n\n### Backend Modules\n\n';
for(const mod of deep.modules){
  sec6+=`#### ${mod.name}\n`;
  sec6+=`- Purpose: ${mod.name} domain module.\n`;
  const modRoutes=(byMod[mod.name]||[]);
  if(modRoutes.length){
    sec6+='- Endpoints:\n';
    for(const r of modRoutes){sec6+=`  - ${r.method} ${r.path} | middleware: ${r.middlewares.join(', ')||'none'} | action: ${r.action||'n/a'}\n`;}
  } else sec6+='- Endpoints: none (support/internal module).\n';
  if(mod.serviceExports?.length) sec6+=`- Service exports: ${mod.serviceExports.join(', ')}\n`;
  if(mod.name==='matches') sec6+='- Business logic highlight: weighted fit scoring with reasons/disqualifiers/breakdown.\n';
  if(mod.name==='onboarding') sec6+='- Business logic highlight: onboarding payload mapping, Organization upsert, user linkage.\n';
  if(['alerts','outbox','followups'].includes(mod.name)) sec6+='- Background process tie-in: invoked by cron schedules.\n';
  sec6+='\n';
}
sec6+='### Frontend Pages (App Router)\n\n';
sec6+='| Route | Role | Purpose | Data/API hints |\n|---|---|---|---|\n';
for(const p of pages.sort((a,b)=>a.route.localeCompare(b.route))){
 const role=roleFromRoute(p.route); const purpose=purposeFromRoute(p.route);
 const hint=p.apis.length?p.apis.slice(0,3).join('; '):(p.redirects.length?`redirect ${p.redirects.join(', ')}`:'view-driven');
 sec6+=`| ${p.route} | ${role} | ${purpose} | ${hint.replace(/\|/g,'/')} |\n`;
}
sec6+='\n';
md=md.slice(0,sec6Start)+sec6+md.slice(sec7Start);
fs.writeFileSync(path.join(root,'PROJECT_SUMMARY.md'),md,'utf8');
console.log('Updated sections 6 and 10 with full route extraction');
