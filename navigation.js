(() => {
  const SWUP_URL='https://unpkg.com/swup@4.10.0/dist/Swup.umd.js';
  const pages=window.DailyMotionPages||{};
  const root=document.documentElement;
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let unmountCurrent=null;
  let swup=null;
  let backHandlerInstalled=false;
  const visitReady=new WeakMap();

  const currentContainer=()=>document.querySelector('#swup');
  const currentPage=()=>currentContainer()?.dataset.page||'';
  const clearTransitionStyles=()=>{
    const container=currentContainer();
    if(!container)return;
    container.getAnimations?.().forEach(animation=>animation.cancel());
    container.style.removeProperty('opacity');
    container.style.removeProperty('transform');
    container.style.removeProperty('will-change');
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
    const next=visit?.to?.document;
    if(!next)return;
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

  const fallbackNavigate=(href,{replace=false}={})=>{
    clearTransitionStyles();
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
      animationSelector:false,
      animateHistoryBrowsing:true,
      cache:true,
      linkSelector:'a[href]:not([data-no-swup]):not([data-nav-back])',
      native:false
    });
    window.DailyMotionSwup=swup;

    window.DailyMotionNavigate=(href,{replace=false}={})=>{
      clearTransitionStyles();
      const url=new URL(href,location.href);
      if(url.origin!==location.origin){location.assign(url.href);return;}
      swup.navigate(url.pathname+url.search+url.hash,{history:replace?'replace':'push'});
    };
    window.DailyMotionBack=(fallback='index.html')=>{
      clearTransitionStyles();
      const state=history.state;
      if(state?.source==='swup'&&Number(state.index)>1){history.back();return;}
      window.DailyMotionNavigate(fallback,{replace:true});
    };

    swup.hooks.on('visit:start',visit=>{
      clearTransitionStyles();
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
      if(!pageIsReady)return;
      const container=currentContainer();
      if(!container)return;
      container.style.willChange='opacity, transform';
      await animateElement(container,[
        {opacity:1,transform:'translate3d(0,0,0)'},
        {opacity:0,transform:'translate3d(0,-2px,0)'}
      ],{duration:90,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'});
    });

    swup.hooks.before('content:replace',visit=>{
      unmountPage();
      syncBodyAndHead(visit);
    });
    swup.hooks.on('content:replace',()=>{
      const container=currentContainer();
      if(container&&!reduceMotion.matches){
        container.style.opacity='0';
        container.style.transform='translate3d(0,3px,0)';
        container.style.willChange='opacity, transform';
      }
      mountPage();
    });
    swup.hooks.replace('animation:in:await',async()=>{
      const container=currentContainer();
      if(!container)return;
      if(!reduceMotion.matches){
        await animateElement(container,[
          {opacity:0,transform:'translate3d(0,3px,0)'},
          {opacity:1,transform:'translate3d(0,0,0)'}
        ],{duration:135,easing:'cubic-bezier(0,0,.2,1)',fill:'forwards'});
      }
      clearTransitionStyles();
    });
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
