window.DailyMotionPages=window.DailyMotionPages||{};
window.DailyMotionPages.home=function mountHome(){
  const Store=window.DailyMotionState;
  const UI=window.DailyMotionUI;
  const lifecycle=new AbortController();
  const listen=(target,type,handler,options={})=>target?.addEventListener(type,handler,{...options,signal:lifecycle.signal});
  const ROUTINES={
    morning:{name:'Утро',title:'Утренняя разминка',minutes:'≈ 10 мин',total:window.DailyMotionProgram.morning.length,icon:'sunrise',available:true},
    day:{name:'День',title:'Дневная разминка',icon:'sun',available:false},
    evening:{name:'Вечер',title:'Вечерняя разминка',icon:'moon',available:false}
  };
  const availableRoutineKeys=Object.entries(ROUTINES).filter(([,routine])=>routine.available).map(([key])=>key);
  const routineIcons={
    sunrise:`<i class="hi hi-sun" aria-hidden="true"></i>`,
    sun:`<i class="hi hi-sun" aria-hidden="true"></i>`,
    moon:`<i class="hi hi-moon" aria-hidden="true"></i>`
  };
  let today=Store.getDay();
  let state=Store.getState();
  const $=selector=>document.querySelector(selector);
  const navigate=(href,options={})=>{
    if(window.DailyMotionNavigate){window.DailyMotionNavigate(href,options);return;}
    if(options.replace)location.replace(href);
    else location.assign(href);
  };
  const go=key=>{
    try{sessionStorage.setItem('dm-resume-routine',key);}catch{}
    navigate(`session.html?routine=${key}&resume=1`,{animation:'workout'});
  };
  const formatDate=()=>new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long'}).format(new Date());

  const list=$('#routineGrid');
  const days=$('#activityDays');
  const names=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];

  const exerciseCount=key=>{
    const config=ROUTINES[key];
    if(!config?.available)return 0;
    const routine=today.routines[key];
    return routine.completed?config.total:Math.min(routine.completedUntil||0,config.total);
  };
  const completedRoutines=()=>availableRoutineKeys.filter(key=>today.routines[key]?.completed).length;
  const nextRoutine=()=>availableRoutineKeys.find(key=>!today.routines[key]?.completed)||availableRoutineKeys[0]||'morning';

  const renderRoutineCards=()=>{
    list.replaceChildren();
    Object.entries(ROUTINES).forEach(([key,routine],index)=>{
      const stateItem=today.routines[key]||{};
      const button=document.createElement('button');
      button.className='routine-card';
      button.type='button';
      button.dataset.routine=key;
      if(!routine.available){
        button.disabled=true;
        button.classList.add('is-unavailable');
        button.innerHTML=`
          <span class="qm-icon qm-icon--accent routine-glyph">${routineIcons[routine.icon]||routineIcons.sun}</span>
          <span class="routine-copy"><strong>${routine.name}</strong><small>Пока недоступно</small></span>
          <span class="routine-status">Скоро</span>`;
      }else{
        const progress=exerciseCount(key);
        const pct=Math.round(progress/routine.total*100);
        const status=stateItem.completed?'Готово':progress>0||stateItem.activeSeconds>0?'Продолжить':'Начать';
        button.onclick=()=>go(key);
        button.innerHTML=`
          <span class="qm-icon qm-icon--accent routine-glyph">${routineIcons[routine.icon]||routineIcons.sun}</span>
          <span class="routine-copy"><strong>${routine.name}</strong><small>${routine.minutes} · ${routine.total} упражнений</small></span>
          <span class="routine-status">${status}<i class="hi hi-chevron-right" aria-hidden="true"></i></span>
          <span class="mini-progress" aria-hidden="true"><i style="width:${pct}%"></i></span>`;
      }
      if(index===Object.keys(ROUTINES).length-1)button.classList.add('is-last');
      list.appendChild(button);
    });
  };

  const streakLabel=count=>{
    const value=Math.max(0,Math.floor(Number(count)||0));
    const mod100=value%100;
    const mod10=value%10;
    const unit=mod100>=11&&mod100<=14?'дней':mod10===1?'день':mod10>=2&&mod10<=4?'дня':'дней';
    return `${value} ${unit}`;
  };

  const renderActivity=()=>{
    days.replaceChildren();
    const currentStreak=Store.getCurrentStreak(availableRoutineKeys,365);
    $('#activityStreak').textContent=currentStreak
      ?`Серия · ${streakLabel(currentStreak)}`
      :'Серия · пока нет';

    let hasActivity=false;
    for(let i=6;i>=0;i--){
      const date=new Date();
      date.setHours(12,0,0,0);
      date.setDate(date.getDate()-i);
      const key=Store.todayKey(date);
      const entry=state.days[key];
      const complete=Store.hasCompletedRoutine(entry,availableRoutineKeys);
      const active=Store.hasRoutineActivity(entry,availableRoutineKeys);
      if(complete||active)hasActivity=true;
      const item=document.createElement('div');
      item.className=`activity-day${complete?' is-complete':active?' is-active':''}${i===0?' is-today':''}`;
      item.setAttribute('aria-label',`${names[date.getDay()]}: ${complete?'тренировка завершена':active?'есть активность':'нет активности'}`);
      item.innerHTML=`<span class="activity-day__dot" aria-hidden="true"></span><small>${names[date.getDay()]}</small>`;
      days.appendChild(item);
    }

    $('#activityEmpty').hidden=hasActivity;
    $('#activityCard').classList.toggle('is-empty',!hasActivity);
  };

  const renderHomeState=()=>{
    today=Store.getDay();
    state=Store.getState();

    const allDone=availableRoutineKeys.length>0&&completedRoutines()===availableRoutineKeys.length;
    const nextKey=allDone?'morning':nextRoutine();
    const next=ROUTINES[nextKey];
    const nextState=today.routines[nextKey];
    const nextDone=exerciseCount(nextKey);
    const nextPercent=Math.round(nextDone/next.total*100);
    const isResuming=!nextState.completed&&(nextState.startedAt||nextState.completedUntil>0||nextState.step>0);
    const resumeIndex=Math.min(next.total-1,Math.max(nextState.step||0,nextState.completedUntil||0));
    const resumeExercise=window.DailyMotionProgram[nextKey]?.[resumeIndex];

    $('#todayLabel').textContent=formatDate();
    $('#todayStatus').textContent=allDone?'Готово':isResuming?'Продолжить':'Сегодня';
    $('#heroTitle').textContent=allDone?'Утренняя разминка завершена':next.title;
    $('#heroText').textContent=allDone
      ?`${next.total} упражнений · ${Store.formatActiveTime(nextState.activeSeconds)} в движении`
      :isResuming?`Упражнение ${resumeIndex+1} из ${next.total} · ${resumeExercise.title}`
      :`${next.minutes} · ${next.total} упражнений`;
    const saved=Store.getPersistenceStatus().ok;
    $('#heroNote').textContent=allDone
      ?saved?'На сегодня готово. Результат сохранён.':'На сегодня готово. Не удалось сохранить результат.'
      :isResuming?saved?'Таймер и прогресс сохранены.':'Не удалось сохранить изменения.':'';
    $('#heroNote').hidden=!allDone&&!isResuming;
    $('#continueBtn').textContent=allDone?'Посмотреть прогресс':isResuming?'Продолжить':'Начать';
    $('#continueBtn').onclick=()=>allDone?navigate('progress.html',{animation:'progress'}):go(nextKey);
    $('#heroProgressText').textContent=`${nextDone} из ${next.total} упражнений`;
    $('#dayProgressValue').textContent=`${nextPercent}%`;
    $('#dayProgressBar').style.width=`${nextPercent}%`;
    const dayProgressTrack=$('#dayProgressTrack');
    if(dayProgressTrack){
      dayProgressTrack.setAttribute('aria-valuenow',String(nextPercent));
      dayProgressTrack.setAttribute('aria-valuetext',`${nextPercent}% (${nextDone} из ${next.total} упражнений)`);
    }
    $('#todayCard').classList.toggle('is-complete',allDone);

    renderRoutineCards();
    renderActivity();
  };

  renderHomeState();

  const refreshHomeAfterReset=()=>renderHomeState();

  const toastController=UI.createToast($('#toast'),{duration:1600});
  const toast=toastController.show;

  const settingsOverlay=$('#settingsOverlay');
  const settingsBtn=$('#settingsBtn');
  const settingsClose=$('#settingsClose');
  const installAppBtn=$('#installAppBtn');
  const iosInstallGuide=$('#iosInstallGuide');
  const iosInstallGuideClose=$('#iosInstallGuideClose');
  const resetTodayBlock=$('#resetTodayBlock');
  const resetTodayBtn=$('#resetTodayBtn');
  const resetTodayConfirm=$('#resetTodayConfirm');
  const resetCancelBtn=$('#resetCancelBtn');
  const resetConfirmBtn=$('#resetConfirmBtn');
  const Audio=window.DailyMotionAudio;
  const PWA=window.DailyMotionPWA;
  let settingsReturnFocus=null;
  let settings=Store.getSettings();

  const settingsBinding=UI.bindSettingsControls({
    store:Store,
    audio:Audio,
    theme:window.DailyMotionTheme,
    signal:lifecycle.signal,
    elements:{
      sound:$('#soundSetting'),
      autoNext:$('#autoNextSetting'),
      countdown:$('#countdownSetting'),
      rest:$('#restSetting'),
      countdownButtons:$('#countdownSettingDesktop'),
      restButtons:$('#restSettingDesktop'),
      themeButtons:$('#themeSetting')
    },
    onChange:value=>{settings=value;}
  });
  const syncSettings=()=>settingsBinding?.sync?.();
  const hideInstallGuide=(restoreFocus=false)=>{
    if(!iosInstallGuide)return;
    iosInstallGuide.hidden=true;
    if(restoreFocus&&!installAppBtn.hidden)installAppBtn.focus({preventScroll:true});
  };
  const syncInstallButton=()=>{
    const mode=PWA?.getInstallMode?.()||'unavailable';
    installAppBtn.hidden=mode==='unavailable';
    const label=installAppBtn.querySelector('span');
    if(label)label.textContent=mode==='ios-manual'?'Добавить на экран «Домой»':'Установить приложение';
    if(mode!=='ios-manual')hideInstallGuide(false);
  };

  let refreshAfterSettingsClose=false;
  let resetInFlight=false;
  let resetCloseTimer=null;
  const resetConfirmFlow=UI.createConfirmFlow({
    block:resetTodayBlock,
    panel:resetTodayConfirm,
    trigger:resetTodayBtn,
    accept:resetConfirmBtn
  });
  const hideResetConfirm=(restoreFocus=false,delay=0)=>resetConfirmFlow.hide(restoreFocus,delay);
  const showResetConfirm=()=>resetConfirmFlow.show();

  const finishSettingsClose=()=>{
    const shouldRefresh=refreshAfterSettingsClose;
    refreshAfterSettingsClose=false;
    hideInstallGuide(false);
    hideResetConfirm(false);
    settingsOverlay.setAttribute('aria-hidden','true');
    document.body.classList.remove('settings-open');
    $('.app-shell').inert=false;
    const returnFocus=settingsReturnFocus||settingsBtn;
    settingsReturnFocus=null;
    if(shouldRefresh){
      refreshHomeAfterReset();
      resetInFlight=false;
      toast('Сегодняшний прогресс сброшен');
      return;
    }
    returnFocus?.focus?.({preventScroll:true});
  };

  const settingsSheet=settingsOverlay.querySelector('.settings-sheet');
  const settingsHandle=settingsOverlay.querySelector('.settings-sheet__handle');
  const settingsMotion=window.DailyMotionMotion?.createBottomSheet?.({
    overlay:settingsOverlay,
    sheet:settingsSheet,
    handle:settingsHandle,
    lockPage:true,
    onBeforeClose:()=>settingsBtn.setAttribute('aria-expanded','false'),
    onClosed:finishSettingsClose,
    onOpened:()=>settingsClose.focus({preventScroll:true})
  });

  const openSettings=()=>{
    hideInstallGuide(false);
    hideResetConfirm(false);
    syncSettings();
    syncInstallButton();
    settingsReturnFocus=document.activeElement;
    document.body.classList.add('settings-open');
    settingsBtn.setAttribute('aria-expanded','true');

    if(settingsMotion){
      settingsMotion.open();
      $('.app-shell').inert=true;
      settingsClose.focus({preventScroll:true});
      return;
    }

    settingsOverlay.setAttribute('aria-hidden','false');
    settingsOverlay.classList.add('is-visible');
    $('.app-shell').inert=true;
    settingsClose.focus({preventScroll:true});
  };

  const closeSettings=()=>{
    if(!settingsOverlay.classList.contains('is-visible'))return;
    settingsBtn.setAttribute('aria-expanded','false');

    if(settingsMotion){
      settingsMotion.close();
      return;
    }

    settingsOverlay.classList.remove('is-visible');
    finishSettingsClose();
  };


  settingsBtn.onclick=openSettings;
  settingsClose.onclick=closeSettings;
  settingsOverlay.addEventListener('click',event=>{if(event.target===settingsOverlay)closeSettings();});
  listen(document,'keydown',event=>{
    if(!settingsOverlay.classList.contains('is-visible'))return;
    if(event.key==='Escape'){
      if(resetTodayBlock.classList.contains('is-confirming')){hideResetConfirm(true,70);return;}
      closeSettings();
      return;
    }
    UI.trapFocus(event,settingsOverlay,{wrapUnknown:false});
  });

  installAppBtn.onclick=async()=>{
    const result=await PWA?.install?.();
    syncInstallButton();
    if(result?.outcome==='accepted'){
      toast('Установка началась');
      return;
    }
    if(result?.outcome==='manual-ios'){
      iosInstallGuide.hidden=false;
      requestAnimationFrame(()=>iosInstallGuideClose?.focus({preventScroll:true}));
    }
  };
  iosInstallGuideClose?.addEventListener('click',()=>hideInstallGuide(true));
  listen(window,'daily-motion-install-change',syncInstallButton);

  syncSettings();
  syncInstallButton();
  document.documentElement.classList.add('app-ready');

  resetTodayBtn.onclick=showResetConfirm;
  resetCancelBtn.onclick=()=>hideResetConfirm(true,70);
  resetConfirmBtn.onclick=()=>{
    if(resetInFlight)return;
    resetInFlight=true;
    Store.resetToday();
    refreshAfterSettingsClose=true;
    resetCloseTimer=setTimeout(()=>{resetCloseTimer=null;closeSettings();},120);
  };

  return ()=>{
    lifecycle.abort();
    settingsMotion?.destroy?.();
    resetConfirmFlow.destroy();
    if(resetCloseTimer!==null)clearTimeout(resetCloseTimer);
    toastController.destroy();
    document.body.classList.remove('settings-open','modal-open');
    const shell=document.querySelector('.app-shell');
    if(shell)shell.inert=false;
  };
};
