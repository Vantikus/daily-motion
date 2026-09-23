import { test, expect } from '@playwright/test';

const pages=[
  {name:'home',url:'/index.html',anchor:'#todayCard'},
  {name:'workout',url:'/session.html?routine=morning',anchor:'#exerciseTitle'},
  {name:'progress',url:'/progress.html',anchor:'#historyCalendar'}
];

for(const pageCase of pages){
  test(`${pageCase.name} loads without runtime errors`,async({page})=>{
    const errors=[];
    page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
    page.on('console',message=>{
      if(message.type()==='error')errors.push(`console: ${message.text()}`);
    });
    page.on('response',response=>{
      if(response.status()>=400&&response.url().startsWith('http://127.0.0.1:4173/')){
        errors.push(`http ${response.status()}: ${response.url()}`);
      }
    });

    await page.goto(pageCase.url,{waitUntil:'domcontentloaded'});
    await expect(page.locator(pageCase.anchor)).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/Личная цель|Цель недели|Недельная цель/);
    await page.waitForTimeout(250);

    expect(errors).toEqual([]);
  });
}

test('all workout complexes are immediately visible on home',async({page})=>{
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  const cards=page.locator('#routineGrid .routine-card');
  await expect(cards).toHaveCount(3);
  for(let index=0;index<3;index++){
    await expect(cards.nth(index)).toBeVisible();
  }
  await expect(page.locator('details#routineCatalog')).toHaveCount(0);
  await expect(page.locator('.home-activity-summary')).toBeVisible();
});

test('theme preference is applied and shared across pages',async({page})=>{
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('#settingsBtn').click();
  await page.locator('#themeSetting').selectOption('dark');

  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content','#101612');
  expect(await page.evaluate(()=>DailyMotionState.getSettings().theme)).toBe('dark');

  await page.goto('/progress.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
});

test('system theme follows the operating-system preference',async({page})=>{
  await page.emulateMedia({colorScheme:'dark'});
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference','system');
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');

  await page.emulateMedia({colorScheme:'light'});
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});

test('state normalization and statistics stay centralized',async({page})=>{
  await page.addInitScript(()=>{
    const keyFor=offset=>{
      const date=new Date();
      date.setHours(12,0,0,0);
      date.setDate(date.getDate()+offset);
      return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    };
    localStorage.setItem('dailyMotionState.v3',JSON.stringify({
      version:3,
      settings:{countdownSeconds:3,restSeconds:15,sound:true,autoNext:false,weeklyGoalDays:7},
      days:{
        [keyFor(0)]:{routines:{morning:{completed:true,completedUntil:9,activeSeconds:0,timers:{x:{duration:60,remaining:30,running:false,paused:true}}}}},
        [keyFor(-1)]:{routines:{morning:{completed:true,completedUntil:9,activeSeconds:20,timers:{}}}}
      }
    }));
  });
  await page.goto('/progress.html',{waitUntil:'domcontentloaded'});

  const stats=await page.evaluate(()=>({
    current:DailyMotionState.getCurrentStreak(['morning']),
    best:DailyMotionState.getBestStreak(['morning']),
    completed:DailyMotionState.getCompletedRoutineCount(['morning']),
    active:DailyMotionState.getTotalActiveSeconds(['morning']),
    exported:DailyMotionState.exportState()
  }));

  expect(stats.current).toBe(2);
  expect(stats.best).toBe(2);
  expect(stats.completed).toBe(2);
  expect(stats.active).toBe(50);
  expect(stats.exported).not.toContain('weeklyGoalDays');
});


test('iOS exposes manual add-to-home-screen guidance',async({page,browserName})=>{
  test.skip(browserName!=='webkit','iOS install guidance is WebKit/iPhone specific');
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('#settingsBtn').click();

  const installButton=page.locator('#installAppBtn');
  await expect(installButton).toBeVisible();
  await expect(installButton).toHaveText('Добавить на экран «Домой»');

  await installButton.click();
  const guide=page.locator('#iosInstallGuide');
  await expect(guide).toBeVisible();
  await expect(guide).toContainText('Поделиться');
  await expect(guide).toContainText('На экран «Домой»');
  await expect(guide).toContainText('Открывать как веб‑приложение');
});


test('program version change safely resets only in-progress workout',async({page})=>{
  await page.addInitScript(()=>{
    const date=new Date();
    const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    localStorage.setItem('dailyMotionState.v3',JSON.stringify({
      version:3,
      settings:{countdownSeconds:0,restSeconds:0,sound:false,autoNext:false},
      programVersions:{morning:'morning-old-program'},
      days:{
        [key]:{routines:{morning:{
          step:4,
          completedUntil:3,
          completed:false,
          startedAt:new Date().toISOString(),
          completedAt:null,
          activeSeconds:12,
          effort:null,
          timers:{'cat-cow':{duration:40,remaining:10,running:false,paused:true,endAt:null,runStartedAt:null}}
        }}}
      }
    }));
  });

  await page.goto('/session.html?routine=morning&resume=1',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#exerciseTitle')).toHaveText('Кошка-корова');

  const migrated=await page.evaluate(()=>{
    const state=DailyMotionState.getState();
    const routine=DailyMotionState.getRoutine('morning');
    return {
      version:state.programVersions.morning,
      step:routine.step,
      completedUntil:routine.completedUntil,
      activeSeconds:routine.activeSeconds,
      timers:Object.keys(routine.timers),
      firstTimer:routine.timers['cat-cow']||null,
      completed:routine.completed
    };
  });

  expect(migrated.version).toBe('morning-v3-active-2026-09-19');
  expect(migrated.step).toBe(0);
  expect(migrated.completedUntil).toBe(0);
  expect(migrated.activeSeconds).toBe(0);
  expect(migrated.timers).toEqual(['cat-cow']);
  expect(migrated.firstTimer).toMatchObject({duration:40,remaining:40,running:false,paused:false});
  expect(migrated.completed).toBe(false);
});

test('morning workout completes end-to-end and reaches history',async({page})=>{
  await page.addInitScript(()=>{
    if(localStorage.getItem('dailyMotionState.v3'))return;
    localStorage.setItem('dailyMotionState.v3',JSON.stringify({
      version:3,
      settings:{countdownSeconds:0,restSeconds:0,sound:false,autoNext:false},
      programVersions:{},
      days:{}
    }));
  });

  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});

  for(let index=0;index<9;index++){
    await expect(page.locator('#headerProgress')).toHaveText(`${index+1} / 9`);
    await page.locator('#nextButton').evaluate(button=>button.click());
    await expect(page.locator('#executionOverlay')).toHaveAttribute('aria-hidden','false');
    await expect(page.locator('#timerCard')).toBeVisible();
    await page.locator('#executionFinishEarly').evaluate(button=>button.click());

    if(index<8){
      await expect(page.locator('#executionOverlay')).toHaveAttribute('aria-hidden','true');
      await page.locator('#nextButton').evaluate(button=>button.click());
      await expect(page.locator('#headerProgress')).toHaveText(`${index+2} / 9`);
    }
  }

  await expect(page.locator('#completionOverlay')).toHaveAttribute('aria-hidden','false');
  await expect(page.locator('#completionCount')).toHaveText('9 / 9');
  await page.locator('[data-effort="right"]').evaluate(button=>button.click());

  const completed=await page.evaluate(()=>{
    const routine=DailyMotionState.getRoutine('morning');
    return {
      completed:routine.completed,
      completedUntil:routine.completedUntil,
      effort:routine.effort,
      completedAt:routine.completedAt
    };
  });
  expect(completed.completed).toBe(true);
  expect(completed.completedUntil).toBe(9);
  expect(completed.effort).toBe('right');
  expect(completed.completedAt).toBeTruthy();

  await page.locator('#completionHome').evaluate(button=>button.click());
  await expect(page).toHaveURL(/\/index\.html$/);
  await expect(page.locator('#todayStatus')).toHaveText('Готово');
  await page.locator('#continueBtn').evaluate(button=>button.click());
  await expect(page).toHaveURL(/\/progress\.html$/);
  await expect(page.locator('#completedSessions')).toHaveText('1');
  await expect(page.locator('#historyList .history-row')).toHaveCount(1);
});

test('completion celebration reports a real streak without changing workout state',async({page,browserName})=>{
  test.skip(browserName!=='chromium','completion celebration contract is verified once in Chromium');
  await page.addInitScript(()=>{
    const key=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const now=new Date();
    const yesterday=new Date(now);
    yesterday.setDate(yesterday.getDate()-1);
    const blank=()=>({step:0,completedUntil:0,completed:false,startedAt:null,completedAt:null,activeSeconds:0,effort:null,timers:{}});
    const previous=blank();
    previous.completed=true;
    previous.completedUntil=9;
    previous.completedAt=new Date(yesterday).toISOString();
    const current=blank();
    current.step=8;
    current.completedUntil=9;
    current.activeSeconds=600;
    localStorage.setItem('dailyMotionState.v3',JSON.stringify({
      version:3,
      settings:{countdownSeconds:0,restSeconds:0,sound:false,autoNext:false},
      programVersions:{morning:'morning-v3-active-2026-09-19'},
      days:{
        [key(yesterday)]:{routines:{morning:previous}},
        [key(now)]:{routines:{morning:current}}
      }
    }));
  });

  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  await page.locator('#nextButton').evaluate(button=>button.click());
  await expect(page.locator('#completionOverlay')).toHaveAttribute('aria-hidden','false');
  await expect(page.locator('.completion-burst i')).toHaveCount(8);
  await expect(page.locator('.completion-check .hi-check-circle')).toBeVisible();
  await expect(page.locator('#completionHighlight')).toHaveText('Новая лучшая серия — 2 дня');

  const routine=await page.evaluate(()=>DailyMotionState.getRoutine('morning'));
  expect(routine.completed).toBe(true);
  expect(routine.completedUntil).toBe(9);
});

test('timer crossfades to warm feedback only in the final three seconds',async({page,browserName})=>{
  test.skip(browserName!=='chromium','final-three timer feedback is verified once in Chromium');
  await page.addInitScript(()=>{
    const now=new Date();
    const key=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    localStorage.setItem('dailyMotionState.v3',JSON.stringify({
      version:3,
      settings:{countdownSeconds:0,restSeconds:0,sound:false,autoNext:false},
      programVersions:{morning:'morning-v3-active-2026-09-19'},
      days:{
        [key]:{routines:{morning:{
          step:0,completedUntil:0,completed:false,startedAt:null,completedAt:null,activeSeconds:0,effort:null,
          timers:{'cat-cow':{duration:40,remaining:3,running:false,paused:true,endAt:null,runStartedAt:null}}
        }}}
      }
    }));
  });

  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  await page.locator('#nextButton').evaluate(button=>button.click());
  await expect(page.locator('#executionOverlay')).toHaveAttribute('aria-hidden','false');
  await expect(page.locator('#timerRing')).toHaveClass(/is-final-three/);
  await expect.poll(()=>page.locator('#timerRing').evaluate(node=>getComputedStyle(node,'::before').opacity)).toBe('1');
});

test('completion motion is choreographed and respects reduced motion',async({page,browserName})=>{
  test.skip(browserName!=='chromium','completion motion choreography is verified once in Chromium');
  await page.addInitScript(()=>{
    const now=new Date();
    const key=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    localStorage.setItem('dailyMotionState.v3',JSON.stringify({
      version:3,
      settings:{countdownSeconds:0,restSeconds:0,sound:false,autoNext:false},
      programVersions:{morning:'morning-v3-active-2026-09-19'},
      days:{
        [key]:{routines:{morning:{
          step:8,completedUntil:9,completed:false,startedAt:null,completedAt:null,activeSeconds:600,effort:null,timers:{}
        }}}
      }
    }));
  });

  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  await page.locator('#nextButton').evaluate(button=>button.click());
  await expect(page.locator('#completionOverlay')).toHaveAttribute('aria-hidden','false');

  const motion=await page.evaluate(()=>({
    check:getComputedStyle(document.querySelector('.completion-check')).animationName,
    icon:getComputedStyle(document.querySelector('.completion-check>.hi')).animationName,
    title:getComputedStyle(document.querySelector('.completion-card>h2')).animationName,
    stats:getComputedStyle(document.querySelector('.completion-stats')).animationName
  }));
  expect(motion.check).toContain('completionCheckSettle');
  expect(motion.icon).toContain('completionIconSweep');
  expect(motion.title).toContain('completionContentIn');
  expect(motion.stats).toContain('completionContentIn');

  await page.emulateMedia({reducedMotion:'reduce'});
  const reduced=await page.evaluate(()=>({
    burst:getComputedStyle(document.querySelector('.completion-burst i')).display,
    check:getComputedStyle(document.querySelector('.completion-check')).animationName
  }));
  expect(reduced.burst).toBe('none');
  expect(reduced.check).toBe('none');
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
  expect(await page.evaluate(()=>DailyMotionPWA.isUpdateSafe())).toBe(false);
  expect(await page.evaluate(()=>window.__swMessages)).toEqual([]);

  await page.evaluate(()=>{
    DailyMotionState.resetRoutine('morning');
    window.dispatchEvent(new CustomEvent('daily-motion-reload-safety-change'));
  });

  await expect(page.locator('.pwa-banner__action')).toBeVisible();
  await expect(page.locator('.pwa-banner__action')).toHaveText('Обновить');
  expect(await page.evaluate(()=>DailyMotionPWA.isUpdateSafe())).toBe(true);

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


test('external state changes defer reload until workout becomes safe',async({page})=>{
  await page.addInitScript(()=>{
    sessionStorage.setItem('dailyMotionStorageBoots',String((Number(sessionStorage.getItem('dailyMotionStorageBoots'))||0)+1));
    if(localStorage.getItem('dailyMotionState.v3'))return;
    const now=new Date();
    const key=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    localStorage.setItem('dailyMotionState.v3',JSON.stringify({
      version:3,
      settings:{countdownSeconds:0,restSeconds:0,sound:false,autoNext:false,theme:'system'},
      programVersions:{morning:'morning-v3-active-2026-09-19'},
      days:{
        [key]:{routines:{morning:{
          step:2,completedUntil:2,completed:false,startedAt:new Date().toISOString(),completedAt:null,
          activeSeconds:35,effort:null,timers:{}
        }}}
      }
    }));
  });

  await page.goto('/session.html?routine=morning&resume=1',{waitUntil:'domcontentloaded'});

  await page.evaluate(()=>{
    const key=DailyMotionState.KEY;
    const external=JSON.parse(localStorage.getItem(key));
    external.settings.theme='dark';
    const next=JSON.stringify(external);
    localStorage.setItem(key,next);
    window.dispatchEvent(new StorageEvent('storage',{key,newValue:next}));
  });

  await page.waitForTimeout(150);
  expect(await page.evaluate(()=>Number(sessionStorage.getItem('dailyMotionStorageBoots')))).toBe(1);
  expect(await page.evaluate(()=>DailyMotionPWA.isUpdateSafe())).toBe(false);

  const reloadFinished=page.waitForEvent('load');
  await page.evaluate(()=>{
    const routine=DailyMotionState.getRoutine('morning');
    routine.completed=true;
    routine.startedAt=null;
    routine.step=0;
    routine.completedUntil=0;
    routine.activeSeconds=0;
    routine.timers={};
    window.dispatchEvent(new CustomEvent('daily-motion-reload-safety-change'));
  });
  await reloadFinished;

  expect(await page.evaluate(()=>Number(sessionStorage.getItem('dailyMotionStorageBoots')))).toBe(2);
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
});


test('cached app shell opens progress offline',async({page,context,browserName})=>{
  test.skip(browserName!=='chromium','offline service-worker regression is covered in Chromium');
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.reload({waitUntil:'domcontentloaded'});
  await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true);

  await context.setOffline(true);
  await page.goto('/progress.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#historyCalendar')).toBeVisible();
});


test('technique accordion exposes semantic headings and labelled regions',async({page})=>{
  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});

  const cards=page.locator('.detail-card');
  await expect(cards).toHaveCount(6);
  await expect(page.locator('.detail-card > h3.detail-card__heading')).toHaveCount(6);

  const expected=[
    ['detail-how','Как делать правильно'],
    ['detail-breathing','Дыхание и темп'],
    ['detail-feel','Что чувствовать'],
    ['detail-mistakes','Частые ошибки'],
    ['detail-easy','Облегчённый вариант'],
    ['detail-progression','Как прогрессировать']
  ];

  for(const [panelId,label] of expected){
    const button=page.locator(`#${panelId}-toggle`);
    const panel=page.locator(`#${panelId}`);
    await expect(button).toContainText(label);
    await expect(button).toHaveAttribute('aria-controls',panelId);
    await expect(panel).toHaveAttribute('role','region');
    await expect(panel).toHaveAttribute('aria-labelledby',`${panelId}-toggle`);
  }
});

test('keyboard focus uses the high-contrast accessibility ring',async({page,browserName})=>{
  test.skip(browserName!=='chromium','focus-visible color contract is verified once in Chromium');
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await page.keyboard.press('Tab');

  const settings=page.locator('#settingsBtn');
  await expect(settings).toBeFocused();
  const focusStyle=await settings.evaluate(element=>{
    const style=getComputedStyle(element);
    return {
      outlineColor:style.outlineColor,
      outlineWidth:style.outlineWidth,
      outlineOffset:style.outlineOffset,
      boxShadow:style.boxShadow
    };
  });

  expect(focusStyle.outlineColor).toBe('rgb(47, 107, 85)');
  expect(focusStyle.outlineWidth).toBe('2px');
  expect(focusStyle.outlineOffset).toBe('2px');
  expect(focusStyle.boxShadow).not.toBe('none');
});


test('settings dialogs keep keyboard focus trapped',async({page})=>{
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsOverlay')).toHaveAttribute('aria-hidden','false');
  await expect(page.locator('#settingsClose')).toBeFocused({timeout:1200});

  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#resetTodayBtn')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#settingsClose')).toBeFocused();

  await page.locator('#settingsClose').click();
  await expect(page.locator('#settingsOverlay')).toHaveAttribute('aria-hidden','true',{timeout:1200});

  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  await page.locator('#routineMoreButton').click();
  await expect(page.locator('#routineSettingsOverlay')).toHaveAttribute('aria-hidden','false');
  await expect(page.locator('#routineSettingsClose')).toBeFocused({timeout:1200});

  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#routineResetBtn')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#routineSettingsClose')).toBeFocused();

  await page.locator('#routineResetBtn').click();
  await expect(page.locator('#routineResetBlock')).toHaveClass(/is-confirming/);
  await expect(page.locator('#routineResetAccept')).toBeFocused({timeout:1000});
  await page.keyboard.press('Escape');
  await expect(page.locator('#routineResetBlock')).not.toHaveClass(/is-confirming/);
  await expect(page.locator('#routineResetBtn')).toBeFocused({timeout:1000});
  await expect(page.locator('#routineSettingsOverlay')).toHaveAttribute('aria-hidden','false');
});


test('consolidated workout CSS preserves the compact mobile contract',async({page,browserName})=>{
  test.skip(browserName!=='chromium','computed CSS consolidation contract is verified once in Chromium');
  await page.setViewportSize({width:360,height:800});
  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});

  const layout=await page.evaluate(()=>{
    const style=selector=>getComputedStyle(document.querySelector(selector));
    const timer=style('#timerRing');
    const shell=style('.session-shell');
    const main=style('.exercise-main');
    const head=style('.exercise-head');
    const facts=style('.exercise-facts');
    const technique=style('.technique-key');
    return {
      timerWidth:timer.width,
      shellWidth:shell.width,
      mainPadding:main.paddingTop,
      mainBorder:main.borderTopWidth,
      headGap:head.rowGap,
      factsGap:facts.columnGap,
      techniqueMargin:technique.marginBottom
    };
  });

  expect(layout.timerWidth).toBe('223.2px');
  expect(layout.shellWidth).toBe('328px');
  expect(layout.mainPadding).toBe('0px');
  expect(layout.mainBorder).toBe('0px');
  expect(layout.headGap).toBe('8px');
  expect(layout.factsGap).toBe('12px');
  expect(layout.techniqueMargin).toBe('20px');
});


test('typography tokens scale readable text without horizontal overflow',async({page,browserName})=>{
  test.skip(browserName!=='chromium','typography scaling contract is verified once in Chromium');
  await page.setViewportSize({width:360,height:800});

  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  const base=await page.evaluate(()=>({
    eyebrow:getComputedStyle(document.querySelector('.eyebrow')).fontSize,
    facts:getComputedStyle(document.querySelector('.exercise-facts span')).fontSize,
    description:getComputedStyle(document.querySelector('.exercise-head p')).fontSize
  }));
  expect(base).toEqual({eyebrow:'12px',facts:'12px',description:'13px'});

  await page.evaluate(()=>{document.documentElement.style.fontSize='20px';});
  const scaled=await page.evaluate(()=>({
    eyebrow:getComputedStyle(document.querySelector('.eyebrow')).fontSize,
    facts:getComputedStyle(document.querySelector('.exercise-facts span')).fontSize,
    description:getComputedStyle(document.querySelector('.exercise-head p')).fontSize,
    overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth
  }));
  expect(scaled).toEqual({eyebrow:'15px',facts:'15px',description:'16.25px',overflow:false});

  for(const url of ['/index.html','/progress.html']){
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await page.evaluate(()=>{document.documentElement.style.fontSize='20px';});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  }

  await page.goto('/progress.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.history-day').first()).toBeVisible();
  await page.evaluate(()=>{document.documentElement.style.fontSize='20px';});
  await expect(page.locator('.history-day').first().locator('small')).toHaveCSS('font-size','15px');
});


test('Daily Motion Design System foundation stays stable',async({page,browserName})=>{
  test.skip(browserName!=='chromium','P0 computed design baseline is verified once in Chromium');
  await page.setViewportSize({width:390,height:844});

  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  const home=await page.evaluate(()=> {
    const root=getComputedStyle(document.documentElement);
    const settings=getComputedStyle(document.querySelector('#settingsBtn'));
    const list=getComputedStyle(document.querySelector('.home-body .routine-list'));
    const row=getComputedStyle(document.querySelector('.home-body .routine-card'));
    return {
      bg:root.getPropertyValue('--bg').trim(),
      surface:root.getPropertyValue('--surface').trim(),
      text:root.getPropertyValue('--text').trim(),
      muted:root.getPropertyValue('--muted').trim(),
      accent:root.getPropertyValue('--accent').trim(),
      settings:[settings.width,settings.height],
      routineListRadius:list.borderTopLeftRadius,
      routineMinHeight:row.minHeight
    };
  });
  expect(home).toEqual({
    bg:'#f4f5f1',
    surface:'#fff',
    text:'#171917',
    muted:'#687169',
    accent:'#2f6b55',
    settings:['44px','44px'],
    routineListRadius:'18px',
    routineMinHeight:'74px'
  });

  await page.locator('#settingsBtn').click();
  const settingsSheet=await page.evaluate(()=> {
    const sheet=getComputedStyle(document.querySelector('.settings-sheet'));
    const handle=getComputedStyle(document.querySelector('.settings-sheet__handle'));
    const reset=getComputedStyle(document.querySelector('#resetTodayBtn'),'::after');
    return {
      radius:sheet.borderTopLeftRadius,
      handleWidth:handle.width,
      handleMinHeight:handle.minHeight,
      resetMicrocopyColor:reset.color
    };
  });
  expect(settingsSheet).toEqual({
    radius:'26px',
    handleWidth:'96px',
    handleMinHeight:'44px',
    resetMicrocopyColor:'rgb(138, 91, 87)'
  });

  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  const workout=await page.evaluate(()=> {
    const shell=getComputedStyle(document.querySelector('.session-shell'));
    const technique=getComputedStyle(document.querySelector('.detail-card__toggle'));
    const nav=getComputedStyle(document.querySelector('.nav-button'));
    return {
      shellWidth:shell.width,
      techniqueMinHeight:technique.minHeight,
      navHeight:nav.height
    };
  });
  expect(workout).toEqual({
    shellWidth:'358px',
    techniqueMinHeight:'56px',
    navHeight:'54px'
  });

  await page.goto('/progress.html',{waitUntil:'domcontentloaded'});
  const progress=await page.evaluate(()=> {
    const card=getComputedStyle(document.querySelector('.progress-card'));
    const micro=getComputedStyle(document.querySelector('.history-day small'));
    return {
      cardRadius:card.borderTopLeftRadius,
      calendarMicrocopyColor:micro.color
    };
  });
  expect(progress).toEqual({
    cardRadius:'18px',
    calendarMicrocopyColor:'rgb(104, 113, 105)'
  });
});


test('settings reset keeps copy stable and reveals only confirmation actions',async({page,browserName})=>{
  test.skip(browserName!=='chromium','reset transition is verified once in Chromium');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('#settingsBtn').click();

  await expect(page.locator('#resetTodayBtn')).toHaveText('Сбросить прогресс');
  const before=await page.locator('#resetTodayBtn').boundingBox();
  await page.locator('#resetTodayBtn').click();
  await expect(page.locator('#resetTodayBlock')).toHaveClass(/is-confirming/);
  await expect(page.locator('#resetTodayBtn')).toHaveText('Сбросить прогресс');
  await expect(page.locator('#resetTodayConfirm')).toHaveAttribute('aria-hidden','false');

  const during=await page.locator('#resetTodayBtn').boundingBox();
  expect(Math.abs(during.height-before.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(during.width-before.width)).toBeLessThanOrEqual(1);

  await page.locator('#resetCancelBtn').click();
  await expect(page.locator('#resetTodayBlock')).not.toHaveClass(/is-confirming/);
  await expect(page.locator('#resetTodayBtn')).toHaveText('Сбросить прогресс');

  await page.evaluate(()=>{window.__resetNoReloadSentinel='alive';});
  await page.locator('#resetTodayBtn').click();
  await page.locator('#resetConfirmBtn').click();
  await expect(page.locator('#settingsOverlay')).toHaveAttribute('aria-hidden','true');
  expect(await page.evaluate(()=>window.__resetNoReloadSentinel)).toBe('alive');
  await expect(page.locator('#heroProgressText')).toHaveText('0 из 9 упражнений');
  await expect(page.locator('#dayProgressValue')).toHaveText('0%');
});

test('settings sheet uses intrinsic selectors and progress actions keep rounded feedback',async({page,browserName})=>{
  test.skip(browserName!=='chromium','settings and progress control geometry are verified once in Chromium');

  for(const width of [320,390]){
    await page.setViewportSize({width,height:844});
    await page.goto('/index.html',{waitUntil:'domcontentloaded'});
    await page.locator('#settingsBtn').click();

    const base=await page.evaluate(()=>{
      const sheet=document.querySelector('.settings-sheet');
      const handle=document.querySelector('.settings-sheet__handle');
      const head=document.querySelector('.settings-sheet__head');
      const reset=document.querySelector('#resetTodayBtn');
      const select=document.querySelector('#countdownSetting');
      const sheetBox=sheet.getBoundingClientRect();
      const handleBox=handle.getBoundingClientRect();
      const headBox=head.getBoundingClientRect();
      const resetBox=reset.getBoundingClientRect();
      const style=getComputedStyle(select);
      return {
        overflow:document.documentElement.scrollWidth-window.innerWidth,
        handleToHead:Math.round(headBox.top-handleBox.top),
        bottomGap:Math.round(sheetBox.bottom-resetBox.bottom),
        height:Math.round(select.getBoundingClientRect().height),
        fieldSizing:style.fieldSizing,
        paddingLeft:style.paddingLeft,
        paddingRight:style.paddingRight,
        textAlign:style.textAlign,
        radius:style.borderTopLeftRadius
      };
    });

    expect(base.overflow).toBeLessThanOrEqual(0);
    expect(base.handleToHead).toBeLessThanOrEqual(38);
    expect(base.bottomGap).toBeLessThanOrEqual(16);
    expect(base.height).toBe(44);
    expect(base.fieldSizing).toBe('content');
    expect(base.textAlign).toBe('left');
    expect(base.radius).toBe('14px');

    await page.locator('#countdownSetting').selectOption('0');
    const noWidth=Math.round((await page.locator('#countdownSetting').boundingBox()).width);
    await page.locator('#countdownSetting').selectOption('5');
    const fiveWidth=Math.round((await page.locator('#countdownSetting').boundingBox()).width);
    expect(noWidth).toBeGreaterThanOrEqual(78);
    expect(noWidth).toBeLessThan(fiveWidth);
    expect(fiveWidth).toBeLessThanOrEqual(122);

    await expect(page.locator('#countdownSetting option[value="0"]')).toHaveText('Нет');
    await expect(page.locator('#restSetting option[value="15"]')).toHaveText('15 секунд');
    await expect(page.locator('#themeSetting option[value="system"]')).toHaveText('Системная');
  }

  await page.setViewportSize({width:390,height:844});
  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  await page.locator('#routineMoreButton').click();
  await expect(page.locator('#workoutThemeSetting option[value="system"]')).toHaveText('Системная');
  const routineSelect=await page.locator('#workoutThemeSetting').evaluate(select=>{
    const style=getComputedStyle(select);
    const box=select.getBoundingClientRect();
    return {width:Math.round(box.width),height:Math.round(box.height),fieldSizing:style.fieldSizing,radius:style.borderTopLeftRadius};
  });
  expect(routineSelect.height).toBe(44);
  expect(routineSelect.width).toBeLessThanOrEqual(136);
  expect(routineSelect.fieldSizing).toBe('content');
  expect(routineSelect.radius).toBe('14px');

  await page.goto('/progress.html',{waitUntil:'domcontentloaded'});
  const importButton=page.locator('#importDataBtn');
  await importButton.evaluate(button=>button.classList.add('is-pressing'));
  const pressed=await importButton.evaluate(button=>{
    const style=getComputedStyle(button);
    return {
      radius:style.borderTopLeftRadius,
      overflow:style.overflow,
      background:style.backgroundColor,
      transform:style.transform
    };
  });
  expect(pressed.radius).toBe('14px');
  expect(pressed.overflow).toBe('hidden');
  expect(pressed.transform).toBe('none');

  const actionGap=await page.locator('.data-actions').evaluate(node=>getComputedStyle(node).gap);
  expect(actionGap).toBe('10px');
});

test('progress entry keeps a rounded press surface',async({page,browserName})=>{
  test.skip(browserName!=='chromium','interaction geometry is verified once in Chromium');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});

  const history=page.locator('.activity-card__head .text-link');
  await history.dispatchEvent('pointerdown',{pointerType:'touch',button:0});
  const historyPress=await history.evaluate(el=>{
    const style=getComputedStyle(el);
    return {radius:style.borderRadius,background:style.backgroundColor,minHeight:style.minHeight};
  });
  expect(historyPress.radius).toBe('12px');
  expect(historyPress.minHeight).toBe('44px');
  expect(historyPress.background).not.toBe('rgba(0, 0, 0, 0)');
});

test('R1 shared layout rhythm stays consistent across pages',async({page,browserName})=>{
  test.skip(browserName!=='chromium','R1 computed geometry contract is verified once in Chromium');
  await page.setViewportSize({width:390,height:844});

  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  const home=await page.evaluate(()=>({
    container:getComputedStyle(document.querySelector('.home-body .container')).width,
    heroPadding:getComputedStyle(document.querySelector('.home-body .today-card')).paddingLeft,
    activityPadding:getComputedStyle(document.querySelector('.home-body .activity-card')).paddingLeft,
    routineRadius:getComputedStyle(document.querySelector('.home-body .routine-list')).borderTopLeftRadius,
    touch:getComputedStyle(document.querySelector('#settingsBtn')).width
  }));
  expect(home).toEqual({
    container:'358px',
    heroPadding:'20px',
    activityPadding:'16px',
    routineRadius:'18px',
    touch:'44px'
  });

  await page.locator('#settingsBtn').click();
  const settings=await page.evaluate(()=>({
    padding:getComputedStyle(document.querySelector('.settings-sheet')).paddingLeft,
    row:getComputedStyle(document.querySelector('.setting-row')).minHeight
  }));
  expect(settings).toEqual({padding:'16px',row:'68px'});

  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  const workout=await page.evaluate(()=>({
    shell:getComputedStyle(document.querySelector('.session-shell')).width,
    techniqueRadius:getComputedStyle(document.querySelector('.technique-key')).borderTopLeftRadius,
    detailGroupRadius:getComputedStyle(document.querySelector('.details-stack')).borderTopLeftRadius,
    detailRowRadius:getComputedStyle(document.querySelector('.detail-card')).borderTopLeftRadius,
    nav:getComputedStyle(document.querySelector('.nav-button')).height,
    executionPadding:getComputedStyle(document.querySelector('.execution-overlay')).paddingLeft
  }));
  expect(workout).toEqual({
    shell:'358px',
    techniqueRadius:'18px',
    detailGroupRadius:'18px',
    detailRowRadius:'0px',
    nav:'54px',
    executionPadding:'16px'
  });

  await page.locator('#routineMoreButton').click();
  const routineSettings=await page.evaluate(()=>({
    padding:getComputedStyle(document.querySelector('.routine-settings-sheet')).paddingLeft,
    row:getComputedStyle(document.querySelector('.routine-setting-row')).minHeight
  }));
  expect(routineSettings).toEqual({padding:'16px',row:'68px'});

  await page.goto('/progress.html',{waitUntil:'domcontentloaded'});
  const progress=await page.evaluate(()=>({
    container:getComputedStyle(document.querySelector('.progress-body .container')).width,
    gap:getComputedStyle(document.querySelector('.progress-page')).rowGap,
    cardPadding:getComputedStyle(document.querySelector('.progress-card')).paddingLeft,
    cardRadius:getComputedStyle(document.querySelector('.progress-card')).borderTopLeftRadius,
    metricGap:getComputedStyle(document.querySelector('.progress-metrics')).gap,
    metricRadius:getComputedStyle(document.querySelector('.progress-metrics article')).borderTopLeftRadius
  }));
  expect(progress).toEqual({
    container:'358px',
    gap:'16px',
    cardPadding:'16px',
    cardRadius:'18px',
    metricGap:'12px',
    metricRadius:'18px'
  });
});


test('R2 component targets and switch contrast stay accessible',async({page,browserName})=>{
  test.skip(browserName!=='chromium','R2 component contract is verified once in Chromium');
  await page.setViewportSize({width:390,height:844});

  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('#settingsBtn').click();
  const home=await page.evaluate(()=>{
    const px=selector=>getComputedStyle(document.querySelector(selector));
    const handle=px('.settings-sheet__handle');
    const close=px('#settingsClose');
    const select=px('.setting-row select');
    const toggle=getComputedStyle(document.querySelector('.switch-input:not(:checked)'));
    return {
      handleMinHeight:handle.minHeight,
      close:[close.width,close.height],
      selectHeight:select.height,
      switchOff:toggle.backgroundColor
    };
  });
  expect(home).toEqual({
    handleMinHeight:'44px',
    close:['44px','44px'],
    selectHeight:'44px',
    switchOff:'rgb(127, 137, 129)'
  });

  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  await page.locator('#nextButton').evaluate(button=>button.click());
  await expect(page.locator('#executionOverlay')).toHaveAttribute('aria-hidden','false');
  const execution=await page.evaluate(()=>({
    close:getComputedStyle(document.querySelector('#executionClose')).height,
    secondary:[...document.querySelectorAll('.execution-secondary button')].map(el=>getComputedStyle(el).minHeight),
    adjustment:[...document.querySelectorAll('.execution-adjustments button')].map(el=>getComputedStyle(el).minHeight)
  }));
  expect(execution.close).toBe('44px');
  expect(execution.secondary.every(value=>value==='44px')).toBe(true);
  expect(execution.adjustment.every(value=>value==='48px')).toBe(true);
});

test('R2 text reflows at 150 and 200 percent without horizontal overflow',async({page,browserName})=>{
  test.skip(browserName!=='chromium','extended text scaling is verified once in Chromium');
  await page.setViewportSize({width:390,height:844});

  for(const rootSize of [24,32]){
    for(const url of ['/index.html','/session.html?routine=morning','/progress.html']){
      await page.goto(url,{waitUntil:'domcontentloaded'});
      await page.evaluate(size=>{document.documentElement.style.fontSize=`${size}px`;},rootSize);
      const result=await page.evaluate(()=>({
        overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
        width:document.documentElement.scrollWidth,
        client:document.documentElement.clientWidth
      }));
      expect(result.overflow,`${url} overflowed at root ${rootSize}px: ${result.width}/${result.client}`).toBe(false);
    }
  }
});

test('R2 compact and large iPhone viewports keep essential UI reachable',async({page,browserName})=>{
  test.skip(browserName!=='webkit','iPhone viewport coverage is WebKit-specific');
  const cases=[
    {width:320,height:568},
    {width:390,height:844},
    {width:430,height:932}
  ];

  for(const viewport of cases){
    await page.setViewportSize(viewport);

    await page.goto('/index.html',{waitUntil:'domcontentloaded'});
    await expect(page.locator('#settingsBtn')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);

    await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
    await expect(page.locator('#nextButton')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);

    await page.goto('/progress.html',{waitUntil:'domcontentloaded'});
    await expect(page.locator('#historyCalendar')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  }
});


test('R3 visual hierarchy stays coherent across pages',async({page,browserName})=>{
  test.skip(browserName!=='chromium','R3 visual hierarchy is verified once in Chromium');
  await page.setViewportSize({width:390,height:844});

  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  const home=await page.evaluate(()=>({
    heroShadow:getComputedStyle(document.querySelector('.home-body .today-card')).boxShadow,
    routinesShadow:getComputedStyle(document.querySelector('.home-body .routine-list')).boxShadow,
    activityShadow:getComputedStyle(document.querySelector('.home-body .activity-card')).boxShadow
  }));
  expect(home.heroShadow).not.toBe('none');
  expect(home.routinesShadow).not.toBe('none');
  expect(home.activityShadow).not.toBe('none');

  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#pageLoader')).toHaveClass(/is-hidden/);
  const workout=await page.evaluate(()=>({
    navBg:getComputedStyle(document.querySelector('.session-nav')).backgroundColor,
    keyBg:getComputedStyle(document.querySelector('.technique-key')).backgroundColor,
    groupShadow:getComputedStyle(document.querySelector('.details-stack')).boxShadow
  }));
  expect(workout.navBg).toBe('rgb(255, 255, 255)');
  expect(workout.keyBg).toBe('rgb(231, 240, 234)');
  expect(workout.groupShadow).not.toBe('none');

  await page.goto('/progress.html',{waitUntil:'domcontentloaded'});
  const progress=await page.evaluate(()=>({
    cardShadow:getComputedStyle(document.querySelector('.progress-card')).boxShadow,
    metricBg:getComputedStyle(document.querySelector('.progress-metrics article')).backgroundColor
  }));
  expect(progress.cardShadow).not.toBe('none');
  expect(progress.metricBg).toBe('rgb(248, 250, 247)');
});
