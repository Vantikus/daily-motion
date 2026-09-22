(function DailyMotionThemeModule(){
  const STATE_KEY='dailyMotionState.v3';
  const PREFERENCES=['system','light','dark'];
  const media=window.matchMedia('(prefers-color-scheme: dark)');

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

  const handleSystemChange=()=>{
    if(document.documentElement.dataset.themePreference==='system')apply('system');
  };
  if(typeof media.addEventListener==='function')media.addEventListener('change',handleSystemChange);
  else media.addListener(handleSystemChange);

  window.DailyMotionTheme={PREFERENCES,normalize,readPreference,resolve,apply};
  apply();
})();
