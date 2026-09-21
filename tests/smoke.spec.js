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
