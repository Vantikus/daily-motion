(() => {
  const reducedQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
  const COMPLETION_PLUGINS=[
    ['DrawSVGPlugin','/vendor/gsap/DrawSVGPlugin.min.js'],
    ['SplitText','/vendor/gsap/SplitText.min.js']
  ];
  let completionPluginsPromise=null;
  let completionTimeline=null;
  let completionContext=null;
  let completionSplit=null;

  const reducedMotion=()=>reducedQuery.matches;

  const registerCompletionPlugins=()=>{
    if(!window.gsap||!window.DrawSVGPlugin||!window.SplitText)return false;
    try{
      window.gsap.registerPlugin(window.DrawSVGPlugin,window.SplitText);
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
      const timeout=setTimeout(()=>{script.remove();resolve(false);},5000);
      const finish=ok=>{clearTimeout(timeout);script.onload=null;script.onerror=null;resolve(ok);};
      script.src=src;script.async=true;script.dataset.dmMotionPlugin=globalName;
      script.onload=()=>finish(Boolean(window[globalName]));script.onerror=()=>finish(false);document.head.appendChild(script);
    });
  };

  const ensureCompletionPlugins=()=>{
    if(reducedMotion())return Promise.resolve(false);
    if(registerCompletionPlugins())return Promise.resolve(true);
    if(completionPluginsPromise)return completionPluginsPromise;
    completionPluginsPromise=Promise.all(COMPLETION_PLUGINS.map(loadPlugin)).then(results=>results.every(Boolean)&&registerCompletionPlugins()).catch(error=>{console.warn('[Daily Motion] enhanced completion motion unavailable',error);return false;}).finally(()=>{completionPluginsPromise=null;});
    return completionPluginsPromise;
  };

  const completionNodes=root=>({card:root?.querySelector('.completion-card'),mark:root?.querySelector('.completion-check'),ring:root?.querySelector('.completion-mark__ring'),check:root?.querySelector('.completion-mark__check'),burst:[...(root?.querySelectorAll('.completion-burst i')||[])],eyebrow:root?.querySelector('.completion-card>.eyebrow'),title:root?.querySelector('#completionTitle'),meta:root?.querySelector('#completionMeta'),highlight:root?.querySelector('#completionHighlight:not([hidden])'),stats:root?.querySelector('.completion-stats'),effort:root?.querySelector('.completion-effort'),button:root?.querySelector('.completion-button')});

  const clearCompletionInlineState=root=>{
    const nodes=completionNodes(root),all=[nodes.card,nodes.mark,...nodes.burst,nodes.eyebrow,nodes.title,nodes.meta,nodes.highlight,nodes.stats,nodes.effort,nodes.button].filter(Boolean);
    if(window.gsap&&all.length)window.gsap.set(all,{clearProps:'opacity,transform,visibility,willChange'});
    [nodes.ring,nodes.check].filter(Boolean).forEach(node=>{node.style.removeProperty('stroke-dasharray');node.style.removeProperty('stroke-dashoffset');});
  };

  const cleanupCompletion=(root=document.querySelector('#completionOverlay'))=>{completionTimeline?.kill?.();completionTimeline=null;completionSplit?.revert?.();completionSplit=null;completionContext?.revert?.();completionContext=null;clearCompletionInlineState(root);};

  const prepareCompletion=root=>{
    if(!root||!window.gsap||reducedMotion())return;
    const nodes=completionNodes(root);
    if(!nodes.mark||!nodes.ring||!nodes.check)return;
    const ringLength=nodes.ring.getTotalLength?.()||0;
    const checkLength=nodes.check.getTotalLength?.()||0;
    window.gsap.set(nodes.mark,{opacity:0,scale:.84,willChange:'opacity,transform'});
    if(ringLength)window.gsap.set(nodes.ring,{strokeDasharray:ringLength,strokeDashoffset:ringLength});
    if(checkLength)window.gsap.set(nodes.check,{strokeDasharray:checkLength,strokeDashoffset:checkLength});
    root.classList.add('completion-motion-prepared');
  };

  const playCompletion=root=>{
    if(!root)return null;const wasPrepared=root.classList.contains('completion-motion-prepared');cleanupCompletion(root);if(wasPrepared)prepareCompletion(root);const gsap=window.gsap,nodes=completionNodes(root);
    if(!gsap||reducedMotion()||!nodes.card||!nodes.title){clearCompletionInlineState(root);return null;}
    const enhanced=registerCompletionPlugins(),titleTargets=[nodes.title];
    let targets=titleTargets;
    if(enhanced&&window.SplitText){try{completionSplit=window.SplitText.create(nodes.title,{type:'words',wordsClass:'completion-title-word'});if(completionSplit.words.length)targets=completionSplit.words;}catch(error){console.warn('[Daily Motion] SplitText fallback used',error);completionSplit=null;}}
    const strokeLengths={ring:0,check:0};
    if(nodes.ring&&nodes.check){try{strokeLengths.ring=nodes.ring.getTotalLength();strokeLengths.check=nodes.check.getTotalLength();}catch(error){console.warn('[Daily Motion] completion stroke measurement fallback used',error);}}
    completionContext=gsap.context(()=>{
      const tl=gsap.timeline({defaults:{ease:'power3.out'},onComplete:()=>{completionSplit?.revert?.();completionSplit=null;gsap.set(nodes.title,{clearProps:'opacity,transform,visibility,willChange'});}});completionTimeline=tl;
      const content=[nodes.eyebrow,nodes.meta,nodes.highlight,nodes.stats,nodes.effort,nodes.button].filter(Boolean);
      gsap.set(nodes.card,{opacity:0,y:7,scale:.992,willChange:'opacity,transform'});gsap.set(content,{opacity:0,y:7,willChange:'opacity,transform'});gsap.set(targets,{opacity:0,y:10,willChange:'opacity,transform'});gsap.set(nodes.mark,{opacity:0,scale:.82,willChange:'opacity,transform'});if(nodes.burst.length)gsap.set(nodes.burst,{opacity:0,x:0,y:0,xPercent:-50,yPercent:-50,scale:.35,transformOrigin:'50% 50%'});
      if(strokeLengths.ring&&strokeLengths.check){gsap.set(nodes.ring,{strokeDasharray:strokeLengths.ring,strokeDashoffset:strokeLengths.ring});gsap.set(nodes.check,{strokeDasharray:strokeLengths.check,strokeDashoffset:strokeLengths.check});}
      tl.to(nodes.card,{opacity:1,y:0,scale:1,duration:.18},.04).to(nodes.mark,{opacity:1,scale:1,duration:.24,ease:'back.out(1.42)'},.16);
      if(strokeLengths.ring&&strokeLengths.check){tl.to(nodes.ring,{strokeDashoffset:0,duration:.42,ease:'power2.out'},.20).to(nodes.check,{strokeDashoffset:0,duration:.26,ease:'power3.out'},.50);}
      if(nodes.burst.length){tl.to(nodes.burst,{opacity:.78,duration:.08,stagger:.012,ease:'power1.out'},.14).to(nodes.burst,{x:i=>Math.cos(i*Math.PI/4)*29,y:i=>Math.sin(i*Math.PI/4)*29,opacity:0,scale:.78,duration:.34,stagger:.012,ease:'power2.out'},.2);}
      if(nodes.eyebrow)tl.to(nodes.eyebrow,{opacity:1,y:0,duration:.2},.14);tl.to(targets,{opacity:1,y:0,duration:.3,stagger:.055,ease:'power3.out'},.2);if(nodes.meta)tl.to(nodes.meta,{opacity:1,y:0,duration:.24},.31);if(nodes.highlight)tl.to(nodes.highlight,{opacity:1,y:0,duration:.24},.35);if(nodes.stats)tl.to(nodes.stats,{opacity:1,y:0,duration:.28},.39);if(nodes.effort)tl.to(nodes.effort,{opacity:1,y:0,duration:.28},.47);if(nodes.button)tl.to(nodes.button,{opacity:1,y:0,duration:.28},.51);
    },root);return completionTimeline;
  };

  const cleanupSessionMotion=()=>cleanupCompletion(document.querySelector('#completionOverlay'));

  window.DailyMotionMotion={reducedMotion,ensureCompletionPlugins,prepareCompletion,playCompletion,cleanupSessionMotion};
})();
