(() => {
  const reducedQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
  const MOTION_TOKENS=Object.freeze({
    microMs:160,
    enterMs:220,
    exitMs:140,
    emphasisMs:280,
    staggerMs:40,
    pressMs:105,
    releaseMs:175,
    stateMs:150,
    easeEnter:'cubic-bezier(.16,.82,.24,1)',
    easeStandard:'cubic-bezier(.2,.72,.2,1)',
    easeExit:'cubic-bezier(.4,0,1,1)',
    easeEmphasized:'cubic-bezier(.16,1,.3,1)'
  });
  const COMPLETION_PLUGINS=[
    ['SplitText','/vendor/gsap/SplitText.min.js']
  ];
  let completionPluginsPromise=null;
  let completionTimeline=null;
  let completionContext=null;
  let completionSplit=null;

  const reducedMotion=()=>reducedQuery.matches;

  const registerCompletionPlugins=()=>{
    if(!window.gsap||!window.SplitText)return false;
    try{
      window.gsap.registerPlugin(window.SplitText);
      return true;
    }catch(error){
      console.warn('[Daily Motion] completion motion plugins could not register',error);
      return false;
    }
  };

  const loadPlugin=([globalName,src])=>{
    if(window[globalName])return Promise.resolve(true);
    const existing=document.querySelector(`script[data-dm-motion-plugin="${globalName}"]`);
    if(existing){
      return new Promise(resolve=>{
        if(window[globalName]){resolve(true);return;}
        existing.addEventListener('load',()=>resolve(Boolean(window[globalName])),{once:true});
        existing.addEventListener('error',()=>resolve(false),{once:true});
      });
    }
    return new Promise(resolve=>{
      const script=document.createElement('script');
      const timeout=setTimeout(()=>{
        script.remove();
        resolve(false);
      },5000);
      const finish=ok=>{
        clearTimeout(timeout);
        script.onload=null;
        script.onerror=null;
        resolve(ok);
      };
      script.src=src;
      script.async=true;
      script.dataset.dmMotionPlugin=globalName;
      script.onload=()=>finish(Boolean(window[globalName]));
      script.onerror=()=>finish(false);
      document.head.appendChild(script);
    });
  };

  const ensureCompletionPlugins=()=>{
    if(reducedMotion())return Promise.resolve(false);
    if(registerCompletionPlugins())return Promise.resolve(true);
    if(completionPluginsPromise)return completionPluginsPromise;
    completionPluginsPromise=Promise.all(COMPLETION_PLUGINS.map(loadPlugin))
      .then(results=>results.every(Boolean)&&registerCompletionPlugins())
      .catch(error=>{
        console.warn('[Daily Motion] enhanced completion motion unavailable',error);
        return false;
      })
      .finally(()=>{completionPluginsPromise=null;});
    return completionPluginsPromise;
  };

  const completionNodes=root=>({
    card:root?.querySelector('.completion-card'),
    mark:root?.querySelector('.completion-check'),
    ring:root?.querySelector('.completion-mark__ring'),
    check:root?.querySelector('.completion-mark__check'),
    burst:[...(root?.querySelectorAll('.completion-burst i')||[])],
    eyebrow:root?.querySelector('.completion-card>.eyebrow'),
    title:root?.querySelector('#completionTitle'),
    meta:root?.querySelector('#completionMeta'),
    highlight:root?.querySelector('#completionHighlight:not([hidden])'),
    stats:root?.querySelector('.completion-stats'),
    effort:root?.querySelector('.completion-effort'),
    button:root?.querySelector('.completion-button')
  });

  const clearCompletionInlineState=root=>{
    const nodes=completionNodes(root);
    const all=[nodes.card,nodes.mark,...nodes.burst,nodes.eyebrow,nodes.title,nodes.meta,nodes.highlight,nodes.stats,nodes.effort,nodes.button].filter(Boolean);
    if(window.gsap&&all.length)window.gsap.set(all,{clearProps:'opacity,transform,visibility,willChange'});
    [nodes.ring,nodes.check].filter(Boolean).forEach(node=>{
      node.style.removeProperty('stroke-dasharray');
      node.style.removeProperty('stroke-dashoffset');
    });
  };

  const cleanupCompletion=(root=document.querySelector('#completionOverlay'))=>{
    completionTimeline?.kill?.();
    completionTimeline=null;
    completionSplit?.revert?.();
    completionSplit=null;
    completionContext?.revert?.();
    completionContext=null;
    clearCompletionInlineState(root);
  };

  const prepareCompletion=root=>{
    root?.classList.remove('completion-motion-played');
  };

  const playCompletion=root=>{
    if(!root)return null;
    cleanupCompletion(root);
    const gsap=window.gsap;
    const nodes=completionNodes(root);
    if(!gsap||reducedMotion()||!nodes.card||!nodes.title){
      clearCompletionInlineState(root);
      return null;
    }

    const enhanced=registerCompletionPlugins();
    let titleTargets=[nodes.title];
    if(enhanced){
      try{
        completionSplit=window.SplitText.create(nodes.title,{type:'words',wordsClass:'completion-title-word'});
        if(completionSplit.words.length)titleTargets=completionSplit.words;
      }catch(error){
        console.warn('[Daily Motion] SplitText fallback used',error);
        completionSplit=null;
      }
    }

    completionContext=gsap.context(()=>{
      const tl=gsap.timeline({
        defaults:{ease:'power3.out'},
        onComplete:()=>{
          completionSplit?.revert?.();
          completionSplit=null;
          gsap.set(nodes.title,{clearProps:'opacity,transform,visibility,willChange'});
          titleTargets=[nodes.title];
        }
      });
      completionTimeline=tl;

      const content=[nodes.eyebrow,nodes.meta,nodes.highlight,nodes.stats,nodes.effort,nodes.button].filter(Boolean);
      gsap.set(nodes.card,{opacity:0,y:7,scale:.992,willChange:'opacity,transform'});
      gsap.set(content,{opacity:0,y:7,willChange:'opacity,transform'});
      gsap.set(titleTargets,{opacity:0,y:10,willChange:'opacity,transform'});
      if(nodes.burst.length)gsap.set(nodes.burst,{opacity:0,x:0,y:0,xPercent:-50,yPercent:-50,scale:.35,transformOrigin:'50% 50%'});

      tl.to(nodes.card,{opacity:1,y:0,scale:1,duration:.18},.04);

      if(nodes.burst.length){
        tl.to(nodes.burst,{opacity:.88,duration:.06,stagger:.009,ease:'power1.out'},.54);
        tl.to(nodes.burst,{
          x:index=>Math.cos(index*Math.PI/4)*42,
          y:index=>Math.sin(index*Math.PI/4)*42,
          opacity:0,
          scale:.78,
          duration:.28,
          stagger:.009,
          ease:'power2.out'
        },.58);
      }

      if(nodes.eyebrow)tl.to(nodes.eyebrow,{opacity:1,y:0,duration:.18},.54);
      tl.to(titleTargets,{opacity:1,y:0,duration:.24,stagger:.04,ease:'power3.out'},.60);
      if(nodes.meta)tl.to(nodes.meta,{opacity:1,y:0,duration:.18},.70);
      if(nodes.highlight)tl.to(nodes.highlight,{opacity:1,y:0,duration:.18},.74);
      if(nodes.stats)tl.to(nodes.stats,{opacity:1,y:0,duration:.22},.78);
      if(nodes.effort)tl.to(nodes.effort,{opacity:1,y:0,duration:.22},.86);
      if(nodes.button)tl.to(nodes.button,{opacity:1,y:0,duration:.22},.92);
    },root);

    return completionTimeline;
  };

  const cleanupSessionMotion=()=>{
    cleanupCompletion(document.querySelector('#completionOverlay'));
  };

  window.DailyMotionMotion={
    ...(window.DailyMotionMotion||{}),
    tokens:MOTION_TOKENS,
    reducedMotion,
    ensureCompletionPlugins,
    prepareCompletion,
    playCompletion,
    cleanupSessionMotion
  };
})();
