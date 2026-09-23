(function DailyMotionThemeModule(){
  const STATE_KEY='dailyMotionState.v3';
  const PREFERENCES=['system','light','dark'];
  const media=window.matchMedia('(prefers-color-scheme: dark)');
  let transitionQueue=Promise.resolve();

  const normalize=preference=>PREFERENCES.includes(preference)?preference:'system';
  const readPreference=()=>{
    try{
      const state=JSON.parse(localStorage.getItem(STATE_KEY)||'null');
      return normalize(state?.settings?.theme);
    }catch{
      return 'system';
    }
  };
  const resolve=preference=>preference==='system'?(media.matches?'dark':'light'):preference;
  const apply=(preference=readPreference())=>{
    const normalized=normalize(preference);
    const resolved=resolve(normalized);
    const root=document.documentElement;
    root.dataset.themePreference=normalized;
    root.dataset.theme=resolved;
    root.style.colorScheme=resolved;
    const themeColor=document.querySelector('meta[name="theme-color"]');
    if(themeColor)themeColor.content=resolved==='dark'?'#101612':'#f4f5f1';
    return {preference:normalized,resolved};
  };

  const applyAnimated=(preference=readPreference())=>{
    const normalized=normalize(preference);
    transitionQueue=transitionQueue.catch(()=>{}).then(async()=>{
      const resolved=resolve(normalized);
      const root=document.documentElement;
      const current=root.dataset.theme||resolve(readPreference());
      if(current===resolved||window.matchMedia('(prefers-reduced-motion: reduce)').matches){
        return apply(normalized);
      }

      root.classList.add('theme-transitioning');
      try{
        if(typeof document.startViewTransition==='function'){
          const transition=document.startViewTransition(()=>apply(normalized));
          await transition.finished.catch(()=>{});
          return {preference:normalized,resolved};
        }

        const target=document.body||root;
        if(typeof target.animate==='function'){
          const out=target.animate(
            [{opacity:1},{opacity:.82}],
            {duration:70,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'}
          );
          await out.finished.catch(()=>{});
          apply(normalized);
          const enter=target.animate(
            [{opacity:.82},{opacity:1}],
            {duration:110,easing:'cubic-bezier(0,0,.2,1)',fill:'forwards'}
          );
          await enter.finished.catch(()=>{});
          out.cancel();
          enter.cancel();
          return {preference:normalized,resolved};
        }

        return apply(normalized);
      }finally{
        root.classList.remove('theme-transitioning');
      }
    });
    return transitionQueue;
  };

  const handleSystemChange=()=>{
    if(document.documentElement.dataset.themePreference==='system')applyAnimated('system');
  };
  if(typeof media.addEventListener==='function')media.addEventListener('change',handleSystemChange);
  else media.addListener(handleSystemChange);

  window.DailyMotionTheme={PREFERENCES,normalize,readPreference,resolve,apply,applyAnimated};
  apply();
})();
