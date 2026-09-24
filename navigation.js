(() => {
  const SWUP_URL='https://unpkg.com/swup@4.10.0/dist/Swup.umd.js';
  const pages=window.DailyMotionPages||{};
  const root=document.documentElement;
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let unmountCurrent=null;
  let swup=null;
  let backHandlerInstalled=false;
  let forcedDirection=null;
  let lastActivation=null;
  const visitReady=new WeakMap();

  const currentContainer=()=>document.querySelector('#swup');
  const currentPage=()=>currentContainer()?.dataset.page||'';

  const ensureOrb=()=>{
    let orb=document.querySelector('.dm-page-orb');
    if(orb)return orb;
    orb=document.createElement('div');
    orb.className='dm-page-orb';
    orb.setAttribute('aria-hidden','true');
    document.body.appendChild(orb);
    return orb;
  };

  const rememberActivation=event=>{
    if(event.type==='pointerdown'&&event.button!==0)return;
    let x=Number(event.clientX);
    let y=Number(event.clientY);
    if((!x&&!y)||event.detail===0){
      const target=event.target?.closest?.('a,button,[role="button"]');
      const rect=target?.getBoundingClientRect?.();
      if(rect){x=rect.left+rect.width/2;y=rect.top+rect.height/2;}
    }
    if(Number.isFinite(x)&&Number.isFinite(y))lastActivation={x,y,time:performance.now()};
  };

  const transitionOrigin=direction=>{
    if(lastActivation&&performance.now()-lastActivation.time<1400){
      return {x:lastActivation.x,y:lastActivation.y};
    }
    return direction==='back'
      ? {x:Math.min(44,innerWidth*.12),y:Math.max(54,innerHeight*.09)}
      : {x:innerWidth*.5,y:innerHeight*.72};
  };

  const clearTransitionStyles=()=>{
    const container=currentContainer();
    if(container){
      container.getAnimations?.().forEach(animation=>animation.cancel());
      container.style.removeProperty('opacity');
      container.style.removeProperty('transform');
      container.style.removeProperty('will-change');
    }
    const orb=document.querySelector('.dm-page-orb');
    if(orb){
      orb.getAnimations?.().forEach(animation=>animation.cancel());
      orb.style.removeProperty('left');
      orb.style.removeProperty('top');
      orb.style.removeProperty('opacity');
      orb.style.removeProperty('transform');
      orb.style.removeProperty('will-change');
      orb.classList.remove('is-active');
    }
  };

  const clearPageState=()=>{
    root.classList.remove('app-ready','session-ready');
    document.body.classList.remove('settings-open','modal-open');
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

  const syncBodyAndHead=visit=>{
    const html=visit?.to?.html;
    if(!html)return;
    const next=new DOMParser().parseFromString(html,'text/html');
    document.body.className=next.body?.className||'';

    for(const selector of [
      'meta[name="description"]',
      'link[rel="canonical"]',
      'meta[property="og:title"]',
      'meta[property="og:description"]',
      'meta[property="og:url"]',
      'meta[name="twitter:title"]',
      'meta[name="twitter:description"]'
    ]){
      const current=document.head.querySelector(selector);
      const incoming=next.head.querySelector(selector);
      if(!current||!incoming)continue;
      if(current.tagName==='LINK')current.setAttribute('href',incoming.getAttribute('href')||'');
      else current.setAttribute('content',incoming.getAttribute('content')||'');
    }
  };

  const animateElement=async(element,keyframes,options)=>{
    if(!element||reduceMotion.matches)return;
    const animation=element.animate(keyframes,options);
    try{await animation.finished;}catch{}
  };

  const resolveDirection=visit=>{
    if(forcedDirection){
      const direction=forcedDirection;
      forcedDirection=null;
      return direction;
    }
    if(visit?.history?.popstate){
      if(visit.history.direction==='backwards')return 'back';
      if(visit.history.direction==='forwards')return 'forward';
    }
    const to=new URL(visit?.to?.url||location.href,location.href).pathname;
    const from=new URL(visit?.from?.url||location.href,location.href).pathname;
    if((to==='/'||to.endsWith('/index.html'))&&from!==to)return 'back';
    return 'forward';
  };

  const fallbackNavigate=(href,{replace=false,direction}={})=>{
    clearTransitionStyles();
    forcedDirection=direction||null;
    const url=new URL(href,location.href).href;
    if(replace)location.replace(url);
    else location.assign(url);
  };

  const fallbackBack=(fallback='index.html')=>{
    clearTransitionStyles();
    forcedDirection='back';
    const state=history.state;
    if(state?.source==='swup'&&Number(state.index)>1){history.back();return;}
    fallbackNavigate(fallback,{replace:true,direction:'back'});
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

  document.addEventListener('pointerdown',rememberActivation,{capture:true,passive:true});
  document.addEventListener('click',event=>{if(event.detail===0)rememberActivation(event);},{capture:true});

  const createReadyGate=visit=>{
    let resolve;
    const promise=new Promise(done=>{resolve=done;});
    const gate={promise,resolve,settled:false};
    visitReady.set(visit,gate);
    return gate;
  };

  const settleReadyGate=(visit,ready)=>{
    const gate=visitReady.get(visit);
    if(!gate||gate.settled)return;
    gate.settled=true;
    gate.resolve(ready);
  };

  const installSwup=()=>{
    if(swup||typeof window.Swup!=='function')return;
    swup=new window.Swup({
      containers:['#swup'],
      animationSelector:'.transition-page',
      animateHistoryBrowsing:true,
      cache:true,
      linkSelector:'a[href]:not([data-no-swup]):not([data-nav-back])',
      native:false
    });
    window.DailyMotionSwup=swup;

    window.DailyMotionNavigate=(href,{replace=false,direction}={})=>{
      clearTransitionStyles();
      forcedDirection=direction||null;
      const url=new URL(href,location.href);
      if(url.origin!==location.origin){location.assign(url.href);return;}
      swup.navigate(url.pathname+url.search+url.hash,{history:replace?'replace':'push'});
    };
    window.DailyMotionBack=(fallback='index.html')=>{
      clearTransitionStyles();
      forcedDirection='back';
      const state=history.state;
      if(state?.source==='swup'&&Number(state.index)>1){history.back();return;}
      window.DailyMotionNavigate(fallback,{replace:true,direction:'back'});
    };

    swup.hooks.on('visit:start',visit=>{
      clearTransitionStyles();
      visit.meta.motionDirection=resolveDirection(visit);
      createReadyGate(visit);
    });
    swup.hooks.on('page:load',visit=>settleReadyGate(visit,true));
    swup.hooks.on('fetch:error',visit=>{
      settleReadyGate(visit,false);
      clearTransitionStyles();
      location.assign(new URL(visit.to.url,location.href).href);
    });
    swup.hooks.on('visit:abort',visit=>{
      settleReadyGate(visit,false);
      clearTransitionStyles();
    });

    swup.hooks.replace('animation:out:await',async visit=>{
      const gate=visitReady.get(visit);
      const pageIsReady=gate?await gate.promise:true;
      if(!pageIsReady||reduceMotion.matches)return;

      const container=currentContainer();
      const orb=ensureOrb();
      if(!container||!orb)return;

      const direction=visit.meta.motionDirection==='back'?'back':'forward';
      const sign=direction==='back'?-1:1;
      const origin=transitionOrigin(direction);
      orb.style.left=`${origin.x}px`;
      orb.style.top=`${origin.y}px`;
      orb.classList.add('is-active');
      orb.style.willChange='transform, opacity';
      container.style.willChange='opacity, transform';

      await Promise.all([
        animateElement(container,[
          {opacity:1,transform:'translate3d(0,0,0) scale(1)'},
          {opacity:.78,transform:`translate3d(${-8*sign}px,0,0) scale(.982)`}
        ],{duration:210,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'}),
        animateElement(orb,[
          {opacity:1,transform:'translate3d(-50%,-50%,0) scale(.018)'},
          {opacity:1,transform:'translate3d(-50%,-50%,0) scale(1)'}
        ],{duration:310,easing:'cubic-bezier(.2,.72,.18,1)',fill:'forwards'})
      ]);
    });

    swup.hooks.before('content:replace',visit=>{
      unmountPage();
      syncBodyAndHead(visit);
    });

    swup.hooks.on('content:replace',visit=>{
      const container=currentContainer();
      const direction=visit.meta.motionDirection==='back'?'back':'forward';
      const sign=direction==='back'?-1:1;
      if(container&&!reduceMotion.matches){
        container.style.opacity='.72';
        container.style.transform=`translate3d(${14*sign}px,0,0) scale(1.018)`;
        container.style.willChange='opacity, transform';
      }
      mountPage();
    });

    swup.hooks.replace('animation:in:await',async visit=>{
      const container=currentContainer();
      const orb=ensureOrb();
      if(!container||!orb){clearTransitionStyles();return;}
      if(reduceMotion.matches){clearTransitionStyles();return;}

      const direction=visit.meta.motionDirection==='back'?'back':'forward';
      const sign=direction==='back'?-1:1;

      await Promise.all([
        animateElement(container,[
          {opacity:.72,transform:`translate3d(${14*sign}px,0,0) scale(1.018)`},
          {opacity:1,transform:'translate3d(0,0,0) scale(1)'}
        ],{duration:330,delay:45,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'}),
        animateElement(orb,[
          {opacity:1,transform:'translate3d(-50%,-50%,0) scale(1)'},
          {opacity:0,transform:'translate3d(-50%,-50%,0) scale(1.055)'}
        ],{duration:260,delay:15,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'})
      ]);

      clearTransitionStyles();
    });
    swup.hooks.on('animation:skip',()=>clearTransitionStyles());
    swup.hooks.on('visit:end',visit=>{
      settleReadyGate(visit,true);
      clearTransitionStyles();
    });
  };

  window.DailyMotionNavigate=fallbackNavigate;
  window.DailyMotionBack=fallbackBack;
  installBackHandler();
  mountPage();

  if(typeof window.Swup==='function'){
    installSwup();
    return;
  }

  const script=document.createElement('script');
  script.src=SWUP_URL;
  script.async=true;
  script.crossOrigin='anonymous';
  script.dataset.dailyMotionVendor='swup';
  script.addEventListener('load',installSwup,{once:true});
  script.addEventListener('error',()=>script.remove(),{once:true});
  document.head.appendChild(script);
})();
