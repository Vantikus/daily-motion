window.DailyMotionPages=window.DailyMotionPages||{};
window.DailyMotionPages.session=function mountSession(){
  const ROUTINE_KEY=new URLSearchParams(location.search).get('routine')||'morning';
  const exercises=window.DailyMotionProgram.morning;
  return (function SessionRuntime(exercises,ROUTINE_KEY){
  const Store=window.DailyMotionState;
  const lifecycle=new AbortController();
  const listen=(target,type,handler,options={})=>target?.addEventListener(type,handler,{...options,signal:lifecycle.signal});
  let destroyed=false;
  const $=selector=>document.querySelector(selector);
  const pageLoader=$('#pageLoader');
  let pageLoaderRevealTimer=setTimeout(()=>{
    pageLoaderRevealTimer=null;
    if(destroyed||!pageLoader)return;
    pageLoader.classList.add('is-visible');
    pageLoader.setAttribute('aria-hidden','false');
  },180);
  const finishPageLoader=()=>{
    if(pageLoaderRevealTimer!==null){
      clearTimeout(pageLoaderRevealTimer);
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
    requestAnimationFrame(()=>{
      if(destroyed)return;
      document.documentElement.classList.add('session-ready');
      finishPageLoader();
    });
    return ()=>{
      destroyed=true;
      lifecycle.abort();
      if(pageLoaderRevealTimer!==null)clearTimeout(pageLoaderRevealTimer);
      document.documentElement.classList.remove('session-ready');
      document.body.classList.remove('modal-open');
    };
  }

  const PROGRAM_VERSION='morning-v3-active-2026-09-19';
  const programVersionState=Store.ensureProgramVersion(ROUTINE_KEY,PROGRAM_VERSION);

  const routine=Store.getRoutine(ROUTINE_KEY);
  let settings=Store.getSettings();
  routine.step=Math.max(0,Math.min(Number(routine.step)||0,exercises.length-1));

  if(new URLSearchParams(location.search).get('resume')==='1'&&!routine.completed){
    routine.step=Math.min(exercises.length-1,Math.max(routine.step,routine.completedUntil||0));
  }

  const resumedFromStep=!routine.completed&&(routine.step>0||routine.completedUntil>0||routine.activeSeconds>0)?routine.step:null;
  let current=routine.step;
  let tickerFrame=null;
  let wakeLock=null;
  let lastFinishState=current===exercises.length-1;
  let countdownTimer=null;
  let restTimer=null;
  let restFinish=null;
  let lastExerciseCueKey=null;
  let lastRestCueSecond=null;
  let executionStage='idle';
  let stageTimer=null;
  let stageTransitionToken=0;
  let executionHideToken=0;
  const Audio=window.DailyMotionAudio;
  const exerciseApp=$('.exercise-app');
  let modalReturnFocus=null;

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

  const toast=message=>{
    const node=$('#toast');
    node.textContent=message;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>node.classList.remove('show'),1700);
  };

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
    if(!node||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    node.animate(
      [
        {transform:'translateY(3px)',opacity:.55},
        {transform:'translateY(0)',opacity:1}
      ],
      {duration:160,easing:'cubic-bezier(.2,.7,.24,1)'}
    );
  };

  const timerData=exercise=>Store.getTimer(ROUTINE_KEY,exercise.id,exercise.seconds);
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

  async function requestWakeLock(){
    if(!('wakeLock' in navigator))return;
    try{wakeLock=await navigator.wakeLock.request('screen');}catch{}
  }

  async function releaseWakeLock(){
    if(!wakeLock)return;
    try{await wakeLock.release();}catch{}
    wakeLock=null;
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

  function syncThemeControl(root,value){
    root?.querySelectorAll('[data-theme-value]').forEach(button=>{
      button.setAttribute('aria-pressed',String(button.dataset.themeValue===value));
    });
  }

  function syncTimingControl(root,value){
    root?.querySelectorAll('[data-value]').forEach(button=>{
      button.setAttribute('aria-pressed',String(button.dataset.value===String(value)));
    });
  }

  function syncWorkoutSettingsControls(){
    settings=Store.getSettings();
    $('#workoutSoundSetting').checked=Boolean(settings.sound);
    $('#workoutAutoNextSetting').checked=Boolean(settings.autoNext);
    $('#workoutCountdownSetting').value=String(settings.countdownSeconds);
    $('#workoutRestSetting').value=String(settings.restSeconds);
    syncTimingControl($('#workoutCountdownSettingDesktop'),settings.countdownSeconds);
    syncTimingControl($('#workoutRestSettingDesktop'),settings.restSeconds);
    syncThemeControl($('#workoutThemeSetting'),settings.theme);
  }

  const routineResetBlock=$('#routineResetBlock');
  const routineResetBtn=$('#routineResetBtn');
  const routineResetConfirm=$('#routineResetConfirm');
  const routineResetCancel=$('#routineResetCancel');
  const routineResetAccept=$('#routineResetAccept');
  let routineResetStateTimer=null;
  let routineResetFocusTimer=null;
  let routineResetInFlight=false;

  function clearRoutineResetTimers(){
    if(routineResetStateTimer!==null){
      clearTimeout(routineResetStateTimer);
      routineResetStateTimer=null;
    }
    if(routineResetFocusTimer!==null){
      clearTimeout(routineResetFocusTimer);
      routineResetFocusTimer=null;
    }
  }

  function applyRoutineResetState(confirming,focusTarget=null){
    routineResetBlock.classList.toggle('is-confirming',confirming);
    routineResetConfirm.setAttribute('aria-hidden',confirming?'false':'true');
    routineResetConfirm.inert=!confirming;
    routineResetBtn.inert=confirming;
    if(focusTarget){
      routineResetFocusTimer=setTimeout(()=>{
        routineResetFocusTimer=null;
        focusTarget.focus({preventScroll:true});
      },300);
    }
  }

  function hideRoutineResetConfirm(restoreFocus=false,delay=0){
    clearRoutineResetTimers();
    const apply=()=>applyRoutineResetState(false,restoreFocus?routineResetBtn:null);
    if(delay){
      routineResetStateTimer=setTimeout(()=>{
        routineResetStateTimer=null;
        apply();
      },delay);
      return;
    }
    apply();
  }

  function showRoutineResetConfirm(){
    if(routineResetBlock.classList.contains('is-confirming')||routineResetStateTimer!==null)return;
    clearRoutineResetTimers();
    routineResetStateTimer=setTimeout(()=>{
      routineResetStateTimer=null;
      applyRoutineResetState(true,routineResetAccept);
    },70);
  }

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

  function clearExecutionStageTransition(){
    stageTransitionToken++;
    Object.values(executionStages()).forEach(node=>{
      if(!node)return;
      node.classList.remove('is-stage-entering','is-stage-leaving');
      node.inert=false;
    });
  }

  function afterAnimations(node,callback,{subtree=false}={}){
    requestAnimationFrame(()=>{
      if(destroyed)return;
      const animations=node?.getAnimations?.({subtree})||[];
      if(!animations.length){callback();return;}
      Promise.allSettled(animations.map(animation=>animation.finished)).then(()=>{
        if(!destroyed)callback();
      });
    });
  }

  function setExecutionStage(stage){
    const stages=executionStages();
    const next=stages[stage];
    const previous=stages[executionStage];
    const overlay=$('#executionOverlay');
    const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canAnimate=Boolean(
      previous&&next&&previous!==next&&
      overlay?.classList.contains('is-visible')&&!reduceMotion
    );

    clearExecutionStageTransition();
    executionStage=stage;
    setExecutionCopy();
    if(overlay)overlay.dataset.stage=stage;

    if(!canAnimate){
      Object.entries(stages).forEach(([name,node])=>{
        if(node)node.hidden=name!==stage;
      });
      return;
    }

    Object.values(stages).forEach(node=>{
      if(node&&node!==previous&&node!==next)node.hidden=true;
    });
    previous.hidden=false;
    next.hidden=false;
    previous.inert=true;
    next.inert=false;
    previous.classList.add('is-stage-leaving');
    next.classList.add('is-stage-entering');

    const token=stageTransitionToken;
    afterAnimations(next,()=>{
      if(token!==stageTransitionToken)return;
      previous.hidden=true;
      previous.inert=false;
      previous.classList.remove('is-stage-leaving');
      next.classList.remove('is-stage-entering');
    });
  }

  function showExecution(stage){
    const overlay=$('#executionOverlay');
    if(!overlay)return;
    executionHideToken++;
    overlay.classList.remove('is-handoff','is-closing','is-surface-fade');
    if(!overlay.classList.contains('is-visible'))modalReturnFocus=document.activeElement;
    setExecutionStage(stage);
    overlay.classList.add('is-visible');
    overlay.setAttribute('aria-hidden','false');
    syncModalState();
    emitReloadSafetyChange();
    const focusTarget=stage==='timer'
      ?$('#timerToggle')
      :stage==='rest'
        ?$('#restSkip')
        :$('#countdownCancel');
    requestAnimationFrame(()=>focusTarget?.focus({preventScroll:true}));
  }

  function hideExecution(handoff=null){
    const overlay=$('#executionOverlay');
    if(!overlay){handoff?.();return;}
    if(stageTimer!==null){
      clearTimeout(stageTimer);
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
    afterAnimations($('.execution-shell'),()=>{
      if(token!==executionHideToken)return;
      overlay.classList.add('is-surface-fade');
      afterAnimations(overlay,finish);
    });
  }

  function cancelCountdown(){
    if(countdownTimer!==null){
      clearInterval(countdownTimer);
      countdownTimer=null;
    }
    if(stageTimer!==null){
      clearTimeout(stageTimer);
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
    showExecution('timer');
    const now=Date.now();
    if(!routine.startedAt)routine.startedAt=new Date(now).toISOString();
    timer.running=true;
    timer.paused=false;
    timer.runStartedAt=now;
    timer.endAt=now+timer.remaining*1000;
    Store.save();
    startTicker();
    requestWakeLock();
    updateTimerUI();
  }

  function startCountdown(done){
    const seconds=Number(settings.countdownSeconds)||0;
    if(seconds<=0){
      showExecution('timer');
      sound('start');
      haptic('next');
      done();
      return;
    }

    cancelCountdown();
    unlockAudio();
    let remaining=seconds;
    $('#countdownValue').textContent=String(remaining);
    showExecution('countdown');
    animateValue($('#countdownValue'));
    sound('tick');

    countdownTimer=setInterval(()=>{
      remaining--;
      if(remaining<=0){
        clearInterval(countdownTimer);
        countdownTimer=null;
        $('#countdownValue').textContent='Старт';
        animateValue($('#countdownValue'));
        sound('start');
        haptic('next');
        stageTimer=setTimeout(()=>{
          stageTimer=null;
          showExecution('timer');
          done();
        },180);
        return;
      }
      $('#countdownValue').textContent=String(remaining);
      animateValue($('#countdownValue'));
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
    $('#restNext').textContent=`Дальше: ${exercises[Math.min(current+1,exercises.length-1)].title}`;
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

    updateNextButton();

    if(settings.autoNext){
      startRest(advanceExercise);
      return;
    }

    hideExecution();
  }

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
    $('#timerRing').style.setProperty('--timer-progress',progress.toFixed(3));
    $('#timerValue').textContent=fmt(timer.remaining);
    const hasProgress=(timer.paused||timer.remaining<timer.duration)&&timer.remaining>0;
    const isPaused=!timer.running&&timer.remaining>0&&hasProgress;
    $('#timerLabel').textContent=timer.remaining===0?'готово':isPaused?'пауза':'осталось';
    $('#timerCard').classList.toggle('is-paused',isPaused);
    $('#timerState').textContent=timer.running?'Идёт':timer.remaining===0?'Завершён':hasProgress?'Пауза':'Готов';
    $('#timerToggle').textContent=timer.running?'Пауза':hasProgress?'Продолжить':'Старт';
    $('#timerRing').classList.toggle('is-running',timer.running);
    $('#timerRing').classList.toggle('is-ending',Boolean(timer.running&&preciseRemaining>0&&preciseRemaining<=5));
    $('#timerRing').classList.toggle('is-final-three',Boolean(timer.running&&preciseRemaining>0&&preciseRemaining<=3));
    $('#timerCard').classList.toggle('is-running',timer.running);
    updateNextButton();

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

  function renderVisual(exercise){
    const box=$('#exerciseVisual');
    if(Array.isArray(exercise.visuals)&&exercise.visuals.length){
      box.hidden=false;
      box.classList.add('has-visuals');
      box.innerHTML=`<div class="visual-phases" style="--phase-count:${Math.min(exercise.visuals.length,3)}">${exercise.visuals.map((src,index)=>`<figure class="visual-phase"><img src="${src}" alt="${exercise.title}, фаза ${index+1}" loading="eager" decoding="async"></figure>`).join('')}</div>`;
      return;
    }
    box.hidden=true;
    box.classList.remove('has-visuals','visual-placeholder');
    box.innerHTML='';
  }

  const detailAnimations=new WeakMap();

  function setDetailState(card,open){
    detailAnimations.get(card)?.forEach?.(animation=>animation.cancel());
    detailAnimations.delete(card);

    const toggle=card.querySelector('.detail-card__toggle');
    const panel=card.querySelector('.detail-card__panel');
    const inner=card.querySelector('.detail-card__inner');

    card.classList.toggle('is-open',open);
    if(panel){panel.inert=!open;panel.setAttribute('aria-hidden',String(!open));}
    if(toggle)toggle.setAttribute('aria-expanded',String(open));
    if(panel){
      panel.style.height=open?'auto':'0px';
      panel.style.opacity=open?'1':'0';
    }
    if(inner){
      inner.style.opacity=open?'1':'0';
      inner.style.transform=open?'translate3d(0,0,0)':'translate3d(0,-2px,0)';
    }
  }

  function animateDetailState(card,open){
    const toggle=card.querySelector('.detail-card__toggle');
    const panel=card.querySelector('.detail-card__panel');
    const inner=card.querySelector('.detail-card__inner');
    if(!panel||!inner){
      setDetailState(card,open);
      return;
    }

    const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const previous=detailAnimations.get(card)||[];
    const currentHeight=panel.getBoundingClientRect().height;
    previous.forEach(animation=>animation.cancel());

    panel.style.height=`${currentHeight}px`;
    panel.style.opacity=currentHeight>0?'1':'0';
    inner.style.opacity=currentHeight>0?'1':'0';
    inner.style.transform=currentHeight>0?'translate3d(0,0,0)':'translate3d(0,-2px,0)';

    card.classList.toggle('is-open',open);
    toggle?.setAttribute('aria-expanded',String(open));
    panel.inert=!open;
    panel.setAttribute('aria-hidden',String(!open));

    const targetHeight=open?inner.scrollHeight:0;
    if(reduceMotion){
      setDetailState(card,open);
      return;
    }

    const panelAnimation=panel.animate(
      [
        {height:`${currentHeight}px`,opacity:currentHeight>0?1:.25},
        {height:`${targetHeight}px`,opacity:open?1:.2}
      ],
      {
        duration:open?300:220,
        easing:'cubic-bezier(.32,.72,0,1)',
        fill:'forwards'
      }
    );

    const innerAnimation=inner.animate(
      open
        ?[
          {opacity:currentHeight>0?1:0,transform:currentHeight>0?'translate3d(0,0,0)':'translate3d(0,-3px,0)'},
          {opacity:1,transform:'translate3d(0,0,0)'}
        ]
        :[
          {opacity:1,transform:'translate3d(0,0,0)'},
          {opacity:0,transform:'translate3d(0,-2px,0)'}
        ],
      {
        duration:open?220:160,
        easing:'cubic-bezier(.32,.72,0,1)',
        fill:'forwards'
      }
    );

    const animations=[panelAnimation,innerAnimation];
    detailAnimations.set(card,animations);

    let finished=false;
    const finish=()=>{
      if(finished||detailAnimations.get(card)!==animations)return;
      finished=true;
      animations.forEach(animation=>animation.cancel());
      detailAnimations.delete(card);

      if(open){
        card.classList.add('is-open');
        panel.style.height='auto';
        panel.style.opacity='1';
        inner.style.opacity='1';
        inner.style.transform='translate3d(0,0,0)';
      }else{
        card.classList.remove('is-open');
        panel.style.height='0px';
        panel.style.opacity='0';
        inner.style.opacity='0';
        inner.style.transform='translate3d(0,-2px,0)';
      }
    };

    panelAnimation.addEventListener('finish',finish,{once:true});
    setTimeout(finish,(open?300:220)+80);
  }

  document.querySelectorAll('.detail-card__toggle').forEach(toggle=>{
    toggle.addEventListener('click',()=>{
      const card=toggle.closest('.detail-card');
      const willOpen=!card.classList.contains('is-open');
      if(willOpen){
        document.querySelectorAll('.detail-card.is-open').forEach(other=>{
          if(other!==card)animateDetailState(other,false);
        });
      }
      animateDetailState(card,willOpen);
      if(willOpen){
        const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        setTimeout(()=>toggle.scrollIntoView({
          block:'nearest',
          behavior:reduceMotion?'auto':'smooth'
        }),80);
      }
      haptic('tap');
    });
  });


  function renderStepSegments(){
    const done=routine.completed?exercises.length:Math.min(routine.completedUntil||0,exercises.length);
    const segments=$('#stepSegments');
    segments.style.setProperty('--step-count',String(exercises.length));
    if(segments.children.length!==exercises.length){
      segments.innerHTML=exercises.map(()=>'<i></i>').join('');
    }
    [...segments.children].forEach((segment,index)=>{
      segment.classList.toggle('is-done',index<done);
      segment.classList.toggle('is-current',index===current&&!routine.completed);
    });
  }

  function animateExercise(direction='forward'){
    const card=$('.exercise-main');
    card.classList.remove('enter-forward','enter-back');
    void card.offsetWidth;
    card.classList.add(direction==='back'?'enter-back':'enter-forward');
    const badge=$('#headerProgress');
    badge.classList.remove('is-updating');
    void badge.offsetWidth;
    badge.classList.add('is-updating');
  }

  function updateNextButton(){
    const button=$('#nextButton');
    const timer=timerData(exercises[current]);
    const isDone=routine.completed||Number(routine.completedUntil||0)>current||timer.remaining===0;
    const hasProgress=(timer.paused||timer.remaining<timer.duration)&&timer.remaining>0;

    if(routine.completed){
      button.textContent='Комплекс завершён';
      button.disabled=true;
      button.classList.remove('is-finish');
      return;
    }

    button.disabled=false;
    if(isDone){
      const isFinish=current===exercises.length-1;
      button.textContent=isFinish?'Завершить комплекс':'Следующее упражнение';
      button.classList.toggle('is-finish',isFinish);
      return;
    }

    button.classList.remove('is-finish');
    button.textContent=timer.running?'Открыть таймер':hasProgress?'Продолжить':'Начать упражнение';
  }

  function render(direction='forward',scrollMode='smooth'){
    stopTicker();
    routine.step=current;
    Store.save();

    const exercise=exercises[current];
    document.title=`${exercise.title} — Daily Motion`;
    renderVisual(exercise);
    $('#exerciseTitle').textContent=exercise.title;
    $('#exerciseGoal').textContent=exercise.goal;
    $('#exerciseVolume').textContent=exercise.volume;
    $('#exerciseTime').textContent=exercise.time;
    $('#keyText').textContent=exercise.key;
    $('#howToList').innerHTML=exercise.how.map(item=>`<li>${item}</li>`).join('');
    $('#breathingText').textContent=exercise.breathing;
    $('#feelText').textContent=exercise.feel;
    $('#mistakesList').innerHTML=exercise.mistakes.map(item=>`<li>${item}</li>`).join('');
    $('#easyText').textContent=exercise.easy;
    $('#progressionText').textContent=exercise.progression;
    $('#headerProgress').textContent=`${current+1} / ${exercises.length}`;
    $('#navStepLabel').textContent=`Упражнение ${current+1} из ${exercises.length}`;
    $('#prevButton').disabled=current===0;

    updateNextButton();
    renderStepSegments();
    document.querySelectorAll('.detail-card').forEach((card,index)=>setDetailState(card,index===0));
    updateTimerUI();

    const timer=timerData(exercise);
    if(timer.running){
      startTicker();
      requestWakeLock();
    }

    if(direction)animateExercise(direction);
    requestAnimationFrame(()=>$('#exerciseScroll').scrollTo({top:0,behavior:scrollMode}));
  }

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
    renderStepSegments();
    sound('complete');
    haptic('success');

    const overlay=$('#completionOverlay');
    $('#completionMeta').textContent='Разминка завершена. Пусть день начнётся с движения.';
    $('#completionDuration').textContent=Store.formatActiveTime(routine.activeSeconds);
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
    if(fromExecution)overlay.classList.add('is-handoff');
    overlay.classList.add('is-visible');
    overlay.setAttribute('aria-hidden','false');
    syncModalState();
    emitReloadSafetyChange();

    if(fromExecution){
      requestAnimationFrame(()=>{
        hideExecution();
        $('#completionTitle').focus({preventScroll:true});
        requestAnimationFrame(()=>overlay.classList.remove('is-handoff'));
      });
    }else{
      $('#completionTitle').focus({preventScroll:true});
    }
  }

  $('#routineMoreButton').addEventListener('click',()=>{
    haptic('tap');
    showRoutineSettingsDialog();
  });
  $('#routineSettingsClose').addEventListener('click',()=>{
    haptic('tap');
    hideRoutineSettingsDialog();
  });
  $('#routineSettingsOverlay').addEventListener('click',event=>{
    if(event.target!==event.currentTarget)return;
    haptic('tap');
    hideRoutineSettingsDialog();
  });
  $('#workoutSoundSetting').addEventListener('change',async event=>{
    settings=Store.updateSettings({sound:event.target.checked});
    if(settings.sound){
      const ready=await Audio?.unlock?.();
      if(ready)Audio?.confirm?.();
    }
  });
  $('#workoutAutoNextSetting').addEventListener('change',event=>{
    settings=Store.updateSettings({autoNext:event.target.checked});
  });
  $('#workoutCountdownSetting').addEventListener('change',event=>{
    settings=Store.updateSettings({countdownSeconds:Number(event.target.value)});
    syncTimingControl($('#workoutCountdownSettingDesktop'),settings.countdownSeconds);
  });
  $('#workoutRestSetting').addEventListener('change',event=>{
    settings=Store.updateSettings({restSeconds:Number(event.target.value)});
    syncTimingControl($('#workoutRestSettingDesktop'),settings.restSeconds);
  });
  $('#workoutCountdownSettingDesktop').addEventListener('click',event=>{
    const button=event.target.closest?.('[data-value]');
    if(!button)return;
    settings=Store.updateSettings({countdownSeconds:Number(button.dataset.value)});
    $('#workoutCountdownSetting').value=String(settings.countdownSeconds);
    syncTimingControl($('#workoutCountdownSettingDesktop'),settings.countdownSeconds);
  });
  $('#workoutRestSettingDesktop').addEventListener('click',event=>{
    const button=event.target.closest?.('[data-value]');
    if(!button)return;
    settings=Store.updateSettings({restSeconds:Number(button.dataset.value)});
    $('#workoutRestSetting').value=String(settings.restSeconds);
    syncTimingControl($('#workoutRestSettingDesktop'),settings.restSeconds);
  });
  $('#workoutThemeSetting').addEventListener('click',event=>{
    const button=event.target.closest?.('[data-theme-value]');
    if(!button)return;
    const theme=button.dataset.themeValue;
    if(settings.theme===theme)return;
    settings=Store.updateSettings({theme});
    syncThemeControl($('#workoutThemeSetting'),settings.theme);
    window.DailyMotionTheme?.applyAnimated?.(settings.theme);
  });
  routineResetBtn.addEventListener('click',()=>{
    haptic('tap');
    showRoutineResetConfirm();
  });
  routineResetCancel.addEventListener('click',()=>{
    haptic('tap');
    hideRoutineResetConfirm(true,70);
  });
  routineResetAccept.addEventListener('click',()=>{
    if(routineResetInFlight)return;
    routineResetInFlight=true;
    haptic('tap');
    setTimeout(()=>{
      hideRoutineSettingsDialog();
      resetRoutineProgress();
    },120);
  });

  $('#prevButton').addEventListener('click',()=>{
    if(current<=0)return;
    cancelRest();
    cancelCountdown();
    if(executionStage!=='idle')hideExecution();
    haptic('soft');
    pauseCurrentTimer();
    current--;
    render('back');
  });

  $('#nextButton').addEventListener('click',async()=>{
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

  $('#timerToggle').addEventListener('click',async()=>{
    haptic('soft');
    await unlockAudio();
    const timer=timerData(exercises[current]);

    if(timer.running){
      pauseCurrentTimer();
      sound('pause');
      updateTimerUI();
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
  });

  $('#timerReset').addEventListener('click',()=>{
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
        if(routineResetBlock.classList.contains('is-confirming')){
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

    if(event.key!=='Tab')return;
    const focusable=[...modal.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select:not([disabled])')].filter(node=>node.offsetParent!==null&&!node.closest('[inert]')&&getComputedStyle(node).visibility!=='hidden');
    if(!focusable.length)return;
    const first=focusable[0];
    const last=focusable[focusable.length-1];
    if(event.shiftKey&&(document.activeElement===first||!focusable.includes(document.activeElement))){
      event.preventDefault();
      last.focus();
    }else if(!event.shiftKey&&(document.activeElement===last||!focusable.includes(document.activeElement))){
      event.preventDefault();
      first.focus();
    }
  });

  $('#minusTen').addEventListener('click',()=>{haptic('tap');adjustTimer(-10);});
  $('#plusTen').addEventListener('click',()=>{haptic('tap');adjustTimer(10);});
  $('#countdownCancel').addEventListener('click',()=>{
    cancelCountdown();
    haptic('tap');
  });

  $('#executionClose').addEventListener('click',()=>{
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

  $('#executionFinishEarly').addEventListener('click',()=>{
    const timer=timerData(exercises[current]);
    stopTicker();
    releaseWakeLock();
    if(timer.running)accountTimerRun(timer,true);
    timer.running=false;
    timer.endAt=null;
    timer.runStartedAt=null;
    timer.remaining=0;
    Store.save();
    updateTimerUI();
    onTimerFinished();
  });

  const takeRestFinish=()=>{
    const finish=restFinish;
    if(restTimer!==null)clearInterval(restTimer);
    restTimer=null;
    restFinish=null;
    releaseWakeLock();
    return finish;
  };

  $('#restSkip').addEventListener('click',async()=>{
    const finish=takeRestFinish();
    haptic('next');
    if(finish)finish();
    await unlockAudio();
    startCountdown(startTimerNow);
  });

  $('#restTechnique').addEventListener('click',()=>{
    const finish=takeRestFinish();
    haptic('soft');
    hideExecution(finish||null);
  });
  function syncEffortButtons(){
    document.querySelectorAll('[data-effort]').forEach(button=>{
      button.setAttribute('aria-pressed',String(button.dataset.effort===routine.effort));
    });
    $('#effortStatus').textContent=routine.effort?'Сохранено в истории. Можно изменить.':'Необязательно · только для вас';
  }
  document.querySelectorAll('[data-effort]').forEach(button=>{
    button.addEventListener('click',()=>{
      routine.effort=routine.effort===button.dataset.effort?null:button.dataset.effort;
      Store.save();
      syncEffortButtons();
    });
  });

  $('#completionHome').addEventListener('click',()=>{
    if(window.DailyMotionNavigate){window.DailyMotionNavigate('index.html',{replace:true});return;}
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
      const timer=timerData(exercises[current]);
      if(timer.running){
        accountTimerRun(timer,false);
        Store.save();
      }
      releaseWakeLock();
    }
  });

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
  requestAnimationFrame(()=>{
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
    if(pageLoaderRevealTimer!==null)clearTimeout(pageLoaderRevealTimer);
    if(stageTimer!==null)clearTimeout(stageTimer);
    clearRoutineResetTimers();
    cancelCountdown();
    cancelRest();
    stopTicker();
    restFinish=null;
    stageTransitionToken++;
    executionHideToken++;
    routineSettingsMotion?.destroy?.();
    document.querySelector('#swup')?.getAnimations?.({subtree:true})?.forEach(animation=>animation.cancel());
    clearTimeout(toast.timer);
    releaseWakeLock();
    if(window.DailyMotionReloadGuard?.isSafe===isReloadSafe)delete window.DailyMotionReloadGuard;
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('session-ready');
  };
})(exercises,ROUTINE_KEY);
};

