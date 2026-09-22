import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';

const baseState={
  version:3,
  settings:{countdownSeconds:3,restSeconds:15,sound:true,autoNext:false},
  programVersions:{morning:'morning-v3-active-2026-09-19'},
  days:{}
};

const visualHashes=Object.freeze({
  home:'221fce692500e008ca2a214170dd1ac3f8e2cdef3a9dcdd13da29668aff1effb',
  workout:'ab27401a6b8380d39e86554b602569b460d12b1c36c7ece7d862d828b4d6ef4a',
  progress:'4ddec1008a4f7746d74128c5f1106ea3bec087661b29437707267113a7f4080f'
});

const prepare=async page=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.clock.install({time:new Date('2026-09-22T08:00:00+05:00')});
  await page.addInitScript(state=>{
    localStorage.setItem('dailyMotionState.v3',JSON.stringify(state));
  },baseState);
};

const assertVisual=async(page,testInfo,name,expectedHash)=>{
  const image=await page.screenshot({
    fullPage:true,
    animations:'disabled',
    caret:'hide',
    scale:'css'
  });
  await testInfo.attach(`${name}-actual.png`,{body:image,contentType:'image/png'});
  const hash=createHash('sha256').update(image).digest('hex');
  expect(hash,`${name} visual SHA-256 changed; inspect the attached PNG before accepting a new baseline`).toBe(expectedHash);
};

test.describe('R2 visual baselines',()=>{
  test.skip(({browserName})=>browserName!=='chromium','visual baselines are verified in Chromium only');
  test.use({viewport:{width:390,height:844},deviceScaleFactor:1});

  test('home visual baseline',async({page},testInfo)=>{
    await prepare(page);
    await page.goto('/index.html',{waitUntil:'domcontentloaded'});
    await assertVisual(page,testInfo,'home-390x844',visualHashes.home);
  });

  test('workout visual baseline',async({page},testInfo)=>{
    await prepare(page);
    await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
    await assertVisual(page,testInfo,'workout-390x844',visualHashes.workout);
  });

  test('progress visual baseline',async({page},testInfo)=>{
    await prepare(page);
    await page.goto('/progress.html',{waitUntil:'domcontentloaded'});
    await assertVisual(page,testInfo,'progress-390x844',visualHashes.progress);
  });
});
