window.DailyMotionPages=window.DailyMotionPages||{};
window.DailyMotionPages.session=function mountSession(){
  const ROUTINE_KEY=new URLSearchParams(location.search).get('routine')||'morning';
  const exercises=window.DailyMotionProgram.morning;
  const Store=window.DailyMotionState;
  const UI=window.DailyMotionUI;
  const SessionView=window.DailyMotionSessionView;
  if(!SessionView)throw new Error('Daily Motion session view runtime is missing');

  // Lifecycle / shared session state.
  const lifecycle=UI.createLifecycle();
  const {listen,defer,cancelDeferred,frame}=lifecycle;
  let destroyed=false;
  const $=selector=>document.querySelector(selector);
  const pageLoader=$('#pageLoader');
  let pageLoaderRevealTimer=defer(()=>{
    pageLoaderRevealTimer=null;
    if(destroyed||!pageLoader)return;
    pageLoader.classList.add('is-visible');
    pageLoader.setAttribute('aria-hidden','false');
  },180);
  const finishPageLoader=()=>{
    if(pageLoaderRevealTimer!==null){
      cancelDeferred(pageLoaderRevealTimer);
      pageLoaderRevealTimer=null;
    }
    if(!pageLoader)return;
    pageLoader.classList.remove('is-visible');
    pageLoader.setAttribute('aria-hidden','true');
  };

  if(ROUTINE_KEY!=='morning'){
    const names={day:'День',evening:'Вечер'};
    $('#routineName').textContent=names[ROUTINE_KEY]||'Комплекс';
    $('.session-nav').style.display='none';
    $('.exercise-main').innerHTML=`
      <div class="stage-placeholder">
        <span class="status-pill">Следующий этап</span>
        <h1>${names[ROUTINE_KEY]||'Этот комплекс'} пока не собран</h1>
        <p>Сейчас полностью прорабатывается основной сценарий тренировки. Состав этого комплекса будет добавлен отдельным этапом.</p>
        <a class="primary-button stage-placeholder__button" href="index.html">На главную</a>
      </div>`;
    frame(()=>{
      if(destroyed)return;
      document.documentElement.classList.add('session-ready');
      finishPageLoader();
    });
    return ()=>{
      destroyed=true;
      lifecycle.abort();
      if(pageLoaderRevealTimer!==null)cancelDeferred(pageLoaderRevealTimer);
      document.documentElement.classList.remove('session-ready');
      document.body.classList.remove('modal-open');
    };
  }

  const PROGRAM_VERSION='morning-v3-active-2026-09-19';
  const programVersionState=Store.ensureProgramVersion(ROUTINE_KEY,PROGRAM_VERSION);

  const routine=Store.getRoutine(ROUTINE_KEY);
  let settings=Store.getSettings();
  routine.step=Math.max(0,Math.min(Number(routine.step)||0,exercises.length-1));

  let resumeRequested=new URLSearchParams(location.search).get('resume')==='1';
  try{
    const queuedRoutine=sessionStorage.getItem('dm-resume-routine');
    if(queuedRoutine===ROUTINE_KEY)resumeRequested=true;
    if(queuedRoutine!==null)sessionStorage.removeItem('dm-resume-routine');
  }catch{}

  if(resumeRequested&&!routine.completed){
    routine.step=Math.min(exercises.length-1,Math.max(routine.step,routine.completedUntil||0));
  }

  const resumedFromStep=!routine.completed&&(routine.step>0||routine.completedUntil>0||routine.activeSeconds>0)?routine.step:null;
  let current=routine.step;
  let tickerFrame=null;
  let wakeLock=null;
  let wakeLockRequest=0;
  let lastFinishState=current===exercises.length-1;
  let countdownTimer=null;
  let restTimer=null;
  let restFinish=null;
  let lastExerciseCueKey=null;
  let lastRestCueSecond=null;
  let executionStage='idle';
  let stageTimer=null;
  let stageTransitionToken=0;
  let earlyFinishPending=false;
  let executionHideToken=0;
  const Audio=window.DailyMotionAudio;
  const Motion=window.DailyMotionMotion;
  const MotionTokens=Motion?.tokens||{
    microMs:160,enterMs:220,exitMs:140,emphasisMs:280,
    easeEnter:'cubic-bezier(.16,.82,.24,1)',
    easeStandard:'cubic-bezier(.2,.72,.2,1)',
    easeExit:'cubic-bezier(.4,0,1,1)'
  };
  const appleMobileMotion=/iP(?:hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const exerciseApp=$('.exercise-app');
  const executionShell=$('.execution-shell');
  const executionTop=$('.execution-top');
  if(appleMobileMotion){
    executionShell?.style.setProperty('animation','none','important');
    executionTop?.style.setProperty('animation','none','important');
  }
  let modalReturnFocus=null;

  // Reload safety / modal ownership.
  const hasWorkoutActivity=()=>{
    const timerActivity=Object.values(routine.timers||{}).some(timer=>
      Boolean(timer?.running)||
      Boolean(timer?.paused)||
      (
        Number.isFinite(Number(timer?.duration))&&
        Number.isFinite(Number(timer?.remaining))&&
        Number(timer.remaining)<Number(timer.duration)
      )
    );
    return !routine.completed&&(
      executionStage!=='idle'||
      Boolean(routine.startedAt)||
      (Number(routine.step)||0)>0||
      (Number(routine.completedUntil)||0)>0||
      (Number(routine.activeSeconds)||0)>0||
      timerActivity
    );
  };
  const isReloadSafe=()=>{
    const modalVisible=Boolean(document.querySelector(
      '.execution-overlay.is-visible,.routine-settings-overlay.is-visible,.completion-overlay.is-visible'
    ));
    return !modalVisible&&!hasWorkoutActivity();
  };
  const emitReloadSafetyChange=()=>window.dispatchEvent(new CustomEvent('daily-motion-reload-safety-change'));
  window.DailyMotionReloadGuard={isSafe:isReloadSafe};

  const toastController=UI.createToast($('#toast'),{duration:1700});
  const toast=toastController.show;

  const haptic=(kind='tap')=>{
    if(!navigator.vibrate)return;
    const patterns={tap:10,soft:16,next:[14,28,14],success:[40,45,90]};
    try{navigator.vibrate(patterns[kind]||10);}catch{}
  };

  const unlockAudio=()=>settings.sound?Audio?.unlock?.():Promise.resolve(false);
  const sound=kind=>{
    if(!settings.sound)return;
    Audio?.[kind]?.();
  };

  const animateValue=node=>{
    if(!node||appleMobileMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    node.animate(
      [{transform:'translateY(3px)',opacity:.55},{transform:'translateY(0)',opacity:1}],
      {duration:MotionTokens.microMs,easing:MotionTokens.easeStandard}
    );
  };

  const animateCountdownValue=(node,{launch=false}={})=>{
    if(!node||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    node.getAnimations?.().forEach(animation=>animation.cancel());
    animateExecutionNode(node,
      launch
        ?[
          {transform:'translate3d(0,5px,0) scale(.9)',opacity:.36},
          {transform:'translate3d(0,-1px,0) scale(1.035)',opacity:1,offset:.72},
          {transform:'translate3d(0,0,0) scale(1)',opacity:1}
        ]
        :[
          {transform:'translate3d(0,5px,0) scale(.88)',opacity:.3},
          {transform:'translate3d(0,-1px,0) scale(1.025)',opacity:1,offset:.72},
          {transform:'translate3d(0,0,0) scale(1)',opacity:1}
        ],
      {duration:launch?235:215,easing:launch?MotionTokens.easeEmphasized:MotionTokens.easeEnter}
    );
  };

  const animateTimerState=()=>{
    if(appleMobileMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const nodes=[$('#timerValue'),$('#timerLabel'),$('#timerState')];
    nodes.filter(Boolean).forEach((node,index)=>{
      node.getAnimations?.().forEach(animation=>animation.cancel());
      node.animate(
        [{transform:'translate3d(0,2px,0)',opacity:.58},{transform:'translate3d(0,0,0)',opacity:1}],
        {duration:150+index*12,easing:MotionTokens.easeEnter}
      );
    });
  };

  const timerData=exercise=>Store.getTimer(ROUTINE_KEY,exercise.id,exercise.seconds);
  const sessionView=SessionView.create({
    exercises,
    routine,
    getCurrent:()=>current,
    getTimer:()=>timerData(exercises[current]),
    motionTokens:MotionTokens,
    haptic,
    signal:lifecycle.signal
  });

  const accountTimerRun=(timer,stop=true)=>{
    if(!timer?.running)return;
    const now=Date.now();
    const started=Number(timer.runStartedAt);
    if(Number.isFinite(started)){
      const end=Number(timer.endAt);
      const until=Number.isFinite(end)?Math.min(now,end):now;
      const elapsed=Math.max(0,(until-started)/1000);
      if(elapsed>0)routine.activeSeconds=(Number(routine.activeSeconds)||0)+elapsed;
    }
    timer.runStartedAt=stop?null:now;
  };
  const fmt=seconds=>{
    const value=Math.max(0,Math.round(seconds));
    return `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
  };
  const formatStreakDays=count=>{
    const value=Math.max(0,Math.floor(Number(count)||0));
    const mod100=value%100;
    const mod10=value%10;
    const label=mod100>=11&&mod100<=14?'дней':mod10===1?'день':mod10>=2&&mod10<=4?'дня':'дней';
    return `${value} ${label}`;
  };

  const formatCompletionTime=seconds=>{
    const value=Math.max(0,Math.round(Number(seconds)||0));
    const minutes=Math.floor(value/60);
    const secs=value%60;
    return `${minutes}:${String(secs).padStart(2,'0')}`;
  };

  async function requestWakeLock(){
    if(destroyed||document.visibilityState==='hidden'||!('wakeLock' in navigator))return;
    const request=++wakeLockRequest;
    try{
      const lock=await navigator.wakeLock.request('screen');
      if(destroyed||request!==wakeLockRequest||document.visibilityState==='hidden'){
        await lock.release();
        return;
      }
      wakeLock=lock;
    }catch{}
  }

  async function releaseWakeLock(){
    wakeLockRequest++;
    const lock=wakeLock;
    wakeLock=null;
    if(!lock)return;
    try{await lock.release();}catch{}
  }

  function stopTicker(){
    if(tickerFrame!==null){
      cancelAnimationFrame(tickerFrame);
      tickerFrame=null;
    }
  }

  function visibleModal(){
    return document.querySelector('.execution-overlay.is-visible,.routine-settings-overlay.is-visible,.completion-overlay.is-visible');
  }

  function syncModalState(){
    const hasModal=Boolean(visibleModal());
    if(exerciseApp)exerciseApp.inert=hasModal;
    document.body.classList.toggle('modal-open',hasModal);
  }

  // Workout settings sheet.
  const workoutSettingsBinding=UI.bindSettingsControls({
    store:Store,
    audio:Audio,
    theme:window.DailyMotionTheme,
    signal:lifecycle.signal,
    elements:{
      sound:$('#workoutSoundSetting'),
      autoNext:$('#workoutAutoNextSetting'),
      countdown:$('#workoutCountdownSetting'),
      rest:$('#workoutRestSetting'),
      countdownButtons:$('#workoutCountdownSettingDesktop'),
      restButtons:$('#workoutRestSettingDesktop'),
      themeButtons:$('#workoutThemeSetting')
    },
    onChange:value=>{settings=value;}
  });
  const syncWorkoutSettingsControls=()=>workoutSettingsBinding?.sync?.();

  const routineResetBlock=$('#routineResetBlock');
  const routineResetBtn=$('#routineResetBtn');
  const routineResetConfirm=$('#routineResetConfirm');
  const routineResetCancel=$('#routineResetCancel');
  const routineResetAccept=$('#routineResetAccept');
  let routineResetInFlight=false;
  const routineResetConfirmFlow=UI.createConfirmFlow({
    block:routineResetBlock,
    panel:routineResetConfirm,
    trigger:routineResetBtn,
    accept:routineResetAccept
  });
  const hideRoutineResetConfirm=(restoreFocus=false,delay=0)=>routineResetConfirmFlow.hide(restoreFocus,delay);
  const showRoutineResetConfirm=()=>routineResetConfirmFlow.show();

  function finishRoutineSettingsClose(){
    const overlay=$('#routineSettingsOverlay');
    if(!overlay)return;
    overlay.setAttribute('aria-hidden','true');
    hideRoutineResetConfirm(false);
    routineResetInFlight=false;
    syncModalState();
    emitReloadSafetyChange();
    if(!visibleModal()&&modalReturnFocus?.isConnected){
      modalReturnFocus.focus({preventScroll:true});
      modalReturnFocus=null;
    }
  }

  const routineSettingsOverlay=$('#routineSettingsOverlay');
  const routineSettingsSheet=routineSettingsOverlay?.querySelector('.routine-settings-sheet');
  const routineSettingsHandle=routineSettingsOverlay?.querySelector('.routine-settings-sheet__handle');
  const routineSettingsMotion=window.DailyMotionMotion?.createBottomSheet?.({
    overlay:routineSettingsOverlay,
    sheet:routineSettingsSheet,
    handle:routineSettingsHandle,
    onBeforeClose:()=>$('#routineMoreButton')?.setAttribute('aria-expanded','false'),
    onClosed:finishRoutineSettingsClose,
    onOpened:()=>$('#routineSettingsClose')?.focus({preventScroll:true})
  });

  function showRoutineSettingsDialog(){
    const overlay=routineSettingsOverlay;
    if(!overlay)return;
    syncWorkoutSettingsControls();
    hideRoutineResetConfirm(false);
    modalReturnFocus=document.activeElement;
    $('#routineMoreButton')?.setAttribute('aria-expanded','true');

    if(routineSettingsMotion){
      routineSettingsMotion.open();
      syncModalState();
      emitReloadSafetyChange();
      return;
    }

    overlay.setAttribute('aria-hidden','false');
    overlay.classList.add('is-visible');
    syncModalState();
    emitReloadSafetyChange();
    $('#routineSettingsClose')?.focus({preventScroll:true});
  }

  function hideRoutineSettingsDialog(){
    const overlay=routineSettingsOverlay;
    if(!overlay||!overlay.classList.contains('is-visible'))return;
    $('#routineMoreButton')?.setAttribute('aria-expanded','false');

    if(routineSettingsMotion){
      routineSettingsMotion.close();
      return;
    }

    overlay.classList.remove('is-visible');
    finishRoutineSettingsClose();
  }


  function resetRoutineProgress(){
    cancelCountdown();
    cancelRest();
    stopTicker();
    releaseWakeLock();

    Store.resetRoutine(ROUTINE_KEY);
    current=0;
    lastFinishState=false;
    Store.save();

    haptic('soft');
    render('back','smooth');
    emitReloadSafetyChange();
    toast('Прогресс тренировки сброшен');
  }

  // Fullscreen execution stage choreography.
  function setExecutionCopy(){
    const exercise=exercises[current];
    $('#executionMeta').textContent=`Утро · ${current+1} из ${exercises.length}`;
    $('#executionTitle').textContent=exercise.title;
    $('#executionCountdownTitle').textContent=exercise.title;
    $('#executionKey').textContent=exercise.key;
  }

  const executionStages=()=>({
    countdown:$('#executionCountdownStage'),
    timer:$('#timerCard'),
    rest:$('#executionRestStage')
  });

  const prefersReducedMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let executionStageAnimations=[];

  function forgetExecutionAnimation(animation){
    executionStageAnimations=executionStageAnimations.filter(item=>item!==animation);
  }

  function trackExecutionAnimation(animation){
    if(!animation)return null;
    executionStageAnimations.push(animation);
    animation.finished.then(
      ()=>forgetExecutionAnimation(animation),
      ()=>forgetExecutionAnimation(animation)
    );
    return animation;
  }

  function cancelExecutionStageAnimations(){
    const animations=executionStageAnimations;
    executionStageAnimations=[];
    animations.forEach(animation=>{
      try{animation.cancel();}catch{}
    });
  }

  function clearExecutionStageTransition(){
    stageTransitionToken++;
    cancelExecutionStageAnimations();
    Object.values(executionStages()).forEach(node=>{
      if(!node)return;
      node.classList.remove('is-stage-entering','is-stage-leaving');
      node.inert=false;
    });
  }

  function afterAnimations(node,callback,{subtree=false}={}){
    frame(()=>{
      if(destroyed)return;
      const animations=node?.getAnimations?.({subtree})||[];
      if(!animations.length){callback();return;}
      Promise.allSettled(animations.map(animation=>animation.finished)).then(()=>{
        if(!destroyed)callback();
      });
    });
  }

  function animateExecutionNode(node,keyframes,options){
    if(!node||prefersReducedMotion()||typeof node.animate!=='function')return null;
    return trackExecutionAnimation(node.animate(keyframes,options));
  }

  function playExecutionStageContent(stage,node,{delay=0}={}){
    if(!node||prefersReducedMotion()||appleMobileMotion)return;

    const item=(selector,keyframes,duration,itemDelay=0)=>{
      const target=node.querySelector(selector);
      if(!target)return;
      animateExecutionNode(target,keyframes,{
        duration,
        delay:delay+itemDelay,
        easing:MotionTokens.easeEnter,
        fill:'backwards'
      });
    };

    if(stage==='countdown'){
      item('.execution-eyebrow',[{opacity:0,transform:'translate3d(0,5px,0)'},{opacity:1,transform:'none'}],170,0);
      item('h2',[{opacity:0,transform:'translate3d(0,6px,0)'},{opacity:1,transform:'none'}],185,22);
      item('.execution-countdown__value',[{opacity:0,transform:'translate3d(0,12px,0) scale(.9)'},{opacity:1,transform:'none'}],235,45);
      item('.execution-countdown__hint',[{opacity:0,transform:'translate3d(0,5px,0)'},{opacity:1,transform:'none'}],180,76);
      item('.execution-text-action',[{opacity:0,transform:'translate3d(0,5px,0)'},{opacity:1,transform:'none'}],180,98);
      return;
    }

    if(stage==='timer'){
      item('.execution-heading',[{opacity:0,transform:'translate3d(0,6px,0)'},{opacity:1,transform:'none'}],185,0);
      item('.execution-key',[{opacity:0,transform:'translate3d(0,5px,0)'},{opacity:1,transform:'none'}],185,22);
      item('.execution-timer__ring',[{opacity:0,transform:'translate3d(0,9px,0) scale(.94)'},{opacity:1,transform:'none'}],250,34);
      item('.execution-timer__ring .timer-ring__inner',[{opacity:0,transform:'scale(.965)'},{opacity:1,transform:'none'}],180,64);
      item('.execution-actions',[{opacity:0,transform:'translate3d(0,7px,0)'},{opacity:1,transform:'none'}],205,82);
      return;
    }

    if(stage==='rest'){
      item('h2',[{opacity:0,transform:'translate3d(0,6px,0)'},{opacity:1,transform:'none'}],185,0);
      item('.execution-rest__value',[{opacity:0,transform:'translate3d(0,11px,0) scale(.92)'},{opacity:1,transform:'none'}],225,38);
      item('.execution-rest__next',[{opacity:0,transform:'translate3d(0,5px,0)'},{opacity:1,transform:'none'}],180,68);
      item('.execution-rest__actions',[{opacity:0,transform:'translate3d(0,7px,0)'},{opacity:1,transform:'none'}],195,88);
    }
  }

  function setExecutionStage(stage,{animate=true}={}){
    const stages=executionStages();
    const next=stages[stage];
    const previous=stages[executionStage];
    const overlay=$('#executionOverlay');
    if(!next)return;

    const previousAlreadyExited=Boolean(previous?.classList.contains('is-finishing-early'));
    const canAnimate=Boolean(
      animate&&previous&&previous!==next&&
      overlay?.classList.contains('is-visible')&&!prefersReducedMotion()
    );

    clearExecutionStageTransition();
    if(previous&&previous!==next){
      [previous,next].forEach(node=>{
        node.getAnimations?.({subtree:true}).forEach(animation=>{
          try{animation.cancel();}catch{}
        });
      });
    }
    executionStage=stage;
    setExecutionCopy();
    if(overlay)overlay.dataset.stage=stage;

    Object.values(stages).forEach(node=>{
      if(node&&node!==previous&&node!==next)node.hidden=true;
    });

    if(!canAnimate){
      earlyFinishPending=false;
      Object.entries(stages).forEach(([name,node])=>{
        if(!node)return;
        node.hidden=name!==stage;
        node.inert=false;
      });
      return;
    }

    const token=stageTransitionToken;
    next.hidden=false;
    next.inert=false;
    next.classList.add('is-stage-entering');

    if(appleMobileMotion){
      previous.hidden=true;
      previous.inert=false;
      previous.classList.remove('is-finishing-early','is-stage-leaving');
      animateExecutionNode(
        next,
        [{transform:'translate3d(0,16px,0)'},{transform:'translate3d(0,0,0)'}],
        {duration:220,easing:MotionTokens.easeStandard,fill:'backwards'}
      );
    }else{
      if(previousAlreadyExited){
        previous.hidden=true;
        previous.inert=false;
        previous.classList.remove('is-finishing-early','is-stage-leaving');
      }else{
        previous.hidden=false;
        previous.inert=true;
        previous.classList.add('is-stage-leaving');
        const leaving=animateExecutionNode(
          previous,
          [{opacity:1,transform:'translate3d(0,0,0)'},{opacity:0,transform:'translate3d(0,-6px,0)'}],
          {duration:110,easing:MotionTokens.easeExit,fill:'forwards'}
        );
        const settlePrevious=()=>{
          if(token!==stageTransitionToken)return;
          previous.hidden=true;
          previous.inert=false;
          previous.classList.remove('is-stage-leaving','is-finishing-early');
          try{leaving?.cancel();}catch{}
        };
        if(leaving)leaving.finished.then(settlePrevious,()=>{});
        else settlePrevious();
      }

      animateExecutionNode(
        next,
        [{opacity:.62,transform:'translate3d(0,7px,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],
        {duration:175,delay:12,easing:MotionTokens.easeEnter,fill:'backwards'}
      );
      playExecutionStageContent(stage,next,{delay:20});
    }

    defer(()=>{
      if(token!==stageTransitionToken)return;
      next.classList.remove('is-stage-entering');
      earlyFinishPending=false;
    },220);
  }

  function playEarlyTimerExit(callback){
    const card=$('#timerCard');
    if(card&&executionStage==='timer'){
      card.inert=true;
      card.classList.add('is-finishing-early');
    }
    // The stage/overlay transition owns the only exit. Keep its content
    // visible until the destination is ready instead of fading it first.
    callback();
  }

  function showExecution(stage){
    const overlay=$('#executionOverlay');
    if(!overlay)return;
    if(stage==='timer'){
      const timerCard=$('#timerCard');
      timerCard?.classList.remove('is-finishing-early');
      timerCard?.style.removeProperty('opacity');
      if(timerCard)timerCard.inert=false;
    }
    const wasVisible=overlay.classList.contains('is-visible');
    executionHideToken++;
    overlay.classList.remove('is-handoff','is-closing','is-surface-fade');
    if(!wasVisible)modalReturnFocus=document.activeElement;
    setExecutionStage(stage,{animate:wasVisible});
    overlay.classList.add('is-visible');
    overlay.setAttribute('aria-hidden','false');

    if(!wasVisible&&!prefersReducedMotion()&&appleMobileMotion){
      animateExecutionNode(
        executionShell,
        [{opacity:.72,transform:'translate3d(0,24px,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],
        {duration:260,easing:MotionTokens.easeEnter,fill:'backwards'}
      );
      if(stage==='countdown')animateCountdownValue($('#countdownValue'));
    }else if(!wasVisible&&!prefersReducedMotion()){
      const token=stageTransitionToken;
      frame(()=>{
        if(destroyed||token!==stageTransitionToken||executionStage!==stage||!overlay.classList.contains('is-visible'))return;
        const node=executionStages()[stage];
        animateExecutionNode(
          node,
          [{opacity:.72,transform:'translate3d(0,6px,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],
          {duration:185,easing:MotionTokens.easeEnter,fill:'backwards'}
        );
        playExecutionStageContent(stage,node,{delay:12});
      });
    }

    syncModalState();
    emitReloadSafetyChange();
    const focusTarget=stage==='timer'
      ?$('#timerToggle')
      :stage==='rest'
        ?$('#restSkip')
        :$('#countdownCancel');
    frame(()=>focusTarget?.focus({preventScroll:true}));
  }

  function hideExecution(handoff=null,{afterHidden=null}={}){
    const overlay=$('#executionOverlay');
    if(!overlay){handoff?.();return;}
    if(stageTimer!==null){
      cancelDeferred(stageTimer);
      stageTimer=null;
    }
    clearExecutionStageTransition();

    const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasHandoff=typeof handoff==='function'&&overlay.classList.contains('is-visible');
    const token=++executionHideToken;

    if(hasHandoff){
      overlay.classList.add('is-handoff');
      handoff();
    }else{
      handoff?.();
    }

    overlay.setAttribute('aria-hidden','true');
    executionStage='idle';

    const finish=()=>{
      if(token!==executionHideToken)return;
      overlay.classList.remove('is-visible','is-handoff','is-closing','is-surface-fade');
      overlay.dataset.stage='idle';
      earlyFinishPending=false;
      Object.values(executionStages()).forEach(node=>{
        if(!node)return;
        node.hidden=true;
        node.inert=false;
        node.classList.remove('is-stage-entering','is-stage-leaving');
      });
      afterHidden?.();
      const timerCard=$('#timerCard');
      timerCard?.classList.remove('is-finishing-early');
      timerCard?.style.removeProperty('opacity');
      if(timerCard)timerCard.inert=false;
      syncModalState();
      emitReloadSafetyChange();
      if(!visibleModal()&&modalReturnFocus?.isConnected){
        modalReturnFocus.focus({preventScroll:true});
        modalReturnFocus=null;
      }
    };

    if(reduceMotion||!overlay.classList.contains('is-visible')){
      finish();
      return;
    }

    overlay.classList.add('is-closing');
    const exits=[
      animateExecutionNode(executionShell,
        [{transform:'translateY(0)'},{transform:'translateY(-12px)'}],
        {duration:180,easing:MotionTokens.easeExit,fill:'forwards'}),
      animateExecutionNode(overlay,[{opacity:1},{opacity:0}],
        {duration:180,easing:MotionTokens.easeExit,fill:'forwards'})
    ].filter(Boolean);
    let settled=false;
    let fallback=null;
    const finishExit=()=>{
      if(settled||destroyed||token!==executionHideToken)return;
      settled=true;
      if(fallback!==null)cancelDeferred(fallback);
      // Hide the overlay before releasing its filled exit effect.
      finish();
      exits.forEach(animation=>{try{animation.cancel();}catch{}});
    };
    Promise.allSettled(exits.map(animation=>animation.finished)).then(finishExit);
    fallback=defer(finishExit,260);
  }

  // Countdown / rest orchestration.
  function cancelCountdown(){
    if(countdownTimer!==null){
      clearInterval(countdownTimer);
      countdownTimer=null;
    }
    if(stageTimer!==null){
      cancelDeferred(stageTimer);
      stageTimer=null;
    }
    if(executionStage==='countdown')hideExecution();
  }

  function cancelRest(){
    if(restTimer!==null){
      clearInterval(restTimer);
      restTimer=null;
    }
    restFinish=null;
    if(executionStage==='rest')hideExecution();
  }

  function startTimerNow(){
    const timer=timerData(exercises[current]);
    if(timer.remaining<=0)timer.remaining=timer.duration;
    const now=Date.now();
    if(!routine.startedAt)routine.startedAt=new Date(now).toISOString();
    timer.running=true;
    timer.paused=false;
    timer.runStartedAt=now;
    timer.endAt=now+timer.remaining*1000;
    Store.save();
    updateTimerUI();
    showExecution('timer');
    startTicker();
    requestWakeLock();
  }

  function startCountdown(done){
    const seconds=Number(settings.countdownSeconds)||0;
    if(seconds<=0){
      sound('start');
      haptic('next');
      done();
      return;
    }

    cancelCountdown();
    unlockAudio();
    let remaining=seconds;
    const countdownValue=$('#countdownValue');
    countdownValue.classList.remove('is-launching');
    countdownValue.textContent=String(remaining);
    showExecution('countdown');
    sound('tick');

    countdownTimer=setInterval(()=>{
      remaining--;
      if(remaining<=0){
        clearInterval(countdownTimer);
        countdownTimer=null;
        countdownValue.textContent='Старт';
        countdownValue.classList.add('is-launching');
        animateCountdownValue(countdownValue,{launch:true});
        sound('start');
        haptic('next');
        stageTimer=defer(()=>{
          stageTimer=null;
          done();
        },160);
        return;
      }
      countdownValue.classList.remove('is-launching');
      countdownValue.textContent=String(remaining);
      animateCountdownValue(countdownValue);
      sound('tick');
      haptic('tap');
    },1000);
  }

  function advanceExercise(){
    const overlay=$('#executionOverlay');
    const maskSwap=Boolean(overlay?.classList.contains('is-visible')&&!overlay.classList.contains('is-handoff'));
    if(maskSwap)overlay.classList.add('is-content-swap');

    current++;
    routine.step=current;
    Store.save();
    render('forward');

    if(maskSwap){
      afterAnimations($('.exercise-main'),()=>overlay.classList.remove('is-content-swap'),{subtree:true});
    }
  }

  function startRest(afterRest){
    const seconds=Number(settings.restSeconds)||0;
    if(seconds<=0){
      hideExecution(afterRest);
      return;
    }

    cancelRest();
    unlockAudio();
    let remaining=seconds;
    const endAt=Date.now()+seconds*1000;
    lastRestCueSecond=null;
    restFinish=afterRest;
    $('#restValue').textContent=String(remaining);
    $('#restNext').textContent=exercises[Math.min(current+1,exercises.length-1)].title;
    showExecution('rest');
    requestWakeLock();

    const tick=()=>{
      remaining=Math.max(0,Math.ceil((endAt-Date.now())/1000));
      $('#restValue').textContent=String(remaining);

      if(remaining!==lastRestCueSecond){
        lastRestCueSecond=remaining;
        if(remaining===10){
          animateValue($('#restValue'));
          sound('warning10');
        }else if(remaining===5){
          animateValue($('#restValue'));
          sound('warning5');
        }else if(remaining>0&&remaining<5){
          animateValue($('#restValue'));
          sound('endingTick');
        }
      }

      if(remaining<=0){
        clearInterval(restTimer);
        restTimer=null;
        const finish=restFinish;
        restFinish=null;
        sound('ready');
        haptic('next');
        releaseWakeLock();
        hideExecution(finish||null);
      }
    };
    restTimer=setInterval(tick,250);
    tick();
  }

  function onTimerFinished(){
    const isLast=current===exercises.length-1;

    if(!isLast){
      sound('finish');
      haptic('success');
    }

    routine.completedUntil=Math.max(routine.completedUntil||0,current+1);
    Store.save();
    releaseWakeLock();

    if(isLast){
      finishRoutine(true);
      return;
    }

    sessionView.updateNextButton();

    if(settings.autoNext){
      startRest(advanceExercise);
      return;
    }

    hideExecution();
  }

  // Timer state and persistence.
  const timerNodes={
    ring:$('#timerRing'),value:$('#timerValue'),label:$('#timerLabel'),
    card:$('#timerCard'),state:$('#timerState'),toggle:$('#timerToggle')
  };
  let lastTimerState=null;
  let lastTimerProgress=null;
  const setTimerText=(node,value)=>{if(node.textContent!==value)node.textContent=value;};
  function updateTimerUI(){
    const exercise=exercises[current];
    const timer=timerData(exercise);
    let preciseRemaining=timer.remaining;
    let justFinished=false;

    if(timer.running&&timer.endAt){
      preciseRemaining=Math.max(0,(timer.endAt-Date.now())/1000);
      timer.remaining=Math.max(0,Math.ceil(preciseRemaining));
    }

    if(timer.running&&preciseRemaining>0){
      const cueSecond=Math.ceil(preciseRemaining);
      const cueKey=`${exercise.id}:${cueSecond}`;

      if(cueKey!==lastExerciseCueKey){
        lastExerciseCueKey=cueKey;
        if(cueSecond===10)sound('warning10');
        else if(cueSecond===5)sound('warning5');
        else if(cueSecond>0&&cueSecond<5)sound('endingTick');
      }
    }

    if(timer.running&&preciseRemaining<=0){
      preciseRemaining=0;
      timer.remaining=0;
      accountTimerRun(timer,true);
      timer.running=false;
      timer.endAt=null;
      stopTicker();
      releaseWakeLock();
      Store.save();
      justFinished=true;
    }

    const progress=timer.duration>0?Math.min(100,Math.max(0,(1-preciseRemaining/timer.duration)*100)):0;
    const paintedProgress=progress.toFixed(3);
    if(paintedProgress!==lastTimerProgress){
      timerNodes.ring.style.setProperty('--timer-progress',paintedProgress);
      lastTimerProgress=paintedProgress;
    }
    const stateKey=[exercise.id,timer.remaining,timer.duration,timer.running,timer.paused,routine.completedUntil,routine.completed].join(':');
    if(stateKey!==lastTimerState){
      lastTimerState=stateKey;
      setTimerText(timerNodes.value,fmt(timer.remaining));
      const hasProgress=(timer.paused||timer.remaining<timer.duration)&&timer.remaining>0;
      const isPaused=!timer.running&&timer.remaining>0&&hasProgress;
      setTimerText(timerNodes.label,timer.remaining===0?'готово':isPaused?'пауза':'осталось');
      timerNodes.card.classList.toggle('is-paused',isPaused);
      setTimerText(timerNodes.state,timer.running?'Идёт':timer.remaining===0?'Завершён':hasProgress?'Пауза':'Готов');
      setTimerText(timerNodes.toggle,timer.running?'Пауза':hasProgress?'Продолжить':'Старт');
      timerNodes.ring.classList.toggle('is-running',timer.running);
      timerNodes.ring.classList.toggle('is-ending',Boolean(timer.running&&preciseRemaining>0&&preciseRemaining<=5));
      timerNodes.ring.classList.toggle('is-final-three',Boolean(timer.running&&preciseRemaining>0&&preciseRemaining<=3));
      timerNodes.card.classList.toggle('is-running',timer.running);
      sessionView.updateNextButton(timer);
    }

    if(justFinished)onTimerFinished();
  }

  function startTicker(){
    stopTicker();
    const tick=()=>{
      updateTimerUI();
      const timer=timerData(exercises[current]);
      if(timer.running)tickerFrame=requestAnimationFrame(tick);
      else tickerFrame=null;
    };
    tickerFrame=requestAnimationFrame(tick);
  }

  function pauseCurrentTimer(){
    const timer=timerData(exercises[current]);
    if(!timer.running)return;
    timer.remaining=Math.max(0,Math.ceil((timer.endAt-Date.now())/1000));
    timer.paused=timer.remaining>0;
    accountTimerRun(timer,true);
    timer.running=false;
    timer.endAt=null;
    stopTicker();
    releaseWakeLock();
    Store.save();
  }

  // Exercise state -> extracted session view.
  function render(direction='forward',scrollMode='smooth'){
    stopTicker();
    routine.step=current;
    Store.save();

    const exercise=exercises[current];
    sessionView.renderExercise(exercise);
    sessionView.updateNextButton();
    sessionView.renderStepSegments();
    sessionView.resetDetails();
    // Rendering the next exercise must not repaint the outgoing timer.
    if(!$('#executionOverlay')?.classList.contains('is-handoff'))updateTimerUI();

    const timer=timerData(exercise);
    if(timer.running){
      startTicker();
      requestWakeLock();
    }

    if(direction)sessionView.animateExercise(direction);
    frame(()=>$('#exerciseScroll').scrollTo({top:0,behavior:scrollMode}));
  }

  // Completion flow.
  function finishRoutine(fromExecution=false){
    pauseCurrentTimer();
    cancelCountdown();
    cancelRest();
    const wasCompleted=Boolean(routine.completed);
    const previousBestStreak=Store.getBestStreak([ROUTINE_KEY]);
    routine.completed=true;
    routine.completedUntil=exercises.length;
    routine.step=exercises.length-1;
    routine.completedAt=routine.completedAt||new Date().toISOString();
    Store.save();
    sessionView.renderStepSegments();
    sound('complete');
    haptic('success');

    const overlay=$('#completionOverlay');
    $('#completionMeta').textContent='Разминка завершена. Пусть день начнётся с движения.';
    $('#completionDuration').textContent=formatCompletionTime(routine.activeSeconds);
    $('#completionCount').textContent=`${Math.min(routine.completedUntil,exercises.length)} / ${exercises.length}`;
    const currentStreak=Store.getCurrentStreak([ROUTINE_KEY]);
    const completionHighlight=$('#completionHighlight');
    let highlightText='';
    if(!wasCompleted&&currentStreak>1&&currentStreak>previousBestStreak){
      highlightText=`Новая лучшая серия — ${formatStreakDays(currentStreak)}`;
    }else if(currentStreak>1){
      highlightText=`Серия продолжается — ${formatStreakDays(currentStreak)}`;
    }
    completionHighlight.textContent=highlightText;
    completionHighlight.hidden=!highlightText;
    syncEffortButtons();
    modalReturnFocus=document.activeElement;
    Motion?.prepareCompletion?.(overlay);

    const revealCompletion=()=>{
      overlay.classList.remove('is-handoff');
      overlay.classList.add('is-visible');
      overlay.setAttribute('aria-hidden','false');
      syncModalState();
      emitReloadSafetyChange();
      frame(()=>{
        Motion?.playCompletion?.(overlay);
        $('#completionTitle').focus({preventScroll:true});
      });
    };

    if(fromExecution){
      hideExecution(revealCompletion);
    }else{
      revealCompletion();
    }
  }

  // Interaction wiring.
  listen($('#routineMoreButton'),'click',()=>{
    haptic('tap');
    showRoutineSettingsDialog();
  });
  listen($('#routineSettingsClose'),'click',()=>{
    haptic('tap');
    hideRoutineSettingsDialog();
  });
  listen($('#routineSettingsOverlay'),'click',event=>{
    if(event.target!==event.currentTarget)return;
    haptic('tap');
    hideRoutineSettingsDialog();
  });

  listen(routineResetBtn,'click',()=>{
    haptic('tap');
    showRoutineResetConfirm();
  });
  listen(routineResetCancel,'click',()=>{
    haptic('tap');
    hideRoutineResetConfirm(true,70);
  });
  listen(routineResetAccept,'click',()=>{
    if(routineResetInFlight)return;
    routineResetInFlight=true;
    haptic('tap');
    defer(()=>{
      hideRoutineSettingsDialog();
      resetRoutineProgress();
    },120);
  });

  listen($('#prevButton'),'click',()=>{
    if(current<=0)return;
    cancelRest();
    cancelCountdown();
    if(executionStage!=='idle')hideExecution();
    haptic('soft');
    pauseCurrentTimer();
    current--;
    render('back');
  });

  listen($('#nextButton'),'click',async()=>{
    if(routine.completed){
      window.location.href='index.html';
      return;
    }
    const timer=timerData(exercises[current]);
    const isDone=Number(routine.completedUntil||0)>current||timer.remaining===0;

    if(isDone){
      if(current>=exercises.length-1){
        finishRoutine();
      }else{
        haptic('next');
        startRest(advanceExercise);
      }
      return;
    }

    haptic('soft');
    await unlockAudio();
    if(destroyed)return;

    if(timer.running){
      showExecution('timer');
      updateTimerUI();
      return;
    }

    const hasProgress=(timer.paused||timer.remaining<timer.duration)&&timer.remaining>0;
    if(hasProgress){
      sound('resume');
      startTimerNow();
      return;
    }

    if(timer.remaining<=0){
      timer.remaining=timer.duration;
      Store.save();
    }
    startCountdown(startTimerNow);
  });

  listen($('#timerToggle'),'click',async()=>{
    haptic('soft');
    await unlockAudio();
    if(destroyed)return;
    const timer=timerData(exercises[current]);

    if(timer.running){
      pauseCurrentTimer();
      sound('pause');
      updateTimerUI();
      animateTimerState();
      return;
    }

    if(timer.remaining<=0){
      timer.remaining=timer.duration;
      Store.save();
      startCountdown(startTimerNow);
      return;
    }

    sound('resume');
    startTimerNow();
    animateTimerState();
  });

  listen($('#timerReset'),'click',()=>{
    haptic('tap');
    const exercise=exercises[current];
    const timer=timerData(exercise);
    if(timer.running)accountTimerRun(timer,true);
    timer.duration=exercise.seconds;
    timer.remaining=exercise.seconds;
    timer.paused=false;
    timer.running=false;
    timer.endAt=null;
    timer.runStartedAt=null;
    stopTicker();
    releaseWakeLock();
    Store.save();
    updateTimerUI();
  });

  function adjustTimer(delta){
    const exercise=exercises[current];
    const timer=timerData(exercise);
    const wasFresh=!timer.running&&timer.remaining===timer.duration;
    if(wasFresh){
      timer.duration=Math.max(10,timer.duration+delta);
      timer.remaining=timer.duration;
    }else{
      timer.remaining=Math.max(0,timer.remaining+delta);
      if(timer.remaining>timer.duration)timer.duration=timer.remaining;
      if(timer.running)timer.endAt=Date.now()+timer.remaining*1000;
    }
    if(timer.remaining<=0){
      if(timer.running)accountTimerRun(timer,true);
      timer.running=false;
      timer.endAt=null;
      timer.runStartedAt=null;
      Store.save();
      updateTimerUI();
      onTimerFinished();
      return;
    }
    Store.save();
    updateTimerUI();
  }

  listen(document,'pointerdown',()=>{unlockAudio();},{once:true,passive:true});

  listen(document,'keydown',event=>{
    const modal=visibleModal();
    if(!modal)return;

    if(event.key==='Escape'){
      if($('#routineSettingsOverlay').classList.contains('is-visible')){
        if(routineResetConfirmFlow.isConfirming()){
          hideRoutineResetConfirm(true,70);
        }else{
          hideRoutineSettingsDialog();
        }
        return;
      }
      if($('#executionOverlay').classList.contains('is-visible')){
        $('#executionClose').click();
      }
      return;
    }

    UI.trapFocus(event,modal);
  });

  listen($('#minusTen'),'click',()=>{haptic('tap');adjustTimer(-10);});
  listen($('#plusTen'),'click',()=>{haptic('tap');adjustTimer(10);});
  listen($('#countdownCancel'),'click',()=>{
    cancelCountdown();
    haptic('tap');
  });

  listen($('#executionClose'),'click',()=>{
    if(earlyFinishPending)return;
    if(executionStage==='countdown'){
      cancelCountdown();
      haptic('tap');
      return;
    }
    if(executionStage==='rest'){
      cancelRest();
      releaseWakeLock();
      haptic('tap');
      return;
    }
    const timer=timerData(exercises[current]);
    if(timer.running)pauseCurrentTimer();
    hideExecution();
    updateTimerUI();
    haptic('tap');
  });

  listen($('#executionFinishEarly'),'click',()=>{
    const card=$('#timerCard');
    if(earlyFinishPending||executionStage!=='timer'||card?.hidden)return;
    earlyFinishPending=true;

    const timer=timerData(exercises[current]);
    stopTicker();
    releaseWakeLock();
    if(timer.running)accountTimerRun(timer,true);
    timer.running=false;
    timer.endAt=null;
    timer.runStartedAt=null;
    timer.remaining=0;
    Store.save();

    playEarlyTimerExit(onTimerFinished);
  });

  const takeRestFinish=()=>{
    const finish=restFinish;
    if(restTimer!==null)clearInterval(restTimer);
    restTimer=null;
    restFinish=null;
    releaseWakeLock();
    return finish;
  };

  listen($('#restSkip'),'click',async()=>{
    const finish=takeRestFinish();
    haptic('next');
    if(finish)finish();
    await unlockAudio();
    if(destroyed)return;
    startCountdown(startTimerNow);
  });

  listen($('#restTechnique'),'click',()=>{
    const finish=takeRestFinish();
    haptic('soft');
    hideExecution(finish||null);
  });
  function syncEffortButtons(){
    document.querySelectorAll('[data-effort]').forEach(button=>{
      button.setAttribute('aria-pressed',String(button.dataset.effort===routine.effort));
    });
    $('#effortStatus').textContent=routine.effort
      ?Store.getPersistenceStatus().ok?'Сохранено в истории. Можно изменить.':'Не удалось сохранить оценку. Можно попробовать ещё раз.'
      :'Необязательно · только для вас';
  }
  document.querySelectorAll('[data-effort]').forEach(button=>{
    listen(button,'click',()=>{
      routine.effort=routine.effort===button.dataset.effort?null:button.dataset.effort;
      Store.save();
      syncEffortButtons();
    });
  });

  listen($('#completionHome'),'click',()=>{
    if(window.DailyMotionNavigate){window.DailyMotionNavigate('index.html',{replace:true,animation:'completion-home'});return;}
    location.replace('index.html');
  });

  listen(document,'visibilitychange',()=>{
    if(document.visibilityState==='visible'){
      updateTimerUI();
      const timer=timerData(exercises[current]);
      if(timer.running){
        startTicker();
        requestWakeLock();
      }
    }else{
      stopTicker();
      const timer=timerData(exercises[current]);
      if(timer.running){
        accountTimerRun(timer,false);
        Store.save();
      }
      releaseWakeLock();
    }
  });

  // Lifecycle persistence / teardown.
  const persist=()=>{
    const timer=timerData(exercises[current]);
    if(timer.running)accountTimerRun(timer,false);
    routine.step=current;
    Store.save();
    releaseWakeLock();
  };
  listen(window,'pagehide',persist);
  listen(window,'beforeunload',persist);

  render(null,'auto');
  frame(()=>{
    if(destroyed)return;
    document.documentElement.classList.add('session-ready');
    finishPageLoader();

    if(programVersionState.reset)toast('Комплекс обновлён — текущий прогресс начат заново');
    else if(routine.completed)toast('Комплекс уже завершён сегодня');
    else if(resumedFromStep!==null)toast(`Продолжено с упражнения ${resumedFromStep+1}`);
  });

  return ()=>{
    if(destroyed)return;
    persist();
    destroyed=true;
    lifecycle.abort();
    if(pageLoaderRevealTimer!==null)cancelDeferred(pageLoaderRevealTimer);
    if(stageTimer!==null)cancelDeferred(stageTimer);
    routineResetConfirmFlow.destroy();
    cancelCountdown();
    cancelRest();
    stopTicker();
    restFinish=null;
    stageTransitionToken++;
    executionHideToken++;
    sessionView.destroy();
    routineSettingsMotion?.destroy?.();
    Motion?.cleanupSessionMotion?.();
    document.querySelector('#swup')?.getAnimations?.({subtree:true})?.forEach(animation=>animation.cancel());
    toastController.destroy();
    releaseWakeLock();
    if(window.DailyMotionReloadGuard?.isSafe===isReloadSafe)delete window.DailyMotionReloadGuard;
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('session-ready');
  };
};
