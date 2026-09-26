(() => {
  const pages=window.DailyMotionPages||{};
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionTokens=window.DailyMotionMotion?.tokens||{};
  const pageExit=(motionTokens.exitMs||140)/1000;
  const pageEnter=(motionTokens.enterMs||220)/1000;
  let unmountCurrent=null;
  let swup=null;
  let backHandlerInstalled=false;

  const currentContainer=()=>document.querySelector('#swup');
  const currentPage=()=>currentContainer()?.dataset.page||'';

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
    if(!container||!window.gsap||reducedMotion.matches)return Promise.resolve();
    window.gsap.killTweensOf(container);
    container.style.willChange='opacity, transform';
    if(phase==='in')window.gsap.set(container,from);
    return new Promise(resolve=>{
      window.gsap.to(container,{
        ...to,
        duration,
        ease,
        overwrite:true,
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
      in:()=>runTween('in',{from:{opacity:0,y:4},to:{opacity:1,y:0},duration:pageEnter,ease:'power3.out'})
    },
    {
      from:'(.*)',
      to:'workout',
      out:()=>runTween('out',{from:{},to:{opacity:0,y:-3},duration:pageExit,ease:'power2.in'}),
      in:()=>runTween('in',{from:{opacity:0,y:6},to:{opacity:1,y:0},duration:pageEnter+.02,ease:'power3.out'})
    },
    {
      from:'(.*)',
      to:'back-home',
      out:()=>runTween('out',{from:{},to:{opacity:0,y:3},duration:pageExit,ease:'power2.in'}),
      in:()=>runTween('in',{from:{opacity:0,y:-4},to:{opacity:1,y:0},duration:pageEnter,ease:'power3.out'})
    },
    {
      from:'(.*)',
      to:'progress',
      out:()=>runTween('out',{from:{},to:{opacity:0,y:-2},duration:pageExit,ease:'power2.in'}),
      in:()=>runTween('in',{from:{opacity:0,y:4},to:{opacity:1,y:0},duration:pageEnter,ease:'power3.out'})
    },
    transition(
      {from:{},to:{opacity:0,y:-2},duration:pageExit,ease:'power2.in'},
      {from:{opacity:0,y:4},to:{opacity:1,y:0},duration:pageEnter,ease:'power3.out'}
    )
  ];

  const SWUP_RUNTIME=[
    ['Swup','https://unpkg.com/swup@4.10.0/dist/Swup.umd.js'],
    ['SwupPreloadPlugin','https://unpkg.com/@swup/preload-plugin@3.2.12/dist/index.umd.js'],
    ['SwupHeadPlugin','https://unpkg.com/@swup/head-plugin@2.3.1/dist/index.umd.js'],
    ['SwupBodyClassPlugin','https://unpkg.com/@swup/body-class-plugin@3.3.0/dist/index.umd.js'],
    ['SwupA11yPlugin','https://unpkg.com/@swup/a11y-plugin@5.2.1/dist/index.umd.js'],
    ['SwupJsPlugin','https://unpkg.com/@swup/js-plugin@3.2.0/dist/index.umd.js'],
    ['SwupScrollPlugin','https://unpkg.com/@swup/scroll-plugin@4.0.0/dist/index.umd.js']
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
        native:false,
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

    window.DailyMotionSwup=swup;

    window.DailyMotionNavigate=(href,{replace=false,animation}={})=>{
      const url=new URL(href,location.href);
      if(url.origin!==location.origin){location.assign(url.href);return;}
      swup.navigate(url.pathname+url.search+url.hash,{
        history:replace?'replace':'push',
        animation
      });
    };

    window.DailyMotionBack=(fallback='index.html')=>{
      const state=history.state;
      if(state?.source==='swup'&&Number(state.index)>1){
        history.back();
        return;
      }
      window.DailyMotionNavigate(fallback,{replace:true,animation:'back-home'});
    };

    swup.hooks.on('visit:start',visit=>{
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
    swup.hooks.on('visit:abort',()=>clearPageMotion());
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

  window.DailyMotionNavigate=fallbackNavigate;
  window.DailyMotionBack=fallbackBack;
  installBackHandler();
  mountPage();
  ensureSwup();
  window.addEventListener('online',()=>{if(!swup)ensureSwup();},{passive:true});
})();
