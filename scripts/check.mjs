import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(join(root,path),'utf8');
const fail=message=>{throw new Error(message);};

const syntaxFiles=[
  'app.js','audio.js','motion.js','navigation.js','program.js','progress.js','pwa.js','session.js','state.js','sw.js','theme.js',
  'vendor/gsap/DrawSVGPlugin.min.js','vendor/gsap/SplitText.min.js',
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
const navigation=read('navigation.js');
const appRuntime=read('app.js');
const progressRuntime=read('progress.js');
const sessionRuntime=read('session.js');
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
if(!styles.includes('min-height:var(--component-row-h)')){
  fail('styles.css: shared settings row height is not wired through the R2 component token');
}
if(!styles.includes('.details-stack{display:grid;grid-template-columns:1fr!important;gap:0;border:1px solid var(--line-soft);border-radius:var(--radius-card)')){
  fail('styles.css: technique grouped-list radius/polish contract is not wired');
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
for(const token of [
  "createHash('sha256')",
  "page.screenshot({",
  "home:'02021377ce78e9dc3dec40a453f1ceb20bfcbbd7384ccb7641ce2e4300731099'",
  "workout:'7225427ba9d598af0b726c28a4333cd52a52e66357d9c5e33ba62a543029bf71'",
  "progress:'08a6f3343021f986158eb43a1e2c737031fd96bf6f20d62e0825da61a1ce9d5e'"
]){
  if(!visualSpec.includes(token))fail(`tests/visual.spec.js: R2 visual baseline contract missing ${token}`);
}
if(!ci.includes('actions/upload-artifact@v4')){
  fail('ci.yml: browser regression artifacts must be uploaded on failure');
}
if(!designSystem.includes('## R2 — component contracts and regression hardening')){
  fail('DESIGN_SYSTEM.md: R2 component hardening contract is missing');
}


for(const token of [
  '--surface-raised:#fff;',
  '--surface-soft:#f8faf7;',
  '--line-soft:rgba(23,25,23,.065);',
  '--line-strong:rgba(23,25,23,.12);',
  '--accent-wash:#e7f0ea;',
  '--shadow-card:0 1px 2px rgba(23,25,23,.025),0 10px 28px rgba(37,49,41,.045);',
  '--shadow-hero:0 1px 2px rgba(23,25,23,.025),0 18px 42px rgba(37,49,41,.065);',
  '--shadow-sheet:0 -20px 64px rgba(27,37,30,.16);'
]){
  if(!styles.includes(token))fail(`styles.css: R3 polish token drifted: ${token}`);
}
for(const fragment of [
  'box-shadow:var(--shadow-hero);',
  'box-shadow:var(--shadow-card);',
  'box-shadow:var(--shadow-sheet);',
  'background:var(--accent-wash);',
  'background:var(--surface-soft);'
]){
  if(!styles.includes(fragment))fail(`styles.css: R3 visual hierarchy contract missing: ${fragment}`);
}
if(!designSystem.includes('## R3 — visual hierarchy and surface polish')){
  fail('DESIGN_SYSTEM.md: R3 visual polish contract is missing');
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
for(const [file,content] of Object.entries(html)){
  if(!content.includes('id="swup"'))fail(`${file}: Swup container is missing`);
  if(!content.includes('class="transition-page"'))fail(`${file}: Swup transition container class is missing`);
  if(!content.includes('navigation.js?v=166'))fail(`${file}: v166 navigation bootstrap is missing`);
  for(const runtime of ['app.js?v=166','progress.js?v=166','session.js?v=166','motion.js?v=166']){
    if(!content.includes(runtime))fail(`${file}: persistent page runtime missing: ${runtime}`);
  }
  if(content.includes('unpkg.com/'))fail(`${file}: parser-blocking Swup CDN tags must not return`);
}
for(const url of swupVendorUrls){
  if(!navigation.includes(`'${url}'`))fail(`navigation.js: pinned Swup runtime missing: ${url}`);
}

for(const fragment of [
  "containers:['#swup']",
  'animationSelector:false',
  'animateHistoryBrowsing:true',
  'cache:true',
  'native:false',
  'timeout:8000',
  'const SWUP_RUNTIME=[',
  'const loadRuntimeScript=',
  'const ensureSwup=',
  'await Promise.all(SWUP_RUNTIME.map(loadRuntimeScript))',
  "window.addEventListener('online',()=>{if(!swup)ensureSwup();},{passive:true})",
  'new window.SwupPreloadPlugin({throttle:3})',
  'new window.SwupHeadPlugin()',
  'new window.SwupBodyClassPlugin()',
  'new window.SwupA11yPlugin(',
  'new window.SwupJsPlugin({animations:pageAnimations})',
  'new window.SwupScrollPlugin({animateScroll:false})',
  'respectReducedMotion:true',
  "swup.hooks.before('content:replace'",
  "swup.hooks.on('content:replace'",
  "swup.hooks.on('fetch:error'",
  "swup.hooks.on('page:view'",
  'preloadLikelyRoutes',
  "swup.preload('/session.html?routine=morning&resume=1')",
  'window.DailyMotionNavigate=(href,{replace=false,animation}={})=>{',
  "window.DailyMotionBack=(fallback='index.html')=>{"
]){
  if(!navigation.includes(fragment))fail(`navigation.js: v166 Swup plugin contract missing: ${fragment}`);
}

for(const forbidden of [
  'preloadHoveredLinks:true',
  'preloadVisibleLinks:false',
  'preloadInitialPage:true',
  'awaitAssets:true',
  'persistAssets:true',
  'headingSelector:',
  'doScrollingRightAway:',
  'shouldResetScrollPosition:'
]){
  if(navigation.includes(forbidden))fail(`navigation.js: redundant Swup option returned: ${forbidden}`);
}
const fallbackBackBlock=navigation.match(/const fallbackBack=.*?\n  };/s)?.[0]||'';
if(fallbackBackBlock.includes('history.state')||fallbackBackBlock.includes('history.back()')){
  fail('navigation.js: native fallback back must not depend on stale Swup history state');
}

for(const animation of ['workout','progress','back-home','completion-home']){
  if(!navigation.includes(`to:'${animation}'`))fail(`navigation.js: route animation missing: ${animation}`);
}
if(!appRuntime.includes("animation:'workout'"))fail('app.js: workout navigation must request workout motion');
if(!appRuntime.includes("animation:'progress'"))fail('app.js: progress navigation must request progress motion');
if(!sessionRuntime.includes("animation:'completion-home'"))fail('session.js: completion navigation must request completion-home motion');
if(!html['index.html'].includes('data-swup-animation="progress" data-swup-preload')){
  fail('index.html: Progress link must be preloaded and use progress motion');
}
for(const file of ['progress.html','session.html']){
  if(!html[file].includes('data-nav-back data-swup-animation="back-home" data-swup-preload')){
    fail(`${file}: back navigation must restore history with preload metadata`);
  }
}

for(const forbidden of [
  'const SWUP_URL=',
  "script.addEventListener('load',installSwup",
  'syncBodyAndHead',
  'DOMParser',
  'SwupScriptsPlugin',
  'SwupParallelPlugin',
  'SwupFragmentPlugin'
]){
  if(navigation.includes(forbidden))fail(`navigation.js: obsolete/unneeded Swup runtime returned: ${forbidden}`);
}
for(const content of Object.values(html)){
  for(const forbidden of ['scripts-plugin','parallel-plugin','fragment-plugin']){
    if(content.includes(forbidden))fail(`HTML: unneeded Swup plugin loaded: ${forbidden}`);
  }
}

if(!styles.includes('#swup{')||!styles.includes('transform:none;')){
  fail('styles.css: Swup container base contract is missing');
}
for(const fragment of ['.session-body>#swup{','.session-body>#swup>.exercise-app{','.session-body>#swup>.ios-safe-zone-bar{']){
  if(!styles.includes(fragment))fail(`styles.css: Session Swup wrapper layout missing: ${fragment}`);
}
for(const forbidden of [
  'html.is-changing #swup.transition-page',
  'html.is-animating #swup.transition-page',
  '.dm-page-orb{',
  '.dm-page-curtain{',
  '@view-transition{',
  'types:forward;',
  ':active-view-transition-type(forward)',
  ':active-view-transition-type(back)',
  'qmPageTransitionOut',
  'qmPageTransitionIn'
]){
  if(styles.includes(forbidden))fail(`styles.css: obsolete page motion returned: ${forbidden}`);
}
for(const forbidden of [
  'PAGE_TRANSITION_KEY',
  "window.addEventListener('pageswap'",
  'window.DailyMotionNavigate=navigatePage;',
  'window.DailyMotionBack=navigateBack;'
]){
  if(pwa.includes(forbidden))fail(`pwa.js: obsolete pre-Swup navigation runtime returned: ${forbidden}`);
}

for(const [source,label,page] of [
  [appRuntime,'app.js','home'],
  [progressRuntime,'progress.js','progress'],
  [sessionRuntime,'session.js','session']
]){
  if(!source.includes(`window.DailyMotionPages.${page}=function`))fail(`${label}: managed page mount is missing`);
}
for(const fragment of [
  'lifecycle.abort();',
  'routineSettingsMotion?.destroy?.();',
  'cancelCountdown();',
  'cancelRest();',
  'stopTicker();'
]){
  if(!sessionRuntime.includes(fragment))fail(`session.js: managed workout cleanup missing: ${fragment}`);
}
if(!pwa.includes('const destroy=()=>{')||!pwa.includes('return {open,close:()=>close(0,false),destroy,')){
  fail('pwa.js: bottom-sheet destroy lifecycle is missing');
}

for(const fragment of [
  "const SWUP_VENDOR_URLS=[",
  "'/navigation.js?v=166'",
  'Promise.allSettled(SWUP_VENDOR_URLS.map(url=>cache.add(url)))',
  'SWUP_VENDOR_URLS.includes(request.url)',
  "request.headers.get('X-Requested-With')==='swup'",
  'const swupNavigation=async request=>'
]){
  if(!sw.includes(fragment))fail(`sw.js: v166 Swup offline/runtime cache contract missing: ${fragment}`);
}
for(const url of swupVendorUrls){
  if(!sw.includes(`'${url}'`))fail(`sw.js: vendor URL is not cached: ${url}`);
}
if(!designSystem.includes('## v157 — Swup plugin architecture')){
  fail('DESIGN_SYSTEM.md: v157 Swup ownership contract is missing');
}
if(!designSystem.includes('## v160 — Swup resilience pass')){
  fail('DESIGN_SYSTEM.md: v160 Swup resilience contract is missing');
}
if(!designSystem.includes('## v161 — Completion Motion M1')){
  fail('DESIGN_SYSTEM.md: v161 Completion Motion M1 contract is missing');
}

const motion=read('motion.js');
for(const file of ['vendor/gsap/DrawSVGPlugin.min.js','vendor/gsap/SplitText.min.js']){
  if(!existsSync(join(root,file)))fail(`M1: local GSAP plugin missing: ${file}`);
}
if(!read('vendor/gsap/DrawSVGPlugin.min.js').includes('DrawSVGPlugin 3.15.0'))fail('M1: DrawSVGPlugin version drifted');
if(!read('vendor/gsap/SplitText.min.js').includes('SplitText 3.15.0'))fail('M1: SplitText version drifted');
for(const fragment of [
  "['DrawSVGPlugin','/vendor/gsap/DrawSVGPlugin.min.js']",
  "['SplitText','/vendor/gsap/SplitText.min.js']",
  'ensureCompletionPlugins','playCompletion','cleanupSessionMotion',
  "type:'words'","wordsClass:'completion-title-word'"
]){if(!motion.includes(fragment))fail(`motion.js: M1 contract missing: ${fragment}`);}
for(const fragment of ['Motion?.ensureCompletionPlugins?.();','Motion?.playCompletion?.(overlay);','Motion?.cleanupSessionMotion?.();']){
  if(!sessionRuntime.includes(fragment))fail(`session.js: M1 motion boundary missing: ${fragment}`);
}
if(!html['session.html'].includes('class="completion-mark"')||!html['session.html'].includes('completion-mark__ring')||!html['session.html'].includes('completion-mark__check'))fail('session.html: M1 inline completion mark is missing');
for(const fragment of ['completionMarkPop','completionRingDraw','completionCheckDraw','stroke-dasharray:126','stroke-dasharray:28']){
  if(!styles.includes(fragment))fail(`styles.css: v165 completion mark contract missing: ${fragment}`);
}
for(const fragment of ['completionSuccessSettle','completionSuccessHalo','completionSuccessHaloOuter','completionMarkPopStrong','completionRingDrawStrong','completionCheckDrawStrong']){
  if(!styles.includes(fragment))fail(`styles.css: v166 completion emphasis missing: ${fragment}`);
}
if(html['session.html'].includes('completion-check" aria-hidden="true"><span class="completion-burst')&&html['session.html'].includes('completion-burst</span><i class="hi hi-check-circle'))fail('session.html: old masked completion Heroicon returned');
for(const obsolete of ['completionCheckSettle','completionHaloPrimary','completionHaloSecondary','completionIconSweep','completionBurst','completionContentIn']){
  if(styles.includes(`@keyframes ${obsolete}`))fail(`styles.css: replaced M1 completion keyframe returned: ${obsolete}`);
}
for(const fragment of ["'/motion.js?v=166'","'/vendor/gsap/DrawSVGPlugin.min.js'","'/vendor/gsap/SplitText.min.js'"]){
  if(!sw.includes(fragment))fail(`sw.js: M1 offline asset missing: ${fragment}`);
}

for(const fragment of [
  '/* v158 timer entrance choreography',
  '.execution-overlay.is-visible[data-stage=\"timer\"] .execution-timer__ring',
  'animation:qmTimerRingIn 360ms 25ms',
  'animation:qmTimerDigitsIn 240ms 80ms',
  'animation:qmTimerActionsIn 280ms 105ms',
  '@keyframes qmTimerFocusBloom',
  '@keyframes qmTimerRingIn',
  '@keyframes qmTimerDigitsIn'
]){
  if(!styles.includes(fragment))fail(`styles.css: v158 timer entrance motion missing: ${fragment}`);
}

for(const fragment of [
  '/* v159 countdown + early timer exit choreography',
  'animation:qmCountdownValueIn 500ms 85ms',
  '@keyframes qmCountdownBloomIn',
  '@keyframes qmTimerRingOut',
  '.execution-timer.is-finishing-early .execution-actions'
]){
  if(!styles.includes(fragment))fail(`styles.css: v159 countdown/exit motion missing: ${fragment}`);
}
for(const fragment of [
  'const animateCountdownValue=',
  'function playEarlyTimerExit(callback)',
  "card.classList.add('is-finishing-early')",
  'playEarlyTimerExit(()=>{'
]){
  if(!sessionRuntime.includes(fragment))fail(`session.js: v159 countdown/exit choreography missing: ${fragment}`);
}

for(const fragment of [
  "types:['theme']",
  ':active-view-transition-type(theme)',
  'mix-blend-mode:normal;'
]){
  const source=fragment.includes('types:')?read('theme.js'):styles;
  if(!source.includes(fragment))fail(`theme transition contract missing: ${fragment}`);
}

if(html['index.html'].includes('>Начать тренировку</button>')){
  fail('index.html: initial CTA copy must match runtime copy');
}
for(const fragment of [
  'const renderProgress=()=>{',
  'window.DailyMotionPages.progress=function mountProgress()'
]){
  if(!progressRuntime.includes(fragment))fail(`progress.js: managed progress lifecycle missing: ${fragment}`);
}
for(const fragment of [
  "document.documentElement.classList.add('session-ready')",
  "overlay.classList.add('is-handoff')",
  "overlay.classList.add('is-content-swap')",
  'function afterAnimations(node,callback,{subtree=false}={})'
]){
  if(!sessionRuntime.includes(fragment))fail(`session.js: P1 workout motion contract missing: ${fragment}`);
}
for(const forbidden of [
  'stageTransitionTimer',
  'setTimeout(finish,230)',
  "setTimeout(()=>overlay.classList.remove('is-content-swap'),260)"
]){
  if(sessionRuntime.includes(forbidden))fail(`session.js: timer-driven motion returned: ${forbidden}`);
}
if(styles.includes('.completion-overlay.is-exiting')){
  fail('styles.css: obsolete completion exit layer returned');
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
  const token=`.hi-${name}{--hi-mask:url("vendor/heroicons/${name}.svg")}`;
  if(!heroicons.includes(token))fail(`heroicons.css: Heroicon mapping missing ${name}`);
  const svg=read(`vendor/heroicons/${name}.svg`);
  if(!svg.includes('stroke-width="1.7"'))fail(`vendor/heroicons/${name}.svg: expected 1.7px stroke`);
}
for(const [file,content] of Object.entries({...html,'app.js':read('app.js')})){
  if(/class=["'][^"']*\bph\b/.test(content))fail(`${file}: Phosphor class remains after Heroicons migration`);
  if(/phosphor\.css/i.test(content))fail(`${file}: Phosphor stylesheet remains after Heroicons migration`);
}
for(const file of htmlFiles){
  const allowed=file==='session.html'?html[file].replace(/<svg class="completion-mark"[\s\S]*?<\/svg>/i,''):html[file];
  if(/<svg\b/i.test(allowed))fail(`${file}: inline SVG UI icons remain after Heroicons migration`);
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
  "qm-svg",
  "routine-reset-actions",
  "routine-reset-button",
  "routine-reset-cancel",
  "routine-reset-confirm",
  "routine-reset-entry",
  "routine-reset-overlay",
  "routine-reset-view",
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
if(!styles.includes('/* P2 desktop Home — one authoritative layout layer. */')){
  fail('styles.css: consolidated P2 desktop Home layout is missing');
}
if(!styles.includes('/* P3 micro-polish — desktop timing controls stay native on touch/mobile. */')){
  fail('styles.css: P3 desktop timing control layer is missing');
}
for(const retiredTimerMotion of ['timerBreath','timerEnding','timerFinalThree']){
  if(styles.includes(retiredTimerMotion))fail(`styles.css: retired timer transform motion returned: ${retiredTimerMotion}`);
}
if(!styles.includes('timerUrgencyPulse'))fail('styles.css: geometry-safe timer urgency motion is missing');

for(const retiredHomeLayout of [
  'grid-column:span 7;padding:26px',
  'grid-column:1 / 8;grid-row:1 / span 2',
  '"routines activity"'
]){
  if(styles.includes(retiredHomeLayout))fail(`styles.css: retired desktop Home layout returned: ${retiredHomeLayout}`);
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
for(const [file,id] of [
  ['index.html','countdownSettingDesktop'],
  ['index.html','restSettingDesktop'],
  ['session.html','workoutCountdownSettingDesktop'],
  ['session.html','workoutRestSettingDesktop']
]){
  if(!html[file].includes(`id="${id}"`))fail(`${file}: P3 desktop timing control missing ${id}`);
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
  '.settings-reset':1,
  '.completion-button':1,
  '.settings-install':1,
  '.home-body .routines-section':1,
  '.home-body .activity-section':1
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
  "sheetHeight*SHEET_MOTION.dismissRatio",
  "y>=SHEET_MOTION.flingMinY&&velocity>SHEET_MOTION.flingVelocity",
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
