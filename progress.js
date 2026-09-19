(() => {
  const Store=window.DailyMotionState;
  const state=Store.getState();
  const $=selector=>document.querySelector(selector);
  const ROUTINES={
    morning:{name:'Утро',total:8},
    day:{name:'День',total:7},
    evening:{name:'Вечер',total:11}
  };

  const dateFromKey=key=>new Date(`${key}T12:00:00`);
  const formatDate=date=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',weekday:'short'}).format(date);
  const hasWorkout=day=>Boolean(day&&Object.values(day.routines||{}).some(routine=>routine?.completed));
  const hasActivity=day=>Boolean(day&&Object.values(day.routines||{}).some(routine=>routine?.completed||routine?.startedAt||(routine?.completedUntil||0)>0));
  const completedRoutines=day=>Object.entries(day?.routines||{}).filter(([,routine])=>routine?.completed);
  const elapsedMinutes=routine=>{
    if(!routine?.completed||!routine.startedAt||!routine.completedAt)return 0;
    const start=new Date(routine.startedAt).getTime();
    const end=new Date(routine.completedAt).getTime();
    if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return 0;
    return Math.min(180,Math.max(1,Math.round((end-start)/60000)));
  };

  const toast=message=>{
    const node=$('#toast');
    node.textContent=message;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>node.classList.remove('show'),1800);
  };

  const currentStreak=()=>{
    let count=0;
    const date=new Date();
    if(!hasWorkout(state.days[Store.todayKey(date)]))date.setDate(date.getDate()-1);
    for(let i=0;i<730;i++){
      const day=state.days[Store.todayKey(date)];
      if(!hasWorkout(day))break;
      count++;
      date.setDate(date.getDate()-1);
    }
    return count;
  };

  const bestStreak=()=>{
    const dates=Object.keys(state.days)
      .filter(key=>hasWorkout(state.days[key]))
      .sort();
    let best=0;
    let current=0;
    let previous=null;
    for(const key of dates){
      const date=dateFromKey(key);
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

  const completedSessionCount=()=>Object.values(state.days).reduce(
    (sum,day)=>sum+completedRoutines(day).length,0
  );

  const totalMinutes=()=>Object.values(state.days).reduce(
    (sum,day)=>sum+Object.values(day.routines||{}).reduce((daySum,routine)=>daySum+elapsedMinutes(routine),0),0
  );

  const weekStart=()=>{
    const date=new Date();
    const mondayOffset=(date.getDay()+6)%7;
    date.setHours(12,0,0,0);
    date.setDate(date.getDate()-mondayOffset);
    return date;
  };

  const weeklyCount=()=>{
    const start=weekStart();
    let count=0;
    for(let i=0;i<7;i++){
      const date=new Date(start);
      date.setDate(start.getDate()+i);
      if(hasWorkout(state.days[Store.todayKey(date)]))count++;
    }
    return count;
  };

  const renderGoal=()=>{
    const goal=Store.getSettings().weeklyGoalDays;
    const done=weeklyCount();
    const percent=Math.min(100,Math.round(done/goal*100));
    $('#weeklyGoalText').textContent=`${done} / ${goal} дней`;
    $('#weeklyGoalPercent').textContent=`${percent}%`;
    $('#weeklyGoalBar').style.width=`${percent}%`;
    $('#weeklyGoalHint').textContent=done>=goal
      ?'Цель недели выполнена.'
      :done===0
        ?'Первый завершённый комплекс засчитает тренировочный день.'
        :`До цели осталось ${goal-done} ${goal-done===1?'день':'дня'}.`;
  };

  $('#currentStreak').textContent=String(currentStreak());
  $('#bestStreak').textContent=String(bestStreak());
  $('#completedSessions').textContent=String(completedSessionCount());
  $('#totalMinutes').textContent=String(totalMinutes());

  const goalSelect=$('#goalSelect');
  for(let value=1;value<=7;value++){
    const option=document.createElement('option');
    option.value=String(value);
    option.textContent=`${value} ${value===1?'день':'дней'} / нед`;
    goalSelect.appendChild(option);
  }
  goalSelect.value=String(Store.getSettings().weeklyGoalDays);
  goalSelect.addEventListener('change',()=>{
    Store.updateSettings({weeklyGoalDays:Number(goalSelect.value)});
    renderGoal();
    toast('Недельная цель обновлена');
  });
  renderGoal();

  const calendar=$('#historyCalendar');
  const weekdays=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
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

  const history=$('#historyList');
  const historyKeys=Object.keys(state.days)
    .filter(key=>hasActivity(state.days[key]))
    .sort((a,b)=>b.localeCompare(a))
    .slice(0,30);

  $('#historyEmpty').hidden=historyKeys.length>0;

  historyKeys.forEach(key=>{
    const day=state.days[key];
    const completed=completedRoutines(day);
    const activeRoutines=Object.entries(day.routines||{}).filter(([,routine])=>routine?.startedAt||(routine?.completedUntil||0)>0||routine?.completed);
    const minutes=activeRoutines.reduce((sum,[,routine])=>sum+elapsedMinutes(routine),0);
    const completedExercises=Object.entries(day.routines||{}).reduce((sum,[routineKey,routine])=>{
      const total=ROUTINES[routineKey]?.total||0;
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
        <span>${labels}</span>
      </div>
      <div class="history-row__meta">
        <strong>${completedExercises}</strong>
        <span>упр.${minutes?` · ${minutes} мин`:''}</span>
      </div>`;
    history.appendChild(row);
  });

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
      toast('Данные импортированы');
      setTimeout(()=>location.reload(),350);
    }catch{
      toast('Не удалось импортировать файл');
      importInput.value='';
    }
  });

  document.documentElement.classList.add('app-ready');
})();
