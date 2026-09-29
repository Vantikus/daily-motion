import { test, expect } from '@playwright/test';

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

test('typography tokens scale readable text without horizontal overflow',async({page,browserName})=>{
  test.skip(browserName!=='chromium','typography scaling contract is verified once in Chromium');
  await page.setViewportSize({width:360,height:800});

  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  const base=await page.evaluate(()=>({
    eyebrow:getComputedStyle(document.querySelector('.eyebrow')).fontSize,
    facts:getComputedStyle(document.querySelector('.exercise-facts span')).fontSize,
    description:getComputedStyle(document.querySelector('.exercise-head p')).fontSize
  }));
  expect(base).toEqual({eyebrow:'11px',facts:'11px',description:'13px'});

  await page.evaluate(()=>{document.documentElement.style.fontSize='20px';});
  const scaled=await page.evaluate(()=>({
    eyebrow:getComputedStyle(document.querySelector('.eyebrow')).fontSize,
    facts:getComputedStyle(document.querySelector('.exercise-facts span')).fontSize,
    description:getComputedStyle(document.querySelector('.exercise-head p')).fontSize,
    overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth
  }));
  expect(scaled).toEqual({eyebrow:'13.75px',facts:'13.75px',description:'16.25px',overflow:false});

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
