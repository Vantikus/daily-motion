(function DailyMotionStateModule(){
  const KEY='dailyMotionState.v3';
  const LEGACY_KEYS=['dailyMotionState.v2','dailyMotionState.v1'];
  const ROUTINE_KEYS=['morning','day','evening'];
  const DEFAULT_SETTINGS={countdownSeconds:3,restSeconds:15,sound:true,autoNext:false,theme:'system'};
  const isRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const record=value=>isRecord(value)?value:{};
  const safeKey=key=>!['__proto__','constructor','prototype'].includes(key);
  const finiteNumber=value=>{
    if(typeof value!=='number'&&(typeof value!=='string'||!value.trim()))return null;
    const number=Number(value);
    return Number.isFinite(number)?number:null;
  };

  const todayKey=(date=new Date())=>{
    const d=new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const validDayKey=key=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(key))return false;
    const date=new Date(`${key}T12:00:00`);
    return Number.isFinite(date.getTime())&&todayKey(date)===key;
  };

  const blankRoutine=()=>({
    step:0,completedUntil:0,completed:false,startedAt:null,completedAt:null,activeSeconds:0,effort:null,timers:{}
  });

  const normalizeSettings=input=>{
    const settings=record(input);
    const countdown=finiteNumber(settings.countdownSeconds);
    const rest=finiteNumber(settings.restSeconds);
    return {
      countdownSeconds:[0,3,5].includes(countdown)?countdown:DEFAULT_SETTINGS.countdownSeconds,
      restSeconds:[0,15,30,45].includes(rest)?rest:DEFAULT_SETTINGS.restSeconds,
      sound:typeof settings.sound==='boolean'?settings.sound:DEFAULT_SETTINGS.sound,
      autoNext:typeof settings.autoNext==='boolean'?settings.autoNext:DEFAULT_SETTINGS.autoNext,
      theme:['system','light','dark'].includes(settings.theme)?settings.theme:DEFAULT_SETTINGS.theme
    };
  };

  const normalizeTimer=input=>{
    const timer=record(input);
    const duration=finiteNumber(timer.duration);
    const remaining=finiteNumber(timer.remaining);
    const endAt=finiteNumber(timer.endAt);
    const runStartedAt=finiteNumber(timer.runStartedAt);
    const running=timer.running===true&&endAt!==null;
    return {
      duration:duration===null?null:Math.max(10,duration),
      remaining:remaining===null?null:Math.max(0,remaining),
      running,
      paused:!running&&(timer.paused===true||(timer.running===true&&remaining>0)),
      endAt:running?endAt:null,
      runStartedAt:running?runStartedAt:null
    };
  };

  const normalizeRoutine=input=>{
    const routine=record(input);
    const next=blankRoutine();
    next.step=Math.max(0,Math.floor(finiteNumber(routine.step)||0));
    next.completedUntil=Math.max(0,Math.floor(finiteNumber(routine.completedUntil)||0));
    next.completed=routine.completed===true;
    next.startedAt=typeof routine.startedAt==='string'?routine.startedAt:null;
    next.completedAt=typeof routine.completedAt==='string'?routine.completedAt:null;
    next.effort=['easy','right','hard'].includes(routine.effort)?routine.effort:null;
    next.activeSeconds=Math.max(0,finiteNumber(routine.activeSeconds)||0);
    Object.entries(record(routine.timers)).forEach(([id,timer])=>{
      if(safeKey(id)&&isRecord(timer))next.timers[id]=normalizeTimer(timer);
    });
    return next;
  };

  const normalizeDay=input=>{
    const routines=record(record(input).routines);
    const normalized={routines:{}};
    ROUTINE_KEYS.forEach(key=>{normalized.routines[key]=normalizeRoutine(routines[key]);});
    Object.keys(routines).forEach(key=>{
      if(safeKey(key)&&!normalized.routines[key])normalized.routines[key]=normalizeRoutine(routines[key]);
    });
    return normalized;
  };

  const normalizeState=input=>{
    const raw=record(input);
    const next={
      version:3,
      settings:normalizeSettings(raw.settings),
      programVersions:{...record(raw.programVersions)},
      days:{}
    };
    const days=record(raw.days);
    const current=todayKey();
    Object.entries(days).forEach(([date,day])=>{
      if(!validDayKey(date))return;
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
      const parsed=raw?JSON.parse(raw):null;
      return isRecord(parsed)?parsed:null;
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
    if(legacyKey==='dailyMotionState.v1'&&isRecord(legacy.timers)){
      const date=todayKey();
      if(!next.days[date])next.days[date]=normalizeDay();
      Object.entries(legacy.timers).forEach(([routineKey,timers])=>{
        if(!safeKey(routineKey))return;
        if(!next.days[date].routines[routineKey])next.days[date].routines[routineKey]=blankRoutine();
        if(isRecord(timers)){
          Object.entries(timers).forEach(([id,timer])=>{
            if(safeKey(id)&&isRecord(timer))next.days[date].routines[routineKey].timers[id]=normalizeTimer(timer);
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
  let persistenceError=null;
  const getPersistenceStatus=()=>({ok:persistenceError===null,error:persistenceError});
  const setPersistenceError=error=>{
    if(persistenceError===error)return;
    persistenceError=error;
    window.dispatchEvent(new CustomEvent('daily-motion-storage-status-change',{detail:getPersistenceStatus()}));
  };
  const persistState=next=>{
    try{
      localStorage.setItem(KEY,JSON.stringify(next));
      setPersistenceError(null);
      return true;
    }catch{
      setPersistenceError('STORAGE_WRITE_FAILED');
      return false;
    }
  };
  const save=()=>persistState(state);

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
    const duration=finiteNumber(timer?.duration);
    const remaining=finiteNumber(timer?.remaining);
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
    if(!isRecord(parsed))throw new Error('INVALID_STATE');
    const next=normalizeState(parsed);
    const date=todayKey();
    if(!next.days[date])next.days[date]=normalizeDay();
    if(!persistState(next))throw new Error('STATE_SAVE_FAILED');
    state=next;
    return state;
  };

  let externalChange=false;
  let pendingExternalState=null;
  const canReloadPage=()=>{
    try{
      return window.DailyMotionReloadGuard?.isSafe?.()!==false;
    }catch{
      return false;
    }
  };

  window.addEventListener('storage',event=>{
    if(event.key!==KEY||!event.newValue)return;
    try{
      const parsed=JSON.parse(event.newValue);
      if(!isRecord(parsed))return;
      const nextState=normalizeState(parsed);
      externalChange=true;
      if(canReloadPage()){
        state=nextState;
        if(document.visibilityState==='visible')setTimeout(()=>location.reload(),0);
      }else{
        pendingExternalState=nextState;
      }
    }catch{}
  });

  const bootDayKey=todayKey();
  const checkDayBoundary=()=>{
    if(!externalChange&&todayKey()===bootDayKey)return;
    if(!canReloadPage())return;
    if(pendingExternalState){
      state=pendingExternalState;
      pendingExternalState=null;
    }
    location.reload();
  };
  window.addEventListener('focus',checkDayBoundary);
  window.addEventListener('daily-motion-reload-safety-change',checkDayBoundary);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')checkDayBoundary();
  });
  setInterval(()=>{
    if(document.visibilityState==='visible')checkDayBoundary();
  },60000);

  window.DailyMotionState={
    todayKey,EFFORT_LABELS,formatActiveTime,
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
    ensureProgramVersion,
    exportState,
    importState,
    save,
    getPersistenceStatus,
    resetToday,
    resetRoutine
  };
})();
