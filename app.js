window.DailyMotionPages=window.DailyMotionPages||{};
window.DailyMotionPages.home=function mountHome(){
  const Store=window.DailyMotionState;
  const lifecycle=new AbortController();
  const listen=(target,type,handler,options={})=>target?.addEventListener(type,handler,{...options,signal:lifecycle.signal});
  const ROUTINES={
    morning:{name:'Утро',title:'Утренняя разминка',minutes:'≈ 10 мин',total:window.DailyMotionProgram.morning.length,icon:'sunrise',available:true},
    day:{name:'День',title:'Дневная разминка',icon:'sun',available:false},
    evening:{name:'Вечер',title:'Утренняя разминка',icon:'moon',available:false}
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
  const navigate=href=>{
    if(window.DailyMotionNavigate){window.DailyMotionNavigate(href);return;}
    location.assign(href);
  };
  const go=key=>navigate(`session.html?routine=${key}&resume=1`);
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
          <span class="routine-copy"><strong>${routine.name}</strong><small>Комплекс в разработке</small></span>
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

  const renderActivity=()=>{
    days.replaceChildren();
    const currentStreak=Store.getCurrentStreak(availableRoutineKeys,365);
    $('#activityStreak').textContent=currentStreak
      ?`Серия ${currentStreak} ${currentStreak===1?'день':'дня'}`
      :'Серия —';

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
    $('#heroNote').textContent=allDone?'На сегодня готово. Результат сохранён.':isResuming?'Таймер и прогресс сохранены.':'';
    $('#heroNote').hidden=!allDone&&!isResuming;
    $('#continueBtn').textContent=allDone?'Посмотреть прогресс':isResuming?'Продолжить':'Начать';
    $('#continueBtn').onclick=()=>allDone?navigate('progress.html'):go(nextKey);
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

  const toast=message=>{
    const node=$('#toast');
    node.textContent=message;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>node.classList.remove('show'),1600);
  };

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

  const syncThemeControl=(root,value)=>{
    root?.querySelectorAll('[data-theme-value]').forEach(button=>{
      button.setAttribute('aria-pressed',String(button.dataset.themeValue===value));
    });
  };
  const syncTimingControl=(root,value)=>{
    root?.querySelectorAll('[data-value]').forEach(button=>{
      button.setAttribute('aria-pressed',String(button.dataset.value===String(value)));
    });
  };
  const syncSettings=()=>{
    settings=Store.getSettings();
    $('#soundSetting').checked=settings.sound;
    $('#autoNextSetting').checked=settings.autoNext;
    $('#countdownSetting').value=String(settings.countdownSeconds);
    $('#restSetting').value=String(settings.restSeconds);
    syncTimingControl($('#countdownSettingDesktop'),settings.countdownSeconds);
    syncTimingControl($('#restSettingDesktop'),settings.restSeconds);
    syncThemeControl($('#themeSetting'),settings.theme);
  };

  const focusableInSettings=()=>[...settingsOverlay.querySelectorAll('button:not([hidden]),input:not([disabled]),select:not([disabled]),[href]')].filter(node=>node.offsetParent!==null&&!node.closest('[inert]')&&getComputedStyle(node).visibility!=='hidden');
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

  let resetStateTimer=null;
  let resetFocusTimer=null;
  let refreshAfterSettingsClose=false;
  let resetInFlight=false;
  let resetCloseTimer=null;
  const clearResetTimers=()=>{
    if(resetStateTimer!==null){
      clearTimeout(resetStateTimer);
      resetStateTimer=null;
    }
    if(resetFocusTimer!==null){
      clearTimeout(resetFocusTimer);
      resetFocusTimer=null;
    }
  };
  const applyResetConfirmState=(confirming,focusTarget=null)=>{
    resetTodayBlock.classList.toggle('is-confirming',confirming);
    resetTodayConfirm.setAttribute('aria-hidden',confirming?'false':'true');
    resetTodayConfirm.inert=!confirming;
    resetTodayBtn.inert=confirming;
    if(focusTarget){
      resetFocusTimer=setTimeout(()=>{
        resetFocusTimer=null;
        focusTarget.focus({preventScroll:true});
      },300);
    }
  };
  const hideResetConfirm=(restoreFocus=false,delay=0)=>{
    clearResetTimers();
    const apply=()=>applyResetConfirmState(false,restoreFocus?resetTodayBtn:null);
    if(delay){
      resetStateTimer=setTimeout(()=>{
        resetStateTimer=null;
        apply();
      },delay);
      return;
    }
    apply();
  };
  const showResetConfirm=()=>{
    if(resetTodayBlock.classList.contains('is-confirming')||resetStateTimer!==null)return;
    clearResetTimers();
    resetStateTimer=setTimeout(()=>{
      resetStateTimer=null;
      applyResetConfirmState(true,resetConfirmBtn);
    },70);
  };

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
    if(event.key!=='Tab')return;
    const focusable=focusableInSettings();
    if(!focusable.length)return;
    const first=focusable[0];
    const last=focusable[focusable.length-1];
    if(event.shiftKey&&document.activeElement===first){
      event.preventDefault();
      last.focus();
    }else if(!event.shiftKey&&document.activeElement===last){
      event.preventDefault();
      first.focus();
    }
  });

  $('#soundSetting').addEventListener('change',async event=>{
    settings=Store.updateSettings({sound:event.target.checked});
    if(settings.sound){
      const ready=await Audio?.unlock?.();
      if(ready)Audio?.confirm?.();
    }
  });
  $('#autoNextSetting').addEventListener('change',event=>{settings=Store.updateSettings({autoNext:event.target.checked});});
  $('#countdownSetting').addEventListener('change',event=>{
    settings=Store.updateSettings({countdownSeconds:Number(event.target.value)});
    syncTimingControl($('#countdownSettingDesktop'),settings.countdownSeconds);
  });
  $('#restSetting').addEventListener('change',event=>{
    settings=Store.updateSettings({restSeconds:Number(event.target.value)});
    syncTimingControl($('#restSettingDesktop'),settings.restSeconds);
  });
  $('#countdownSettingDesktop').addEventListener('click',event=>{
    const button=event.target.closest?.('[data-value]');
    if(!button)return;
    settings=Store.updateSettings({countdownSeconds:Number(button.dataset.value)});
    $('#countdownSetting').value=String(settings.countdownSeconds);
    syncTimingControl($('#countdownSettingDesktop'),settings.countdownSeconds);
  });
  $('#restSettingDesktop').addEventListener('click',event=>{
    const button=event.target.closest?.('[data-value]');
    if(!button)return;
    settings=Store.updateSettings({restSeconds:Number(button.dataset.value)});
    $('#restSetting').value=String(settings.restSeconds);
    syncTimingControl($('#restSettingDesktop'),settings.restSeconds);
  });
  $('#themeSetting').addEventListener('click',event=>{
    const button=event.target.closest?.('[data-theme-value]');
    if(!button)return;
    const theme=button.dataset.themeValue;
    if(settings.theme===theme)return;
    settings=Store.updateSettings({theme});
    syncThemeControl($('#themeSetting'),settings.theme);
    window.DailyMotionTheme?.applyAnimated?.(settings.theme);
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
    clearResetTimers();
    if(resetCloseTimer!==null)clearTimeout(resetCloseTimer);
    clearTimeout(toast.timer);
    document.body.classList.remove('settings-open','modal-open');
    const shell=document.querySelector('.app-shell');
    if(shell)shell.inert=false;
  };
};

