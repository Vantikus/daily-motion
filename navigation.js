(() => {
  const pages=window.DailyMotionPages||{};
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const pageDuration={forward:.36,back:.34};
  const pageEase='cubic-bezier(.3,.5,.3,1)';
  const appleShieldDuration={cover:80,reveal:140};
  const appleShieldEase={
    cover:'cubic-bezier(.3,0,.35,1)',
    reveal:'cubic-bezier(.2,.72,.22,1)'
  };
  const pageMotion={
    forward:{incomingX:'100%',outgoingX:'-22%',incomingAbove:true},
    back:{incomingX:'-22%',outgoingX:'100%',incomingAbove:false}
  };
  const pageEdgeShadow='-1px 0 0 rgba(17,24,20,.05),-12px 0 24px rgba(17,24,20,.08)';
  let unmountCurrent=null;
  let swup=null;
  let backHandlerInstalled=false;
  let backPending=false;
  let pageGhost=null;
  let pageDepthOverlay=null;
  let pageShield=null;
  let activePageAnimations=[];
  let frozenPageAnimations=[];
  let pageReadyPromise=Promise.resolve();
  let pageMotionVersion=0;
  let pageDirection='forward';

  const currentContainer=()=>document.querySelector('#swup');
  const currentPage=()=>currentContainer()?.dataset.page||'';
  const isAppleMobileWebKit=()=>/iP(?:hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  document.documentElement.classList.toggle('dm-apple-mobile',isAppleMobileWebKit());
  const pageMotionTarget=()=>currentContainer();
  const canUseNativePageTransition=()=>Boolean(document.startViewTransition)&&!reducedMotion.matches&&!isAppleMobileWebKit();

  const installPageMotionStyles=()=>{
    if(document.getElementById('dm-page-motion'))return;
    const style=document.createElement('style');
    style.id='dm-page-motion';
    style.textContent=`
      html.dm-page-transition #swup{view-transition-name:none!important;background:inherit}
      html.dm-page-transition::view-transition-image-pair(root){isolation:isolate}
      html.dm-page-transition::view-transition-old(root),
      html.dm-page-transition::view-transition-new(root){
        mix-blend-mode:normal;
        backface-visibility:hidden;
      }
      html.dm-page-transition::view-transition-old(root){animation:dmPageForwardOut ${pageDuration.forward*1000}ms ${pageEase} both}
      html.dm-page-transition::view-transition-new(root){
        animation:dmPageForwardIn ${pageDuration.forward*1000}ms ${pageEase} both;
        box-shadow:${pageEdgeShadow};
      }
      html.dm-page-transition.dm-page-back::view-transition-old(root){
        animation:dmPageBackOut ${pageDuration.back*1000}ms ${pageEase} both;
        box-shadow:${pageEdgeShadow};
      }
      html.dm-page-transition.dm-page-back::view-transition-new(root){
        animation:dmPageBackIn ${pageDuration.back*1000}ms ${pageEase} both;
        box-shadow:none;
      }
      @keyframes dmPageForwardOut{
        from{opacity:1;transform:translate3d(0,0,0)}
        to{opacity:.935;transform:translate3d(-22%,0,0)}
      }
      @keyframes dmPageForwardIn{from{transform:translate3d(100%,0,0)}}
      @keyframes dmPageBackOut{to{transform:translate3d(100%,0,0)}}
      @keyframes dmPageBackIn{
        from{opacity:.935;transform:translate3d(-22%,0,0)}
        to{opacity:1;transform:translate3d(0,0,0)}
      }

      .dm-page-ghost{
        background:inherit;
        backface-visibility:hidden;
        isolation:isolate;
      }
      .dm-page-depth{
        position:absolute;
        inset:0;
        pointer-events:none;
        z-index:2147483647;
        background:rgba(12,18,15,.075);
        will-change:opacity;
      }
      .dm-page-shield{
        position:fixed;
        inset:0;
        pointer-events:none;
        z-index:2147483647;
        background:rgba(30,52,42,.085);
        opacity:0;
        will-change:opacity;
      }
      html.dm-page-freeze #swup{
        pointer-events:none!important;
        user-select:none!important;
        -webkit-user-select:none!important;
      }
      html.dm-page-stabilize #swup,
      html.dm-page-stabilize #swup *,
      html.dm-page-stabilize #swup *::before,
      html.dm-page-stabilize #swup *::after{
        animation:none!important;
        transition:none!important;
      }

      html.dm-apple-mobile .app-ready .page-grid>*,
      html.dm-apple-mobile .app-ready .routine-card,
      html.dm-apple-mobile .app-ready .today-card,
      html.dm-apple-mobile .app-ready .progress-page,
      html.dm-apple-mobile .app-ready .progress-metrics article,
      html.dm-apple-mobile .app-ready .progress-card,
      html.dm-apple-mobile .exercise-main.enter-forward :is(.exercise-head,.exercise-facts,.technique-key,.details-section),
      html.dm-apple-mobile .exercise-main.enter-back :is(.exercise-head,.exercise-facts,.technique-key,.details-section),
      html.dm-apple-mobile .step-indicator>strong.is-updating{
        animation:none!important;
        transform:none!important;
        opacity:1!important;
      }
      .dm-page-ghost *,
      .dm-page-ghost *::before,
      .dm-page-ghost *::after{
        animation-play-state:paused!important;
        caret-color:transparent!important;
      }

      html.dm-page-transition .exercise-main.enter-forward .exercise-head,
      html.dm-page-transition .exercise-main.enter-back .exercise-head,
      html.dm-page-transition .exercise-main.enter-forward .exercise-facts,
      html.dm-page-transition .exercise-main.enter-back .exercise-facts,
      html.dm-page-transition .exercise-main.enter-forward .technique-key,
      html.dm-page-transition .exercise-main.enter-back .technique-key,
      html.dm-page-transition .exercise-main.enter-forward .details-section,
      html.dm-page-transition .exercise-main.enter-back .details-section,
      html.dm-page-transition .exercise-main .exercise-visual,
      html.dm-page-fallback .exercise-main.enter-forward .exercise-head,
      html.dm-page-fallback .exercise-main.enter-back .exercise-head,
      html.dm-page-fallback .exercise-main.enter-forward .exercise-facts,
      html.dm-page-fallback .exercise-main.enter-back .exercise-facts,
      html.dm-page-fallback .exercise-main.enter-forward .technique-key,
      html.dm-page-fallback .exercise-main.enter-back .technique-key,
      html.dm-page-fallback .exercise-main.enter-forward .details-section,
      html.dm-page-fallback .exercise-main.enter-back .details-section,
      html.dm-page-fallback .exercise-main .exercise-visual{animation:none!important}

      @media(prefers-reduced-motion:reduce){
        html.dm-page-transition::view-transition-old(root),
        html.dm-page-transition::view-transition-new(root){animation:none!important}
      }
    `;
    document.body.append(style);
  };
  installPageMotionStyles();

  const clearPageState=()=>{
    document.documentElement.classList.remove('app-ready','session-ready');
    document.body.classList.remove('settings-open','modal-open');
  };

  const clearSurfaceStyles=node=>{
    if(!node)return;
    for(const prop of ['transform','will-change','position','z-index','box-shadow','isolation','background-color','background-image','background-position','background-size','background-repeat']){
      node.style.removeProperty(prop);
    }
  };

  const removePageDepth=()=>{
    pageDepthOverlay?.remove?.();
    pageDepthOverlay=null;
  };

  const removePageShield=()=>{
    pageShield?.remove?.();
    pageShield=null;
  };

  const removePageGhost=()=>{
    pageGhost?.remove?.();
    pageGhost=null;
  };

  const createPageDepth=(host,opacity)=>{
    removePageDepth();
    if(!host)return null;
    const overlay=document.createElement('div');
    overlay.className='dm-page-depth';
    overlay.setAttribute('aria-hidden','true');
    overlay.style.opacity=String(opacity);
    host.append(overlay);
    pageDepthOverlay=overlay;
    return overlay;
  };

  const preparePageShield=()=>{
    if(!isAppleMobileWebKit()||reducedMotion.matches)return null;
    removePageShield();
    const shield=document.createElement('div');
    shield.className='dm-page-shield';
    shield.setAttribute('aria-hidden','true');
    document.body.append(shield);
    pageShield=shield;
    return shield;
  };

  const freezeCurrentPage=()=>{
    if(!isAppleMobileWebKit()||reducedMotion.matches)return;
    const target=currentContainer();
    frozenPageAnimations=target?.getAnimations?.({subtree:true})||[];
    for(const animation of frozenPageAnimations){
      try{animation.pause();}catch{}
    }
    try{target?.setAttribute('inert','');}catch{}
    document.documentElement.classList.add('dm-page-freeze');
  };

  const waitForOnest=async()=>{
    if(!document.fonts)return;
    try{
      await Promise.all([
        document.fonts.load('400 16px "Onest"'),
        document.fonts.load('700 16px "Onest"'),
        document.fonts.ready
      ]);
    }catch{}
  };

  const nextPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));

  const stabilizeIncomingPage=async()=>{
    if(!isAppleMobileWebKit()||reducedMotion.matches)return;
    const target=currentContainer();
    document.documentElement.classList.add('dm-page-stabilize');
    target?.getAnimations?.({subtree:true})?.forEach(animation=>{
      try{animation.cancel();}catch{}
    });
    await waitForOnest();
    await nextPaint();
    target?.getAnimations?.({subtree:true})?.forEach(animation=>{
      try{animation.cancel();}catch{}
    });
    document.documentElement.classList.remove('dm-page-stabilize');
  };

  const releasePageFreeze=()=>{
    frozenPageAnimations=[];
    currentContainer()?.removeAttribute('inert');
    document.documentElement.classList.remove('dm-page-freeze','dm-page-stabilize');
  };

  const clearPageMotion=()=>{
    pageMotionVersion+=1;
    for(const animation of activePageAnimations){
      try{animation?.cancel?.();}catch{}
    }
    activePageAnimations=[];
    removePageShield();
    removePageDepth();
    removePageGhost();
    clearSurfaceStyles(pageMotionTarget());
  };

  const copyScrollState=(source,clone)=>{
    const sourceNodes=[source,...source.querySelectorAll('*')];
    const cloneNodes=[clone,...clone.querySelectorAll('*')];
    for(let index=0;index<sourceNodes.length;index+=1){
      const from=sourceNodes[index];
      const to=cloneNodes[index];
      if(!to)continue;
      if(from.scrollTop)to.scrollTop=from.scrollTop;
      if(from.scrollLeft)to.scrollLeft=from.scrollLeft;
    }
  };

  const copySurfaceBackground=(node,source=document.body)=>{
    if(!node||!source)return;
    const style=getComputedStyle(source);
    node.style.backgroundColor=style.backgroundColor;
    node.style.backgroundImage=style.backgroundImage;
    node.style.backgroundPosition=style.backgroundPosition;
    node.style.backgroundSize=style.backgroundSize;
    node.style.backgroundRepeat=style.backgroundRepeat;
  };

  const createPageGhost=()=>{
    if(isAppleMobileWebKit()||reducedMotion.matches||swup?.visit?.animation.native)return;
    const source=currentContainer();
    if(!source)return;
    removePageShield();
    removePageDepth();
    removePageGhost();

    const layer=document.createElement('div');
    layer.className=['dm-page-ghost',...document.body.classList].join(' ');
    layer.setAttribute('aria-hidden','true');
    layer.inert=true;
    Object.assign(layer.style,{
      position:'fixed',
      inset:'0',
      width:'100%',
      height:'100dvh',
      overflow:'hidden',
      pointerEvents:'none',
      contain:'paint',
      isolation:'isolate',
      backfaceVisibility:'hidden',
      transform:'translate3d(0,0,0)',
      willChange:'transform'
    });
    copySurfaceBackground(layer);

    const clone=source.cloneNode(true);
    clone.removeAttribute('id');
    for(const node of clone.querySelectorAll('[id]'))node.removeAttribute('id');
    copyScrollState(source,clone);
    const scrollY=window.scrollY;
    Object.assign(clone.style,{
      position:'absolute',
      left:'0',
      right:'0',
      top:`-${scrollY}px`,
      width:'100%',
      minHeight:`${Math.max(document.documentElement.scrollHeight,window.innerHeight)}px`
    });
    layer.append(clone);
    document.body.append(layer);
    pageGhost=layer;
    if(pageDirection==='forward')createPageDepth(layer,0);
  };

  const prepareIncomingSurface=()=>{
    const target=pageMotionTarget();
    if(!target||!pageGhost||reducedMotion.matches||swup?.visit?.animation.native)return;
    const spec=pageMotion[pageDirection]||pageMotion.forward;
    target.style.position='relative';
    target.style.isolation='isolate';
    copySurfaceBackground(target);
    target.style.transform=`translate3d(${spec.incomingX},0,0)`;
    target.style.willChange='transform';
    target.style.zIndex=spec.incomingAbove?'2147483001':'2147482999';
    pageGhost.style.zIndex=spec.incomingAbove?'2147483000':'2147483001';
    if(spec.incomingAbove)target.style.boxShadow=pageEdgeShadow;
    else pageGhost.style.boxShadow=pageEdgeShadow;
    if(pageDirection==='back')createPageDepth(target,1);
  };

  const unmountPage=()=>{
    if(typeof unmountCurrent==='function'){
      try{unmountCurrent();}catch(error){console.error('[Daily Motion] page cleanup failed',error);}
    }
    unmountCurrent=null;
    clearPageState();
  };

  const mountPage=()=>{
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

  const runPageShield=async phase=>{
    if(!isAppleMobileWebKit()||reducedMotion.matches)return;
    if(phase==='reveal')await pageReadyPromise;
    const shield=pageShield||preparePageShield();
    if(!shield||typeof shield.animate!=='function')return;

    const animation=shield.animate(
      phase==='cover'
        ?[{opacity:0},{opacity:1}]
        :[{opacity:1},{opacity:0}],
      {
        duration:appleShieldDuration[phase],
        easing:appleShieldEase[phase],
        fill:'forwards'
      }
    );
    activePageAnimations=[animation];
    try{await animation.finished;}catch{}
    if(phase==='reveal'){
      activePageAnimations=[];
      removePageShield();
      releasePageFreeze();
    }
  };

  const runPageMotion=()=>{
    const target=pageMotionTarget();
    if(!target||reducedMotion.matches||swup?.visit?.animation.native||typeof target.animate!=='function'){
      removePageDepth();
      removePageGhost();
      clearSurfaceStyles(target);
      return Promise.resolve();
    }
    const spec=pageMotion[pageDirection]||pageMotion.forward;
    const version=++pageMotionVersion;
    const duration=(pageDuration[pageDirection]||pageDuration.forward)*1000;
    const options={duration,easing:pageEase,fill:'both'};
    const animations=[];

    const incoming=target.animate([
      {transform:`translate3d(${spec.incomingX},0,0)`},
      {transform:'translate3d(0,0,0)'}
    ],options);
    animations.push(incoming);

    if(pageGhost){
      const outgoing=pageGhost.animate([
        {transform:'translate3d(0,0,0)'},
        {transform:`translate3d(${spec.outgoingX},0,0)`}
      ],options);
      animations.push(outgoing);
    }

    if(pageDepthOverlay){
      const depth=pageDepthOverlay.animate(
        pageDirection==='forward'
          ?[{opacity:0},{opacity:1}]
          :[{opacity:1},{opacity:0}],
        options
      );
      animations.push(depth);
    }

    activePageAnimations=animations;
    return Promise.allSettled(animations.map(animation=>animation.finished)).then(()=>{
      if(version!==pageMotionVersion)return;
      activePageAnimations=[];
      removePageDepth();
      removePageGhost();
      clearSurfaceStyles(target);
    });
  };

  const pageAnimations=[{
    from:'(.*)',
    to:'(.*)',
    out:()=>isAppleMobileWebKit()?runPageShield('cover'):Promise.resolve(),
    in:()=>isAppleMobileWebKit()?runPageShield('reveal'):runPageMotion()
  }];

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

  const pluginsReady=()=>requiredGlobals.every(name=>typeof window[name]==='function');

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
          new window.SwupHeadPlugin({awaitAssets:true,timeout:4000}),
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
      document.documentElement.classList.remove('dm-page-transition','dm-page-fallback','dm-page-back');
      releasePageFreeze();
      clearPageMotion();
    };

    swup.hooks.on('visit:start',visit=>{
      visit.animation.wait=true;
      const historyBack=visit.history.popstate&&visit.history.direction==='backwards';
      const namedBack=visit.animation.name==='back-home'||visit.animation.name==='completion-home';
      pageDirection=historyBack||namedBack?'back':'forward';
      if(historyBack)visit.animation.name='back-home';
      visit.animation.native=canUseNativePageTransition();
      document.documentElement.classList.toggle('dm-page-transition',visit.animation.native);
      document.documentElement.classList.toggle('dm-page-fallback',!visit.animation.native&&!reducedMotion.matches);
      document.documentElement.classList.toggle('dm-page-back',pageDirection==='back');
      if(isAppleMobileWebKit()&&!reducedMotion.matches){
        freezeCurrentPage();
        preparePageShield();
      }
    });

    swup.hooks.on('fetch:error',visit=>{
      releasePageFreeze();
      clearPageMotion();
      location.assign(new URL(visit.to.url,location.href).href);
    });

    swup.hooks.before('content:replace',()=>{createPageGhost();unmountPage();});
    swup.hooks.on('content:replace',()=>{
      if(isAppleMobileWebKit()&&!reducedMotion.matches)document.documentElement.classList.add('dm-page-stabilize');
      prepareIncomingSurface();
      mountPage();
      pageReadyPromise=isAppleMobileWebKit()&&!reducedMotion.matches
        ?stabilizeIncomingPage()
        :Promise.resolve();
    });
    swup.hooks.on('page:view',()=>preloadLikelyRoutes());
    swup.hooks.on('visit:end',finishTransition);
    swup.hooks.on('visit:abort',finishTransition);
    swup.hooks.on('animation:skip',finishTransition);

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
    if(url.origin!==location.origin||!/(?:index|session|progress)\.html$/.test(url.pathname))return;
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
