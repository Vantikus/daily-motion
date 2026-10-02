import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const fail=message=>{throw new Error(message);};
const versionOf=content=>{
  const match=content.match(/const RELEASE_VERSION=(\d+);/);
  if(!match)fail('sw.js RELEASE_VERSION missing');
  return Number(match[1]);
};

const base=process.argv[2];
if(!base||/^0+$/.test(base)){
  console.log('Release version guard skipped: no base commit');
  process.exit(0);
}

const ignored=path=>
  path.startsWith('.git/')||
  path.startsWith('.github/')||
  path.startsWith('scripts/')||
  path.startsWith('tests/')||
  path.startsWith('node_modules/')||
  path.startsWith('test-results/')||
  path.startsWith('playwright-report/')||
  path.startsWith('blob-report/')||
  path.endsWith('.md')||
  ['package.json','package-lock.json','bun.lock','bun.lockb','playwright.config.js','wrangler.json','.assetsignore','.gitignore'].includes(path);

const changed=execFileSync('git',['diff','--name-only',base,'HEAD'],{encoding:'utf8'})
  .trim().split(/\r?\n/).filter(Boolean);
const deployable=changed.filter(path=>!ignored(path));
if(!deployable.length){
  console.log('Release version guard: no deployable files changed');
  process.exit(0);
}

let baseSw;
try{
  baseSw=execFileSync('git',['show',`${base}:sw.js`],{encoding:'utf8'});
}catch{
  fail('Release version guard: cannot read base sw.js');
}

const previous=versionOf(baseSw);
const current=versionOf(readFileSync('sw.js','utf8'));
if(current<=previous){
  fail(`Deployable files changed without a service worker version bump (v${previous} -> v${current}). Run npm run release:bump before publishing.`);
}
console.log(`Release version guard passed · v${previous} -> v${current}`);
