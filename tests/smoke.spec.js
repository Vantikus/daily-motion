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
