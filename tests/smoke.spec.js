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
