import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';

const baseState={
  version:3,
  settings:{countdownSeconds:3,restSeconds:15,sound:true,autoNext:false},
  programVersions:{morning:'morning-v3-active-2026-09-19'},
  days:{}
};

const visualHashes=Object.freeze({
  home:'fc60ec1d43714af6a126fb3dde193e99120c094c8d273ea10977380b5fef713e',
  workout:'c78ca777a88d4913f9ce6cc2280eeab284fdfe284d972550e05077667634f6cb',
  progress:'e561b3a1148ada4355c874d2490aac3554d6bb28bd513b39a6c08544f0adc89c'
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

test.describe('Daily Motion visual baselines',()=>{
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
    await expect(page.locator('#pageLoader')).toHaveAttribute('aria-hidden','true',{timeout:1000});
    await expect(page.locator('#pageLoader')).not.toHaveClass(/is-visible/);
    await expect(page.locator('#exerciseGoal')).not.toHaveText('');
    await assertVisual(page,testInfo,'workout-390x844',visualHashes.workout);
  });

  test('progress visual baseline',async({page},testInfo)=>{
    await prepare(page);
    await page.goto('/progress.html',{waitUntil:'domcontentloaded'});
    await assertVisual(page,testInfo,'progress-390x844',visualHashes.progress);
  });
});
