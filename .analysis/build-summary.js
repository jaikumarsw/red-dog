const fs=require('fs');
const path=require('path');
const root=process.cwd();

const deep=JSON.parse(fs.readFileSync(path.join(root,'.analysis','deep.json'),'utf8'));
const pages=JSON.parse(fs.readFileSync(path.join(root,'.analysis','frontend-pages.json'),'utf8'));
const backendPkg=JSON.parse(fs.readFileSync(path.join(root,'red-dog-radios-backend','package.json'),'utf8'));
const frontendPkg=JSON.parse(fs.readFileSync(path.join(root,'red-dog-radios-frontend','package.json'),'utf8'));
const backendTree=fs.readFileSync(path.join(root,'.analysis','backend-tree.txt'),'utf8');
const frontendTree=fs.readFileSync(path.join(root,'.analysis','frontend-tree.txt'),'utf8');

const baseByModule={
  auth:'/api/auth',organizations:'/api/organizations',opportunities:'/api/opportunities',matches:'/api/matches',applications:'/api/applications',agencies:'/api/agencies',alerts:'/api/alerts',outbox:'/api/outbox',digests:'/api/digests',ai:'/api/ai',dashboard:'/api/dashboard',onboarding:'/api/onboarding',settings:'/api/settings',funders:'/api/funders',wins:'/api/wins',outreach:'/api/outreach',followups:'/api/followups',tracker:'/api/tracker',ashleen:'/api/ashleen',admin:'/api/admin'
};

function roleFromRoute(route){
  if(route.startsWith('/admin')) return 'Admin';
  if(['/login','/signup','/forgot-password','/otp-verification','/create-password','/'].includes(route)) return 'Public';
  return 'Agency';
}

function purposeFromRoute(route){
  const map={
    '/':'Root redirect to login','/login':'Agency login','/signup':'Agency signup','/forgot-password':'Password reset start','/otp-verification':'OTP verification','/create-password':'Create/reset password',
    '/dashboard':'Agency dashboard','/opportunities':'Browse opportunities','/matches':'Match list','/applications':'Application list','/alerts':'Alerts center','/funders':'Funders list','/tracker':'Application tracker','/wins':'Wins and insights','/weekly-summary':'Weekly digest view',
    '/settings':'User and org settings','/settings/agency':'Agency profile settings','/outreach':'Outreach list','/outreach/[id]':'Outreach editor','/followups':'Follow-up queue','/onboarding':'Onboarding welcome'
  };
  if(map[route]) return map[route];
  if(route.includes('/admin/')) return 'Admin panel view';
  if(route.includes('/onboarding/step')) return 'Onboarding step form';
  if(route.includes('/applications/[id]')) return 'Application detail/builder';
  if(route.includes('/funders/[id]')) return 'Funder detail';
  return 'Page route';
}

let md='';
md += '# PROJECT SUMMARY\n\n';
md += '_Generated from a full source traversal of backend and frontend code (261 source files under src)._\n\n';
md += '## 1. Project Overview\n\n';
md += '- **What it does**: Red Dog Radios is a grant intelligence platform for public-safety agencies. It helps agencies discover opportunities, compute fit scores, track applications, manage outreach, and receive alerts/digests.\n';
md += '- **Who it serves**: Two primary roles are supported end-to-end.\n';
md += '- **Agency role**:\n';
md += '  - Register/login with OTP verification\n';
md += '  - Complete onboarding and maintain organization profile\n';
md += '  - View opportunities, matches, applications, alerts, tracker, wins\n';
md += '  - Generate/manage outreach and follow-ups\n';
md += '- **Staff/Admin role**:\n';
md += '  - Access dedicated admin login and panel\n';
md += '  - Manage agencies, users, opportunities, funders, matches, and applications\n';
md += '  - Review activity logs and trigger recompute/admin workflows\n\n';

md += '## 2. Tech Stack\n\n';
md += '### Backend\n\n';
md += `- Runtime: Node.js (CommonJS), package ${backendPkg.name}@${backendPkg.version}\n`;
md += `- Framework: express@${backendPkg.dependencies.express}\n`;
md += `- Database/ODM: mongoose@${backendPkg.dependencies.mongoose}, mongoose-paginate-v2@${backendPkg.dependencies['mongoose-paginate-v2']}\n`;
md += `- Auth/Security: jsonwebtoken@${backendPkg.dependencies.jsonwebtoken}, bcryptjs@${backendPkg.dependencies.bcryptjs}, helmet@${backendPkg.dependencies.helmet}, cors@${backendPkg.dependencies.cors}, express-rate-limit@${backendPkg.dependencies['express-rate-limit']}\n`;
md += `- Email: nodemailer@${backendPkg.dependencies.nodemailer}, resend@${backendPkg.dependencies.resend}\n`;
md += `- AI: openai@${backendPkg.dependencies.openai} (model default gpt-4o-mini)\n`;
md += `- Scheduling: node-cron@${backendPkg.dependencies['node-cron']}\n`;
md += `- Middleware/ops: morgan@${backendPkg.dependencies.morgan}, dotenv@${backendPkg.dependencies.dotenv}, multer@${backendPkg.dependencies.multer}, cloudinary@${backendPkg.dependencies.cloudinary}\n`;
md += `- API Docs: swagger-jsdoc@${backendPkg.dependencies['swagger-jsdoc']}, swagger-ui-express@${backendPkg.dependencies['swagger-ui-express']}\n\n`;

md += '### Frontend\n\n';
md += `- Framework: next@${frontendPkg.dependencies.next} (App Router), react@${frontendPkg.dependencies.react}, react-dom@${frontendPkg.dependencies['react-dom']}\n`;
md += '- UI: Shadcn-style component set + Radix UI primitives\n';
md += `- State management: @tanstack/react-query@${frontendPkg.dependencies['@tanstack/react-query']}\n`;
md += `- Forms/validation: react-hook-form@${frontendPkg.dependencies['react-hook-form']}, zod@${frontendPkg.dependencies.zod}, @hookform/resolvers@${frontendPkg.dependencies['@hookform/resolvers']}\n`;
md += `- HTTP client: axios@${frontendPkg.dependencies.axios}\n`;
md += `- Styling: tailwindcss@${frontendPkg.devDependencies.tailwindcss}, postcss@${frontendPkg.devDependencies.postcss}, tailwindcss-animate@${frontendPkg.dependencies['tailwindcss-animate']}\n\n`;

md += '## 3. Folder Structure\n\n';
md += '### Backend Tree (annotated)\n\n';
md += '```text\n'+backendTree+'\n```\n\n';
md += 'Backend notes:\n';
md += '- src/app.js mounts middleware, health, docs, and all module routes.\n';
md += '- src/server.js handles env validation, Mongo connection, startup, and cron boot.\n';
md += '- src/modules/* uses schema/service/controller/route layering.\n';
md += '- src/config/* encapsulates OpenAI/email/cloudinary provider setup.\n';
md += '- src/utils/cron.jobs.js registers scheduled background jobs.\n\n';

md += '### Frontend Tree (annotated)\n\n';
md += '```text\n'+frontendTree+'\n```\n\n';
md += 'Frontend notes:\n';
md += '- src/app/* defines Next.js App Router pages (agency + admin panel).\n';
md += '- src/views/* holds feature views consumed by route pages.\n';
md += '- src/lib/* contains API clients, auth contexts, constants, and query config.\n';
md += '- src/components/* holds app shell/layout and reusable UI primitives.\n';
md += '- src/middleware.ts enforces auth + onboarding redirects using cookies.\n\n';

md += '## 4. Architecture & Data Flow\n\n';
md += '- Frontend calls relative /api endpoints through Axios clients (src/lib/api.ts and src/lib/adminApi.ts).\n';
md += '- next.config.ts rewrites /api/:path* -> API_ORIGIN/NEXT_PUBLIC_API_ORIGIN backend origin.\n';
md += '- Agency auth state uses localStorage keys rdg_token/rdg_user and cookies rdg_token/rdg_onboarding.\n';
md += '- Admin auth state uses localStorage keys rdg_admin_token/rdg_admin_user and cookie rdg_admin_token.\n';
md += '- Axios request interceptors attach Bearer token; response interceptors clear session and redirect on 401 (excluding auth endpoints).\n';
md += '- Domain flow:\n';
md += '  1. Organization profile is created/updated during onboarding.\n';
md += '  2. Opportunity records are ingested/managed (agency read, admin CRUD).\n';
md += '  3. Match engine computes fit scores and stores reasoning/breakdowns.\n';
md += '  4. Alert jobs generate deadline/high-fit alerts and optional emails.\n';
md += '  5. Applications are drafted/generated/submitted and tracked.\n';
md += '  6. Outreach drafts/sends communications to funders.\n';
md += '  7. Outbox queues and sends scheduled/manual emails with retries.\n\n';

md += '## 5. Authentication & Authorization\n\n';
md += '- Registration: POST /api/auth/register creates unverified agency account and sends signup OTP.\n';
md += '- Verify email: POST /api/auth/verify-email validates OTP and returns JWT + user.\n';
md += '- Login: POST /api/auth/login for agency users (admin users are blocked and redirected to /admin/login path).\n';
md += '- Forgot/reset: POST /api/auth/forgot-password -> POST /api/auth/verify-otp -> POST /api/auth/reset-password.\n';
md += '- Frontend route protection: src/middleware.ts checks cookies for agency/admin tokens and onboarding status; redirects based on route class (public, agency protected, admin protected).\n';
md += '- Backend authorization: protect middleware validates JWT and loads user; protectAdmin/adminAuth middleware enforces role=admin for staff endpoints.\n\n';

md += '## 6. All Modules & Features\n\n';
md += '### Backend Modules\n\n';
for(const mod of deep.modules){
  const base=baseByModule[mod.name]||'(internal/no mounted route)';
  md += `#### ${mod.name}\n`;
  md += `- Purpose: ${mod.name} domain module.\n`;
  md += `- Files: ${mod.files.join(', ')}\n`;
  if(mod.routes.length){
    md += `- Base Path: ${base}\n`;
    md += '- Endpoints:\n';
    for(const r of mod.routes){
      const full = base.startsWith('/api') ? `${base}${r.path === '/' ? '' : r.path}` : r.path;
      md += `  - ${r.method} ${full} | middlewares: ${r.middlewares.join(', ')||'none'} | action: ${r.controller||'n/a'}\n`;
    }
  } else {
    md += '- Endpoints: none (support/internal module).\n';
  }
  if(mod.serviceExports.length) md += `- Service highlights: ${mod.serviceExports.join(', ')}\n`;
  if(mod.controllerExports.length) md += `- Controller actions: ${mod.controllerExports.join(', ')}\n`;
  if(mod.name==='matches') md += '- Business logic: weighted fit scoring with reasons/disqualifiers and per-dimension breakdown.\n';
  if(mod.name==='onboarding') md += '- Business logic: maps frontend agency/budget enums, creates or updates Organization, links User.organizationId, marks onboarding complete.\n';
  if(mod.name==='outbox') md += '- Background integration: hourly queue processing and retry handling.\n';
  if(mod.name==='alerts') md += '- Background integration: nightly deadline/high-fit alert generation jobs.\n';
  md += '\n';
}

md += '### Frontend Routes/Pages\n\n';
md += '| Route | Role | Purpose | Data/API Hints |\n|---|---|---|---|\n';
for(const p of pages.sort((a,b)=>a.route.localeCompare(b.route))){
  const role=roleFromRoute(p.route);
  const purpose=purposeFromRoute(p.route);
  const apiHints = p.apis.length ? p.apis.slice(0,2).join('; ') : (p.redirects.length ? `redirect: ${p.redirects.join(', ')}` : 'view-driven/no direct call');
  md += `| ${p.route} | ${role} | ${purpose} | ${apiHints.replace(/\|/g,'/')} |\n`;
}
md += '\n';

md += '## 7. Database Schema\n\n';
md += 'Mongoose models identified:\n\n';
for(const mod of deep.modules.filter(m=>m.schema)){
  md += `- ${mod.schema.model || mod.name} (${mod.schema.file})\n`;
  if(mod.schema.fields && mod.schema.fields.length){
    md += `  - Top-level fields seen: ${mod.schema.fields.slice(0,20).map(f=>f.name).join(', ')}${mod.schema.fields.length>20?' ...':''}\n`;
  }
  if(mod.schema.indexes.length){
    md += `  - Indexes: ${mod.schema.indexes.join(' ; ')}\n`;
  }
}
md += '\nDetailed schema behavior from source:\n';
md += '- User: account credentials, role, verification/reset OTP/token fields, settings object, organization link.\n';
md += '- Organization: profile, agency types, program/focus areas, budget/timeline, operational metadata.\n';
md += '- Opportunity: grant metadata, amounts, deadlines, match-related tags, lock/cap fields.\n';
md += '- Match: organization-opportunity link, fit score, reasons, disqualifiers, breakdown, moderation status.\n';
md += '- Application: lifecycle status, narrative fields, alignedVersion, status history, winner tags.\n';
md += '- Alert: typed notifications with priority/read state and de-dup key.\n';
md += '- Digest: period-based summary with matches/opportunities and email content.\n';
md += '- Outbox: queued emails, scheduling, status, retry count, provider IDs.\n';
md += '- FollowUp: scheduled reminders tied to application/user/org/funder/opportunity.\n';
md += '- Funder/Win/Outreach/ActivityLog/Agency: supporting domain records and audit trail.\n\n';

md += '## 8. Environment Variables\n\n';
md += '### Backend Variables\n\n';
md += '| Variable | Required | Purpose |\n|---|---|---|\n';
const backendEnvRows=[
['MONGO_URI','Yes','MongoDB connection string'],['JWT_SECRET','Yes','JWT signing/verification secret'],['PORT','No','API port (default 4000)'],['NODE_ENV','No','Environment mode'],['JWT_EXPIRES_IN','No','JWT TTL'],['CORS_ORIGIN','No','Allowed frontend origin'],['OPENAI_API_KEY','No','Enable real AI responses'],['OPENAI_MODEL','No','Model override for ashleen controller'],['SMTP_HOST','No','SMTP host'],['SMTP_PORT','No','SMTP port'],['SMTP_USER','No','SMTP username/from fallback'],['SMTP_PASS','No','SMTP password'],['SMTP_FROM','No','Email from address'],['SMTP_SECURE','No','SMTP secure toggle'],['DEV_REDIRECT_EMAIL','No','Redirect outbound emails in non-prod'],['ADMIN_EMAIL','No','Cron failure notification recipient'],['FRONTEND_URL','No','Links in email templates'],['CLOUDINARY_CLOUD_NAME','No','Cloudinary config'],['CLOUDINARY_API_KEY','No','Cloudinary config'],['CLOUDINARY_API_SECRET','No','Cloudinary config']
];
for(const r of backendEnvRows){md += `| ${r[0]} | ${r[1]} | ${r[2]} |\n`;}
md += '\n### Frontend Variables\n\n';
md += '| Variable | Required | Purpose |\n|---|---|---|\n';
[['API_ORIGIN','No','Server-side rewrite destination for /api'],['NEXT_PUBLIC_API_ORIGIN','No','Public fallback rewrite destination'],['REPLIT_DEV_DOMAIN','No','Allowed dev origin for Replit'],['NODE_ENV','No','Runtime checks in client/admin shell']].forEach(r=>{md += `| ${r[0]} | ${r[1]} | ${r[2]} |\n`;});
md += '\n';

md += '## 9. Key Business Logic\n\n';
md += '- Match scoring engine (matches service): computes fitScore 0-100 across agency type, geography, keyword overlap, deadline viability, award fit, timeline alignment, data completeness, and local match capability. Returns reasons, disqualifiers, breakdown, and recommended action.\n';
md += '- Onboarding completion (onboarding service): validates/massages agency payload, maps enum values, persists Organization, syncs compatibility Agency record, updates User.onboardingCompleted + organizationId, and attempts welcome email send.\n';
md += '- Alert generation (alerts + cron): deadline alerts and high-fit alerts are generated nightly with de-dup keys; optional email notifications are sent to organization users.\n';
md += '- Digest generation (digests service): builds weekly summaries from qualifying matches/opportunities and AI intro (or stub fallback), supports preview and send.\n';
md += '- Outbox queue processing (outbox service + cron): queued outbound emails are processed hourly with retry and failure tracking.\n\n';

md += '## 10. API Reference\n\n';
md += '| Module | Method | Path | Middleware | Controller Action |\n|---|---|---|---|---|\n';
for(const mod of deep.modules.filter(m=>m.routes.length)){
  const base=baseByModule[mod.name]||'';
  for(const r of mod.routes){
    const full = (base ? `${base}${r.path==='/'?'':r.path}` : r.path);
    md += `| ${mod.name} | ${r.method} | ${full} | ${r.middlewares.join(', ')||'none'} | ${r.controller||'n/a'} |\n`;
  }
}
md += '\n';

md += '## 11. Frontend Pages & Components\n\n';
md += `- Total App Router page files: ${pages.length}\n`;
md += `- Key reusable components: ${deep.uiComponents.length} files under src/components (including app shell, admin shell, auth layout, settings primitives, and extensive ui primitives).\n`;
md += '- Notable shared components:\n';
md += '  - App shell/navigation: AppShell, AppShellLayout, ConditionalAppShell\n';
md += '  - Auth/session UI: AuthSplitLayout, AuthFooter\n';
md += '  - Domain widgets: AshleenChat, StatusBadge, filter dropdown/selects\n';
md += '  - Admin shell/utilities: AdminShell, TagSelect, AdminTableViewLink\n';
md += '  - Settings controls: SettingsPrimitives, DeleteAccountModal\n\n';

md += '## 12. Known Issues & Pending Work\n\n';
md += '- OpenAI and email systems are designed with stubs/fallbacks when env variables are missing (non-fatal behavior).\n';
md += '- Cloudinary is configured but not fully integrated into active upload workflows.\n';
md += '- Frontend README is still generic Next.js template; project-specific frontend docs are incomplete.\n';
md += '- Automated test coverage is not present for critical backend and frontend flows.\n';
md += '- Some routes/pages are redirect-only or legacy placeholders (e.g., organizations redirect, admin new pages redirect to list).\n';
md += '- Lint/style diagnostics exist in a few files and should be cleaned before release.\n\n';

md += '## 13. Setup & Run Instructions\n\n';
md += '### Prerequisites\n\n';
md += '- Node.js LTS\n- MongoDB (local service or hosted URI)\n\n';
md += '### Backend\n\n';
md += '1. cd red-dog-radios-backend\n';
md += '2. npm install\n';
md += '3. Create .env from .env.example and set required values (MONGO_URI, JWT_SECRET).\n';
md += '4. Optional: set OPENAI_API_KEY and SMTP/CLOUDINARY values for production behavior.\n';
md += '5. npm run dev (or npm start)\n';
md += '6. Verify health at http://localhost:4000/health and docs at http://localhost:4000/api-docs\n\n';
md += '### Frontend\n\n';
md += '1. cd red-dog-radios-frontend\n';
md += '2. npm install\n';
md += '3. Configure API_ORIGIN or NEXT_PUBLIC_API_ORIGIN if backend host is not localhost:4000.\n';
md += '4. npm run dev\n';
md += '5. Open http://localhost:3000\n\n';
md += '### Seed Demo Data\n\n';
md += '1. cd red-dog-radios-backend\n';
md += '2. npm run seed\n';
md += '- Seeds admin + demo organizations/opportunities/matches/alerts for testing.\n\n';
md += '### Optional Combined Startup\n\n';
md += '- Root start.sh starts MongoDB, backend, then frontend (Replit-oriented script).\n\n';

fs.writeFileSync(path.join(root,'PROJECT_SUMMARY.md'),md,'utf8');
console.log('PROJECT_SUMMARY.md written');
