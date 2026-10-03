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

test.describe('unavailable local runtime',()=>{
  test.use({serviceWorkers:'block'});
test('native navigation remains usable when the Swup runtime cannot load',async({page})=>{
  await page.route('**/vendor/swup/**',route=>route.abort());
  await page.goto('/index.html');
  const token=await page.evaluate(()=>window.__fallbackToken=crypto.randomUUID());
  await page.locator('a[href="progress.html"]').click();
  await expect(page.locator('#historyCalendar')).toBeVisible();
  expect(await page.evaluate(()=>window.__fallbackToken)).not.toBe(token);
});
});

for(const native of [true,false]){
  test(`rapid interrupted visits settle with ${native?'browser snapshots':'fallback animation'}`,async({page})=>{
    await page.addInitScript(native=>{
      if(!native)document.startViewTransition=undefined;
      window.__snapshots=0;
      if(document.startViewTransition){
        const start=document.startViewTransition.bind(document);
        document.startViewTransition=(...args)=>{window.__snapshots++;return start(...args);};
      }
    },native);
    await page.goto('/index.html');
    await expectSwup(page);
    const token=await page.evaluate(()=>window.__rapidToken=crypto.randomUUID());
    await page.evaluate(()=>{
      DailyMotionNavigate('progress.html',{animation:'progress'});
      setTimeout(()=>DailyMotionNavigate('session.html?routine=morning&resume=1',{animation:'workout'}),30);
    });
    await expect(page.locator('#exerciseTitle')).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/is-changing|dm-page-transition/);
    await expect(page.locator('#swup')).toHaveCSS('opacity','1');
    expect(await page.evaluate(()=>window.__rapidToken)).toBe(token);
    if(native&&await page.evaluate(()=>Boolean(document.startViewTransition))){
      expect(await page.evaluate(()=>window.__snapshots)).toBeGreaterThan(0);
    }
    await page.evaluate(()=>{DailyMotionBack();DailyMotionBack();});
    await expect(page).not.toHaveURL(/session\.html/);
    await expect(page.locator('html')).not.toHaveClass(/is-changing|dm-page-transition/);
    await expect(page.locator('#swup')).toHaveCSS('opacity','1');
    expect(await page.evaluate(()=>window.__rapidToken)).toBe(token);
  });
}

test('local navigation works when external scripts are blocked',async({page})=>{
  await page.route('https://**',route=>route.abort());
  await page.goto('/index.html');
  await expectSwup(page);
  const token=await page.evaluate(()=>window.__localToken=crypto.randomUUID());
  await page.locator('a[href="progress.html"]').click();
  await expect(page.locator('#historyCalendar')).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/is-changing|dm-page-transition/);
  expect(await page.evaluate(()=>window.__localToken)).toBe(token);
});

test('iPhone page motion uses two transform surfaces plus a lightweight depth scrim',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'userAgent',{configurable:true,get:()=>
      'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1'
    });
    Object.defineProperty(navigator,'platform',{configurable:true,get:()=> 'iPhone'});
    window.__dmPageAnimations=[];
    const animate=Element.prototype.animate;
    Element.prototype.animate=function(keyframes,options){
      if(this.matches?.('#swup,.dm-page-ghost,.dm-page-depth')){
        window.__dmPageAnimations.push({
          kind:this.id==='swup'?'incoming':this.classList.contains('dm-page-depth')?'depth':'outgoing',
          page:this.id==='swup'?this.dataset.page||'':'',
          keyframes:Array.from(keyframes,frame=>({...frame})),
          options:{...options}
        });
      }
      return animate.call(this,keyframes,options);
    };
  });
  await page.goto('/index.html');
  await expectSwup(page);

  const assertMotion=async({destination,direction})=>{
    const calls=await page.evaluate(()=>window.__dmPageAnimations);
    const incoming=calls.find(call=>call.kind==='incoming');
    const outgoing=calls.find(call=>call.kind==='outgoing');
    const depth=calls.find(call=>call.kind==='depth');
    expect(incoming?.page).toBe(destination);
    expect(incoming?.keyframes.every(frame=>frame.transform&&!('opacity' in frame))).toBe(true);
    expect(outgoing?.keyframes.every(frame=>frame.transform&&!('opacity' in frame))).toBe(true);
    expect(depth?.keyframes.every(frame=>'opacity' in frame&&!('transform' in frame))).toBe(true);
    expect(incoming?.options.duration).toBe(direction==='forward'?360:340);
    expect(outgoing?.options.duration).toBe(direction==='forward'?360:340);
    expect(depth?.options.duration).toBe(direction==='forward'?360:340);
    expect(incoming?.keyframes[0].transform).toContain(direction==='forward'?'100%':'-22%');
    expect(outgoing?.keyframes.at(-1).transform).toContain(direction==='forward'?'-22%':'100%');
    expect(depth?.keyframes.map(frame=>Number(frame.opacity))).toEqual(direction==='forward'?[0,1]:[1,0]);
  };

  await page.evaluate(()=>{
    window.__dmPageAnimations=[];
    DailyMotionNavigate('progress.html',{animation:'progress'});
  });
  await expect(page.locator('#historyCalendar')).toBeVisible();
  await assertMotion({destination:'progress',direction:'forward'});

  await page.evaluate(()=>{
    window.__dmPageAnimations=[];
    DailyMotionBack();
  });
  await expect(page.locator('#todayCard')).toBeVisible();
  await assertMotion({destination:'home',direction:'back'});
});

test('iPhone navigation uses the compositor fallback instead of page snapshots',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'userAgent',{configurable:true,get:()=>
      'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1'
    });
    Object.defineProperty(navigator,'platform',{configurable:true,get:()=> 'iPhone'});
    window.__snapshots=0;
    const start=document.startViewTransition?.bind(document);
    if(start){
      document.startViewTransition=(...args)=>{window.__snapshots++;return start(...args);};
    }
  });
  await page.goto('/index.html');
  await expectSwup(page);
  const token=await page.evaluate(()=>window.__iosFallbackToken=crypto.randomUUID());
  await page.evaluate(()=>DailyMotionNavigate('progress.html',{animation:'progress'}));
  await expect(page.locator('#historyCalendar')).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/is-changing|dm-page-transition/);
  await expect(page.locator('#swup')).toHaveCSS('opacity','1');
  expect(await page.evaluate(()=>window.__iosFallbackToken)).toBe(token);
  expect(await page.evaluate(()=>window.__snapshots)).toBe(0);
});

test('reduced motion skips page snapshots',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>{
    window.__snapshots=0;
    if(document.startViewTransition){
      const start=document.startViewTransition.bind(document);
      document.startViewTransition=(...args)=>{window.__snapshots++;return start(...args);};
    }
  });
  await page.goto('/index.html');
  await expectSwup(page);
  await page.locator('a[href="progress.html"]').click();
  await expect(page.locator('#historyCalendar')).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/is-changing|dm-page-transition/);
  expect(await page.evaluate(()=>window.__snapshots)).toBe(0);
});


test('a first tap waits for local navigation instead of reloading the document',async({page})=>{
  await page.route('**/vendor/swup/**',async route=>{
    await new Promise(resolve=>setTimeout(resolve,350));
    await route.continue();
  });
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  const token=await page.evaluate(()=>window.__firstTapToken=crypto.randomUUID());
  await page.locator('a[href="progress.html"]').evaluate(link=>link.click());
  await expect(page.locator('#historyCalendar')).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/is-changing|dm-page-transition/);
  expect(await page.evaluate(()=>window.__firstTapToken)).toBe(token);
});


test('the incoming workout snapshot contains visible exercise content',async({page})=>{
  await page.addInitScript(()=>{
    const start=document.startViewTransition?.bind(document);
    if(!start)return;
    document.startViewTransition=(...args)=>{
      const transition=start(...args);
      transition.ready.then(()=>{
        const title=document.querySelector('#exerciseTitle');
        window.__incomingSnapshot={title:title?.textContent,opacity:title?getComputedStyle(title).opacity:null};
      });
      return transition;
    };
  });
  await page.goto('/index.html');
  test.skip(!await page.evaluate(()=>Boolean(document.startViewTransition)),'browser snapshots are unavailable');
  await expectSwup(page);
  await page.evaluate(()=>DailyMotionNavigate('session.html?routine=morning&resume=1',{animation:'workout'}));
  await expect.poll(()=>page.evaluate(()=>window.__incomingSnapshot?.title)).toBeTruthy();
  expect(await page.evaluate(()=>window.__incomingSnapshot.opacity)).toBe('1');
  await expect(page.locator('html')).not.toHaveClass(/dm-page-transition/);
});
