import { test, expect, expectSwup } from './helpers/runtime.js';

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

  await expect(page.locator('#completionOverlay')).not.toHaveClass(/is-exiting/);
  await page.locator('#completionHome').click();
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
  await expect(page.locator('.completion-mark')).toBeVisible();
  await expect(page.locator('.completion-mark__ring')).toBeVisible();
  await expect(page.locator('.completion-mark__check')).toBeVisible();
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
  await expect.poll(()=>page.locator('#timerRing').evaluate(node=>getComputedStyle(node).transform)).toBe('none');
  const finalMotion=await page.locator('#timerRing').evaluate(node=>{
    const style=getComputedStyle(node);
    return {transform:style.transform,animation:style.animationName};
  });
  expect(finalMotion.transform).toBe('none');
  expect(finalMotion.animation).toContain('timerUrgencyPulse');
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
  const motion=await page.evaluate(async()=>{
    document.querySelector('#nextButton').click();
    await new Promise(resolve=>requestAnimationFrame(()=>resolve()));
    const ring=document.querySelector('.completion-mark__ring');
    const check=document.querySelector('.completion-mark__check');
    const title=document.querySelector('#completionTitle');
    return {
      ariaHidden:document.querySelector('#completionOverlay').getAttribute('aria-hidden'),
      gsap:Boolean(window.gsap),
      owner:typeof window.DailyMotionMotion?.playCompletion==='function',
      checkAnimation:getComputedStyle(document.querySelector('.completion-check')).animationName,
      ringAnimation:getComputedStyle(ring).animationName,
      checkDrawAnimation:getComputedStyle(check).animationName,
      ringInline:ring.style.strokeDasharray,
      checkInline:check.style.strokeDasharray,
      titleInline:title.getAttribute('style')||''
    };
  });
  expect(motion.ariaHidden).toBe('false');
  expect(motion.gsap).toBe(true);
  expect(motion.owner).toBe(true);
  expect(motion.checkAnimation).toBe('none');
  expect(motion.ringAnimation).toBe('none');
  expect(motion.checkDrawAnimation).toBe('none');
  expect(motion.ringInline).not.toBe('');
  expect(motion.checkInline).not.toBe('');
  expect(motion.titleInline).toContain('opacity');

  await page.waitForTimeout(900);
  await expect(page.locator('#completionTitle')).toBeVisible();
  await expect(page.locator('.completion-mark__ring')).toBeVisible();
  await expect(page.locator('.completion-mark__check')).toBeVisible();

  await page.emulateMedia({reducedMotion:'reduce'});
  const reduced=await page.evaluate(()=>({
    check:getComputedStyle(document.querySelector('.completion-check')).animationName,
    ringOffset:getComputedStyle(document.querySelector('.completion-mark__ring')).strokeDashoffset,
    checkOffset:getComputedStyle(document.querySelector('.completion-mark__check')).strokeDashoffset
  }));
  expect(reduced.check).toBe('none');
  expect(reduced.ringOffset).toBe('0px');
  expect(reduced.checkOffset).toBe('0px');
});

test('technique accordion keeps at most one section expanded',async({page})=>{
  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  const cards=page.locator('.detail-card');
  await expect(cards.filter({has:page.locator('[aria-expanded="true"]')})).toHaveCount(1);

  await page.locator('#detail-breathing-toggle').click();
  await expect(page.locator('#detail-breathing-toggle')).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('#detail-how-toggle')).toHaveAttribute('aria-expanded','false');
  await expect(page.locator('.detail-card.is-open')).toHaveCount(1);

  await page.locator('#detail-feel-toggle').click();
  await expect(page.locator('#detail-feel-toggle')).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('#detail-breathing-toggle')).toHaveAttribute('aria-expanded','false');
  await expect(page.locator('.detail-card.is-open')).toHaveCount(1);
});

test('expanded technique starts scrolling immediately and stays above workout navigation',async({page})=>{
  await page.setViewportSize({width:360,height:640});
  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});

  await page.evaluate(()=>{
    window.__techniqueClickAt=0;
    window.__techniqueScrollAt=0;
    document.querySelector('#detail-progression-toggle').addEventListener('click',()=>{
      window.__techniqueClickAt=performance.now();
    },{capture:true,once:true});
    document.querySelector('#exerciseScroll').addEventListener('scroll',()=>{
      if(window.__techniqueClickAt&&!window.__techniqueScrollAt){
        window.__techniqueScrollAt=performance.now();
      }
    });
  });
  await page.locator('#detail-progression-toggle').click();
  await expect(page.locator('#detail-progression-toggle')).toHaveAttribute('aria-expanded','true');
  await page.waitForFunction(()=>window.__techniqueScrollAt>0,null,{polling:'raf',timeout:180});
  const scrollDelay=await page.evaluate(()=>window.__techniqueScrollAt-window.__techniqueClickAt);
  expect(scrollDelay).toBeLessThan(180);
  await expect.poll(()=>page.evaluate(()=>{
    const scroll=document.querySelector('#exerciseScroll').getBoundingClientRect();
    const card=document.querySelector('#detail-progression-toggle').closest('.detail-card').getBoundingClientRect();
    return Math.round(card.bottom-scroll.bottom);
  }),{timeout:1500}).toBeLessThanOrEqual(-12);
});

test('finish-early hands timer to rest without exposing two full stages',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('dailyMotionState.v3',JSON.stringify({
      version:3,
      settings:{countdownSeconds:0,restSeconds:15,sound:false,autoNext:true,theme:'system'},
      programVersions:{morning:'morning-v3-active-2026-09-19'},
      days:{}
    }));
  });
  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  await page.locator('#nextButton').click();
  await expect(page.locator('#timerCard')).toBeVisible();

  await page.locator('#executionFinishEarly').evaluate(button=>button.click());
  await expect(page.locator('#executionOverlay')).toHaveAttribute('data-stage','rest');
  await expect(page.locator('#executionRestStage')).toBeVisible();
  await expect(page.locator('#timerCard')).toBeHidden();

  await page.waitForTimeout(320);
  const visibleStages=await page.locator('.execution-stage').evaluateAll(nodes=>
    nodes.filter(node=>!node.hidden&&getComputedStyle(node).display!=='none').map(node=>node.id)
  );
  expect(visibleStages).toEqual(['executionRestStage']);
});

test('rest skip hands through countdown before starting the next timer',async({page})=>{
  const time=new Date('2026-09-22T08:00:00+05:00');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.clock.install({time});
  await page.clock.pauseAt(new Date(time.getTime()+1000));
  await page.addInitScript(()=>{
    localStorage.setItem('dailyMotionState.v3',JSON.stringify({
      version:3,
      settings:{countdownSeconds:3,restSeconds:15,sound:false,autoNext:true,theme:'system'},
      programVersions:{morning:'morning-v3-active-2026-09-19'},
      days:{}
    }));
  });
  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  await expectSwup(page);
  await page.clock.runFor(32);
  await page.locator('#nextButton').evaluate(button=>button.click());
  await expect(page.locator('#executionOverlay')).toHaveAttribute('data-stage','countdown');
  await expect(page.locator('#executionCountdownStage')).toBeVisible();
  await expect(page.locator('#timerCard')).toBeHidden();

  await page.clock.runFor(1000);
  await expect(page.locator('#countdownValue')).toHaveText('2');
  await page.clock.runFor(1000);
  await expect(page.locator('#countdownValue')).toHaveText('1');
  await page.clock.runFor(1000);
  await expect(page.locator('#countdownValue')).toHaveText('Старт');
  // The launch label is held for 160ms before handing off to the timer.
  await page.clock.runFor(200);
  await expect(page.locator('#timerCard')).toBeVisible();
  await page.locator('#executionFinishEarly').evaluate(button=>button.click());
  await expect(page.locator('#executionRestStage')).toBeVisible();
  await page.locator('#restSkip').evaluate(button=>button.click());

  await expect(page.locator('#headerProgress')).toHaveText('2 / 9');
  await expect(page.locator('#executionOverlay')).toHaveAttribute('data-stage','countdown');
  await expect(page.locator('#executionCountdownStage')).toBeVisible();
  await expect(page.locator('#executionRestStage')).toBeHidden();
  await expect(page.locator('#timerCard')).toBeHidden();

  await page.clock.runFor(3200);
  await expect(page.locator('#timerCard')).toBeVisible();
  await expect(page.locator('#executionCountdownStage')).toBeHidden();
  await expect(page.locator('#timerState')).toHaveText('Идёт');
});

test('finish-early ignores a simultaneous close until the rest handoff is stable',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('dailyMotionState.v3',JSON.stringify({
      version:3,
      settings:{countdownSeconds:0,restSeconds:15,sound:false,autoNext:true,theme:'system'},
      programVersions:{morning:'morning-v3-active-2026-09-19'},
      days:{}
    }));
  });
  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  await page.locator('#nextButton').click();
  await expect(page.locator('#timerCard')).toBeVisible();

  await page.locator('#executionFinishEarly').evaluate(button=>button.click());
  await page.waitForTimeout(35);
  await page.locator('#executionClose').evaluate(button=>button.click());

  await expect(page.locator('#executionOverlay')).toHaveAttribute('data-stage','rest');
  await expect(page.locator('#executionOverlay')).toHaveAttribute('aria-hidden','false');
  await expect(page.locator('#executionRestStage')).toBeVisible();
  await expect(page.locator('#timerCard')).toBeHidden();
});

test('rest actions match their result',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('dailyMotionState.v3',JSON.stringify({
      version:3,
      settings:{countdownSeconds:0,restSeconds:15,sound:false,autoNext:true,theme:'system'},
      programVersions:{morning:'morning-v3-active-2026-09-19'},
      days:{}
    }));
  });
  await page.goto('/session.html?routine=morning',{waitUntil:'domcontentloaded'});
  await page.locator('#nextButton').click();
  await page.locator('#executionFinishEarly').evaluate(button=>button.click());
  await expect(page.locator('#executionRestStage')).toBeVisible();
  await expect(page.locator('#restSkip')).toHaveText('Начать следующее');
  await expect(page.locator('#restTechnique')).toHaveText('Посмотреть технику');

  await page.locator('#restSkip').evaluate(button=>button.click());
  await expect(page.locator('#headerProgress')).toHaveText('2 / 9');
  await expect(page.locator('#executionOverlay')).toHaveAttribute('aria-hidden','false');
  await expect(page.locator('#timerCard')).toBeVisible();
  await expect(page.locator('#timerState')).toHaveText('Идёт');
});

test('final timer hands off directly to completion without exposing technique',async({page})=>{
  await page.addInitScript(()=>{
    const now=new Date();
    const key=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    localStorage.setItem('dailyMotionState.v3',JSON.stringify({
      version:3,
      settings:{countdownSeconds:0,restSeconds:0,sound:false,autoNext:false,theme:'system'},
      programVersions:{morning:'morning-v3-active-2026-09-19'},
      days:{
        [key]:{routines:{morning:{
          step:8,completedUntil:8,completed:false,startedAt:new Date().toISOString(),completedAt:null,
          activeSeconds:120,effort:null,timers:{}
        }}}
      }
    }));
  });

  await page.goto('/session.html?routine=morning&resume=1',{waitUntil:'domcontentloaded'});
  await page.locator('#nextButton').evaluate(button=>button.click());
  await expect(page.locator('#executionOverlay')).toHaveAttribute('aria-hidden','false');

  await page.locator('#executionFinishEarly').evaluate(button=>button.click());
  await expect(page.locator('#completionOverlay')).toHaveAttribute('aria-hidden','false',{timeout:1500});
  await expect(page.locator('#executionOverlay')).toHaveAttribute('aria-hidden','true',{timeout:1500});
  await expect(page.locator('#executionOverlay')).not.toHaveClass(/is-visible/,{timeout:1500});
  await expect(page.locator('.exercise-app')).toHaveAttribute('inert','');
  await expect(page.locator('#completionTitle')).toBeVisible();
});
