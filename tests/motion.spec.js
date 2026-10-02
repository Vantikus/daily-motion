import { test, expect } from './helpers/runtime.js';

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
  const overlayMotion=await page.locator('#settingsOverlay').evaluate(node=>({
    opacity:getComputedStyle(node).opacity,
    background:getComputedStyle(node).backgroundColor
  }));
  expect(overlayMotion.opacity).toBe('1');
  expect(overlayMotion.background).toBe('rgba(23, 25, 23, 0.18)');
  await page.locator('#settingsClose').click();
  await expect(page.locator('#settingsOverlay')).toHaveAttribute('aria-hidden','true',{timeout:1000});
});



test('iPhone settings open and close use native transform animation with a static dimmed backdrop',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'userAgent',{configurable:true,get:()=>
      'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1'
    });
    Object.defineProperty(navigator,'platform',{configurable:true,get:()=> 'iPhone'});
    window.__sheetNativeAnimations=[];
    const original=Element.prototype.animate;
    Element.prototype.animate=function(keyframes,options){
      if(this.matches?.('.settings-sheet,.routine-settings-sheet')){
        window.__sheetNativeAnimations.push({keyframes,options});
      }
      return original.call(this,keyframes,options);
    };
  });
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
    window.__sheetGsapTweens=0;
    const original=gsap.to.bind(gsap);
    gsap.to=(target,vars)=>{
      if(target?.matches?.('.settings-sheet,.routine-settings-sheet'))window.__sheetGsapTweens++;
      return original(target,vars);
    };
  });
  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsOverlay')).toHaveAttribute('aria-hidden','false');
  await page.waitForTimeout(430);
  await page.locator('#settingsClose').click();
  await expect(page.locator('#settingsOverlay')).toHaveAttribute('aria-hidden','true',{timeout:1000});

  const result=await page.evaluate(()=>({
    native:window.__sheetNativeAnimations,
    gsap:window.__sheetGsapTweens,
    backdrop:getComputedStyle(document.querySelector('#settingsOverlay')).backgroundColor
  }));
  expect(result.native.length).toBeGreaterThanOrEqual(2);
  expect(result.native.every(entry=>entry.keyframes.every(frame=>Object.keys(frame).every(key=>key==='transform')))).toBe(true);
  expect(result.gsap).toBe(0);
  expect(result.backdrop).toBe('rgba(23, 25, 23, 0.18)');
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
  const pointerId=41;
  await handle.dispatchEvent('pointerdown',{pointerId,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,button:0,buttons:1});
  for(let step=1;step<=12;step++){
    await handle.dispatchEvent('pointermove',{pointerId,pointerType:'touch',isPrimary:true,clientX:x,clientY:y+25*step,button:0,buttons:1});
  }
  await handle.dispatchEvent('pointerup',{pointerId,pointerType:'touch',isPrimary:true,clientX:x,clientY:y+300,button:0,buttons:0});

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
  expect(ownership.ui).toEqual(['bindSettingsControls','createConfirmFlow','createLifecycle','createToast','trapFocus']);
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
