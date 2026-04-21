const fs=require('fs');
const path=require('path');
const root=process.cwd();

const deep=JSON.parse(fs.readFileSync(path.join(root,'.analysis','deep.json'),'utf8'));
const pages=JSON.parse(fs.readFileSync(path.join(root,'.analysis','frontend-pages.json'),'utf8'));
const backendPkg=JSON.parse(fs.readFileSync(path.join(root,'red-dog-radios-backend','package.json'),'utf8'));
const frontendPkg=JSON.parse(fs.readFileSync(path.join(root,'red-dog-radios-frontend','package.json'),'utf8'));

function asciiTree(baseAbs, baseName){
  const ignore=new Set(['node_modules','.git','.next']);
  function walk(dir, prefix){
    const names=fs.readdirSync(dir).filter(n=>!ignore.has(n)).sort();
    let out=[];
    names.forEach((n,i)=>{
      const p=path.join(dir,n);
      const st=fs.statSync(p);
      const last=i===names.length-1;
      out.push(prefix + (last?'+-- ':'+-- ') + n + (st.isDirectory()?'/':''));
      if(st.isDirectory()){
        out=out.concat(walk(p,prefix+'    '));
      }
    });
    return out;
  }
  return [baseName+'/'].concat(walk(baseAbs,'')).join('\n');
}
const backendTree=asciiTree(path.join(root,'red-dog-radios-backend'),'red-dog-radios-backend');
const frontendTree=asciiTree(path.join(root,'red-dog-radios-frontend'),'red-dog-radios-frontend');

const baseByModule={auth:'/api/auth',organizations:'/api/organizations',opportunities:'/api/opportunities',matches:'/api/matches',applications:'/api/applications',agencies:'/api/agencies',alerts:'/api/alerts',outbox:'/api/outbox',digests:'/api/digests',ai:'/api/ai',dashboard:'/api/dashboard',onboarding:'/api/onboarding',settings:'/api/settings',funders:'/api/funders',wins:'/api/wins',outreach:'/api/outreach',followups:'/api/followups',tracker:'/api/tracker',ashleen:'/api/ashleen',admin:'/api/admin'};
function roleFromRoute(route){if(route.startsWith('/admin')) return 'Admin'; if(['/login','/signup','/forgot-password','/otp-verification','/create-password','/'].includes(route)) return 'Public'; return 'Agency';}
function purposeFromRoute(route){const map={'/':'Root redirect to login','/login':'Agency login','/signup':'Agency signup','/forgot-password':'Password reset start','/otp-verification':'OTP verification','/create-password':'Create/reset password','/dashboard':'Agency dashboard','/opportunities':'Browse opportunities','/matches':'Match list','/applications':'Application list','/alerts':'Alerts center','/funders':'Funders list','/tracker':'Application tracker','/wins':'Wins and insights','/weekly-summary':'Weekly digest view','/settings':'User and org settings','/settings/agency':'Agency profile settings','/outreach':'Outreach list','/outreach/[id]':'Outreach editor','/followups':'Follow-up queue','/onboarding':'Onboarding welcome'}; if(map[route]) return map[route]; if(route.includes('/admin/')) return 'Admin panel view'; if(route.includes('/onboarding/step')) return 'Onboarding step form'; if(route.includes('/applications/[id]')) return 'Application detail/builder'; if(route.includes('/funders/[id]')) return 'Funder detail'; return 'Page route';}

let md='';
md+='# PROJECT SUMMARY\n\n';
md+='_Generated from a full source traversal of backend and frontend code (261 source files under src)._\n\n';
md+='## 1. Project Overview\n\n';
md+='- **What it does**: Red Dog Radios is a grant intelligence platform for public-safety agencies. It helps agencies discover opportunities, compute fit scores, track applications, manage outreach, and receive alerts/digests.\n';
md+='- **Who it serves**: Two primary roles are supported end-to-end.\n';
md+='- **Agency role**: register/login with OTP, onboarding, profile management, opportunity/match/application workflows, alerts, outreach, followups, tracker, wins.\n';
md+='- **Staff/Admin role**: dedicated admin login and panel for agencies, users, opportunities, funders, matches, applications, and activity logs.\n\n';
md+='## 2. Tech Stack\n\n';
md+='### Backend\n\n';
md+=`- Runtime: Node.js (CommonJS), package ${backendPkg.name}@${backendPkg.version}\n`;
md+=`- Framework: express@${backendPkg.dependencies.express}\n`;
md+=`- Database/ODM: mongoose@${backendPkg.dependencies.mongoose}, mongoose-paginate-v2@${backendPkg.dependencies['mongoose-paginate-v2']}\n`;
md+=`- Auth/Security: jsonwebtoken@${backendPkg.dependencies.jsonwebtoken}, bcryptjs@${backendPkg.dependencies.bcryptjs}, helmet@${backendPkg.dependencies.helmet}, cors@${backendPkg.dependencies.cors}, express-rate-limit@${backendPkg.dependencies['express-rate-limit']}\n`;
md+=`- Email: nodemailer@${backendPkg.dependencies.nodemailer}, resend@${backendPkg.dependencies.resend}\n`;
md+=`- AI: openai@${backendPkg.dependencies.openai}\n`;
md+=`- Scheduling: node-cron@${backendPkg.dependencies['node-cron']}\n`;
md+=`- Middleware/ops: morgan@${backendPkg.dependencies.morgan}, dotenv@${backendPkg.dependencies.dotenv}, multer@${backendPkg.dependencies.multer}, cloudinary@${backendPkg.dependencies.cloudinary}\n`;
md+=`- API Docs: swagger-jsdoc@${backendPkg.dependencies['swagger-jsdoc']}, swagger-ui-express@${backendPkg.dependencies['swagger-ui-express']}\n\n`;
md+='### Frontend\n\n';
md+=`- Framework: next@${frontendPkg.dependencies.next} (App Router), react@${frontendPkg.dependencies.react}, react-dom@${frontendPkg.dependencies['react-dom']}\n`;
md+='- UI: Radix UI primitives + Shadcn-style component layer\n';
md+=`- State management: @tanstack/react-query@${frontendPkg.dependencies['@tanstack/react-query']}\n`;
md+=`- Forms/validation: react-hook-form@${frontendPkg.dependencies['react-hook-form']}, zod@${frontendPkg.dependencies.zod}, @hookform/resolvers@${frontendPkg.dependencies['@hookform/resolvers']}\n`;
md+=`- HTTP client: axios@${frontendPkg.dependencies.axios}\n`;
md+=`- Styling: tailwindcss@${frontendPkg.devDependencies.tailwindcss}, postcss@${frontendPkg.devDependencies.postcss}, tailwindcss-animate@${frontendPkg.dependencies['tailwindcss-animate']}\n\n`;
md+='## 3. Folder Structure\n\n';
md+='### Backend Tree (annotated)\n\n```text\n'+backendTree+'\n```\n\n';
md+='- `src/app.js`: global middleware, health endpoint, route mounts.\n';
md+='- `src/server.js`: env checks, Mongo connect, server start, cron registration.\n';
md+='- `src/modules/*`: domain modules with schema/service/controller/route layering.\n';
md+='- `src/config/*`: provider adapters (email/openai/cloudinary).\n';
md+='- `src/utils/cron.jobs.js`: scheduled jobs.\n\n';
md+='### Frontend Tree (annotated)\n\n```text\n'+frontendTree+'\n```\n\n';
md+='- `src/app/*`: route entry points (agency + admin).\n';
md+='- `src/views/*`: feature screens consumed by route pages.\n';
md+='- `src/lib/*`: API clients, auth contexts, query keys/client.\n';
md+='- `src/components/*`: app shell, admin shell, shared widgets, UI primitives.\n';
md+='- `src/middleware.ts`: role/onboarding route enforcement.\n\n';
md+='## 4. Architecture & Data Flow\n\n';
md+='- Frontend talks to backend through `/api/*` rewrite in `next.config.ts`.\n';
md+='- Agency client (`src/lib/api.ts`) and admin client (`src/lib/adminApi.ts`) add Bearer tokens from localStorage.\n';
md+='- 401 handling clears sessions and redirects to login per role (admin vs agency).\n';
md+='- Session persistence uses localStorage + cookies for both roles.\n';
md+='- Domain flow: Organization -> Opportunity -> Match -> Alert -> Application -> Outreach -> Outbox.\n\n';
md+='## 5. Authentication & Authorization\n\n';
md+='- Agency auth: register, verify-email OTP, login, forgot-password OTP, reset-password.\n';
md+='- Admin auth: dedicated login via `/api/admin/auth/login`.\n';
md+='- Frontend route protection is cookie-driven in `src/middleware.ts` with onboarding gating.\n';
md+='- Backend auth middleware: `protect` (JWT validation) and `protectAdmin`/`adminAuth` (role enforcement).\n\n';
md+='## 6. All Modules & Features\n\n';
md+='### Backend Modules\n\n';
for(const mod of deep.modules){
 const base=baseByModule[mod.name]||'(internal/no mounted route)';
 md+=`#### ${mod.name}\n`;
 md+=`- Purpose: ${mod.name} domain module.\n`;
 if(mod.routes.length){
  md+=`- Base Path: ${base}\n`;
  md+='- Endpoints:\n';
  for(const r of mod.routes){
   const full=base.startsWith('/api')?`${base}${r.path==='/'?'':r.path}`:r.path;
   md+=`  - ${r.method} ${full} | middleware: ${r.middlewares.join(', ')||'none'} | action: ${r.controller||'n/a'}\n`;
  }
 } else {
  md+='- Endpoints: none (support/internal module).\n';
 }
 if(mod.serviceExports.length) md+=`- Service exports: ${mod.serviceExports.join(', ')}\n`;
 if(mod.name==='matches') md+='- Business logic highlight: weighted fit scoring with reasons/disqualifiers/breakdown.\n';
 if(mod.name==='onboarding') md+='- Business logic highlight: maps onboarding payload to Organization + links User.organizationId.\n';
 if(mod.name==='alerts' || mod.name==='outbox' || mod.name==='followups') md+='- Background process tie-in: used by scheduled cron jobs in `src/utils/cron.jobs.js`.\n';
 md+='\n';
}
md+='### Frontend Pages (App Router)\n\n';
md+='| Route | Role | Purpose | Data/API hints |\n|---|---|---|---|\n';
for(const p of pages.sort((a,b)=>a.route.localeCompare(b.route))){
 const role=roleFromRoute(p.route); const purpose=purposeFromRoute(p.route);
 const hint=p.apis.length?p.apis.slice(0,3).join('; '):(p.redirects.length?`redirect ${p.redirects.join(', ')}`:'view-driven');
 md+=`| ${p.route} | ${role} | ${purpose} | ${hint.replace(/\|/g,'/')} |\n`;
}
md+='\n';
md+='## 7. Database Schema\n\n';
md+='Models detected in backend schemas:\n\n';
for(const mod of deep.modules.filter(m=>m.schema)){
 md+=`- **${mod.schema.model || mod.name}** (${mod.schema.file})\n`;
 if(mod.schema.fields?.length) md+=`  - Key fields (top-level parse): ${mod.schema.fields.slice(0,18).map(f=>f.name).join(', ')}${mod.schema.fields.length>18?' ...':''}\n`;
 if(mod.schema.indexes?.length) md+=`  - Indexes: ${mod.schema.indexes.join(' ; ')}\n`;
}
md+='\nRelationships and intent by model:\n';
md+='- User -> Organization (organizationId), role-based access, OTP/reset fields, settings.\n';
md+='- Organization -> createdBy(User), used by Matches/Applications/Alerts/Tracker.\n';
md+='- Opportunity -> core grant metadata and eligibility data.\n';
md+='- Match -> Organization x Opportunity unique pair with fit and breakdown.\n';
md+='- Application -> organization/opportunity/funder lifecycle and narrative content.\n';
md+='- Alert/Digest/Outbox/FollowUp -> notification and communication pipeline.\n';
md+='- Funder/Win/Outreach/ActivityLog/Agency -> supporting operational features.\n\n';
md+='## 8. Environment Variables\n\n';
md+='### Backend\n\n| Variable | Required | Configures |\n|---|---|---|\n';
[['MONGO_URI','Yes','MongoDB connection'],['JWT_SECRET','Yes','JWT signing'],['PORT','No','HTTP port'],['NODE_ENV','No','Runtime mode'],['JWT_EXPIRES_IN','No','Token expiry'],['CORS_ORIGIN','No','CORS origin'],['OPENAI_API_KEY','No','OpenAI integration'],['OPENAI_MODEL','No','Ashleen model override'],['SMTP_HOST','No','SMTP transport'],['SMTP_PORT','No','SMTP transport'],['SMTP_USER','No','SMTP auth/from'],['SMTP_PASS','No','SMTP auth'],['SMTP_FROM','No','Mail from'],['SMTP_SECURE','No','SMTP TLS'],['DEV_REDIRECT_EMAIL','No','Dev email redirect'],['ADMIN_EMAIL','No','Cron error alert email'],['FRONTEND_URL','No','Email links'],['CLOUDINARY_CLOUD_NAME','No','Cloudinary'],['CLOUDINARY_API_KEY','No','Cloudinary'],['CLOUDINARY_API_SECRET','No','Cloudinary']].forEach(r=>md+=`| ${r[0]} | ${r[1]} | ${r[2]} |\n`);
md+='\n### Frontend\n\n| Variable | Required | Configures |\n|---|---|---|\n';
[['API_ORIGIN','No','Server rewrite backend origin'],['NEXT_PUBLIC_API_ORIGIN','No','Public rewrite fallback'],['REPLIT_DEV_DOMAIN','No','Allowed dev origin'],['NODE_ENV','No','Client-mode checks']].forEach(r=>md+=`| ${r[0]} | ${r[1]} | ${r[2]} |\n`);
md+='\n';
md+='## 9. Key Business Logic\n\n';
md+='- **Match scoring engine**: `src/modules/matches/match.service.js` scores agency type, location, keywords, deadline, award fit, timeline, completeness, local-match; outputs `fitScore`, `breakdown`, `reasons`, `disqualifiers`, `recommendedAction`.\n';
md+='- **Onboarding completion**: `src/modules/onboarding/onboarding.service.js` validates input, maps enums, creates/updates Organization, syncs Agency compatibility record, marks onboarding complete.\n';
md+='- **Alert + digest generation**: `src/modules/alerts/*` and `src/modules/digests/*` support threshold-based alerts and weekly summary generation/preview/send.\n';
md+='- **Outbox queue processing**: `src/modules/outbox/outbox.service.js` and cron run scheduled queue send + retry logic.\n\n';
md+='## 10. API Reference\n\n';
md+='| Module | Method | Path | Middleware | Controller Action |\n|---|---|---|---|---|\n';
for(const mod of deep.modules.filter(m=>m.routes.length)){
 const base=baseByModule[mod.name]||'';
 for(const r of mod.routes){const full=base?`${base}${r.path==='/'?'':r.path}`:r.path; md+=`| ${mod.name} | ${r.method} | ${full} | ${r.middlewares.join(', ')||'none'} | ${r.controller||'n/a'} |\n`;}
}
md+='\n';
md+='## 11. Frontend Pages & Components\n\n';
md+=`- Total App Router page files: ${pages.length}\n`;
md+=`- Shared component files under src/components: ${deep.uiComponents.length}\n`;
md+='- Key reusable components:\n';
md+='  - App shell/layout: AppShell, AppShellLayout, ConditionalAppShell\n';
md+='  - Admin shell: AdminShell, AdminTableViewLink, AdminBackLink, TagSelect\n';
md+='  - Auth/layout: AuthSplitLayout, AuthFooter, RedDogLogo\n';
md+='  - Domain helpers: AshleenChat, StatusBadge, filter/select components\n';
md+='  - Settings primitives: SettingsPrimitives, DeleteAccountModal\n';
md+='  - UI primitives: src/components/ui/* (buttons, forms, table, dialogs, toasts, etc.)\n\n';
md+='## 12. Known Issues & Pending Work\n\n';
md+='- OpenAI/email features run in fallback/stub mode when keys are missing.\n';
md+='- Cloudinary is configured but not yet fully wired through active feature flows.\n';
md+='- Root and frontend testing is missing (no robust automated test suite found).\n';
md+='- Frontend README remains default Next.js template; project-specific docs are incomplete.\n';
md+='- Some routes are redirect-only or placeholders, requiring continued feature hardening.\n\n';
md+='## 13. Setup & Run Instructions\n\n';
md+='### Local Setup\n\n';
md+='1. Backend\n';
md+='   - cd red-dog-radios-backend\n';
md+='   - npm install\n';
md+='   - Copy/edit .env from .env.example (required: MONGO_URI, JWT_SECRET)\n';
md+='   - npm run dev\n';
md+='2. Frontend\n';
md+='   - cd red-dog-radios-frontend\n';
md+='   - npm install\n';
md+='   - Ensure API_ORIGIN/NEXT_PUBLIC_API_ORIGIN points to backend (default localhost:4000)\n';
md+='   - npm run dev\n';
md+='3. Verify\n';
md+='   - Backend health: http://localhost:4000/health\n';
md+='   - API docs: http://localhost:4000/api-docs\n';
md+='   - Frontend: http://localhost:3000\n\n';
md+='### Seed Data\n\n';
md+='- cd red-dog-radios-backend\n';
md+='- npm run seed\n\n';
md+='### Optional script\n\n';
md+='- Root `start.sh` can start MongoDB + backend + frontend in sequence (Replit-oriented).\n';

fs.writeFileSync(path.join(root,'PROJECT_SUMMARY.md'),md,'utf8');
console.log('PROJECT_SUMMARY.md rewritten with ASCII tree');
