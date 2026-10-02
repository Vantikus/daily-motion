(() => {
  const pages=window.DailyMotionPages||{};
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const pageExit=.08;
  const pageEnter=.18;
  let unmountCurrent=null;
  let swup=null;
  let backHandlerInstalled=false;
  let backPending=false;

  const currentContainer=()=>document.querySelector('#swup');
  const currentPage=()=>currentContainer()?.dataset.page||'';
  const isAppleMobileWebKit=()=>/iP(?:hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const canUseNativePageTransition=()=>Boolean(document.startViewTransition)&&!reducedMotion.matches&&!isAppleMobileWebKit();

  const clearPageState=()=>{
    document.documentElement.classList.remove('app-ready','session-ready');
    document.body.classList.remove('settings-open','modal-open');
  };

  const clearPageMotion=()=>{
    const container=currentContainer();
    if(!container)return;
    window.gsap?.killTweensOf?.(container);
    window.gsap?.set?.(container,{clearProps:'opacity,transform,willChange'});
  };

  const unmountPage=()=>{
    if(typeof unmountCurrent==='function'){
      try{unmountCurrent();}catch(error){console.error('[Daily Motion] page cleanup failed',error);}
    }
    unmountCurrent=null;
    clearPageMotion();
    clearPageState();
  };

  const mountPage=()=>{
    clearPageMotion();
    clearPageState();
    const page=currentPage();
    const mount=pages[page];
    if(typeof mount!=='function')return;
    try{
      const cleanup=mount();
      unmountCurrent=typeof cleanup==='function'?cleanup:null;
    }catch(error){
      console.error(`[Daily Motion] failed to mount ${page}`,error);
      unmountCurrent=null;
    }
  };

  const fallbackNavigate=(href,{replace=false}={})=>{
    const url=new URL(href,location.href).href;
    if(replace)location.replace(url);
    else location.assign(url);
  };

  const fallbackBack=(fallback='index.html')=>{
    fallbackNavigate(fallback,{replace:true});
  };

  const installBackHandler=()=>{
    if(backHandlerInstalled)return;
    backHandlerInstalled=true;
    document.addEventListener('click',event=>{
      const link=event.target.closest?.('a[data-nav-back][href]');
      if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      window.DailyMotionBack?.(link.getAttribute('href')||'index.html');
    },true);
  };

  const runTween=(phase,{from,to,duration,ease})=>{
    const container=currentContainer();
    if(!container||!window.gsap||reducedMotion.matches||swup?.visit?.animation.native)return Promise.resolve();
    window.gsap.killTweensOf(container);
    container.style.willChange='opacity, transform';
    if(phase==='in')window.gsap.set(container,from);
    return new Promise(resolve=>{
      window.gsap.to(container,{
        ...to,
        force3D:true,
        duration,
        ease,
        overwrite:true,
        onInterrupt:resolve,
        onComplete:()=>{
          if(phase==='in')window.gsap.set(container,{clearProps:'opacity,transform,willChange'});
          resolve();
        }
      });
    });
  };

  const transition=(outMotion,inMotion)=>({
    from:'(.*)',
    to:'(.*)',
    out:()=>runTween('out',outMotion),
    in:()=>runTween('in',inMotion)
  });

  const pageAnimations=[
    {
      from:'(.*)',
      to:'completion-home',
      out:()=>runTween('out',{from:{},to:{opacity:0,y:-2},duration:pageExit,ease:'power2.in'}),
      in:()=>runTween('in',{from:{opacity:0,y:4},to:{opacity:1,y:0},duration:pageEnter,ease:'power2.out'})
    },
    {
      from:'(.*)',
      to:'workout',
      out:()=>runTween('out',{from:{},to:{opacity:0,y:-3},duration:pageExit,ease:'power2.in'}),
      in:()=>runTween('in',{from:{opacity:0,y:6},to:{opacity:1,y:0},duration:pageEnter+.02,ease:'power2.out'})
    },
    {
      from:'(.*)',
      to:'back-home',
      out:()=>runTween('out',{from:{},to:{opacity:0,y:3},duration:pageExit,ease:'power2.in'}),
      in:()=>runTween('in',{from:{opacity:0,y:-4},to:{opacity:1,y:0},duration:pageEnter,ease:'power2.out'})
    },
    {
      from:'(.*)',
      to:'progress',
      out:()=>runTween('out',{from:{},to:{opacity:0,y:-2},duration:pageExit,ease:'power2.in'}),
      in:()=>runTween('in',{from:{opacity:0,y:4},to:{opacity:1,y:0},duration:pageEnter,ease:'power2.out'})
    },
    transition(
      {from:{},to:{opacity:0,y:-2},duration:pageExit,ease:'power2.in'},
      {from:{opacity:0,y:4},to:{opacity:1,y:0},duration:pageEnter,ease:'power2.out'}
    )
  ];

  const SWUP_RUNTIME=[
    ['Swup','/vendor/swup/swup-4.10.0.js'],
    ['SwupPreloadPlugin','/vendor/swup/preload-3.2.12.js'],
    ['SwupHeadPlugin','/vendor/swup/head-2.3.1.js'],
    ['SwupBodyClassPlugin','/vendor/swup/body-class-3.3.0.js'],
    ['SwupA11yPlugin','/vendor/swup/a11y-5.2.1.js'],
    ['SwupJsPlugin','/vendor/swup/js-3.2.0.js'],
    ['SwupScrollPlugin','/vendor/swup/scroll-4.0.0.js']
  ];
  const requiredGlobals=SWUP_RUNTIME.map(([name])=>name);
  let runtimePromise=null;

  const pluginsReady=()=>requiredGlobals.every(name=>typeof window[name]==='function')&&Boolean(window.gsap);

  const loadRuntimeScript=([name,src])=>{
    if(typeof window[name]==='function')return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      const timeout=setTimeout(()=>{
        script.remove();
        reject(new Error(`${name} timed out`));
      },6000);
      const finish=callback=>{
        clearTimeout(timeout);
        script.onload=null;
        script.onerror=null;
        callback();
      };
      script.src=src;
      script.crossOrigin='anonymous';
      script.dataset.dmSwupRuntime=name;
      script.onload=()=>finish(()=>typeof window[name]==='function'
        ?resolve()
        :reject(new Error(`${name} loaded without its expected global`)));
      script.onerror=()=>finish(()=>reject(new Error(`${name} failed to load`)));
      document.head.append(script);
    });
  };

  const preloadLikelyRoutes=()=>{
    if(!swup?.preload||currentPage()!=='home')return;
    swup.preload('/session.html?routine=morning&resume=1').catch(()=>{});
  };

  const installSwup=()=>{
    if(swup||!pluginsReady())return false;

    try{
      swup=new window.Swup({
        containers:['#swup'],
        animationSelector:false,
        animateHistoryBrowsing:true,
        cache:true,
        native:true,
        timeout:8000,
        linkSelector:'a[href]:not([data-no-swup]):not([data-nav-back])',
        plugins:[
          new window.SwupPreloadPlugin({throttle:3}),
          new window.SwupHeadPlugin(),
          new window.SwupBodyClassPlugin(),
          new window.SwupA11yPlugin({
            respectReducedMotion:true,
            announcements:{
              visit:'Открыта страница: {title}',
              url:'Новая страница: {url}'
            }
          }),
          new window.SwupJsPlugin({animations:pageAnimations}),
          new window.SwupScrollPlugin({animateScroll:false})
        ]
      });
    }catch(error){
      console.error('[Daily Motion] Swup initialization failed; using native navigation',error);
      swup=null;
      return false;
    }

    window.DailyMotionNavigate=(href,{replace=false,animation}={})=>{
      const url=new URL(href,location.href);
      if(url.origin!==location.origin){location.assign(url.href);return;}
      if(swup.navigating&&swup.visit.to.url+swup.visit.to.hash===url.pathname+url.search+url.hash)return;
      swup.navigate(url.pathname+url.search+url.hash,{
        history:replace?'replace':'push',
        animation
      });
    };

    window.DailyMotionBack=(fallback='index.html')=>{
      if(backPending)return;
      const state=history.state;
      if(state?.source==='swup'&&Number(state.index)>1){
        backPending=true;
        history.back();
        return;
      }
      window.DailyMotionNavigate(fallback,{replace:true,animation:'back-home'});
    };

    const finishTransition=()=>{
      backPending=false;
      document.documentElement.classList.remove('dm-page-transition','dm-page-back');
      clearPageMotion();
    };

    swup.hooks.on('visit:start',visit=>{
      visit.animation.wait=true;
      visit.animation.native=canUseNativePageTransition();
      document.documentElement.classList.toggle('dm-page-transition',visit.animation.native);
      document.documentElement.classList.toggle('dm-page-back',visit.animation.name==='back-home'||(visit.history.popstate&&visit.history.direction==='backwards'));
      if(visit.history.popstate&&visit.history.direction==='backwards'){
        visit.animation.name='back-home';
      }
    });

    swup.hooks.on('fetch:error',visit=>{
      clearPageMotion();
      location.assign(new URL(visit.to.url,location.href).href);
    });

    swup.hooks.before('content:replace',()=>unmountPage());
    swup.hooks.on('content:replace',()=>mountPage());
    swup.hooks.on('page:view',()=>preloadLikelyRoutes());
    swup.hooks.on('visit:end',finishTransition);
    swup.hooks.on('visit:abort',finishTransition);
    swup.hooks.on('animation:skip',()=>clearPageMotion());

    preloadLikelyRoutes();
    return true;
  };

  const ensureSwup=()=>{
    if(swup)return Promise.resolve(true);
    if(runtimePromise)return runtimePromise;
    runtimePromise=(async()=>{
      try{
        await Promise.all(SWUP_RUNTIME.map(loadRuntimeScript));
        return installSwup();
      }catch(error){
        console.warn('[Daily Motion] Swup runtime unavailable; native navigation remains active',error);
        return false;
      }finally{
        if(!swup)runtimePromise=null;
      }
    })();
    return runtimePromise;
  };

  let pendingNavigation=null;
  const navigateWhenReady=(href,options={})=>{
    const request={href,options};
    pendingNavigation=request;
    return ensureSwup().then(ready=>{
      if(pendingNavigation!==request)return;
      pendingNavigation=null;
      if(ready)window.DailyMotionNavigate(href,options);
      else fallbackNavigate(href,options);
    });
  };

  // Keep a first tap in this document while local navigation scripts finish.
  document.addEventListener('click',event=>{
    if(swup||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const link=event.target.closest?.('a[href]:not([data-no-swup]):not([data-nav-back]):not([download])');
    if(!link||link.target&&link.target!=='_self')return;
    const url=new URL(link.href,location.href);
    if(url.origin!==location.origin||!/(?:index|session|progress).html$/.test(url.pathname))return;
    event.preventDefault();
    navigateWhenReady(url.pathname+url.search+url.hash);
  },true);

  window.DailyMotionNavigate=navigateWhenReady;
  window.DailyMotionBack=fallbackBack;
  installBackHandler();
  mountPage();
  ensureSwup();
  window.addEventListener('online',()=>{if(!swup)ensureSwup();},{passive:true});
})();
