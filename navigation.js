(() => {
  const pages=window.DailyMotionPages||{};
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
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
    const state=history.state;
    if(state?.source==='swup'&&Number(state.index)>1){history.back();return;}
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
      out:()=>runTween('out',{from:{},to:{opacity:0,y:-5,scale:.995},duration:.16,ease:'power2.in'}),
      in:()=>runTween('in',{from:{opacity:0,y:7,scale:.995},to:{opacity:1,y:0,scale:1},duration:.24,ease:'power3.out'})
    },
    {
      from:'(.*)',
      to:'workout',
      out:()=>runTween('out',{from:{},to:{opacity:0,y:-7,scale:.99},duration:.17,ease:'power2.in'}),
      in:()=>runTween('in',{from:{opacity:0,y:11,scale:.986},to:{opacity:1,y:0,scale:1},duration:.28,ease:'power3.out'})
    },
    {
      from:'(.*)',
      to:'back-home',
      out:()=>runTween('out',{from:{},to:{opacity:0,y:7,scale:.99},duration:.16,ease:'power2.in'}),
      in:()=>runTween('in',{from:{opacity:0,y:-7,scale:.992},to:{opacity:1,y:0,scale:1},duration:.25,ease:'power3.out'})
    },
    {
      from:'(.*)',
      to:'progress',
      out:()=>runTween('out',{from:{},to:{opacity:0,y:-3,scale:.996},duration:.15,ease:'power2.in'}),
      in:()=>runTween('in',{from:{opacity:0,y:6,scale:.997},to:{opacity:1,y:0,scale:1},duration:.23,ease:'power3.out'})
    },
    transition(
      {from:{},to:{opacity:0,y:-2},duration:.14,ease:'power2.in'},
      {from:{opacity:0,y:4},to:{opacity:1,y:0},duration:.22,ease:'power3.out'}
    )
  ];

  const requiredGlobals=[
    'Swup','SwupPreloadPlugin','SwupHeadPlugin','SwupBodyClassPlugin',
    'SwupA11yPlugin','SwupJsPlugin','SwupScrollPlugin'
  ];

  const pluginsReady=()=>requiredGlobals.every(name=>typeof window[name]==='function')&&Boolean(window.gsap);

  const preloadLikelyRoutes=()=>{
    if(!swup?.preload)return;
    const page=currentPage();
    const urls=page==='home'
      ? ['/progress.html','/session.html?routine=morning&resume=1']
      : ['/index.html'];
    swup.preload(urls).catch(()=>{});
  };

  const installSwup=()=>{
    if(swup||!pluginsReady())return false;

    const scrollAnimations=reducedMotion.matches?false:{
      betweenPages:false,
      samePageWithHash:true,
      samePage:true
    };

    swup=new window.Swup({
      containers:['#swup'],
      animationSelector:false,
      animateHistoryBrowsing:true,
      cache:true,
      native:false,
      linkSelector:'a[href]:not([data-no-swup]):not([data-nav-back])',
      plugins:[
        new window.SwupPreloadPlugin({
          throttle:3,
          preloadHoveredLinks:true,
          preloadVisibleLinks:false,
          preloadInitialPage:true
        }),
        new window.SwupHeadPlugin({
          awaitAssets:true,
          persistAssets:true
        }),
        new window.SwupBodyClassPlugin(),
        new window.SwupA11yPlugin({
          headingSelector:'h1',
          respectReducedMotion:true,
          announcements:{
            visit:'Открыта страница: {title}',
            url:'Новая страница: {url}'
          }
        }),
        new window.SwupJsPlugin({animations:pageAnimations}),
        new window.SwupScrollPlugin({
          animateScroll:scrollAnimations,
          doScrollingRightAway:false,
          shouldResetScrollPosition:trigger=>!trigger?.matches?.('[data-nav-back]')
        })
      ]
    });

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

  window.DailyMotionNavigate=fallbackNavigate;
  window.DailyMotionBack=fallbackBack;
  installBackHandler();
  mountPage();
  installSwup();
})();
