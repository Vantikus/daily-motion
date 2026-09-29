import { test, expect } from '@playwright/test';

const stateKey='dailyMotionState.v3';

const blockStateWrites=async page=>page.evaluate(()=>{
  const nativeSetItem=Storage.prototype.setItem;
  window.__blockStateWrites=true;
  Storage.prototype.setItem=function(key,value){
    if(window.__blockStateWrites&&key==='dailyMotionState.v3'){
      throw new DOMException('Storage is full','QuotaExceededError');
    }
    return nativeSetItem.call(this,key,value);
  };
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

test('legacy v1 state migrates timers into the current routine',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.removeItem('dailyMotionState.v3');
    localStorage.removeItem('dailyMotionState.v2');
    localStorage.setItem('dailyMotionState.v1',JSON.stringify({
      settings:{countdownSeconds:5,restSeconds:30,sound:false,autoNext:true},
      timers:{morning:{'cat-cow':{duration:40,remaining:17,running:false,paused:true}}}
    }));
  });
  await page.goto('/progress.html',{waitUntil:'domcontentloaded'});

  const migrated=await page.evaluate(()=>({
    version:DailyMotionState.getState().version,
    settings:DailyMotionState.getSettings(),
    timer:DailyMotionState.getRoutine('morning').timers['cat-cow']
  }));

  expect(migrated.version).toBe(3);
  expect(migrated.settings).toMatchObject({countdownSeconds:5,restSeconds:30,sound:false,autoNext:true});
  expect(migrated.timer).toMatchObject({duration:40,remaining:17,running:false,paused:true});
});

test('damaged nested fields recover without losing valid history or paused timers',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    const date=new Date();
    const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    localStorage.setItem('dailyMotionState.v3',JSON.stringify({
      version:3,settings:null,programVersions:[],
      days:{
        [key]:{routines:{morning:{completed:true,completedUntil:9,activeSeconds:120,timers:{
          good:{duration:40,remaining:17,running:false,paused:true,endAt:null,runStartedAt:null},
          broken:null,
          array:[],
          fresh:{duration:null,remaining:null,running:false},
          invalidRunning:{duration:40,remaining:17,running:true,endAt:null}
        }},day:null,evening:[]}},
        '2026-09-10':{routines:{morning:{completed:true,completedUntil:9,activeSeconds:60}}},
        '2026-09-09':null,
        'not-a-date':{routines:{morning:{completed:true}}},
        '2026-02-30':{routines:{morning:{completed:true}}}
      }
    }));
  });
  await page.goto('/progress.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#completedSessions')).toHaveText('2');
  await expect(page.locator('#historyList .history-row')).toHaveCount(2);
  const recovered=await page.evaluate(()=>({
    settings:DailyMotionState.getSettings(),
    routine:DailyMotionState.getRoutine('morning'),
    fresh:DailyMotionState.getTimer('morning','fresh',40),
    keys:Object.keys(DailyMotionState.getState().days)
  }));
  expect(recovered.settings).toEqual({countdownSeconds:3,restSeconds:15,sound:true,autoNext:false,theme:'system'});
  expect(recovered.routine).toMatchObject({completed:true,completedUntil:9,activeSeconds:120});
  expect(recovered.routine.timers.good).toMatchObject({duration:40,remaining:17,paused:true,endAt:null,runStartedAt:null});
  expect(recovered.routine.timers).not.toHaveProperty('broken');
  expect(recovered.routine.timers).not.toHaveProperty('array');
  expect(recovered.routine.timers.invalidRunning).toMatchObject({remaining:17,running:false,paused:true,endAt:null});
  expect(recovered.fresh).toMatchObject({duration:40,remaining:40,running:false});
  expect(recovered.keys).not.toContain('not-a-date');
  expect(recovered.keys).not.toContain('2026-02-30');
  expect(errors).toEqual([]);
});

test('legacy v2 preserves history and settings and clears only historical running flags',async({page})=>{
  await page.addInitScript(()=>{
    const date=new Date();
    const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    localStorage.setItem('dailyMotionState.v2',JSON.stringify({
      version:2,settings:{countdownSeconds:5,restSeconds:30,sound:false,autoNext:true,theme:'dark'},
      days:{
        [key]:{routines:{morning:{step:2,completedUntil:2,activeSeconds:25,timers:{good:{duration:40,remaining:17,running:false,paused:true}}}}},
        '2026-09-10':{routines:{morning:{completed:true,activeSeconds:60,timers:{old:{duration:40,remaining:12,running:true,endAt:Date.now()+12000,runStartedAt:Date.now()}}}}}
      }
    }));
    localStorage.setItem('dailyMotionState.v1',JSON.stringify({settings:{countdownSeconds:0},days:{}}));
  });
  await page.goto('/progress.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#completedSessions')).toHaveText('1');
  const migrated=await page.evaluate(()=>({
    version:DailyMotionState.getState().version,
    settings:DailyMotionState.getSettings(),
    current:DailyMotionState.getRoutine('morning'),
    old:DailyMotionState.getDay('2026-09-10').routines.morning,
    saved:DailyMotionState.save(),
    stored:JSON.parse(localStorage.getItem('dailyMotionState.v3'))
  }));
  expect(migrated.version).toBe(3);
  expect(migrated.settings).toEqual({countdownSeconds:5,restSeconds:30,sound:false,autoNext:true,theme:'dark'});
  expect(migrated.current).toMatchObject({step:2,completedUntil:2,activeSeconds:25,timers:{good:{duration:40,remaining:17,paused:true}}});
  expect(migrated.old).toMatchObject({completed:true,activeSeconds:60,timers:{old:{remaining:12,running:false,endAt:null,runStartedAt:null}}});
  expect(migrated.saved).toBe(true);
  expect(migrated.stored.version).toBe(3);
});

for(const [name,raw] of [['invalid JSON','{'],['null','null'],['array','[]'],['primitive','true']]){
  test(`current state with ${name} falls back to valid legacy data`,async({page})=>{
    await page.addInitScript(({key,raw})=>{
      localStorage.setItem(key,raw);
      localStorage.setItem('dailyMotionState.v2',JSON.stringify({settings:{sound:false,restSeconds:30},days:{'2026-09-10':{routines:{morning:{completed:true,activeSeconds:60}}}}}));
    },{key:stateKey,raw});
    await page.goto('/progress.html',{waitUntil:'domcontentloaded'});
    await expect(page.locator('#completedSessions')).toHaveText('1');
    expect(await page.evaluate(()=>DailyMotionState.getSettings())).toMatchObject({sound:false,restSeconds:30});
  });
}

test('save and reload preserve nullable timer fields and default missing durations',async({page})=>{
  await page.goto('/progress.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
    const key=DailyMotionState.todayKey();
    DailyMotionState.importState({settings:{countdownSeconds:null,restSeconds:null},days:{[key]:{routines:{morning:{timers:{
      fresh:{duration:null,remaining:null,running:false,paused:false,endAt:null,runStartedAt:null},
      missingRemaining:{duration:40,remaining:null,running:false,paused:false,endAt:null,runStartedAt:null},
      paused:{duration:40,remaining:17,running:false,paused:true,endAt:null,runStartedAt:null}
    }}}}}});
  });
  expect(await page.evaluate(()=>DailyMotionState.getTotalActiveSeconds(['morning']))).toBe(23);
  await page.reload({waitUntil:'domcontentloaded'});
  const roundTrip=await page.evaluate(()=>({
    settings:DailyMotionState.getSettings(),
    fresh:DailyMotionState.getTimer('morning','fresh',40),
    paused:DailyMotionState.getTimer('morning','paused',40)
  }));
  expect(roundTrip.settings).toMatchObject({countdownSeconds:3,restSeconds:15});
  expect(roundTrip.fresh).toMatchObject({duration:40,remaining:40,endAt:null,runStartedAt:null});
  expect(roundTrip.paused).toMatchObject({duration:40,remaining:17,paused:true,endAt:null,runStartedAt:null});
});

test('invalid imports preserve both live state and saved data',async({page})=>{
  await page.goto('/progress.html',{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(()=>{
    DailyMotionState.getRoutine('morning').activeSeconds=123;
    DailyMotionState.save();
    const before=DailyMotionState.exportState();
    const stored=localStorage.getItem('dailyMotionState.v3');
    const rejected=[];
    for(const input of ['{','null','[]','true']){
      try{DailyMotionState.importState(input);rejected.push(false);}catch{rejected.push(true);}
    }
    return {rejected,liveUnchanged:before===DailyMotionState.exportState(),diskUnchanged:stored===localStorage.getItem('dailyMotionState.v3')};
  });
  expect(result).toEqual({rejected:[true,true,true,true],liveUnchanged:true,diskUnchanged:true});
});

test('failed import retains the existing state object and saved history',async({page})=>{
  await page.goto('/progress.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
    DailyMotionState.getRoutine('morning').activeSeconds=123;
    DailyMotionState.save();
  });
  await blockStateWrites(page);
  const result=await page.evaluate(()=>{
    const before=DailyMotionState.getState();
    const stored=localStorage.getItem('dailyMotionState.v3');
    let error=null;
    try{DailyMotionState.importState({settings:{sound:false},days:{}});}catch(e){error=e.message;}
    return {error,sameObject:before===DailyMotionState.getState(),seconds:DailyMotionState.getRoutine('morning').activeSeconds,diskUnchanged:stored===localStorage.getItem('dailyMotionState.v3'),status:DailyMotionState.getPersistenceStatus()};
  });
  expect(result).toEqual({error:'STATE_SAVE_FAILED',sameObject:true,seconds:123,diskUnchanged:true,status:{ok:false,error:'STORAGE_WRITE_FAILED'}});
  await expect(page.locator('#toast')).toContainText('Не удалось сохранить изменения');
});

test('storage failure is visible, pending data remains exportable and saving can recover',async({page})=>{
  await page.goto('/progress.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>DailyMotionState.save());
  await blockStateWrites(page);
  const failed=await page.evaluate(()=>{
    DailyMotionState.updateSettings({autoNext:true});
    return {saved:DailyMotionState.save(),status:DailyMotionState.getPersistenceStatus(),pending:JSON.parse(DailyMotionState.exportState()).settings.autoNext,stored:JSON.parse(localStorage.getItem('dailyMotionState.v3')).settings.autoNext};
  });
  expect(failed).toEqual({saved:false,status:{ok:false,error:'STORAGE_WRITE_FAILED'},pending:true,stored:false});
  await expect(page.locator('#toast')).toContainText('Не удалось сохранить изменения');
  const download=page.waitForEvent('download');
  await page.locator('#exportDataBtn').click();
  await download;
  await expect(page.locator('#toast')).toHaveText('Резервная копия подготовлена');
  const recovered=await page.evaluate(()=>{
    window.__blockStateWrites=false;
    return {saved:DailyMotionState.save(),status:DailyMotionState.getPersistenceStatus(),stored:JSON.parse(localStorage.getItem('dailyMotionState.v3')).settings.autoNext};
  });
  expect(recovered).toEqual({saved:true,status:{ok:true,error:null},stored:true});
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
    const key='dailyMotionState.v3';
    const external=JSON.parse(localStorage.getItem(key));
    external.settings.theme='dark';
    const next=JSON.stringify(external);
    localStorage.setItem(key,next);
    window.dispatchEvent(new StorageEvent('storage',{key,newValue:next}));
  });

  await page.waitForTimeout(150);
  expect(await page.evaluate(()=>Number(sessionStorage.getItem('dailyMotionStorageBoots')))).toBe(1);
  expect(await page.evaluate(()=>window.DailyMotionReloadGuard?.isSafe?.())).toBe(false);

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
