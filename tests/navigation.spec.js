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

for(const native of [true,false]){
  test(`iPhone navigation preserves the document with ${native?'native transitions':'the fallback'}`,async({page})=>{
    await page.addInitScript(native=>{
      Object.defineProperty(navigator,'userAgent',{configurable:true,get:()=> 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile Safari/604.1'});
      Object.defineProperty(navigator,'platform',{configurable:true,get:()=> 'iPhone'});
      if(!native)document.startViewTransition=undefined;
      window.__snapshots=0;
      window.__nativeSupported=Boolean(document.startViewTransition);
      const start=document.startViewTransition?.bind(document);
      if(start)document.startViewTransition=(...args)=>{window.__snapshots++;return start(...args);};
    },native);
    await page.goto('/index.html');
    await expectSwup(page);
    const token=await page.evaluate(()=>window.__navigationToken=crypto.randomUUID());
    await page.locator('a[href="progress.html"]').click();
    await expect(page.locator('#historyCalendar')).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/is-changing|dm-page-transition|dm-page-fallback/);
    expect(await page.evaluate(()=>window.__navigationToken)).toBe(token);
    const result=await page.evaluate(()=>({supported:window.__nativeSupported,count:window.__snapshots}));
    expect(result.count).toBe(result.supported?1:0);
    await expect(page.locator('#swup')).toHaveCSS('opacity','1');
    await expect(page.locator('#swup')).toHaveCSS('transform','none');
    await expect(page.locator('.dm-page-ghost,.dm-page-depth')).toHaveCount(0);
    await page.goBack();
    await expect(page.locator('#todayCard')).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/is-changing|dm-page-transition|dm-page-fallback/);
    expect(await page.evaluate(()=>window.__navigationToken)).toBe(token);
  });
}

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
  test(`${mode} forward and back preserve state and release the screen`,async({page})=>{
    await page.setViewportSize({width:mode==='standalone'?1024:390,height:844});
    await page.addInitScript(mode=>{
      if(mode==='android'){
        Object.defineProperty(navigator,'userAgent',{configurable:true,get:()=> 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/151.0 Mobile Safari/537.36'});
        Object.defineProperty(navigator,'platform',{configurable:true,get:()=> 'Linux armv8l'});
      }
      if(mode==='standalone')Object.defineProperty(navigator,'standalone',{configurable:true,value:true});
    },mode);
    await page.goto('/index.html');
    await expectSwup(page);
    await page.evaluate(()=>DailyMotionTheme.apply('dark'));
    const token=await page.evaluate(()=>window.__mobileVisitToken=crypto.randomUUID());
    await page.evaluate(()=>DailyMotionNavigate('session.html?routine=morning&resume=1'));
    await expect(page.locator('#exerciseTitle')).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/is-changing|dm-page-transition|dm-page-fallback/);
    await expect(page.locator('#swup')).toHaveCSS('transform','none');
    await expect(page.locator('#nextButton')).toBeVisible();
    const nav=await page.locator('.session-nav').boundingBox();
    expect(nav.y+nav.height).toBeLessThanOrEqual(845);
    await page.locator('[data-nav-back]').click();
    await expect(page.locator('#todayCard')).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/is-changing|dm-page-transition|dm-page-fallback/);
    expect(await page.evaluate(()=>window.__mobileVisitToken)).toBe(token);
    await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    await expect(page.locator('.dm-page-ghost,.dm-page-depth')).toHaveCount(0);
    await expect(page.locator('#swup')).not.toHaveAttribute('inert');
    await expect(page.locator('#swup')).toHaveCSS('transform','none');
    await page.locator('#settingsBtn').click();
    await expect(page.locator('#settingsOverlay')).toHaveAttribute('aria-hidden','false');
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
