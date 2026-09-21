import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(join(root,path),'utf8');
const fail=message=>{throw new Error(message);};

const syntaxFiles=[
  'app.js','audio.js','program.js','progress.js','pwa.js','session.js','state.js','sw.js',
  'playwright.config.js','tests/smoke.spec.js','tests/motion.spec.js'
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
const pwa=read('pwa.js');
const phosphor=read('phosphor.css');

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


for(const token of ['.ph.ph-sun-horizon:before','.ph.ph-sliders-horizontal:before','.ph.ph-check-circle:before']){
  if(!phosphor.includes(token))fail(`phosphor.css: Phosphor icon system is missing ${token}`);
}
for(const file of htmlFiles){
  if(/<svg\b/i.test(html[file]))fail(`${file}: inline SVG UI icons remain after Phosphor migration`);
}
if(/<svg\b/i.test(read('app.js')))fail('app.js: inline SVG routine icons remain after Phosphor migration');

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
if(!read('session.js').includes('createBottomSheet'))fail('session.js: shared bottom sheet is not wired');
if(read('progress.js').includes('createBottomSheet'))fail('progress.js: bottom sheet should not be used on progress page');

console.log(`Daily Motion checks passed · release v${[...releaseVersions][0]}`);
