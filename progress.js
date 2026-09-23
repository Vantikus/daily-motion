(() => {
  const Store=window.DailyMotionState;
  const $=selector=>document.querySelector(selector);
  const ROUTINES={morning:{name:'Утро',total:window.DailyMotionProgram.morning.length}};
  const routineKeys=Object.keys(ROUTINES);
  const supportedEntries=day=>Store.getRoutineEntries(day,routineKeys);
  const hasWorkout=day=>Store.hasCompletedRoutine(day,routineKeys);
  const hasActivity=day=>Store.hasRoutineActivity(day,routineKeys);
  const completedRoutines=day=>supportedEntries(day).filter(([,routine])=>routine.completed);

  const dateFromKey=key=>new Date(`${key}T12:00:00`);
  const formatDate=date=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',weekday:'short'}).format(date);

  const toast=message=>{
    const node=$('#toast');
    node.textContent=message;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>node.classList.remove('show'),1800);
  };

  const calendar=$('#historyCalendar');
  const history=$('#historyList');
  const weekdays=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];

  const renderProgress=()=>{
    const state=Store.getState();

    $('#currentStreak').textContent=String(Store.getCurrentStreak(routineKeys));
    $('#bestStreak').textContent=String(Store.getBestStreak(routineKeys));
    $('#completedSessions').textContent=String(Store.getCompletedRoutineCount(routineKeys));
    $('#totalMinutes').textContent=String(Math.round(Store.getTotalActiveSeconds(routineKeys)/60));

    calendar.replaceChildren();
    for(let offset=27;offset>=0;offset--){
      const date=new Date();
      date.setHours(12,0,0,0);
      date.setDate(date.getDate()-offset);
      const key=Store.todayKey(date);
      const day=state.days[key];
      const workout=hasWorkout(day);
      const active=hasActivity(day);
      const cell=document.createElement('div');
      cell.className=`history-day${workout?' is-complete':active?' is-active':''}`;
      cell.setAttribute('aria-label',`${formatDate(date)}: ${workout?'тренировка завершена':active?'есть незавершённая активность':'нет активности'}`);
      cell.innerHTML=`<small>${weekdays[date.getDay()]}</small><strong>${date.getDate()}</strong><i aria-hidden="true"></i>`;
      calendar.appendChild(cell);
    }

    history.replaceChildren();
    const historyKeys=Object.keys(state.days)
      .filter(key=>hasActivity(state.days[key]))
      .sort((a,b)=>b.localeCompare(a))
      .slice(0,30);

    $('#historyEmpty').hidden=historyKeys.length>0;

    historyKeys.forEach(key=>{
      const day=state.days[key];
      const completed=completedRoutines(day);
      const activeRoutines=supportedEntries(day).filter(([,routine])=>routine?.completed||(routine?.completedUntil||0)>0||Store.getRoutineActiveSeconds(routine)>0);
      const seconds=activeRoutines.reduce((sum,[,routine])=>sum+Store.getRoutineActiveSeconds(routine),0);
      const duration=Store.formatActiveTime(seconds);
      const effort=completed.map(([,routine])=>Store.EFFORT_LABELS[routine.effort]).filter(Boolean).join(' · ');
      const completedExercises=supportedEntries(day).reduce((sum,[routineKey,routine])=>{
        const total=ROUTINES[routineKey].total;
        return sum+(routine?.completed?total:Math.min(Number(routine?.completedUntil)||0,total));
      },0);

      const row=document.createElement('article');
      row.className='history-row';
      const labels=completed.length
        ?completed.map(([routineKey])=>ROUTINES[routineKey]?.name||routineKey).join(' · ')
        :'Не завершено';
      row.innerHTML=`
        <div class="history-row__date">
          <strong>${formatDate(dateFromKey(key))}</strong>
          <span>${labels}${effort?` · ${effort}`:''}</span>
        </div>
        <div class="history-row__meta">
          <strong>${completedExercises}</strong>
          <span>упр.${seconds>0?` · ${duration}`:''}</span>
        </div>`;
      history.appendChild(row);
    });
  };

  renderProgress();

  $('#exportDataBtn').addEventListener('click',()=>{
    const blob=new Blob([Store.exportState()],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download=`daily-motion-backup-${Store.todayKey()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast('Резервная копия подготовлена');
  });

  const importInput=$('#importDataInput');
  $('#importDataBtn').addEventListener('click',()=>importInput.click());
  importInput.addEventListener('change',async()=>{
    const file=importInput.files?.[0];
    if(!file)return;
    const approved=confirm('Импорт полностью заменит текущий прогресс и настройки. Продолжить?');
    if(!approved){
      importInput.value='';
      return;
    }
    try{
      Store.importState(await file.text());
      window.DailyMotionTheme?.apply?.();
      renderProgress();
      importInput.value='';
      toast('Данные импортированы');
    }catch{
      toast('Не удалось импортировать файл');
      importInput.value='';
    }
  });

  window.addEventListener('pageshow',event=>{
    if(event.persisted)renderProgress();
  });

  document.documentElement.classList.add('app-ready');
})();
