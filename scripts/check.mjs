import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(join(root,path),'utf8');
const fail=message=>{throw new Error(message);};
const requireFile=path=>{if(!existsSync(join(root,path)))fail(`Missing required file: ${path}`);};

const runtimeFiles=[
  'app.js','audio.js','motion.js','ui.js','session-view.js','navigation.js',
  'program.js','progress.js','pwa.js','session.js','state.js','sw.js','theme.js'
];
const behaviorSpecs=[
  'tests/state.spec.js',
  'tests/lifecycle.spec.js',
  'tests/visual-matrix.spec.js',
  'tests/pwa.spec.js',
  'tests/navigation.spec.js',
  'tests/session-flow.spec.js',
  'tests/settings.spec.js',
  'tests/accessibility.spec.js',
  'tests/layout.spec.js',
  'tests/motion.spec.js',
  'tests/visual.spec.js'
];
const syntaxFiles=[...runtimeFiles,'playwright.config.js','scripts/test-server.mjs','tests/helpers/runtime.js',...behaviorSpecs];

for(const file of syntaxFiles){
  requireFile(file);
  const result=spawnSync(process.execPath,['--check',join(root,file)],{encoding:'utf8'});
  if(result.status!==0)fail(`Syntax check failed for ${file}:\n${result.stderr||result.stdout}`);
}
if(existsSync(join(root,'tests/smoke.spec.js')))fail('tests/smoke.spec.js must remain split by responsibility');
if(existsSync(join(root,'DAILY_MOTION_HANDOFF_STAGE8.md')))fail('Stage 8 handoff file must not ship in the final source');

const htmlFiles=['index.html','session.html','progress.html'];
const html=Object.fromEntries(htmlFiles.map(file=>[file,read(file)]));
const styles=read('styles.css');
const sw=read('sw.js');
const manifest=JSON.parse(read('manifest.webmanifest'));
const packageJson=JSON.parse(read('package.json'));
const ci=read('.github/workflows/ci.yml');
const app=read('app.js');
const progress=read('progress.js');
const session=read('session.js');
const sessionView=read('session-view.js');
const state=read('state.js');
const ui=read('ui.js');
const motion=read('motion.js');
const pwa=read('pwa.js');
const navigation=read('navigation.js');
const theme=read('theme.js');
const heroicons=read('heroicons.css');

if(packageJson.devDependencies?.['@playwright/test']!=='1.63.0')fail('package.json: Playwright must stay pinned to 1.63.0');
if(packageJson.devDependencies?.wrangler!=='4.143.0')fail('package.json: Wrangler must stay pinned to 4.143.0');
if(!ci.includes('node-version: 22.16.0'))fail('ci.yml: Node runtime must stay pinned to 22.16.0');
if(!ci.includes('npm install --no-audit --no-fund --package-lock=false'))fail('ci.yml: deterministic tooling install is missing');
if(!ci.includes('npm run check')||!ci.includes('npm run test:e2e'))fail('ci.yml: static and browser regression stages are required');
if(!ci.includes('actions/upload-artifact@v4'))fail('ci.yml: failed browser artifacts must be uploaded');

const releaseVersions=new Set();
for(const [file,content] of Object.entries(html)){
  const versions=[...content.matchAll(/\?v=(\d+)/g)].map(match=>match[1]);
  if(!versions.length)fail(`${file}: no versioned runtime assets`);
  const unique=[...new Set(versions)];
  if(unique.length!==1)fail(`${file}: mixed runtime versions ${unique.join(', ')}`);
  releaseVersions.add(unique[0]);
}
const cacheMatch=sw.match(/const CACHE_NAME='daily-motion-v(\d+)'/);
if(!cacheMatch)fail('sw.js: CACHE_NAME version missing');
releaseVersions.add(cacheMatch[1]);
const swVersions=[...sw.matchAll(/\?v=(\d+)/g)].map(match=>match[1]);
if(!swVersions.length||new Set(swVersions).size!==1)fail('sw.js: mixed or missing asset versions');
releaseVersions.add(swVersions[0]);
if(releaseVersions.size!==1)fail(`Release version mismatch: ${[...releaseVersions].join(', ')}`);
const releaseVersion=[...releaseVersions][0];

const designThemeColor='#f4f5f1';
if(manifest.theme_color!==designThemeColor||manifest.background_color!==designThemeColor){
  fail('manifest.webmanifest: canvas/theme colors drifted');
}
for(const [file,content] of Object.entries(html)){
  const themeMeta=content.match(/<meta\s+name="theme-color"\s+content="([^"]+)"/i);
  if(!themeMeta||themeMeta[1].toLowerCase()!==designThemeColor)fail(`${file}: theme-color meta drifted`);
  if(!content.includes('id="swup"')||!content.includes('class="transition-page"'))fail(`${file}: Swup container contract missing`);
  for(const runtime of ['navigation.js','motion.js','ui.js','session-view.js','app.js','progress.js','session.js']){
    if(!content.includes(`${runtime}?v=${releaseVersion}`))fail(`${file}: persistent runtime missing ${runtime}`);
  }
  if(content.includes('unpkg.com/'))fail(`${file}: parser-blocking remote runtime tag returned`);
}

const manifestIcons=Array.isArray(manifest.icons)?manifest.icons:[];
for(const size of ['192x192','512x512']){
  if(!manifestIcons.some(icon=>String(icon?.sizes||'').split(/\s+/).includes(size)))fail(`manifest.webmanifest: missing ${size} icon`);
}
for(const icon of manifestIcons){
  const src=String(icon?.src||'');
  if(src.startsWith('/')&&!existsSync(join(root,src.slice(1))))fail(`manifest.webmanifest: missing icon ${src}`);
}

const shellMatch=sw.match(/const APP_SHELL=\[(.*?)\];/s);
if(!shellMatch)fail('sw.js: APP_SHELL missing');
for(const match of shellMatch[1].matchAll(/'([^']+)'/g)){
  const url=match[1];
  if(url==='/')continue;
  const relative=url.split('?')[0].replace(/^\//,'');
  if(relative&&!existsSync(join(root,relative)))fail(`sw.js: APP_SHELL points to missing file ${url}`);
}
for(const runtime of ['navigation.js','motion.js','ui.js','session-view.js','app.js','progress.js','session.js']){
  if(!sw.includes(`'/${runtime}?v=${releaseVersion}'`))fail(`sw.js: persistent runtime not cached ${runtime}`);
}
if(!sw.includes("pathname.endsWith('/progress.html')")||!sw.includes("pathname.endsWith('/session.html')")){
  fail('sw.js: canonical offline navigation fallback missing');
}

const swupVendorUrls=[
  'https://unpkg.com/swup@4.10.0/dist/Swup.umd.js',
  'https://unpkg.com/@swup/preload-plugin@3.2.12/dist/index.umd.js',
  'https://unpkg.com/@swup/head-plugin@2.3.1/dist/index.umd.js',
  'https://unpkg.com/@swup/body-class-plugin@3.3.0/dist/index.umd.js',
  'https://unpkg.com/@swup/a11y-plugin@5.2.1/dist/index.umd.js',
  'https://unpkg.com/@swup/js-plugin@3.2.0/dist/index.umd.js',
  'https://unpkg.com/@swup/scroll-plugin@4.0.0/dist/index.umd.js'
];
for(const url of swupVendorUrls){
  if(!navigation.includes(`'${url}'`))fail(`navigation.js: pinned Swup runtime missing ${url}`);
  if(!sw.includes(`'${url}'`))fail(`sw.js: Swup runtime not cached ${url}`);
}
for(const token of [
  'new window.SwupPreloadPlugin({throttle:3})',
  'new window.SwupHeadPlugin()',
  'new window.SwupBodyClassPlugin()',
  'new window.SwupA11yPlugin(',
  'new window.SwupJsPlugin({animations:pageAnimations})',
  'new window.SwupScrollPlugin({animateScroll:false})',
  "swup.hooks.before('content:replace'",
  "swup.hooks.on('content:replace'",
  "swup.hooks.on('page:view'",
  'window.DailyMotionNavigate=',
  'window.DailyMotionBack='
]){
  if(!navigation.includes(token))fail(`navigation.js: navigation ownership missing ${token}`);
}
for(const forbidden of ['DOMParser','syncBodyAndHead','SwupScriptsPlugin','SwupParallelPlugin','SwupFragmentPlugin']){
  if(navigation.includes(forbidden))fail(`navigation.js: obsolete navigation implementation returned ${forbidden}`);
}

for(const [source,label,page] of [[app,'app.js','home'],[progress,'progress.js','progress'],[session,'session.js','session']]){
  if(!source.includes(`window.DailyMotionPages.${page}=function`))fail(`${label}: managed page mount missing`);
}
for(const token of ['lifecycle.abort();','cancelCountdown();','cancelRest();','stopTicker();','sessionView.destroy();','routineSettingsMotion?.destroy?.();']){
  if(!session.includes(token))fail(`session.js: cleanup contract missing ${token}`);
}

for(const token of ['createToast','trapFocus','createConfirmFlow','bindSettingsControls']){
  if(!ui.includes(token))fail(`ui.js: shared UI primitive missing ${token}`);
}
for(const source of [app,session]){
  for(const duplicate of ['function syncThemeControl','function syncTimingControl','const focusable=[...']){
    if(source.includes(duplicate))fail(`Shared UI logic duplicated: ${duplicate}`);
  }
}
if(!app.includes('UI.bindSettingsControls')||!session.includes('UI.bindSettingsControls'))fail('Home/Session settings must use ui.js');
for(const stale of ['canInstall:','isStandalone,','update:()=>registration']){
  if(pwa.includes(stale))fail(`pwa.js: unused public API returned ${stale}`);
}
for(const forbidden of ['createBottomSheet','SHEET_MOTION','installPressFeedback','installDoubleTapGuard','DailyMotionMotion']){
  if(pwa.includes(forbidden))fail(`pwa.js: motion responsibility leaked into PWA runtime ${forbidden}`);
}

for(const token of [
  'openDuration:.38','closeDuration:.30','dismissRatio:.28','dismissMin:110',
  'dismissMax:190','flingMinY:52','flingVelocity:700','flingProjection:.12'
]){
  if(!motion.includes(token))fail(`motion.js: frozen bottom-sheet physics changed ${token}`);
}
if(!motion.includes('createBottomSheet'))fail('motion.js: bottom-sheet owner missing');
if(motion.includes('sheetMotion:SHEET_MOTION'))fail('motion.js: internal sheet constants leaked into public API');
if(!motion.includes('playCompletion')||!motion.includes('cleanupSessionMotion'))fail('motion.js: completion owner missing');
if(existsSync(join(root,'vendor/gsap/SplitText.min.js'))||existsSync(join(root,'vendor/gsap/DrawSVGPlugin.min.js'))){
  fail('Removed GSAP plugins must not return');
}
if(/SplitText|DrawSVGPlugin/.test(motion)||/SplitText|DrawSVGPlugin/.test(sw))fail('Removed GSAP plugin runtime reference returned');

for(const token of [
  'function animateExecutionNode(node,keyframes,options)',
  'function playExecutionStageContent(stage,node',
  'function setExecutionStage(stage,{animate=true}={})',
  'function playEarlyTimerExit(callback)',
  "card.classList.add('is-finishing-early')"
]){
  if(!session.includes(token))fail(`session.js: fullscreen execution owner missing ${token}`);
}
for(const obsolete of [
  'animation:qmTimerRingIn 340ms 22ms',
  'animation:qmTimerDigitsIn 210ms 72ms',
  'animation:qmTimerActionsIn 250ms 92ms',
  'animation:qmCountdownValueIn 500ms 85ms',
  'animation:qmTimerActionsOut 95ms',
  'animation:executionStageOut 115ms',
  'animation:executionStageIn 165ms'
]){
  if(styles.includes(obsolete))fail(`styles.css: competing fullscreen animation returned ${obsolete}`);
}

for(const token of [
  'window.DailyMotionSessionView=Object.freeze({create})',
  'const animateDetailState=',
  'const renderExercise=',
  'const renderStepSegments=',
  'const updateNextButton='
]){
  if(!sessionView.includes(token))fail(`session-view.js: presentation contract missing ${token}`);
}
for(const token of [
  'const SessionView=window.DailyMotionSessionView',
  'const sessionView=SessionView.create({',
  'sessionView.renderExercise(exercise)',
  'sessionView.updateNextButton()',
  'sessionView.renderStepSegments()',
  'sessionView.resetDetails()',
  'sessionView.destroy()'
]){
  if(!session.includes(token))fail(`session.js: session-view wiring missing ${token}`);
}
for(const obsolete of ['DEV_COMPLETION','dm-dev-completion','SessionRuntime','function renderVisual','function animateDetailState','function updateNextButton','function renderStepSegments']){
  if(session.includes(obsolete))fail(`session.js: obsolete responsibility returned ${obsolete}`);
}

for(const token of [
  'getRoutineEntries','getRoutineActiveSeconds','hasCompletedRoutine','hasRoutineActivity',
  'getCurrentStreak','getBestStreak','getCompletedRoutineCount','getTotalActiveSeconds','ensureProgramVersion'
]){
  if(!state.includes(token))fail(`state.js: shared state API missing ${token}`);
}
if(app.includes('availableRoutinesForDay')||progress.includes('timerElapsedSeconds'))fail('State/statistics logic duplicated outside state.js');
if(!session.includes('Store.ensureProgramVersion'))fail('session.js: program-version migration not wired');

const restStart=session.indexOf('function startRest');
const restEnd=session.indexOf('function onTimerFinished',restStart);
const restBlock=restStart>=0&&restEnd>restStart?session.slice(restStart,restEnd):'';
if(!restBlock.includes('releaseWakeLock();'))fail('session.js: natural rest completion must release wake lock');

if(!html['session.html'].includes('class="completion-mark"')||
   !html['session.html'].includes('completion-mark__ring')||
   !html['session.html'].includes('completion-mark__check')){
  fail('session.html: inline completion mark missing');
}
if(html['session.html'].includes('completion-burst')||styles.includes('.completion-burst'))fail('Dead completion burst returned');

for(const [file,sources] of [
  ['index.html',[app]],
  ['session.html',[session,sessionView]],
  ['progress.html',[progress]]
]){
  const markup=html[file];
  for(const source of sources){
    const ids=new Set([
      ...[...source.matchAll(/\$\(['"]#([^'"]+)['"]\)/g)].map(match=>match[1]),
      ...[...source.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(match=>match[1]),
      ...[...source.matchAll(/querySelector\(['"]#([^'"]+)['"]\)/g)].map(match=>match[1])
    ]);
    for(const id of ids){
      if(!markup.includes(`id="${id}"`)&&!markup.includes(`id='${id}'`))fail(`${file}: runtime references missing DOM id #${id}`);
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

const iconSources={...html,'app.js':app,'session.js':session,'session-view.js':sessionView,'progress.js':progress};
const usedHeroicons=new Set();
for(const content of Object.values(iconSources)){
  for(const match of content.matchAll(/\bhi-([a-z0-9-]+)/g))usedHeroicons.add(match[1]);
}
for(const name of usedHeroicons){
  const token=`.hi-${name}{--hi-mask:url("vendor/heroicons/${name}.svg")}`;
  if(!heroicons.includes(token))fail(`heroicons.css: mapping missing ${name}`);
  const svg=read(`vendor/heroicons/${name}.svg`);
  if(!svg.includes('stroke-width="1.7"'))fail(`vendor/heroicons/${name}.svg: stroke-width must stay 1.7`);
}
for(const [file,content] of Object.entries({...html,'app.js':app})){
  if(/class=["'][^"']*\bph\b/.test(content)||/phosphor\.css/i.test(content))fail(`${file}: Phosphor must not return`);
}
for(const file of htmlFiles){
  const allowed=file==='session.html'?html[file].replace(/<svg class="completion-mark"[\s\S]*?<\/svg>/i,''):html[file];
  if(/<svg\b/i.test(allowed))fail(`${file}: inline SVG UI icon returned`);
}
if(/<svg\b/i.test(app))fail('app.js: inline SVG routine icon returned');

const forbiddenGoals=[
  /weekly-goal/i,/weeklyGoal/,/home-goal/i,/goalSelect/,/getWeeklyProgress/,
  /Личная цель/i,/Цель недели/i,/Недельная цель/i,/personal goals/i
];
for(const [file,content] of Object.entries({
  ...html,'app.js':app,'progress.js':progress,'session.js':session,'state.js':state,'styles.css':styles,'README.md':read('README.md')
})){
  for(const pattern of forbiddenGoals){
    if(pattern.test(content))fail(`${file}: removed personal-goal code returned ${pattern}`);
  }
}

if(!theme.includes("types:['theme']")||!styles.includes(':active-view-transition-type(theme)')){
  fail('Theme View Transition ownership missing');
}
if(html['index.html'].includes('<details')||html['index.html'].includes('routineCatalog'))fail('Home complexes must remain immediately visible');

const frozenFlowAssets={
  'icons/daily-motion-flow.svg':'322c0d32f6986a04bbac71e3868723a21ea21ad4448f98c31204b1da9c58affe',
  'icons/flow-app-v3.svg':'3f26d21d17684f52dd2782270db0e1a651e8b17792235713eca7cb4f82eb3c69',
  'icons/flow-symbol-v3.svg':'b1236b907634dc7ddd887a4433c3172cea21af09cfcd4839a1623385c96edb7e'
};
for(const [asset,expectedHash] of Object.entries(frozenFlowAssets)){
  requireFile(asset);
  const actualHash=createHash('sha256').update(readFileSync(join(root,asset))).digest('hex');
  if(actualHash!==expectedHash)fail(`Frozen FLOW asset changed: ${asset}`);
}
if(navigation.includes('window.DailyMotionSwup'))fail('navigation.js: unused DailyMotionSwup global returned');
if(state.includes('const setProgramVersion='))fail('state.js: unused setProgramVersion helper returned');

for(const deadCss of [
  '--space-8','--space-10','--space-12','--layout-wide','--radius-hero','--radius-pill',
  '--component-control-radius','--line-strong','--motion-press-in','--motion-micro','--motion-emphasis',
  '--motion-sheet-close','--motion-sheet-open','--motion-ease-emphasized','--r-sm',
  '--qm-section-gap','--qm-control-h','--qm-stage',
  'completion-title-word','dev-completion-link',
  'buttonMorph','qmStageIn','qmStageInSoft','qmDetailReveal','qmGlyphSettle','qmToastSettle','qmStageQuiet'
]){
  if(styles.includes(deadCss))fail(`styles.css: audited dead token returned ${deadCss}`);
}

for(const forbidden of [
  'KEY,ROUTINE_KEYS',
  'getProgramVersion,',
  'setProgramVersion,'
]){
  const apiBlock=state.match(/window\.DailyMotionState=\{([\s\S]*?)\};/)?.[1]||'';
  if(apiBlock.includes(forbidden))fail(`state.js: internal API leaked globally ${forbidden}`);
}
if(ui.match(/window\.DailyMotionUI=Object\.freeze\(\{([\s\S]*?)\}\);/)?.[1]?.includes('syncPressed')){
  fail('ui.js: internal syncPressed leaked globally');
}
if(/window\.DailyMotionTheme=.*(?:PREFERENCES|normalize|readPreference|resolve)/s.test(theme)){
  fail('theme.js: internal theme helpers leaked globally');
}
if(pwa.match(/window\.DailyMotionPWA=Object\.freeze\(\{([\s\S]*?)\}\);/)?.[1]?.includes('isUpdateSafe')){
  fail('pwa.js: internal reload-safety helper leaked globally');
}
if(read('audio.js').includes('api.test'))fail('audio.js: debug test API returned');

console.log(`Daily Motion checks passed · release v${releaseVersion}`);
