import { test, expect, expectSwup } from './helpers/runtime.js';

const quietWorkout=async page=>page.addInitScript(()=>{
  localStorage.setItem('dailyMotionState.v3',JSON.stringify({settings:{countdownSeconds:0,restSeconds:0,sound:false},days:{}}));
});

test('detached page controls cannot change state after repeated Swup visits',async({page})=>{
  await quietWorkout(page);
  await page.goto('/index.html');
  await expectSwup(page);
  const token=await page.evaluate(()=>window.__lifecycleToken=crypto.randomUUID());
  for(let visit=0;visit<3;visit++){
    await page.evaluate(()=>{
      window.__oldHomeButton=document.querySelector('#continueBtn');
      DailyMotionNavigate('/session.html?routine=morning');
    });
    await expect(page.locator('#exerciseTitle')).toBeVisible();
    await page.evaluate(()=>{
      window.__oldWorkoutButtons=[document.querySelector('#plusTen'),document.querySelector('#executionFinishEarly')];
      DailyMotionNavigate('/progress.html');
    });
    await expect(page.locator('#historyCalendar')).toBeVisible();
    await page.evaluate(()=>{
      window.__oldExportButton=document.querySelector('#exportDataBtn');
      DailyMotionNavigate('/index.html');
    });
    await expect(page.locator('#todayCard')).toBeVisible();
    const result=await page.evaluate(()=>{
      const before=DailyMotionState.exportState();
      for(const button of [__oldHomeButton,...__oldWorkoutButtons,__oldExportButton])button.click();
      return {unchanged:before===DailyMotionState.exportState(),page:document.querySelector('#swup').dataset.page,guard:typeof DailyMotionReloadGuard,token:__lifecycleToken};
    });
    expect(result).toEqual({unchanged:true,page:'home',guard:'undefined',token});
  }
});

test('a late screen wake lock is released after leaving the workout',async({page})=>{
  await quietWorkout(page);
  await page.addInitScript(()=>{
    window.__releasedLocks=0;
    Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{request:()=>new Promise(resolve=>{
      window.__grantLock=()=>resolve({release:async()=>{window.__releasedLocks++;}});
    })}});
  });
  await page.goto('/session.html?routine=morning');
  await expectSwup(page);
  await page.locator('#nextButton').click();
  await expect(page.locator('#timerToggle')).toHaveText('Пауза');
  await page.evaluate(()=>DailyMotionNavigate('/index.html'));
  await expect(page.locator('#todayCard')).toBeVisible();
  await page.evaluate(()=>window.__grantLock());
  await expect.poll(()=>page.evaluate(()=>window.__releasedLocks)).toBe(1);
});

test('audio unlock finishing after navigation cannot start an old workout',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    let audio;
    window.__audioResolvers=[];
    Object.defineProperty(window,'DailyMotionAudio',{configurable:true,set:value=>{audio=value;},get:()=>({...audio,unlock:()=>new Promise(resolve=>window.__audioResolvers.push(resolve))})});
  });
  await page.goto('/session.html?routine=morning');
  await expectSwup(page);
  await page.locator('#nextButton').click();
  await expect.poll(()=>page.evaluate(()=>window.__audioResolvers.length)).toBeGreaterThan(0);
  await page.evaluate(()=>DailyMotionNavigate('/index.html'));
  await expect(page.locator('#todayCard')).toBeVisible();
  await page.evaluate(()=>window.__audioResolvers.forEach(resolve=>resolve(true)));
  await page.waitForTimeout(100);
  expect(await page.evaluate(()=>DailyMotionState.getRoutine('morning').startedAt)).toBeNull();
  expect(errors).toEqual([]);
});

test('timer paints smooth progress while text changes only when its value changes',async({page})=>{
  await quietWorkout(page);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.clock.install();
  await page.goto('/session.html?routine=morning');
  await page.locator('#nextButton').click();
  await expect(page.locator('#timerToggle')).toHaveText('Пауза');
  await page.evaluate(()=>{
    window.__timerMutations={value:0,state:0,next:0,ring:0};
    for(const [name,id] of [['value','timerValue'],['state','timerState'],['next','nextButton'],['ring','timerRing']]){
      new MutationObserver(records=>window.__timerMutations[name]+=records.length).observe(document.getElementById(id),name==='ring'?{attributes:true,attributeFilter:['style']}:{childList:true,characterData:true,subtree:true});
    }
  });
  await page.clock.runFor(1000);
  const mutations=await page.evaluate(()=>window.__timerMutations);
  expect(mutations.value).toBeLessThanOrEqual(2);
  expect(mutations.state).toBe(0);
  expect(mutations.next).toBe(0);
  expect(mutations.ring).toBeGreaterThan(10);
  const before=await page.evaluate(()=>DailyMotionState.getRoutine('morning').timers['cat-cow'].remaining);
  await page.evaluate(()=>{
    Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});
    document.dispatchEvent(new Event('visibilitychange'));
    window.__timerMutations.ring=0;
  });
  await page.clock.runFor(5000);
  expect(await page.evaluate(()=>window.__timerMutations.ring)).toBe(0);
  await page.evaluate(()=>{
    Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const after=await page.evaluate(()=>DailyMotionState.getRoutine('morning').timers['cat-cow'].remaining);
  expect(before-after).toBeGreaterThanOrEqual(5);
  await page.locator('#timerToggle').click();
  await expect(page.locator('#timerState')).toHaveText('Пауза');
});
