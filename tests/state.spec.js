import { test, expect } from '@playwright/test';

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
