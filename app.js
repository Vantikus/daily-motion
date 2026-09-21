(function HomeApp(){
  const Store=window.DailyMotionState;
  const ROUTINES={
    morning:{name:'Утро',title:'Утренняя разминка',minutes:'≈ 10 мин',total:window.DailyMotionProgram.morning.length,icon:'sunrise',available:true},
    day:{name:'День',title:'Дневная разминка',icon:'sun',available:false},
    evening:{name:'Вечер',title:'Вечерняя разминка',icon:'moon',available:false}
  };
  const availableRoutineKeys=Object.entries(ROUTINES).filter(([,routine])=>routine.available).map(([key])=>key);
  const routineIcons={
    sunrise:`<svg class="qm-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3M5.6 5.6l2.1 2.1M18.4 5.6l-2.1 2.1M3 15h18M5 19h14"></path><path d="M7 15a5 5 0 0 1 10 0"></path></svg>`,
    sun:`<svg class="qm-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"></path></svg>`,
    moon:`<svg class="qm-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z"></path></svg>`
  };
  const today=Store.getDay();
  const state=Store.getState();
  const $=selector=>document.querySelector(selector);
  const go=key=>{location.href=`session.html?routine=${key}&resume=1`;};
  const formatDate=()=>new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long'}).format(new Date());

  const exerciseCount=key=>{
    const config=ROUTINES[key];
    if(!config?.available)return 0;
    const routine=today.routines[key];
    return routine.completed?config.total:Math.min(routine.completedUntil||0,config.total);
  };
  const completedRoutines=()=>availableRoutineKeys.filter(key=>today.routines[key]?.completed).length;
  const nextRoutine=()=>availableRoutineKeys.find(key=>!today.routines[key]?.completed)||availableRoutineKeys[0]||'morning';

  const allDone=availableRoutineKeys.length>0&&completedRoutines()===availableRoutineKeys.length;
  const nextKey=allDone?'morning':nextRoutine();
  const next=ROUTINES[nextKey];
  const nextState=today.routines[nextKey];
  const nextDone=exerciseCount(nextKey);
  const nextPercent=Math.round(nextDone/next.total*100);
  const isResuming=!nextState.completed&&(nextState.startedAt||nextState.completedUntil>0||nextState.step>0);

  $('#todayLabel').textContent=formatDate();
  $('#todayStatus').textContent=allDone?'Готово':isResuming?'Продолжить':'Сегодня';
  $('#heroTitle').textContent=allDone?'Утренняя разминка завершена':next.title;
  const resumeIndex=Math.min(next.total-1,Math.max(nextState.step||0,nextState.completedUntil||0));
  const resumeExercise=window.DailyMotionProgram[nextKey]?.[resumeIndex];
  $('#heroText').textContent=allDone
    ?`${next.total} упражнений · ${Store.formatActiveTime(nextState.activeSeconds)} в движении`
    :isResuming?`Упражнение ${resumeIndex+1} из ${next.total} · ${resumeExercise.title}`
    :`${next.minutes} · ${next.total} упражнений`;
  $('#heroNote').textContent=allDone?'На сегодня готово. Результат сохранён.':isResuming?'Таймер и прогресс сохранены.':'';
  $('#heroNote').hidden=!allDone&&!isResuming;
  $('#continueBtn').textContent=allDone?'Посмотреть прогресс':isResuming?'Продолжить':'Начать';
  $('#continueBtn').onclick=()=>allDone?location.href='progress.html':go(nextKey);
  $('#heroProgressText').textContent=`${nextDone} из ${next.total} упражнений`;
  $('#dayProgressValue').textContent=`${nextPercent}%`;
  $('#dayProgressBar').style.width=`${nextPercent}%`;
  $('#todayCard').classList.toggle('is-complete',allDone);

  const list=$('#routineGrid');
  Object.entries(ROUTINES).forEach(([key,routine],index)=>{
    const stateItem=today.routines[key];
    const button=document.createElement('button');
    button.className='routine-card';
    button.type='button';
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
        <span class="routine-status">${status}<b aria-hidden="true">›</b></span>
        <span class="mini-progress" aria-hidden="true"><i style="width:${pct}%"></i></span>`;
    }
    if(index===Object.keys(ROUTINES).length-1)button.classList.add('is-last');
    list.appendChild(button);
  });

  const currentStreak=Store.getCurrentStreak(availableRoutineKeys,365);
  $('#activityStreak').textContent=currentStreak
    ?`Серия ${currentStreak} ${currentStreak===1?'день':'дня'}`
    :'Серия —';

  const days=$('#activityDays');
  const names=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
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
  const Audio=window.DailyMotionAudio;
  const PWA=window.DailyMotionPWA;
  let settingsReturnFocus=null;
  let settings=Store.getSettings();

  const syncSettings=()=>{
    settings=Store.getSettings();
    $('#soundSetting').checked=settings.sound;
    $('#autoNextSetting').checked=settings.autoNext;
    $('#countdownSetting').value=String(settings.countdownSeconds);
    $('#restSetting').value=String(settings.restSeconds);
  };

  const focusableInSettings=()=>[...settingsOverlay.querySelectorAll('button:not([hidden]),input:not([disabled]),select:not([disabled]),[href]')].filter(node=>node.offsetParent!==null);
  const syncInstallButton=()=>{installAppBtn.hidden=!PWA?.canInstall?.();};

  const finishSettingsClose=()=>{
    settingsOverlay.setAttribute('aria-hidden','true');
    document.body.classList.remove('settings-open');
    $('.app-shell').inert=false;
    const returnFocus=settingsReturnFocus||settingsBtn;
    settingsReturnFocus=null;
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
  document.addEventListener('keydown',event=>{
    if(!settingsOverlay.classList.contains('is-visible'))return;
    if(event.key==='Escape'){closeSettings();return;}
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
  $('#countdownSetting').addEventListener('change',event=>{settings=Store.updateSettings({countdownSeconds:Number(event.target.value)});});
  $('#restSetting').addEventListener('change',event=>{settings=Store.updateSettings({restSeconds:Number(event.target.value)});});

  installAppBtn.onclick=async()=>{
    const result=await PWA?.install?.();
    syncInstallButton();
    if(result?.outcome==='accepted')toast('Установка началась');
  };
  window.addEventListener('daily-motion-install-change',syncInstallButton);

  syncSettings();
  syncInstallButton();
  document.documentElement.classList.add('app-ready');

  $('#resetTodayBtn').onclick=()=>{
    if(confirm('Сбросить весь сегодняшний прогресс и таймеры?')){
      Store.resetToday();
      toast('Сегодняшний прогресс сброшен');
      setTimeout(()=>location.reload(),300);
    }
  };

  window.addEventListener('pageshow',event=>{
    if(event.persisted)location.reload();
  });
})();

