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
    if(window.gsap&&all.length)window.gsap.set(all,{clearProps:'opacity,transform,visibility,willChange,boxShadow'});
    [nodes.ring,nodes.check].filter(Boolean).forEach(node=>{
      node.style.removeProperty('stroke-dasharray');
      node.style.removeProperty('stroke-dashoffset');
      node.style.removeProperty('opacity');
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

    completionContext=gsap.context(()=>{
      const tl=gsap.timeline({
        defaults:{ease:'power3.out'},
        onComplete:()=>{
          gsap.set([nodes.card,nodes.mark,nodes.eyebrow,nodes.title,nodes.meta,nodes.highlight,nodes.stats,nodes.effort,nodes.button].filter(Boolean),{clearProps:'opacity,transform,visibility,willChange,boxShadow'});
          // Keep the drawn success mark visible until the overlay is cleaned up.
          [nodes.ring,nodes.check].filter(Boolean).forEach(node=>{
            node.style.removeProperty('will-change');
          });
        }
      });
      completionTimeline=tl;

      const content=[nodes.eyebrow,nodes.meta,nodes.highlight,nodes.stats,nodes.effort,nodes.button].filter(Boolean);
      gsap.set(nodes.card,{opacity:0,y:5,scale:.996,willChange:'opacity,transform'});
      gsap.set(content,{opacity:0,y:6,willChange:'opacity,transform'});
      gsap.set(nodes.title,{opacity:0,y:8,willChange:'opacity,transform'});
      if(nodes.mark)gsap.set(nodes.mark,{opacity:0,scale:.88,boxShadow:'0 0 0 0 rgba(47,107,85,0)',willChange:'opacity,transform,box-shadow'});
      if(nodes.ring)gsap.set(nodes.ring,{strokeDasharray:126,strokeDashoffset:126,opacity:.5});
      if(nodes.check)gsap.set(nodes.check,{strokeDasharray:28,strokeDashoffset:28,opacity:0});

      tl.to(nodes.card,{opacity:1,y:0,scale:1,duration:.14},0);
      if(nodes.mark)tl.to(nodes.mark,{opacity:1,scale:1,duration:.20,ease:'power3.out'},.05);
      if(nodes.ring)tl.to(nodes.ring,{strokeDashoffset:0,duration:.26,ease:'power2.out'},.08);
      if(nodes.check){
        tl.to(nodes.check,{opacity:1,duration:.04,ease:'none'},.25);
        tl.to(nodes.check,{strokeDashoffset:0,duration:.18,ease:'power3.out'},.27);
      }
      if(nodes.mark){
        tl.to(nodes.mark,{scale:1.045,boxShadow:'0 0 0 7px rgba(47,107,85,.05)',duration:.09,ease:'power2.out'},.40);
        tl.to(nodes.mark,{scale:1,boxShadow:'0 0 0 0 rgba(47,107,85,0)',duration:.13,ease:'power2.out'},.49);
      }
      if(nodes.eyebrow)tl.to(nodes.eyebrow,{opacity:1,y:0,duration:.16},.34);
      tl.to(nodes.title,{opacity:1,y:0,duration:.20,ease:'power3.out'},.39);
      if(nodes.meta)tl.to(nodes.meta,{opacity:1,y:0,duration:.16},.46);
      if(nodes.highlight)tl.to(nodes.highlight,{opacity:1,y:0,duration:.16},.49);
      if(nodes.stats)tl.to(nodes.stats,{opacity:1,y:0,duration:.18},.50);
      if(nodes.effort)tl.to(nodes.effort,{opacity:1,y:0,duration:.18},.55);
      if(nodes.button)tl.to(nodes.button,{opacity:1,y:0,duration:.18},.60);
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
