import { test, expect } from '@playwright/test';

const readTransformY=async locator=>locator.evaluate(element=>{
  const value=getComputedStyle(element).transform;
  if(!value||value==='none')return 0;
  if(value.startsWith('matrix3d(')){
    const parts=value.slice(9,-1).split(',').map(Number);
    return Number.isFinite(parts[13])?parts[13]:0;
  }
  if(value.startsWith('matrix(')){
    const parts=value.slice(7,-1).split(',').map(Number);
    return Number.isFinite(parts[5])?parts[5]:0;
  }
  return 0;
});

const beginSampling=async(page,selector,duration=430)=>{
  await page.evaluate(({selector,duration})=>{
    window.__dmMotionSamples=[];
    const element=document.querySelector(selector);
    if(!element)return;
    const readY=()=>{
      const value=getComputedStyle(element).transform;
      if(!value||value==='none')return 0;
      if(value.startsWith('matrix3d(')){
        const parts=value.slice(9,-1).split(',').map(Number);
        return Number.isFinite(parts[13])?parts[13]:0;
      }
      if(value.startsWith('matrix(')){
        const parts=value.slice(7,-1).split(',').map(Number);
        return Number.isFinite(parts[5])?parts[5]:0;
      }
      return 0;
    };
    const started=performance.now();
    const frame=now=>{
      window.__dmMotionSamples.push({t:now-started,y:readY()});
      if(now-started<duration)requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  },{selector,duration});
};

const assertMonotonicClose=samples=>{
  expect(samples.length).toBeGreaterThan(5);
  const rounded=new Set(samples.map(sample=>Math.round(sample.y)));
  expect(rounded.size).toBeGreaterThan(4);
  for(let index=1;index<samples.length;index++){
    expect(samples[index].y+2).toBeGreaterThanOrEqual(samples[index-1].y);
  }
};

const openHomeSettings=async page=>{
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsOverlay')).toHaveAttribute('aria-hidden','false');
  await page.waitForTimeout(430);
};

test('home settings close is continuous and monotonic',async({page})=>{
  await openHomeSettings(page);
  await beginSampling(page,'.settings-sheet');
  await page.locator('#settingsClose').click();
  await page.waitForTimeout(450);

  const samples=await page.evaluate(()=>window.__dmMotionSamples||[]);
  assertMonotonicClose(samples);
  await expect(page.locator('#settingsOverlay')).toHaveAttribute('aria-hidden','true');
});

test('short sheet drag snaps back instead of dismissing',async({page})=>{
  await openHomeSettings(page);
  const handle=page.locator('.settings-sheet__handle');
  const box=await handle.boundingBox();
  expect(box).not.toBeNull();

  const x=box.x+box.width/2;
  const y=box.y+box.height/2;
  await page.mouse.move(x,y);
  await page.mouse.down();
  await page.mouse.move(x,y+40,{steps:4});
  await page.mouse.up();

  await page.waitForTimeout(650);
  await expect(page.locator('#settingsOverlay')).toHaveAttribute('aria-hidden','false');
  expect(Math.abs(await readTransformY(page.locator('.settings-sheet')))).toBeLessThan(2);
});

test('long sheet drag dismisses without jumping back',async({page})=>{
  await openHomeSettings(page);
  const handle=page.locator('.settings-sheet__handle');
  const box=await handle.boundingBox();
  expect(box).not.toBeNull();

  const x=box.x+box.width/2;
  const y=box.y+box.height/2;
  await page.mouse.move(x,y);
  await page.mouse.down();
  await page.mouse.move(x,y+220,{steps:8});
  await beginSampling(page,'.settings-sheet',380);
  await page.mouse.up();
  await page.waitForTimeout(420);

  const samples=await page.evaluate(()=>window.__dmMotionSamples||[]);
  assertMonotonicClose(samples);
  await expect(page.locator('#settingsOverlay')).toHaveAttribute('aria-hidden','true');
});

test('workout settings uses the same shared sheet motion',async({page})=>{
  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  await page.locator('#routineMoreButton').click();
  await expect(page.locator('#routineSettingsOverlay')).toHaveAttribute('aria-hidden','false');
  await page.waitForTimeout(430);

  await beginSampling(page,'.routine-settings-sheet');
  await page.locator('#routineSettingsClose').click();
  await page.waitForTimeout(450);

  const samples=await page.evaluate(()=>window.__dmMotionSamples||[]);
  assertMonotonicClose(samples);
  await expect(page.locator('#routineSettingsOverlay')).toHaveAttribute('aria-hidden','true');
});

test('reduced motion settles immediately without leaving transient state',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsOverlay')).toHaveAttribute('aria-hidden','false');
  expect(Math.abs(await readTransformY(page.locator('.settings-sheet')))).toBeLessThan(2);

  await page.locator('#settingsClose').click();
  await expect(page.locator('#settingsOverlay')).toHaveAttribute('aria-hidden','true',{timeout:500});
});
