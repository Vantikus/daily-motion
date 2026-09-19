(function HomeApp(){
  const Store=window.DailyMotionState;
  const ROUTINES={
    morning:{name:'Утро',icon:'☀',minutes:'12–15 мин',total:8},
    day:{name:'День',icon:'◐',minutes:'8–12 мин',total:7},
    evening:{name:'Вечер',icon:'☾',minutes:'15–20 мин',total:11}
  };
  const TOTAL_EXERCISES=Object.values(ROUTINES).reduce((sum,item)=>sum+item.total,0);
  const today=Store.getDay();
  const state=Store.getState();
  const $=selector=>document.querySelector(selector);
  const go=key=>{location.href=`session.html?routine=${key}`;};
  const formatDate=()=>new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long'}).format(new Date());

  const exerciseCount=key=>{
    const routine=today.routines[key];
    const total=ROUTINES[key].total;
    return routine.completed?total:Math.min(routine.completedUntil||0,total);
  };
  const completedExercises=()=>Object.keys(ROUTINES).reduce((sum,key)=>sum+exerciseCount(key),0);
  const completedRoutines=()=>Object.keys(ROUTINES).filter(key=>today.routines[key]?.completed).length;
  const nextRoutine=()=>Object.keys(ROUTINES).find(key=>!today.routines[key]?.completed)||'morning';

  const streak=()=>{
    let count=0;
    const date=new Date();
    for(let i=0;i<365;i++){
      const key=Store.todayKey(date);
      const entry=state.days[key];
      const complete=entry&&Object.keys(ROUTINES).every(routineKey=>entry.routines?.[routineKey]?.completed);
      if(complete)count++;
      else if(i>0)break;
      date.setDate(date.getDate()-1);
    }
    return count;
  };

  const totalDone=completedExercises();
  const percent=Math.round(totalDone/TOTAL_EXERCISES*100);
  const nextKey=nextRoutine();
  const next=ROUTINES[nextKey];
  const nextState=today.routines[nextKey];
  const isResuming=!nextState.completed&&(nextState.startedAt||nextState.completedUntil>0||nextState.step>0);
  const allDone=completedRoutines()===Object.keys(ROUTINES).length;

  $('#todayLabel').textContent=formatDate();
  $('#todayStatus').textContent=allDone?'Готово на сегодня':isResuming?'Продолжить':'Сегодня';
  $('#heroTitle').textContent=allDone?'Движение на сегодня завершено':isResuming?`Продолжить: ${next.name.toLowerCase()}`:`${next.name} · ${next.minutes}`;
  $('#heroText').textContent=allDone
    ?'Все запланированные комплексы отмечены как завершённые.'
    :isResuming
      ?`Следующий шаг — упражнение ${Math.min((nextState.step||0)+1,next.total)} из ${next.total}. Прогресс сохранён.`
      :`${next.total} упражнений. Начните с текущего комплекса — приложение сохранит место автоматически.`;
  $('#continueBtn').textContent=allDone?'Открыть утро':isResuming?'Продолжить тренировку':'Начать тренировку';
  $('#continueBtn').onclick=()=>go(allDone?'morning':nextKey);
  $('#heroProgressText').textContent=`${totalDone} из ${TOTAL_EXERCISES} упражнений`;
  $('#dayProgressValue').textContent=`${percent}%`;
  $('#dayProgressBar').style.width=`${percent}%`;

  const currentStreak=streak();
  $('#streakValue').textContent=String(currentStreak);
  $('#exerciseValue').textContent=`${totalDone}/${TOTAL_EXERCISES}`;
  $('#routineValue').textContent=`${completedRoutines()}/${Object.keys(ROUTINES).length}`;

  const list=$('#routineGrid');
  Object.entries(ROUTINES).forEach(([key,routine])=>{
    const progress=exerciseCount(key);
    const pct=Math.round(progress/routine.total*100);
    const stateItem=today.routines[key];
    const button=document.createElement('button');
    button.className='routine-card';
    button.type='button';
    button.onclick=()=>go(key);
    const status=stateItem.completed?'Завершено':progress>0||stateItem.startedAt?'Продолжить':'Начать';
    button.innerHTML=`
      <span class="routine-icon" aria-hidden="true">${routine.icon}</span>
      <span class="routine-copy">
        <strong>${routine.name}</strong>
        <small>${routine.minutes} · ${routine.total} упражнений</small>
        <span class="mini-progress" aria-hidden="true"><i style="width:${pct}%"></i></span>
      </span>
      <span class="routine-status">${status}<b aria-hidden="true">›</b></span>`;
    list.appendChild(button);
  });

  $('#activityStreak').textContent=currentStreak?`${currentStreak} ${currentStreak===1?'день':'дней'} подряд`:'Серия начнётся после полного дня';
  const days=$('#activityDays');
  const names=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
  for(let i=6;i>=0;i--){
    const date=new Date();
    date.setDate(date.getDate()-i);
    const key=Store.todayKey(date);
    const entry=state.days[key];
    const done=entry?Object.keys(ROUTINES).filter(routineKey=>entry.routines?.[routineKey]?.completed).length:0;
    const pct=Math.round(done/Object.keys(ROUTINES).length*100);
    const item=document.createElement('div');
    item.className='activity-day';
    item.innerHTML=`<span class="activity-day__bar"><i style="height:${Math.max(5,pct)}%"></i></span><small>${names[date.getDay()]}</small>`;
    days.appendChild(item);
  }

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
  const Audio=window.DailyMotionAudio;
  let settings=Store.getSettings();

  const syncSettings=()=>{
    settings=Store.getSettings();
    $('#soundSetting').checked=settings.sound;
    $('#autoNextSetting').checked=settings.autoNext;
    $('#countdownSetting').value=String(settings.countdownSeconds);
    $('#restSetting').value=String(settings.restSeconds);
  };

  const openSettings=()=>{
    syncSettings();
    settingsOverlay.classList.add('is-visible');
    settingsOverlay.setAttribute('aria-hidden','false');
    document.body.classList.add('settings-open');
    settingsClose.focus();
  };

  const closeSettings=()=>{
    settingsOverlay.classList.remove('is-visible');
    settingsOverlay.setAttribute('aria-hidden','true');
    document.body.classList.remove('settings-open');
    settingsBtn.focus();
  };

  settingsBtn.onclick=openSettings;
  settingsClose.onclick=closeSettings;
  settingsOverlay.addEventListener('click',event=>{if(event.target===settingsOverlay)closeSettings();});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&settingsOverlay.classList.contains('is-visible'))closeSettings();
  });

  $('#soundSetting').addEventListener('change',async event=>{
    settings=Store.updateSettings({sound:event.target.checked});
    if(settings.sound)await Audio?.unlock?.();
  });
  $('#autoNextSetting').addEventListener('change',event=>{settings=Store.updateSettings({autoNext:event.target.checked});});
  $('#countdownSetting').addEventListener('change',event=>{settings=Store.updateSettings({countdownSeconds:Number(event.target.value)});});
  $('#restSetting').addEventListener('change',event=>{settings=Store.updateSettings({restSeconds:Number(event.target.value)});});

  $('#testSoundBtn').onclick=async()=>{
    if(!Store.getSettings().sound){
      settings=Store.updateSettings({sound:true});
      syncSettings();
    }
    const ok=await Audio?.test?.();
    toast(ok?'Звук включён':'Не удалось запустить звук');
  };

  syncSettings();
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
