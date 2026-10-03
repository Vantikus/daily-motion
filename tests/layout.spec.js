import { test, expect } from './helpers/runtime.js';

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

  expect(layout.timerWidth).toBe('220px');
  expect(layout.shellWidth).toBe('328px');
  expect(layout.mainPadding).toBe('0px');
  expect(layout.mainBorder).toBe('0px');
  expect(layout.headGap).toBe('8px');
  expect(layout.factsGap).toBe('16px');
  expect(layout.techniqueMargin).toBe('24px');
});

test('P3 timer urgency never changes ring geometry',async({page,browserName})=>{
  test.skip(browserName!=='chromium','timer geometry is verified once in Chromium');
  await page.addInitScript(()=>{
    const now=new Date();
    const key=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    localStorage.setItem('dailyMotionState.v3',JSON.stringify({
      version:3,
      settings:{countdownSeconds:0,restSeconds:0,sound:false,autoNext:false,theme:'system'},
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
  await expect(page.locator('#timerRing')).toHaveClass(/is-final-three/);
  await expect.poll(()=>page.locator('#timerRing').evaluate(node=>getComputedStyle(node).transform)).toBe('none');
  const ring=await page.locator('#timerRing').evaluate(node=>{
    const box=node.getBoundingClientRect();
    const style=getComputedStyle(node);
    return {
      width:Math.round(box.width),
      height:Math.round(box.height),
      transform:style.transform,
      animation:style.animationName
    };
  });
  expect(ring.width).toBe(ring.height);
  expect(ring.transform).toBe('none');
  expect(ring.animation).toContain('timerUrgencyPulse');
});

test('P2 desktop Home uses one balanced wide layout',async({page,browserName})=>{
  test.skip(browserName!=='chromium','desktop layout geometry is verified once in Chromium');
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});

  const layout=await page.evaluate(()=>{
    const container=document.querySelector('.home-body .container').getBoundingClientRect();
    const grid=getComputedStyle(document.querySelector('.home-body .page-grid'));
    const hero=document.querySelector('.home-body .today-card').getBoundingClientRect();
    const activity=document.querySelector('.home-body .activity-section').getBoundingClientRect();
    const routines=document.querySelector('.home-body .routines-section').getBoundingClientRect();
    return {
      containerWidth:Math.round(container.width),
      areas:grid.gridTemplateAreas,
      sameTop:Math.abs(hero.top-activity.top),
      routinesBelow:routines.top>=Math.max(hero.bottom,activity.bottom)-1,
      routinesWidth:Math.round(routines.width),
      heroWidth:Math.round(hero.width)
    };
  });

  expect(layout.containerWidth).toBe(1100);
  expect(layout.areas).toContain('"hero activity"');
  expect(layout.areas).toContain('"routines routines"');
  expect(layout.sameTop).toBeLessThanOrEqual(1);
  expect(layout.routinesBelow).toBe(true);
  expect(layout.routinesWidth).toBeGreaterThan(layout.heroWidth);
});

test('exercise facts stay clustered instead of stretching across the workout',async({page,browserName})=>{
  test.skip(browserName!=='chromium','facts geometry is verified once in Chromium');
  await page.setViewportSize({width:760,height:900});
  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});

  const facts=await page.evaluate(()=>{
    const items=[...document.querySelectorAll('.exercise-facts>div')].map(node=>node.getBoundingClientRect());
    const secondLabel=getComputedStyle(document.querySelector('.fact-label--right'));
    return {
      gap:Math.round(items[1].left-items[0].right),
      justify:secondLabel.justifyContent,
      containerWidth:Math.round(document.querySelector('.exercise-facts').getBoundingClientRect().width)
    };
  });
  expect(facts.gap).toBeGreaterThanOrEqual(20);
  expect(facts.gap).toBeLessThanOrEqual(40);
  expect(facts.justify).toBe('flex-start');
  expect(facts.containerWidth).toBeGreaterThan(300);
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
    routineListRadius:'16px',
    routineMinHeight:'68px'
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
    techniqueMinHeight:'52px',
    navHeight:'48px'
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

test('progress entry keeps a rounded press surface',async({page,browserName})=>{
  test.skip(browserName!=='chromium','interaction geometry is verified once in Chromium');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});

  const history=page.locator('.activity-card__head .text-link');
  await history.dispatchEvent('pointerdown',{pointerType:'touch',button:0});
  await expect(history).toHaveClass(/is-pressing/);
  await expect.poll(()=>history.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
  const historyPress=await history.evaluate(el=>{
    const style=getComputedStyle(el);
    return {radius:style.borderRadius,minHeight:style.minHeight};
  });
  expect(historyPress.radius).toBe('12px');
  expect(historyPress.minHeight).toBe('44px');
  await history.dispatchEvent('pointerup',{pointerType:'touch',button:0});
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
    heroPadding:'19px',
    activityPadding:'15px',
    routineRadius:'16px',
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
    techniqueRadius:'16px',
    detailGroupRadius:'18px',
    detailRowRadius:'0px',
    nav:'48px',
    executionPadding:'14px'
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
    cardPadding:'20px',
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
  expect(execution.secondary.every(value=>value==='40px')).toBe(true);
  expect(execution.adjustment.every(value=>value==='43px')).toBe(true);
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
  expect(home.routinesShadow).toBe('none');
  expect(home.activityShadow).toBe('none');

  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#pageLoader')).toHaveAttribute('aria-hidden','true',{timeout:1000});
  await expect(page.locator('#pageLoader')).not.toHaveClass(/is-visible/);
  const workout=await page.evaluate(()=>({
    navBg:getComputedStyle(document.querySelector('.session-nav')).backgroundColor,
    keyBg:getComputedStyle(document.querySelector('.technique-key')).backgroundColor,
    groupShadow:getComputedStyle(document.querySelector('.details-stack')).boxShadow
  }));
  expect(workout.navBg).toBe('rgb(255, 255, 255)');
  expect(workout.keyBg).not.toBe(workout.navBg);
  expect(workout.groupShadow).toBe('none');

  await page.goto('/progress.html',{waitUntil:'domcontentloaded'});
  const progress=await page.evaluate(()=>({
    cardShadow:getComputedStyle(document.querySelector('.progress-card')).boxShadow,
    metricBg:getComputedStyle(document.querySelector('.progress-metrics article')).backgroundColor
  }));
  expect(progress.cardShadow).not.toBe('none');
  expect(progress.metricBg).toBe('rgb(248, 250, 247)');
});
