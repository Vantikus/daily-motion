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

const openHomeSettings=async page=>{
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsOverlay')).toHaveAttribute('aria-hidden','false');
  await page.waitForTimeout(430);
};

test('home settings opens and closes cleanly',async({page})=>{
  await openHomeSettings(page);
  await page.locator('#settingsClose').click();
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

test('long sheet drag dismisses',async({page})=>{
  await openHomeSettings(page);
  const handle=page.locator('.settings-sheet__handle');
  const box=await handle.boundingBox();
  expect(box).not.toBeNull();

  const x=box.x+box.width/2;
  const y=box.y+box.height/2;
  await page.mouse.move(x,y);
  await page.mouse.down();
  await page.mouse.move(x,y+300,{steps:12});
  await page.mouse.up();

  await expect(page.locator('#settingsOverlay')).toHaveAttribute('aria-hidden','true',{timeout:1500});
});

test('workout settings uses the same shared sheet behavior',async({page})=>{
  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  await page.locator('#routineMoreButton').click();
  await expect(page.locator('#routineSettingsOverlay')).toHaveAttribute('aria-hidden','false');
  await page.waitForTimeout(430);

  await page.locator('#routineSettingsClose').click();
  await expect(page.locator('#routineSettingsOverlay')).toHaveAttribute('aria-hidden','true',{timeout:1500});
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


test('shared UI and motion ownership stay centralized',async({page})=>{
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  const ownership=await page.evaluate(()=>({
    ui:Object.keys(DailyMotionUI||{}).sort(),
    motion:Object.keys(DailyMotionMotion||{}).sort(),
    pwa:Object.keys(DailyMotionPWA||{}).sort(),
    theme:Object.keys(DailyMotionTheme||{}).sort()
  }));
  expect(ownership.ui).toEqual(['bindSettingsControls','createConfirmFlow','createToast','trapFocus']);
  expect(ownership.motion).toEqual(['cleanupSessionMotion','createBottomSheet','playCompletion','prepareCompletion','reducedMotion','tokens']);
  expect(ownership.pwa).toEqual(['getInstallMode','install']);
  expect(ownership.theme).toEqual(['apply','applyAnimated']);
});


test('audio synthesis stays lazy until first audio use',async({page,browserName})=>{
  test.skip(browserName!=='chromium','lazy audio lifecycle is verified once in Chromium');
  await page.addInitScript(()=>{
    const nativeBtoa=window.btoa.bind(window);
    window.__dmAudioBtoaCalls=0;
    window.btoa=value=>{
      window.__dmAudioBtoaCalls++;
      return nativeBtoa(value);
    };
  });

  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await expect.poll(()=>page.evaluate(()=>typeof DailyMotionAudio?.unlock)).toBe('function');

  const before=await page.evaluate(()=>window.__dmAudioBtoaCalls);
  expect(before).toBe(0);

  await page.evaluate(()=>DailyMotionAudio.unlock());
  const afterFirst=await page.evaluate(()=>window.__dmAudioBtoaCalls);
  expect(afterFirst).toBeGreaterThan(0);

  await page.evaluate(()=>DailyMotionAudio.unlock());
  const afterSecond=await page.evaluate(()=>window.__dmAudioBtoaCalls);
  expect(afterSecond).toBe(afterFirst);
});


test('session presentation is owned by the extracted view runtime',async({page})=>{
  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  const ownership=await page.evaluate(()=>({
    create:typeof DailyMotionSessionView?.create,
    page:typeof DailyMotionPages?.session,
    completionHidden:document.querySelector('#completionOverlay')?.getAttribute('aria-hidden'),
    openDetails:document.querySelectorAll('.detail-card.is-open').length
  }));
  expect(ownership.create).toBe('function');
  expect(ownership.page).toBe('function');
  expect(ownership.completionHidden).toBe('true');
  expect(ownership.openDetails).toBe(1);

  const toggles=page.locator('.detail-card__toggle');
  await toggles.nth(1).click();
  await expect(toggles.nth(1)).toHaveAttribute('aria-expanded','true');
  await expect(toggles.nth(0)).toHaveAttribute('aria-expanded','false');
});
