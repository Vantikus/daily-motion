import { expect, test } from '@playwright/test';

const baseState={
  version:3,
  settings:{countdownSeconds:3,restSeconds:15,sound:true,autoNext:false},
  programVersions:{morning:'morning-v3-active-2026-09-19'},
  days:{}
};

const prepare=async page=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.clock.install({time:new Date('2026-09-22T08:00:00+05:00')});
  await page.addInitScript(state=>{
    localStorage.setItem('dailyMotionState.v3',JSON.stringify(state));
  },baseState);
};

test.describe('R2 visual baselines',()=>{
  test.skip(({browserName})=>browserName!=='chromium','visual baselines are generated in Chromium only');
  test.use({viewport:{width:390,height:844}});

  test('home visual baseline',async({page})=>{
    await prepare(page);
    await page.goto('/index.html',{waitUntil:'domcontentloaded'});
    await expect(page).toHaveScreenshot('home-390x844.png',{fullPage:true});
  });

  test('workout visual baseline',async({page})=>{
    await prepare(page);
    await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
    await expect(page).toHaveScreenshot('workout-390x844.png',{fullPage:true});
  });

  test('progress visual baseline',async({page})=>{
    await prepare(page);
    await page.goto('/progress.html',{waitUntil:'domcontentloaded'});
    await expect(page).toHaveScreenshot('progress-390x844.png',{fullPage:true});
  });
});
