import { test, expect, expectSwup } from './helpers/runtime.js';

test('iOS exposes manual add-to-home-screen guidance',async({page,browserName})=>{
  test.skip(browserName!=='webkit','iOS install guidance is WebKit/iPhone specific');
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('#settingsBtn').click();

  const installButton=page.locator('#installAppBtn');
  await expect(installButton).toBeVisible();
  await expect(installButton).toHaveText('Добавить на экран «Домой»');
  await expect(installButton.locator('.hi-arrow-down-tray')).toHaveCount(1);
  const installStyle=await installButton.evaluate(button=>{
    const style=getComputedStyle(button);
    return {background:style.backgroundColor,color:style.color,border:style.borderTopWidth};
  });
  expect(installStyle.background).not.toBe('rgb(47, 107, 85)');
  expect(installStyle.color).toBe('rgb(47, 107, 85)');
  expect(installStyle.border).toBe('1px');

  await installButton.click();
  const guide=page.locator('#iosInstallGuide');
  await expect(guide).toBeVisible();
  await expect(guide).toContainText('Поделиться');
  await expect(guide).toContainText('На экран «Домой»');
  await expect(guide).toContainText('Открывать как веб‑приложение');
});

test('PWA update waits until an in-progress workout is safe',async({page})=>{
  await page.addInitScript(()=>{
    const now=new Date();
    const key=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    localStorage.setItem('dailyMotionState.v3',JSON.stringify({
      version:3,
      settings:{countdownSeconds:0,restSeconds:0,sound:false,autoNext:false,theme:'system'},
      programVersions:{morning:'morning-v3-active-2026-09-19'},
      days:{
        [key]:{routines:{morning:{
          step:0,completedUntil:0,completed:false,startedAt:new Date().toISOString(),completedAt:null,
          activeSeconds:5,effort:null,
          timers:{'cat-cow':{duration:40,remaining:30,running:false,paused:true,endAt:null,runStartedAt:null}}
        }}}
      }
    }));

    window.__swMessages=[];
    const listeners={};
    const worker={
      state:'installed',
      addEventListener(){},
      postMessage(message){window.__swMessages.push(message);}
    };
    const registration={
      waiting:worker,
      installing:null,
      addEventListener(){},
      async update(){}
    };
    const serviceWorker={
      controller:{},
      ready:Promise.resolve(registration),
      async register(){return registration;},
      addEventListener(type,callback){
        (listeners[type]??=[]).push(callback);
      }
    };
    Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:serviceWorker});
    window.__emitServiceWorkerEvent=type=>{
      for(const callback of listeners[type]||[])callback(new Event(type));
    };
  });

  await page.goto('/session.html?routine=morning',{waitUntil:'load'});

  await expect(page.locator('.pwa-banner')).toBeVisible();
  await expect(page.locator('.pwa-banner__text')).toHaveText('Обновление готово — обновить можно после тренировки');
  await expect(page.locator('.pwa-banner__action')).toBeHidden();
  expect(await page.evaluate(()=>window.DailyMotionReloadGuard?.isSafe?.())).toBe(false);
  expect(await page.evaluate(()=>window.__swMessages)).toEqual([]);

  await page.evaluate(()=>{
    DailyMotionState.resetRoutine('morning');
    window.dispatchEvent(new CustomEvent('daily-motion-reload-safety-change'));
  });

  await expect(page.locator('.pwa-banner__action')).toBeVisible();
  await expect(page.locator('.pwa-banner__action')).toHaveText('Обновить');
  expect(await page.evaluate(()=>window.DailyMotionReloadGuard?.isSafe?.())).toBe(true);

  await page.locator('.pwa-banner__action').click();
  expect(await page.evaluate(()=>window.__swMessages)).toEqual([{type:'SKIP_WAITING'}]);
});

test('service-worker controller change never reloads an active workout',async({page})=>{
  await page.addInitScript(()=>{
    sessionStorage.setItem('dailyMotionTestBoots',String((Number(sessionStorage.getItem('dailyMotionTestBoots'))||0)+1));
    const now=new Date();
    const key=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    if(!localStorage.getItem('dailyMotionState.v3')){
      localStorage.setItem('dailyMotionState.v3',JSON.stringify({
        version:3,
        settings:{countdownSeconds:0,restSeconds:0,sound:false,autoNext:false,theme:'system'},
        programVersions:{morning:'morning-v3-active-2026-09-19'},
        days:{
          [key]:{routines:{morning:{
            step:1,completedUntil:1,completed:false,startedAt:new Date().toISOString(),completedAt:null,
            activeSeconds:20,effort:null,timers:{}
          }}}
        }
      }));
    }

    const listeners={};
    const worker={state:'installed',addEventListener(){},postMessage(){}};
    const registration={waiting:worker,installing:null,addEventListener(){},async update(){}};
    const serviceWorker={
      controller:{},
      ready:Promise.resolve(registration),
      async register(){return registration;},
      addEventListener(type,callback){(listeners[type]??=[]).push(callback);}
    };
    Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:serviceWorker});
    window.__emitServiceWorkerEvent=type=>{
      for(const callback of listeners[type]||[])callback(new Event(type));
    };
  });

  await page.goto('/session.html?routine=morning&resume=1',{waitUntil:'load'});
  await expect(page.locator('.pwa-banner__text')).toHaveText('Обновление готово — обновить можно после тренировки');

  await page.evaluate(()=>window.__emitServiceWorkerEvent('controllerchange'));
  await page.waitForTimeout(150);

  expect(await page.evaluate(()=>Number(sessionStorage.getItem('dailyMotionTestBoots')))).toBe(1);
  await expect(page.locator('.pwa-banner__text')).toHaveText('Обновление установлено — применится после тренировки');
  await expect(page.locator('#exerciseTitle')).toBeVisible();
});

test('cached app shell opens progress offline',async({page,context,browserName})=>{
  test.skip(browserName!=='chromium','offline service-worker regression is covered in Chromium');
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.reload({waitUntil:'domcontentloaded'});
  await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true);
  await expectSwup(page);
  const token=await page.evaluate(()=>window.__offlineToken=crypto.randomUUID());
  const vendors=await page.evaluate(async()=>{
    const keys=await caches.keys();
    const cache=await caches.open(keys.find(key=>key.startsWith('daily-motion-v')));
    return (await cache.keys()).filter(request=>request.url.startsWith('https://unpkg.com/')).length;
  });
  expect(vendors).toBe(7);
  await context.unroute('https://unpkg.com/**');
  await context.setOffline(true);
  await page.locator('a[href="progress.html"]').click();
  await expect(page.locator('#historyCalendar')).toBeVisible();
  expect(await page.evaluate(()=>window.__offlineToken)).toBe(token);
  await page.locator('[data-nav-back]').click();
  await expect(page.locator('#todayCard')).toBeVisible();
  expect(await page.evaluate(()=>window.__offlineToken)).toBe(token);
});

test('a real waiting worker activates only after the workout becomes safe',async({page,browserName})=>{
  test.skip(browserName!=='chromium','real service workers require Chromium');
  await page.addInitScript(()=>{
    const nativeRegister=navigator.serviceWorker.register.bind(navigator.serviceWorker);
    window.__registerRealWorker=nativeRegister;
    navigator.serviceWorker.register=()=>nativeRegister(`/__test__/sw.js?build=${sessionStorage.getItem('dm-test-worker-build')||'one'}`,{scope:'/'});
    sessionStorage.setItem('dm-test-worker-boots',String(Number(sessionStorage.getItem('dm-test-worker-boots')||0)+1));
    if(!localStorage.getItem('dailyMotionState.v3')){
      const date=new Date();
      const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      localStorage.setItem('dailyMotionState.v3',JSON.stringify({settings:{sound:false},programVersions:{morning:'morning-v3-active-2026-09-19'},days:{[key]:{routines:{morning:{activeSeconds:25,timers:{'cat-cow':{duration:40,remaining:17,paused:true}}}}},'2026-09-10':{routines:{morning:{completed:true,activeSeconds:60}}}}}));
    }
  });
  await page.goto('/session.html?routine=morning',{waitUntil:'load'});
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.evaluate(async()=>{
    sessionStorage.setItem('dm-test-worker-build','two');
    await window.__registerRealWorker('/__test__/sw.js?build=two',{scope:'/'});
  });
  await expect(page.locator('.pwa-banner__text')).toHaveText('Обновление готово — обновить можно после тренировки',{timeout:15000});
  await expect(page.locator('.pwa-banner__action')).toBeHidden();
  expect(await page.evaluate(()=>({boots:Number(sessionStorage.getItem('dm-test-worker-boots')),seconds:DailyMotionState.getRoutine('morning').activeSeconds,controller:navigator.serviceWorker.controller.scriptURL}))).toMatchObject({boots:1,seconds:25,controller:expect.stringContaining('build=one')});
  await page.evaluate(()=>{
    DailyMotionState.resetRoutine('morning');
    window.dispatchEvent(new CustomEvent('daily-motion-reload-safety-change'));
  });
  await expect(page.locator('.pwa-banner__action')).toBeVisible();
  await Promise.all([page.waitForEvent('load'),page.locator('.pwa-banner__action').click()]);
  expect(await page.evaluate(()=>Number(sessionStorage.getItem('dm-test-worker-boots')))).toBe(2);
  await expect.poll(()=>page.evaluate(()=>navigator.serviceWorker.controller.scriptURL)).toContain('build=two');
  expect(await page.evaluate(()=>DailyMotionState.getCompletedRoutineCount(['morning']))).toBe(1);
  await expect.poll(()=>page.evaluate(async()=>await caches.keys())).not.toContain('daily-motion-test-one');
});
