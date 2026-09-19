(function DailyMotionStateModule(){
  const KEY='dailyMotionState.v2';
  const LEGACY_KEY='dailyMotionState.v1';
  const ROUTINE_KEYS=['morning','day','evening'];
  const DEFAULT_SETTINGS={
    countdownSeconds:3,
    restSeconds:15,
    sound:true,
    autoNext:false,
    weeklyGoalDays:5
  };

  const todayKey=(date=new Date())=>{
    const d=new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  const blankRoutine=()=>({
    step:0,
    completedUntil:0,
    completed:false,
    startedAt:null,
    completedAt:null,
    timers:{}
  });

  const normalizeSettings=(settings={})=>({
    countdownSeconds:[0,3,5].includes(Number(settings.countdownSeconds))?Number(settings.countdownSeconds):DEFAULT_SETTINGS.countdownSeconds,
    restSeconds:[0,15,30,45].includes(Number(settings.restSeconds))?Number(settings.restSeconds):DEFAULT_SETTINGS.restSeconds,
    sound:typeof settings.sound==='boolean'?settings.sound:DEFAULT_SETTINGS.sound,
    autoNext:typeof settings.autoNext==='boolean'?settings.autoNext:DEFAULT_SETTINGS.autoNext,
    weeklyGoalDays:Number.isInteger(Number(settings.weeklyGoalDays))
      ?Math.min(7,Math.max(1,Number(settings.weeklyGoalDays)))
      :DEFAULT_SETTINGS.weeklyGoalDays
  });

  const normalizeTimer=(timer={})=>({
    duration:Number.isFinite(Number(timer.duration))?Math.max(10,Number(timer.duration)):null,
    remaining:Number.isFinite(Number(timer.remaining))?Math.max(0,Number(timer.remaining)):null,
    running:Boolean(timer.running),
    endAt:Number.isFinite(Number(timer.endAt))?Number(timer.endAt):null
  });

  const normalizeRoutine=(routine={})=>{
    const next=blankRoutine();
    next.step=Math.max(0,Number(routine.step)||0);
    next.completedUntil=Math.max(0,Number(routine.completedUntil)||0);
    next.completed=Boolean(routine.completed);
    next.startedAt=routine.startedAt||null;
    next.completedAt=routine.completedAt||null;
    const timers=routine.timers&&typeof routine.timers==='object'?routine.timers:{};
    Object.entries(timers).forEach(([id,timer])=>{next.timers[id]=normalizeTimer(timer);});
    return next;
  };

  const normalizeDay=(day={})=>{
    const routines=day.routines&&typeof day.routines==='object'?day.routines:{};
    const normalized={routines:{}};
    ROUTINE_KEYS.forEach(key=>{normalized.routines[key]=normalizeRoutine(routines[key]);});
    Object.keys(routines).forEach(key=>{
      if(!normalized.routines[key])normalized.routines[key]=normalizeRoutine(routines[key]);
    });
    return normalized;
  };

  const normalizeState=(raw={})=>{
    const next={version:2,settings:normalizeSettings(raw.settings),days:{}};
    const days=raw.days&&typeof raw.days==='object'?raw.days:{};
    Object.entries(days).forEach(([date,day])=>{next.days[date]=normalizeDay(day);});
    return next;
  };

  const readJson=key=>{
    try{
      const raw=localStorage.getItem(key);
      return raw?JSON.parse(raw):null;
    }catch{return null;}
  };

  const migrateLegacy=()=>{
    const legacy=readJson(LEGACY_KEY);
    if(!legacy)return {version:2,settings:normalizeSettings(),days:{}};
    const next=normalizeState(legacy);
    const date=todayKey();
    if(!next.days[date])next.days[date]=normalizeDay();
    if(legacy.timers&&typeof legacy.timers==='object'){
      Object.entries(legacy.timers).forEach(([routineKey,timers])=>{
        if(!next.days[date].routines[routineKey])next.days[date].routines[routineKey]=blankRoutine();
        if(timers&&typeof timers==='object'){
          Object.entries(timers).forEach(([id,timer])=>{
            next.days[date].routines[routineKey].timers[id]=normalizeTimer(timer);
          });
        }
      });
    }
    return next;
  };

  let state=normalizeState(readJson(KEY)||migrateLegacy());

  const ensureDay=(date=todayKey())=>{
    if(!state.days[date])state.days[date]=normalizeDay();
    return state.days[date];
  };

  const ensureRoutine=(routineKey,date=todayKey())=>{
    const day=ensureDay(date);
    if(!day.routines[routineKey])day.routines[routineKey]=blankRoutine();
    return day.routines[routineKey];
  };

  const save=()=>{
    try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}
  };

  const getTimer=(routineKey,exerciseId,defaultDuration,date=todayKey())=>{
    const routine=ensureRoutine(routineKey,date);
    if(!routine.timers)routine.timers={};
    if(!routine.timers[exerciseId]){
      routine.timers[exerciseId]={
        duration:defaultDuration,
        remaining:defaultDuration,
        running:false,
        endAt:null
      };
    }
    const timer=routine.timers[exerciseId];
    if(!Number.isFinite(timer.duration)||timer.duration<10)timer.duration=defaultDuration;
    if(!Number.isFinite(timer.remaining))timer.remaining=timer.duration;
    timer.remaining=Math.max(0,timer.remaining);
    if(timer.running&&timer.endAt){
      timer.remaining=Math.max(0,Math.ceil((timer.endAt-Date.now())/1000));
    }
    return timer;
  };

  const getSettings=()=>state.settings;
  const updateSettings=patch=>{
    state.settings=normalizeSettings({...state.settings,...patch});
    save();
    return state.settings;
  };

  const resetToday=()=>{
    state.days[todayKey()]=normalizeDay();
    save();
  };

  const exportState=()=>JSON.stringify(state,null,2);

  const importState=input=>{
    const parsed=typeof input==='string'?JSON.parse(input):input;
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('INVALID_STATE');
    state=normalizeState(parsed);
    ensureDay();
    save();
    return state;
  };

  ensureDay();
  save();

  window.DailyMotionState={
    KEY,
    ROUTINE_KEYS,
    todayKey,
    getState:()=>state,
    getDay:ensureDay,
    getRoutine:ensureRoutine,
    getTimer,
    getSettings,
    updateSettings,
    exportState,
    importState,
    save,
    resetToday
  };
})();
