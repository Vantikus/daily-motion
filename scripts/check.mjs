import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(join(root,path),'utf8');
const fail=message=>{throw new Error(message);};

const syntaxFiles=[
  'app.js','audio.js','program.js','progress.js','pwa.js','session.js','state.js','sw.js',
  'playwright.config.js','tests/smoke.spec.js','tests/motion.spec.js','tests/visual.spec.js'
];

for(const file of syntaxFiles){
  const result=spawnSync(process.execPath,['--check',join(root,file)],{encoding:'utf8'});
  if(result.status!==0)fail(`Syntax check failed for ${file}:\n${result.stderr||result.stdout}`);
}

const htmlFiles=['index.html','session.html','progress.html'];
const html=Object.fromEntries(htmlFiles.map(file=>[file,read(file)]));
const sw=read('sw.js');
const styles=read('styles.css');
const readme=read('README.md');
const designSystem=read('DESIGN_SYSTEM.md');
const pwa=read('pwa.js');
const heroicons=read('heroicons.css');
const manifest=JSON.parse(read('manifest.webmanifest'));
const packageJson=JSON.parse(read('package.json'));
const ci=read('.github/workflows/ci.yml');
const visualSpec=read('tests/visual.spec.js');

if(packageJson.devDependencies?.['@playwright/test']!=='1.63.0'){
  fail('package.json: Playwright must be pinned exactly to 1.63.0');
}
if(!ci.includes('node-version: 22.16.0')){
  fail('ci.yml: Node runtime must stay pinned to 22.16.0');
}
if(!ci.includes('npm install --no-audit --no-fund --package-lock=false')){
  fail('ci.yml: deterministic test-tooling install command is missing');
}

const releaseVersions=new Set();
for(const [file,content] of Object.entries(html)){
  const versions=[...content.matchAll(/\?v=(\d+)/g)].map(match=>match[1]);
  if(!versions.length)fail(`${file}: no versioned assets found`);
  if(new Set(versions).size!==1)fail(`${file}: mixed asset versions: ${[...new Set(versions)].join(', ')}`);
  releaseVersions.add(versions[0]);
}
const cacheMatch=sw.match(/const CACHE_NAME='daily-motion-v(\d+)'/);
if(!cacheMatch)fail('sw.js: CACHE_NAME version not found');
releaseVersions.add(cacheMatch[1]);
const swVersions=[...sw.matchAll(/\?v=(\d+)/g)].map(match=>match[1]);
if(!swVersions.length||new Set(swVersions).size!==1)fail('sw.js: mixed or missing asset versions');
releaseVersions.add(swVersions[0]);
if(releaseVersions.size!==1)fail(`Release version mismatch: ${[...releaseVersions].join(', ')}`);

const designThemeColor='#f4f5f1';
if(manifest.theme_color!==designThemeColor)fail('manifest.webmanifest: theme_color drifted from Daily Motion canvas');
if(manifest.background_color!==designThemeColor)fail('manifest.webmanifest: background_color drifted from Daily Motion canvas');
if(manifest.background_color!==manifest.theme_color)fail('manifest.webmanifest: background/theme colors must stay synchronized');
for(const [file,content] of Object.entries(html)){
  const themeMatch=content.match(/<meta\s+name="theme-color"\s+content="([^"]+)"/i);
  if(!themeMatch)fail(`${file}: theme-color meta is missing`);
  if(themeMatch[1].toLowerCase()!==designThemeColor)fail(`${file}: theme-color drifted from Daily Motion canvas`);
}
for(const token of [
  '--bg:#f4f5f1;',
  '--surface:#fff;',
  '--surface-muted:#edf1ec;',
  '--text:#171917;',
  '--muted:#687169;',
  '--muted-strong:#535c54;',
  '--line:rgba(23,25,23,.09);',
  '--accent:#2f6b55;',
  '--accent-soft:#dfece5;'
]){
  if(!styles.includes(token))fail(`styles.css: P0 design-system token drifted: ${token}`);
}
if(!designSystem.includes('# Daily Motion Design System v1')||!designSystem.includes('P0 baseline contract')){
  fail('DESIGN_SYSTEM.md: P0 design-system contract is missing');
}
if(styles.includes('#8a918b'))fail('styles.css: low-contrast calendar microcopy returned');
if(styles.includes('#9b6b68'))fail('styles.css: low-contrast reset microcopy returned');


for(const token of [
  '--space-1:4px;',
  '--space-2:8px;',
  '--space-3:12px;',
  '--space-4:16px;',
  '--space-5:20px;',
  '--space-6:24px;',
  '--space-8:32px;',
  '--space-10:40px;',
  '--space-12:48px;',
  '--layout-max:760px;',
  '--layout-inline-space:40px;',
  '--radius-control:14px;',
  '--radius-card:18px;',
  '--radius-hero:24px;',
  '--radius-sheet:26px;',
  '--control-touch:44px;',
  '--control-primary:52px;',
  '--control-nav:54px;',
  '--settings-row-h:68px;'
]){
  if(!styles.includes(token))fail(`styles.css: R1 layout token drifted: ${token}`);
}
if(!styles.includes('@media(max-width:520px){:root{--layout-inline-space:32px}}')){
  fail('styles.css: R1 mobile 16px gutter contract is missing');
}
if(!styles.includes('.session-shell{width:min(var(--layout-max),calc(100% - var(--layout-inline-space)))')){
  fail('styles.css: session shell is not wired to shared layout gutter');
}
if(styles.includes('.session-shell{width:calc(100% - 24px)')){
  fail('styles.css: legacy 12px workout gutter returned');
}
if(!styles.includes('min-height:var(--settings-row-h)')){
  fail('styles.css: shared settings row height is not wired');
}
if(!styles.includes('.details-stack{display:grid;grid-template-columns:1fr!important;gap:0;border:1px solid var(--line);border-radius:var(--radius-card)')){
  fail('styles.css: technique grouped-list radius is not wired to R1');
}
if(!designSystem.includes('## R1 — layout and spacing normalization')){
  fail('DESIGN_SYSTEM.md: R1 layout contract is missing');
}


for(const token of [
  '--component-hit:var(--control-touch);',
  '--component-secondary-h:var(--control-secondary);',
  '--component-primary-h:var(--control-primary);',
  '--component-row-h:var(--settings-row-h);',
  '--switch-off:#7f8981;',
  '--focus-color:var(--accent);',
  '--motion-press-in:120ms;',
  '--motion-fast:140ms;',
  '--motion-base:220ms;',
  '--motion-content:220ms;',
  '--motion-stage:280ms;',
  '--motion-sheet-close:300ms;',
  '--motion-slow:320ms;',
  '--motion-sheet-open:380ms;'
]){
  if(!styles.includes(token))fail(`styles.css: R2 component/motion token drifted: ${token}`);
}
if(!styles.includes('.settings-sheet__handle,.routine-settings-sheet__handle{width:96px;min-height:var(--component-hit)}')){
  fail('styles.css: sheet drag target must remain 44px through the R2 component token');
}
if(!styles.includes('background:var(--switch-off)')){
  fail('styles.css: switch off-state contrast token is not wired');
}
for(const fragment of [
  'openDuration:.38',
  'closeDuration:.30',
  'dismissRatio:.28',
  'dismissMin:110',
  'dismissMax:190',
  'flingMinY:52',
  'flingVelocity:700',
  'flingProjection:.12'
]){
  if(!pwa.includes(fragment))fail(`pwa.js: bottom-sheet motion constant changed or disappeared: ${fragment}`);
}
if(!pwa.includes('window.DailyMotionMotion={createBottomSheet,sheetMotion:SHEET_MOTION};')){
  fail('pwa.js: named bottom-sheet motion contract is not exposed');
}
if(!visualSpec.includes("toHaveScreenshot('home-390x844.png'")||
   !visualSpec.includes("toHaveScreenshot('workout-390x844.png'")||
   !visualSpec.includes("toHaveScreenshot('progress-390x844.png'")){
  fail('tests/visual.spec.js: R2 visual baselines are incomplete');
}
if(!ci.includes('actions/upload-artifact@v4')){
  fail('ci.yml: browser regression artifacts must be uploaded on failure');
}
if(!designSystem.includes('## R2 — component contracts and regression hardening')){
  fail('DESIGN_SYSTEM.md: R2 component hardening contract is missing');
}

const manifestIcons=Array.isArray(manifest.icons)?manifest.icons:[];
for(const requiredSize of ['192x192','512x512']){
  if(!manifestIcons.some(icon=>String(icon?.sizes||'').split(/\s+/).includes(requiredSize))){
    fail(`manifest.webmanifest: missing ${requiredSize} install icon`);
  }
}
for(const icon of manifestIcons){
  const src=String(icon?.src||'');
  if(!src.startsWith('/'))continue;
  const relative=src.replace(/^\//,'');
  if(!existsSync(join(root,relative)))fail(`manifest.webmanifest: missing icon file ${src}`);
}

const shellMatch=sw.match(/const APP_SHELL=\[(.*?)\];/s);
if(!shellMatch)fail('sw.js: APP_SHELL not found');
for(const match of shellMatch[1].matchAll(/'([^']+)'/g)){
  const url=match[1];
  if(url==='/')continue;
  const relative=url.split('?')[0].replace(/^\//,'');
  if(!existsSync(join(root,relative)))fail(`APP_SHELL points to missing file: ${url}`);
}

const forbidden=[
  /weekly-goal/i,
  /weeklyGoal/,
  /home-goal/i,
  /goalSelect/,
  /getWeeklyProgress/,
  /Личная цель/i,
  /Цель недели/i,
  /Недельная цель/i,
  /personal goals/i
];
const goalSources={
  'index.html':html['index.html'],
  'app.js':read('app.js'),
  'progress.html':html['progress.html'],
  'progress.js':read('progress.js'),
  'session.html':html['session.html'],
  'session.js':read('session.js'),
  'state.js':read('state.js'),
  'styles.css':styles,
  'README.md':readme
};
for(const [file,content] of Object.entries(goalSources)){
  for(const pattern of forbidden){
    if(pattern.test(content))fail(`${file}: removed personal-goal code still matches ${pattern}`);
  }
}

const pageScripts=[
  ['index.html','app.js'],
  ['session.html','session.js'],
  ['progress.html','progress.js']
];
for(const [htmlFile,jsFile] of pageScripts){
  const markup=html[htmlFile];
  const js=read(jsFile);
  const ids=new Set([
    ...[...js.matchAll(/\$\(['"]#([^'"]+)['"]\)/g)].map(match=>match[1]),
    ...[...js.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(match=>match[1]),
    ...[...js.matchAll(/querySelector\(['"]#([^'"]+)['"]\)/g)].map(match=>match[1])
  ]);
  for(const id of ids){
    if(!markup.includes(`id="${id}"`)&&!markup.includes(`id='${id}'`)){
      fail(`${jsFile}: DOM id #${id} is missing from ${htmlFile}`);
    }
  }
}

for(const [file,content] of Object.entries(html)){
  for(const match of content.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g)){
    const url=match[1];
    if(/^https?:|^data:|^#/.test(url))continue;
    const relative=url.split('?')[0].replace(/^\//,'');
    if(relative&&!existsSync(join(root,relative)))fail(`${file}: missing local asset ${url}`);
  }
}


const heroiconSources={
  ...html,
  'app.js':read('app.js'),
  'session.js':read('session.js'),
  'progress.js':read('progress.js')
};
const usedHeroicons=new Set();
for(const content of Object.values(heroiconSources)){
  for(const match of content.matchAll(/\bhi-([a-z0-9-]+)/g))usedHeroicons.add(match[1]);
}
for(const name of usedHeroicons){
  const token=`.hi-${name}{--hi-mask:url("/vendor/heroicons/${name}.svg")}`;
  if(!heroicons.includes(token))fail(`heroicons.css: Heroicon mapping missing ${name}`);
  const svg=read(`vendor/heroicons/${name}.svg`);
  if(!svg.includes('stroke-width="1.7"'))fail(`vendor/heroicons/${name}.svg: expected 1.7px stroke`);
}
for(const [file,content] of Object.entries({...html,'app.js':read('app.js')})){
  if(/class=["'][^"']*\bph\b/.test(content))fail(`${file}: Phosphor class remains after Heroicons migration`);
  if(/phosphor\.css/i.test(content))fail(`${file}: Phosphor stylesheet remains after Heroicons migration`);
}
for(const file of htmlFiles){
  if(/<svg\b/i.test(html[file]))fail(`${file}: inline SVG UI icons remain after Heroicons migration`);
}
if(/<svg\b/i.test(read('app.js')))fail('app.js: inline SVG routine icons remain after Heroicons migration');

const retiredCssClasses=[
  "activity-card__actions",
  "activity-day__bar",
  "activity-streak",
  "catalog-chevron",
  "completion-week",
  "execution-check",
  "execution-done",
  "flow-cancel",
  "flow-card",
  "flow-overlay",
  "flow-skip",
  "flow-value",
  "flow-value--rest",
  "is-morphing",
  "notice-card",
  "progress-hero",
  "qm-icon--warn",
  "routine-catalog",
  "routine-icon",
  "routine-reset-button",
  "routine-reset-overlay",
  "routine-reset-sheet",
  "routine-reset-sheet__handle",
  "summary-strip",
  "timer-actions",
  "timer-adjustments",
  "timer-card",
  "timer-card__head",
  "timer-card__status",
  "timer-grid",
  "timer-kicker",
  "timer-primary",
  "timer-reset-link",
  "timer-state-row",
  "today-card__percent",
  "visual-placeholder__icon",
  "visual-placeholder__inner"
];
for(const className of retiredCssClasses){
  if(styles.includes(`.${className}`))fail(`styles.css: retired selector still present: .${className}`);
}
for(const marker of ['/* v75 —','/* v76 —','/* v77 —','/* v78 —']){
  if(styles.includes(marker))fail(`styles.css: historical sheet layer still present: ${marker}`);
}
if(!styles.includes('/* Bottom sheets — GSAP owns transform and backdrop motion */')){
  fail('styles.css: consolidated bottom-sheet layer is missing');
}
if(!styles.includes('.home-body .home-activity-summary')){
  fail('styles.css: activity streak summary styling is missing');
}
if(!styles.includes('--muted-strong:#535c54;')){
  fail('styles.css: accessible microcopy color token is missing');
}
if(!styles.includes('outline:2px solid var(--focus-color);')||!styles.includes('box-shadow:0 0 0 4px var(--focus-halo);')){
  fail('styles.css: semantic high-contrast focus-visible contract is missing');
}
if(/outline:\s*3px solid rgba\(47,107,85,\.18\)/.test(styles)){
  fail('styles.css: obsolete low-contrast focus ring remains');
}
const techniqueMarkup=html['session.html'];
const techniqueHeadingCount=(techniqueMarkup.match(/<h3 class="detail-card__heading">/g)||[]).length;
if(techniqueHeadingCount!==6)fail(`session.html: expected 6 semantic technique headings, found ${techniqueHeadingCount}`);
for(const id of ['detail-how','detail-breathing','detail-feel','detail-mistakes','detail-easy','detail-progression']){
  if(!techniqueMarkup.includes(`id="${id}-toggle"`))fail(`session.html: missing accordion toggle id for ${id}`);
  if(!techniqueMarkup.includes(`id="${id}" role="region" aria-labelledby="${id}-toggle"`)){
    fail(`session.html: missing labelled accordion region for ${id}`);
  }
}
if(/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*<h[1-6]\b/i.test(techniqueMarkup)){
  fail('session.html: headings must wrap accordion buttons, not be nested inside buttons');
}

const countExactCssRule=selector=>{
  const escaped=selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return (styles.match(new RegExp(`(^|\\n)\\s*${escaped}\\s*\\{`,'g'))||[]).length;
};
const cssRuleBudgets={
  '.timer-ring':2,
  '.timer-ring__inner strong':1,
  '.exercise-scroll':1,
  '.session-shell':2,
  '.exercise-main':1,
  '.exercise-head':1,
  '.exercise-head p':2,
  '.exercise-facts':2,
  '.exercise-facts>div':1,
  '.exercise-facts span':1,
  '.technique-key':1,
  '.technique-key span':1,
  '.technique-key strong':1,
  '.details-section':1,
  '.details-title':1,
  '.detail-card__toggle':2,
  '.setting-row':2,
  '.settings-reset':1
};
for(const [selector,maxCount] of Object.entries(cssRuleBudgets)){
  const count=countExactCssRule(selector);
  if(count>maxCount)fail(`styles.css: selector ${selector} regressed to ${count} cascade layers (max ${maxCount})`);
}
if(/@media[^{]+\{\s*\}/.test(styles))fail('styles.css: empty media query remains after consolidation');

const typographyMarker='/* Heroicons Outline — primary UI icon system · 1.7px stroke */';
const typographyMarkerIndex=styles.indexOf(typographyMarker);
if(typographyMarkerIndex<0)fail('styles.css: Heroicons boundary marker is missing');
const textStyles=styles.slice(0,typographyMarkerIndex);
for(const [token,value] of Object.entries({
  '--font-size-xs':'.75rem',
  '--font-size-sm':'.8125rem',
  '--font-size-md':'.875rem',
  '--font-size-body':'.9375rem',
  '--font-size-base':'1rem'
})){
  if(!textStyles.includes(`${token}:${value};`))fail(`styles.css: typography token ${token} must remain ${value}`);
}
if(!textStyles.includes('font-size:var(--font-size-base);'))fail('styles.css: body typography base token is not wired');
if(/font-size\s*:\s*[0-9.]+px/.test(textStyles))fail('styles.css: user-facing text layer contains fixed px font-size');
if(/font-size\s*:\s*(?:10|11|11\.5|12\.5)px/.test(styles))fail('styles.css: legacy micro-font px size returned');
if(html['index.html'].includes('<details')||html['index.html'].includes('routineCatalog')){
  fail('index.html: complexes must remain immediately visible, not inside a disclosure');
}

const motionContract=[
  "phase='closed'",
  "phase='opening'",
  "phase='open'",
  "phase='dragging'",
  "phase='settling'",
  "phase='closing'",
  "sheetHeight*.28",
  "y>=52&&velocity>700",
  "prefers-reduced-motion: reduce",
  "Cubic Hermite",
  "Critically damped return"
];
for(const token of motionContract){
  if(!pwa.includes(token))fail(`pwa.js: motion contract token missing: ${token}`);
}

for(const token of [
  'getRoutineEntries',
  'getRoutineActiveSeconds',
  'hasCompletedRoutine',
  'hasRoutineActivity',
  'getCurrentStreak',
  'getBestStreak',
  'getCompletedRoutineCount',
  'getTotalActiveSeconds'
]){
  if(!read('state.js').includes(token))fail(`state.js: shared activity API missing ${token}`);
}
if(read('app.js').includes('availableRoutinesForDay')||read('progress.js').includes('timerElapsedSeconds')){
  fail('activity/statistics logic was re-duplicated outside state.js');
}
if(!sw.includes("pathname.endsWith('/progress.html')")||!sw.includes("pathname.endsWith('/session.html')")){
  fail('sw.js: canonical offline navigation fallbacks are incomplete');
}
if(/\/\*\s*v\d+\s+—/.test(styles)){
  fail('styles.css: historical version-number comments remain');
}

if(!read('app.js').includes('createBottomSheet'))fail('app.js: shared bottom sheet is not wired');
const sessionSource=read('session.js');
const restStart=sessionSource.indexOf('function startRest');
const restEnd=sessionSource.indexOf('function onTimerFinished',restStart);
const restBlock=restStart>=0&&restEnd>restStart?sessionSource.slice(restStart,restEnd):'';
if(!restBlock.includes('releaseWakeLock();'))fail('session.js: natural rest completion must release wake lock');

if(!read('state.js').includes('ensureProgramVersion'))fail('state.js: safe program-version migration is missing');
if(!read('session.js').includes('Store.ensureProgramVersion'))fail('session.js: safe program-version migration is not wired');

if(!read('session.js').includes('createBottomSheet'))fail('session.js: shared bottom sheet is not wired');
if(read('progress.js').includes('createBottomSheet'))fail('progress.js: bottom sheet should not be used on progress page');

console.log(`Daily Motion checks passed · release v${[...releaseVersions][0]}`);
