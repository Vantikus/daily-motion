import { test, expect, expectSwup } from './helpers/runtime.js';

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

test('fast workout boot does not flash the page loader',async({page})=>{
  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#exerciseGoal')).not.toHaveText('');
  await expect(page.locator('#pageLoader')).toHaveAttribute('aria-hidden','true',{timeout:1000});
  await expect(page.locator('#pageLoader')).not.toHaveClass(/is-visible/);
  await expect(page.locator('#pageLoader')).toHaveCSS('visibility','hidden');
});

test('Swup lifecycle remounts Home and Progress with fresh local state',async({page})=>{
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await expectSwup(page);
  const token=await page.evaluate(()=>window.__navigationToken=crypto.randomUUID());
  await expect(page.locator('#todayStatus')).toHaveText('Сегодня');
  await page.evaluate(()=>{
    const routine=DailyMotionState.getRoutine('morning');
    routine.completed=true;
    routine.completedUntil=DailyMotionProgram.morning.length;
    routine.activeSeconds=600;
    routine.completedAt=new Date().toISOString();
    DailyMotionState.save();
  });

  await page.locator('a[href="progress.html"]').click();
  await expect(page).toHaveURL(/\/progress\.html$/);
  await expect(page.locator('#completedSessions')).toHaveText('1');
  await expect(page.locator('#historyList .history-row')).toHaveCount(1);
  expect(await page.evaluate(()=>window.__navigationToken)).toBe(token);

  await page.locator('[data-nav-back]').click();
  await expect(page).toHaveURL(/\/index\.html$/);
  await expect(page.locator('#todayStatus')).toHaveText('Готово');
  await expect(page.locator('#heroProgressText')).toHaveText('9 из 9 упражнений');
  expect(await page.evaluate(()=>window.__navigationToken)).toBe(token);
  await page.goForward();
  await expect(page.locator('#historyCalendar')).toBeVisible();
  expect(await page.evaluate(()=>window.__navigationToken)).toBe(token);
});

test('Swup navigation shell is present on every page',async({page})=>{
  for(const url of ['/index.html','/progress.html','/session.html?routine=morning']){
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await expect(page.locator('#swup.transition-page')).toHaveCount(1);
    await expectSwup(page);
  }
});

test('native navigation remains usable when the Swup runtime cannot load',async({page})=>{
  await page.route('https://unpkg.com/**',route=>route.abort());
  await page.goto('/index.html');
  const token=await page.evaluate(()=>window.__fallbackToken=crypto.randomUUID());
  await page.locator('a[href="progress.html"]').click();
  await expect(page.locator('#historyCalendar')).toBeVisible();
  expect(await page.evaluate(()=>window.__fallbackToken)).not.toBe(token);
});
