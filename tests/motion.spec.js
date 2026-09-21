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

const sampleWhileVisible=async(page,overlaySelector,sheetSelector,{duration=420,interval=30,initial=[]}={})=>{
  const overlay=page.locator(overlaySelector);
  const sheet=page.locator(sheetSelector);
  const samples=[...initial];
  const started=Date.now();

  while(Date.now()-started<duration){
    const hidden=await overlay.getAttribute('aria-hidden')==='true';
    if(hidden)break;
    samples.push(await readTransformY(sheet));
    await page.waitForTimeout(interval);
  }
  return samples;
};

const assertNoMeaningfulBacktrack=samples=>{
  for(let index=1;index<samples.length;index++){
    expect(samples[index]+4).toBeGreaterThanOrEqual(samples[index-1]);
  }
};

const openHomeSettings=async page=>{
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsOverlay')).toHaveAttribute('aria-hidden','false');
  await page.waitForTimeout(430);
};

test('home settings close progresses downward and completes',async({page})=>{
  await openHomeSettings(page);
  const sheet=page.locator('.settings-sheet');
  const initial=await readTransformY(sheet);

  await page.locator('#settingsClose').click();
  const samples=await sampleWhileVisible(page,'#settingsOverlay','.settings-sheet',{initial:[initial]});

  assertNoMeaningfulBacktrack(samples);
  if(samples.length>1){
    expect(Math.max(...samples)).toBeGreaterThanOrEqual(initial);
  }
  await expect(page.locator('#settingsOverlay')).toHaveAttribute('aria-hidden','true',{timeout:1000});
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

test('long sheet drag keeps moving downward and dismisses',async({page})=>{
  await openHomeSettings(page);
  const handle=page.locator('.settings-sheet__handle');
  const sheet=page.locator('.settings-sheet');
  const box=await handle.boundingBox();
  expect(box).not.toBeNull();

  const x=box.x+box.width/2;
  const y=box.y+box.height/2;
  await page.mouse.move(x,y);
  await page.mouse.down();
  await page.mouse.move(x,y+220,{steps:8});

  const releaseY=await readTransformY(sheet);
  await page.mouse.up();
  const samples=await sampleWhileVisible(page,'#settingsOverlay','.settings-sheet',{duration:380,initial:[releaseY]});

  assertNoMeaningfulBacktrack(samples);
  if(samples.length>1){
    expect(Math.max(...samples)).toBeGreaterThanOrEqual(releaseY);
  }
  await expect(page.locator('#settingsOverlay')).toHaveAttribute('aria-hidden','true',{timeout:1000});
});

test('workout settings uses the same shared sheet behavior',async({page})=>{
  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  await page.locator('#routineMoreButton').click();
  await expect(page.locator('#routineSettingsOverlay')).toHaveAttribute('aria-hidden','false');
  await page.waitForTimeout(430);

  const sheet=page.locator('.routine-settings-sheet');
  const initial=await readTransformY(sheet);
  await page.locator('#routineSettingsClose').click();
  const samples=await sampleWhileVisible(page,'#routineSettingsOverlay','.routine-settings-sheet',{initial:[initial]});

  assertNoMeaningfulBacktrack(samples);
  await expect(page.locator('#routineSettingsOverlay')).toHaveAttribute('aria-hidden','true',{timeout:1000});
});

test('reduced motion settles immediately without transient state',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsOverlay')).toHaveAttribute('aria-hidden','false');
  expect(Math.abs(await readTransformY(page.locator('.settings-sheet')))).toBeLessThan(2);

  await page.locator('#settingsClose').click();
  await expect(page.locator('#settingsOverlay')).toHaveAttribute('aria-hidden','true',{timeout:500});
});
