(() => {
  const ROUTINES = {
    morning: {name:'Утро', icon:'☀', minutes:'12–15 мин', total:8},
    day: {name:'День', icon:'◐', minutes:'8–12 мин', total:7},
    evening: {name:'Вечер', icon:'☾', minutes:'15–20 мин', total:11}
  };
  const KEY = 'dailyMotionState.v1';
  const todayKey = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const blankRoutine = () => ({step:0, completedUntil:0, completed:false});
  const emptyDay = () => ({routines:{morning:blankRoutine(),day:blankRoutine(),evening:blankRoutine()}});
  const load = () => { try{return JSON.parse(localStorage.getItem(KEY))||{days:{},timers:{}}}catch{return {days:{},timers:{}}} };
  const save = s => localStorage.setItem(KEY, JSON.stringify(s));
  const state = load();
  if(!state.days) state.days={};
  if(!state.timers) state.timers={};
  if(!state.days[todayKey()]) state.days[todayKey()] = emptyDay();
  const today = state.days[todayKey()];
  ['morning','day','evening'].forEach(k=>{
    if(!today.routines[k]) today.routines[k]=blankRoutine();
    const r=today.routines[k];
    if(typeof r.completedUntil!=='number') r.completedUntil = r.completed ? ROUTINES[k].total : Math.max(0, Number(r.step)||0);
    if(typeof r.step!=='number') r.step = Math.min(r.completedUntil, ROUTINES[k].total-1);
  });
  save(state);

  const exerciseCount = (key) => {
    const x=today.routines[key], total=ROUTINES[key].total;
    return x.completed ? total : Math.min(x.completedUntil||0,total);
  };
  const completedExercises = () => Object.keys(ROUTINES).reduce((sum,key)=>sum+exerciseCount(key),0);
  const completedRoutines = () => Object.values(today.routines).filter(x=>x.completed).length;
  const nextRoutine = () => ['morning','day','evening'].find(k=>!today.routines[k].completed) || 'morning';
  const pct = () => Math.round((completedExercises()/26)*100);
  const go = key => { location.href = `session.html?routine=${key}`; };
  const fmtDate = () => new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
  const streak = () => {
    let count=0, d=new Date();
    for(let i=0;i<365;i++){
      const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`, entry=state.days[k];
      if(entry && Object.values(entry.routines||{}).every(r=>r.completed)) count++;
      else if(i>0) break;
      d.setDate(d.getDate()-1);
    }
    return count;
  };
  document.querySelector('#todayLabel').textContent = fmtDate();
  const nr=nextRoutine(), n=ROUTINES[nr], progress=pct();
  const nrState=today.routines[nr];
  document.querySelector('#heroTitle').textContent = nrState.completedUntil>0 ? `Продолжить: ${n.name.toLowerCase()}` : `Начать: ${n.name.toLowerCase()}`;
  document.querySelector('#heroText').textContent = `${n.minutes}. Текущий прогресс сохраняется автоматически.`;
  document.querySelector('#continueBtn').textContent = nrState.completedUntil>0 ? 'Продолжить' : 'Начать';
  document.querySelector('#continueBtn').onclick=()=>go(nr);
  document.querySelector('#nextRoutinePill').textContent = completedRoutines()===3 ? 'Все комплексы выполнены' : 'Следующий комплекс';
  document.querySelector('#dayProgressRing').style.setProperty('--progress',progress);
  document.querySelector('#dayProgressValue').textContent = `${progress}%`;
  document.querySelector('#exerciseValue').textContent = `${completedExercises()} / 26`;
  document.querySelector('#routineValue').textContent = `${completedRoutines()} / 3`;
  const currentStreak=streak();
  document.querySelector('#streakValue').textContent = `${currentStreak} ${currentStreak===1?'день':'дней'}`;
  document.querySelector('#daySummary').textContent = `${completedRoutines()} из 3`;

  const grid=document.querySelector('#routineGrid');
  Object.entries(ROUTINES).forEach(([key,r])=>{
    const x=today.routines[key], ex=exerciseCount(key), p=Math.round(ex/r.total*100);
    const b=document.createElement('button'); b.className='routine-card'; b.onclick=()=>go(key);
    b.innerHTML=`<div class="routine-card__top"><span class="routine-icon">${r.icon}</span><span class="routine-state">${x.completed?'Завершено':ex>0?'В процессе':'Не начато'}</span></div><div><h4>${r.name}</h4><p>${r.minutes} · ${r.total} упражнений</p></div><div class="mini-progress"><i style="width:${p}%"></i></div>`;
    grid.appendChild(b);
  });

  const bars=document.querySelector('#activityBars');
  const names=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
  for(let i=6;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i); const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; const entry=state.days[k];
    let c=0; if(entry) c=Object.values(entry.routines||{}).filter(r=>r.completed).length;
    const el=document.createElement('div'); el.className='day-bar';
    el.innerHTML=`<div class="day-bar__track"><div class="day-bar__fill" style="height:${Math.max(4,c/3*100)}%"></div></div><small>${names[d.getDay()]}</small>`;
    bars.appendChild(el);
  }

  document.querySelectorAll('[data-action]').forEach(btn=>btn.onclick=()=>{
    const a=btn.dataset.action; go(a==='continue'?nextRoutine():a);
  });

  const toast=msg=>{const t=document.querySelector('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1600)};
  document.querySelector('#resetTodayBtn').onclick=()=>{
    if(confirm('Сбросить весь сегодняшний прогресс?')){state.days[todayKey()]=emptyDay();save(state);toast('Прогресс сброшен');setTimeout(()=>location.reload(),350)}
  };
})();
