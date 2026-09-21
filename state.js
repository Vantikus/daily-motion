(function DailyMotionStateModule(){
  const KEY='dailyMotionState.v3';
  const LEGACY_KEYS=['dailyMotionState.v2','dailyMotionState.v1'];
  const ROUTINE_KEYS=['morning','day','evening'];
  const DEFAULT_SETTINGS={countdownSeconds:3,restSeconds:15,sound:true,autoNext:false};

  const todayKey=(date=new Date())=>{
    const d=new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  const blankRoutine=()=>({
    step:0,completedUntil:0,completed:false,startedAt:null,completedAt:null,activeSeconds:0,effort:null,timers:{}
  });

  const normalizeSettings=(settings={})=>({
    countdownSeconds:[0,3,5].includes(Number(settings.countdownSeconds))?Number(settings.countdownSeconds):DEFAULT_SETTINGS.countdownSeconds,
    restSeconds:[0,15,30,45].includes(Number(settings.restSeconds))?Number(settings.restSeconds):DEFAULT_SETTINGS.restSeconds,
    sound:typeof settings.sound==='boolean'?settings.sound:DEFAULT_SETTINGS.sound,
    autoNext:typeof settings.autoNext==='boolean'?settings.autoNext:DEFAULT_SETTINGS.autoNext
  });

  const normalizeTimer=(timer={})=>({
    duration:Number.isFinite(Number(timer.duration))?Math.max(10,Number(timer.duration)):null,
    remaining:Number.isFinite(Number(timer.remaining))?Math.max(0,Number(timer.remaining)):null,
    running:Boolean(timer.running),
    paused:Boolean(timer.paused)&&!timer.running,
    endAt:Number.isFinite(Number(timer.endAt))?Number(timer.endAt):null,
    runStartedAt:Number.isFinite(Number(timer.runStartedAt))?Number(timer.runStartedAt):null
  });

  const normalizeRoutine=(routine={})=>{
    const next=blankRoutine();
    next.step=Math.max(0,Math.floor(Number(routine.step)||0));
    next.completedUntil=Math.max(0,Math.floor(Number(routine.completedUntil)||0));
    next.completed=Boolean(routine.completed);
    next.startedAt=routine.startedAt||null;
    next.completedAt=routine.completedAt||null;
    next.effort=['easy','right','hard'].includes(routine.effort)?routine.effort:null;
    next.activeSeconds=Math.max(0,Number(routine.activeSeconds)||0);
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
    const next={
      version:3,
      settings:normalizeSettings(raw.settings),
      programVersions:raw.programVersions&&typeof raw.programVersions==='object'?{...raw.programVersions}:{},
      days:{}
    };
    const days=raw.days&&typeof raw.days==='object'?raw.days:{};
    const current=todayKey();
    Object.entries(days).forEach(([date,day])=>{
      next.days[date]=normalizeDay(day);
      if(date!==current){
        Object.values(next.days[date].routines||{}).forEach(routine=>{
          Object.values(routine.timers||{}).forEach(timer=>{
            timer.running=false;
            timer.endAt=null;
            timer.runStartedAt=null;
          });
        });
      }
    });
    return next;
  };

  const readJson=key=>{
    try{
      const raw=localStorage.getItem(key);
      return raw?JSON.parse(raw):null;
    }catch{return null;}
  };

  const migrateLegacy=()=>{
    let legacy=null;
    let legacyKey=null;
    for(const key of LEGACY_KEYS){
      legacy=readJson(key);
      if(legacy){legacyKey=key;break;}
    }
    if(!legacy)return normalizeState();
    const next=normalizeState(legacy);
    if(legacyKey==='dailyMotionState.v1'&&legacy.timers&&typeof legacy.timers==='object'){
      const date=todayKey();
      if(!next.days[date])next.days[date]=normalizeDay();
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
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}};

  const getTimer=(routineKey,exerciseId,defaultDuration,date=todayKey())=>{
    const routine=ensureRoutine(routineKey,date);
    if(!routine.timers)routine.timers={};
    if(!routine.timers[exerciseId]){
      routine.timers[exerciseId]={duration:defaultDuration,remaining:defaultDuration,running:false,paused:false,endAt:null,runStartedAt:null};
    }
    const timer=routine.timers[exerciseId];
    if(!Number.isFinite(timer.duration)||timer.duration<10)timer.duration=defaultDuration;
    if(!Number.isFinite(timer.remaining))timer.remaining=timer.duration;
    timer.remaining=Math.max(0,timer.remaining);
    if(timer.running&&timer.endAt){
      timer.remaining=Math.max(0,Math.ceil((timer.endAt-Date.now())/1000));
      if(!Number.isFinite(timer.runStartedAt))timer.runStartedAt=Date.now();
    }
    return timer;
  };

  const EFFORT_LABELS={easy:'Легко',right:'В самый раз',hard:'Тяжело'};
  const formatActiveTime=seconds=>{
    const value=Math.max(0,Math.floor(Number(seconds)||0));
    const minutes=Math.floor(value/60);
    return minutes?`${minutes} мин ${String(value%60).padStart(2,'0')} сек`:`${value} сек`;
  };

  const normalizeRoutineKeys=routineKeys=>{
    const keys=Array.isArray(routineKeys)&&routineKeys.length?routineKeys:ROUTINE_KEYS;
    return [...new Set(keys.filter(key=>typeof key==='string'&&key))];
  };
  const getRoutineEntries=(day,routineKeys=ROUTINE_KEYS)=>{
    const routines=day?.routines&&typeof day.routines==='object'?day.routines:{};
    return normalizeRoutineKeys(routineKeys)
      .map(key=>[key,routines[key]])
      .filter(([,routine])=>Boolean(routine));
  };
  const timerElapsedSeconds=timer=>{
    const duration=Number(timer?.duration);
    const remaining=Number(timer?.remaining);
    if(!Number.isFinite(duration)||duration<=0||!Number.isFinite(remaining))return 0;
    return Math.max(0,Math.min(duration,duration-remaining));
  };
  const getRoutineActiveSeconds=routine=>{
    const recorded=Math.max(0,Number(routine?.activeSeconds)||0);
    if(recorded>0)return recorded;
    return Object.values(routine?.timers||{}).reduce((sum,timer)=>sum+timerElapsedSeconds(timer),0);
  };
  const hasCompletedRoutine=(day,routineKeys=ROUTINE_KEYS)=>
    getRoutineEntries(day,routineKeys).some(([,routine])=>Boolean(routine.completed));
  const hasRoutineActivity=(day,routineKeys=ROUTINE_KEYS)=>
    getRoutineEntries(day,routineKeys).some(([,routine])=>
      Boolean(routine.completed)||
      (Number(routine.completedUntil)||0)>0||
      getRoutineActiveSeconds(routine)>0
    );
  const getCurrentStreak=(routineKeys=ROUTINE_KEYS,maxDays=730)=>{
    let count=0;
    const date=new Date();
    date.setHours(12,0,0,0);
    if(!hasCompletedRoutine(state.days[todayKey(date)],routineKeys))date.setDate(date.getDate()-1);
    for(let i=0;i<Math.max(1,Number(maxDays)||730);i++){
      const day=state.days[todayKey(date)];
      if(!hasCompletedRoutine(day,routineKeys))break;
      count++;
      date.setDate(date.getDate()-1);
    }
    return count;
  };
  const getBestStreak=(routineKeys=ROUTINE_KEYS)=>{
    const dates=Object.keys(state.days)
      .filter(key=>hasCompletedRoutine(state.days[key],routineKeys))
      .sort();
    let best=0;
    let current=0;
    let previous=null;
    for(const key of dates){
      const date=new Date(`${key}T12:00:00`);
      if(Number.isNaN(date.getTime()))continue;
      if(previous){
        const diff=Math.round((date-previous)/86400000);
        current=diff===1?current+1:1;
      }else{
        current=1;
      }
      best=Math.max(best,current);
      previous=date;
    }
    return best;
  };
  const getCompletedRoutineCount=(routineKeys=ROUTINE_KEYS)=>
    Object.values(state.days).reduce(
      (sum,day)=>sum+getRoutineEntries(day,routineKeys).filter(([,routine])=>routine.completed).length,
      0
    );
  const getTotalActiveSeconds=(routineKeys=ROUTINE_KEYS)=>
    Object.values(state.days).reduce(
      (sum,day)=>sum+getRoutineEntries(day,routineKeys)
        .reduce((daySum,[,routine])=>daySum+getRoutineActiveSeconds(routine),0),
      0
    );
  const getSettings=()=>state.settings;
  const updateSettings=patch=>{
    state.settings=normalizeSettings({...state.settings,...patch});
    save();
    return state.settings;
  };
  const getProgramVersion=routineKey=>state.programVersions?.[routineKey]||null;
  const setProgramVersion=(routineKey,version)=>{
    if(!state.programVersions||typeof state.programVersions!=='object')state.programVersions={};
    state.programVersions[routineKey]=String(version);
    save();
    return state.programVersions[routineKey];
  };
  const ensureProgramVersion=(routineKey,version,date=todayKey())=>{
    const nextVersion=String(version);
    const previous=getProgramVersion(routineKey);
    if(previous===nextVersion)return {changed:false,reset:false,previous,current:nextVersion};

    const routine=ensureRoutine(routineKey,date);
    const hasInProgress=!routine.completed&&(
      (Number(routine.step)||0)>0||
      (Number(routine.completedUntil)||0)>0||
      (Number(routine.activeSeconds)||0)>0||
      Object.keys(routine.timers||{}).length>0||
      Boolean(routine.startedAt)
    );

    if(previous!==null&&hasInProgress){
      const fresh=blankRoutine();
      Object.keys(routine).forEach(key=>delete routine[key]);
      Object.assign(routine,fresh);
    }

    if(!state.programVersions||typeof state.programVersions!=='object')state.programVersions={};
    state.programVersions[routineKey]=nextVersion;
    save();
    return {changed:true,reset:previous!==null&&hasInProgress,previous,current:nextVersion};
  };
  const resetToday=()=>{state.days[todayKey()]=normalizeDay();save();};
  const resetRoutine=(routineKey,date=todayKey())=>{
    const routine=ensureRoutine(routineKey,date);
    const fresh=blankRoutine();
    Object.keys(routine).forEach(key=>delete routine[key]);
    Object.assign(routine,fresh);
    save();
    return routine;
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

  let externalChange=false;
  window.addEventListener('storage',event=>{
    if(event.key!==KEY||!event.newValue)return;
    try{
      state=normalizeState(JSON.parse(event.newValue));
      externalChange=true;
      if(document.visibilityState==='visible')setTimeout(()=>location.reload(),0);
    }catch{}
  });

  const bootDayKey=todayKey();
  const checkDayBoundary=()=>{
    if(externalChange||todayKey()!==bootDayKey)location.reload();
  };
  window.addEventListener('focus',checkDayBoundary);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')checkDayBoundary();
  });
  setInterval(()=>{
    if(document.visibilityState==='visible')checkDayBoundary();
  },60000);

  window.DailyMotionState={
    KEY,ROUTINE_KEYS,todayKey,EFFORT_LABELS,formatActiveTime,
    getRoutineEntries,
    getRoutineActiveSeconds,
    hasCompletedRoutine,
    hasRoutineActivity,
    getCurrentStreak,
    getBestStreak,
    getCompletedRoutineCount,
    getTotalActiveSeconds,
    getState:()=>state,
    getDay:ensureDay,
    getRoutine:ensureRoutine,
    getTimer,
    getSettings,
    updateSettings,
    getProgramVersion,
    setProgramVersion,
    ensureProgramVersion,
    exportState,
    importState,
    save,
    resetToday,
    resetRoutine
  };
})();
