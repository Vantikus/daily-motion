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
    if(native&&await page.evaluate(()=>Boolean(document.startViewTransition)&&!document.documentElement.classList.contains('dm-apple-mobile')&&!matchMedia('(max-width: 767px), (pointer: coarse), (display-mode: standalone)').matches)){
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

test('iPhone navigation freezes the old page and reveals only after styles and fonts settle',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'userAgent',{configurable:true,get:()=>
      'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1'
    });
    Object.defineProperty(navigator,'platform',{configurable:true,get:()=> 'iPhone'});
    window.__dmPageAnimations=[];
    const animate=Element.prototype.animate;
    Element.prototype.animate=function(keyframes,options){
      if(this.matches?.('#swup,.dm-page-ghost,.dm-page-shield,.exercise-head,#headerProgress')){
        window.__dmPageAnimations.push({
          kind:this.classList.contains('dm-page-shield')?'shield':this.id==='swup'?'page':this.classList.contains('dm-page-ghost')?'ghost':'text',
          keyframes:Array.from(keyframes,frame=>({...frame})),
          options:{...options}
        });
      }
      return animate.call(this,keyframes,options);
    };
  });
  await page.goto('/index.html');
  await expectSwup(page);

  await page.evaluate(()=>{
    window.__dmPageAnimations=[];
    DailyMotionNavigate('session.html?routine=morning&resume=1',{animation:'workout'});
  });
  await expect(page.locator('#exerciseTitle')).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/is-changing|dm-page-freeze|dm-page-stabilize/);
  const calls=await page.evaluate(()=>window.__dmPageAnimations);
  expect(calls.filter(call=>call.kind==='page')).toHaveLength(0);
  expect(calls.filter(call=>call.kind==='ghost')).toHaveLength(0);
  expect(calls.filter(call=>call.kind==='text')).toHaveLength(0);
  expect(calls.filter(call=>call.kind==='shield')).toHaveLength(2);
  await expect(page.locator('html')).not.toHaveClass(/dm-page-freeze|dm-page-stabilize/);
  await expect(page.locator('#swup')).toHaveCSS('transform','none');
  await expect(page.locator('.dm-page-shield')).toHaveCount(0);
  expect(await page.evaluate(()=>document.fonts.check('700 16px "Onest"'))).toBe(true);
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
  await page.setViewportSize({width:1024,height:844});
  test.skip(!await page.evaluate(()=>Boolean(document.startViewTransition)&&!document.documentElement.classList.contains('dm-apple-mobile')&&!matchMedia('(pointer: coarse)').matches),'desktop browser snapshots are unavailable');
  await expectSwup(page);
  await page.evaluate(()=>DailyMotionNavigate('session.html?routine=morning&resume=1',{animation:'workout'}));
  await expect.poll(()=>page.evaluate(()=>window.__incomingSnapshot?.title)).toBeTruthy();
  expect(await page.evaluate(()=>window.__incomingSnapshot.opacity)).toBe('1');
  await expect(page.locator('html')).not.toHaveClass(/dm-page-transition/);
});

test.describe('mobile content motion',()=>{
  // Check painted state, not device GPU throughput; avoid a 3x desktop-sized
  // backing surface when proving standalone routing at a wide viewport.
  test.use({deviceScaleFactor:1});
for(const mode of ['phone','android','standalone']){
  test(`${mode} replaces pages only behind an opaque themed cover and cleans up on back`,async({page})=>{
    await page.setViewportSize({width:mode==='standalone'?1024:390,height:844});
    await page.addInitScript(mode=>{
      if(mode==='android'){
        Object.defineProperty(navigator,'userAgent',{configurable:true,get:()=> 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/151.0 Mobile Safari/537.36'});
        Object.defineProperty(navigator,'platform',{configurable:true,get:()=> 'Linux armv8l'});
      }
      if(mode==='standalone')Object.defineProperty(navigator,'standalone',{configurable:true,value:true});
      window.__coveredReplacements=[];
      window.__mobilePaints=[];
      window.__pageSnapshots=0;
      const start=document.startViewTransition?.bind(document);
      if(start)document.startViewTransition=(...args)=>{window.__pageSnapshots++;return start(...args);};
      document.addEventListener('DOMContentLoaded',()=>{
        new MutationObserver(records=>{
          if(!records.some(record=>Array.from(record.addedNodes).some(node=>node.id==='swup')))return;
          const cover=document.querySelector('.dm-page-shield');
          const surface=document.querySelector('#swup');
          const content=surface.querySelector('.exercise-main,.app-shell');
          const nav=surface.querySelector('.session-nav');
          const frames=[];
          window.__mobilePaints.push(frames);
          const started=performance.now();
          const sample=()=>{
            if(!content.isConnected)return;
            const transform=getComputedStyle(content).transform;
            frames.push({
              x:transform==='none'?0:new DOMMatrixReadOnly(transform).m41,
              cover:cover?.isConnected?Number(getComputedStyle(cover).opacity):0,
              navX:nav?.getBoundingClientRect().x,
              navBottom:nav?.getBoundingClientRect().bottom
            });
            if(performance.now()-started<700)requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
          window.__coveredReplacements.push({
            opacity:cover?getComputedStyle(cover).opacity:null,
            background:cover?getComputedStyle(cover).backgroundColor:null,
            expected:getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
            transform:getComputedStyle(surface).transform,
            ghosts:document.querySelectorAll('.dm-page-ghost').length
          });
        }).observe(document.body,{childList:true});
      });
    },mode);
    await page.goto('/index.html');
    await expectSwup(page);
    await page.evaluate(()=>DailyMotionTheme.apply('dark'));
    const token=await page.evaluate(()=>window.__mobileVisitToken=crypto.randomUUID());
    await page.evaluate(()=>DailyMotionNavigate('session.html?routine=morning&resume=1'));
    await expect(page.locator('#exerciseTitle')).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/is-changing|dm-page-freeze|dm-page-stabilize/);
    await page.waitForTimeout(350);
    await page.evaluate(()=>DailyMotionBack());
    await expect(page.locator('#todayCard')).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/is-changing|dm-page-freeze|dm-page-stabilize/);
    await page.waitForTimeout(350);
    const result=await page.evaluate(()=>({
      records:window.__coveredReplacements,snapshots:window.__pageSnapshots,token:window.__mobileVisitToken,
      paints:window.__mobilePaints,
      animations:document.getAnimations().filter(animation=>animation.effect?.target?.matches?.('.dm-page-shield,#swup,.exercise-main,.app-shell')).length
    }));
    expect(result.token).toBe(token);
    expect(result.snapshots).toBe(0);
    expect(result.records).toHaveLength(2);
    for(const record of result.records){
      expect(record.opacity).toBe('1');
      expect(record.background).toBe('rgb(16, 22, 18)');
      expect(record.transform).toBe('none');
      expect(record.ghosts).toBe(0);
    }
    expect(result.animations).toBe(0);
    expect(result.paints).toHaveLength(2);
    for(const [index,frames] of result.paints.entries()){
      // Prove the content actually moves while uncovered, in both directions.
      const moving=frames.filter(frame=>frame.cover<.1&&Math.abs(frame.x)>2);
      expect(moving.length,JSON.stringify(frames)).toBeGreaterThan(0);
      expect(moving.every(frame=>index===0?frame.x>0:frame.x<0)).toBe(true);
      expect(Math.abs(frames.at(-1).x)).toBeLessThan(.1);
      const fixed=frames.filter(frame=>frame.navBottom!==undefined);
      if(fixed.length){
        expect(Math.max(...fixed.map(frame=>frame.navX))-Math.min(...fixed.map(frame=>frame.navX))).toBeLessThan(.1);
        expect(Math.max(...fixed.map(frame=>frame.navBottom))-Math.min(...fixed.map(frame=>frame.navBottom))).toBeLessThan(.1);
      }
    }
    await expect(page.locator('.dm-page-shield')).toHaveCount(0);
    await expect(page.locator('#swup')).not.toHaveAttribute('inert');
  });
}
});

test('desktop fallback releases filled animations after the visit',async({page,browserName})=>{
  test.skip(browserName!=='chromium','desktop compositor fallback');
  await page.setViewportSize({width:1024,height:844});
  await page.addInitScript(()=>{document.startViewTransition=undefined;});
  await page.goto('/index.html');
  await expectSwup(page);
  const token=await page.evaluate(()=>window.__desktopFallbackToken=crypto.randomUUID());
  await page.evaluate(()=>DailyMotionNavigate('progress.html'));
  await expect(page.locator('#historyCalendar')).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/is-changing|dm-page-fallback/);
  await expect(page.locator('#swup')).toHaveCSS('transform','none');
  await expect(page.locator('.dm-page-ghost,.dm-page-depth')).toHaveCount(0);
  expect(await page.evaluate(()=>document.querySelector('#swup').getAnimations().length)).toBe(0);
  expect(await page.evaluate(()=>window.__desktopFallbackToken)).toBe(token);
});
