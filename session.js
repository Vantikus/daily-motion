(() => {
  const KEY='dailyMotionState.v1';
  const ROUTINE_KEY=new URLSearchParams(location.search).get('routine')||'morning';
  if(ROUTINE_KEY!=='morning'){
    const names={day:'День',evening:'Вечер'};
    document.querySelector('#routineName').textContent=names[ROUTINE_KEY]||'Комплекс';
    document.querySelector('#headerProgress').textContent='Этап 3+';
    document.querySelector('.timer-card').style.display='none';
    document.querySelector('.session-nav').style.display='none';
    document.querySelector('.exercise-main').innerHTML=`<div class="stage-placeholder"><span class="status-pill">Следующий этап</span><h1>${names[ROUTINE_KEY]||'Этот комплекс'} пока не собран</h1><p>На текущем этапе полностью работает только утренний комплекс. День и вечер добавим после проверки утра.</p><a class="primary-button stage-placeholder__button" href="index.html">Вернуться на главную</a></div>`;
    window.addEventListener('load',()=>setTimeout(()=>document.querySelector('#pageLoader').classList.add('is-hidden'),180));
    return;
  }
  const exercises=[
    {
      id:'squat-reach', title:'Присед + подъём рук вверх', volume:'10–12 повторов', time:'≈ 60–75 сек', seconds:70,
      goal:'Разогреть ноги и тазобедренные суставы, включить корпус и мягко добавить движение плеч вверх.',
      how:['Поставьте стопы примерно на ширине плеч, носки слегка наружу.','Уведите таз назад и вниз, колени направляйте по линии носков.','Поднимитесь без рывка и одновременно вытяните руки вверх.','В верхней точке не прогибайтесь в пояснице — рёбра остаются собранными.'],
      feel:'Работу ягодиц и передней поверхности бёдер, лёгкое раскрытие плеч и ощущение вытяжения вверх.',
      mistakes:['Колени заваливаются внутрь.','Пятки отрываются от пола.','Руки поднимаются за счёт сильного прогиба в пояснице.','Присед становится глубже, чем позволяет спокойная техника.'],
      easy:'Уменьшите глубину приседа и поднимайте руки только до комфортного уровня.',
      progression:'На 3-й неделе опускайтесь в присед за 3 секунды. На 4-й — немного увеличьте глубину, если таз и колени остаются стабильными.',
      key:'Стопа полностью на полу, колени следуют за носками, поясница нейтральна.'
    },
    {
      id:'cat-cow', title:'Кошка-корова', volume:'8 повторов', time:'≈ 50–60 сек', seconds:55,
      goal:'Мягко провести позвоночник через сгибание и разгибание и убрать утреннюю скованность.',
      how:['Встаньте на четвереньки: кисти под плечами, колени под тазом.','На выдохе плавно округлите спину и слегка направьте подбородок к груди.','На вдохе мягко раскройте грудную клетку и переведите таз в обратное положение.','Двигайтесь последовательно, без резкого запрокидывания головы.'],
      feel:'Плавное движение вдоль всей спины, особенно между лопатками и в грудном отделе.',
      mistakes:['Движение только поясницей.','Сильное запрокидывание головы.','Рывки и попытка сделать максимальную амплитуду.'],
      easy:'Сделайте меньшую амплитуду и двигайтесь медленнее.',
      progression:'Постепенно сделайте движение более сегментарным: начинайте округление от таза и ведите его к грудному отделу.',
      key:'Не ищите максимальную амплитуду — ищите плавность по всей длине позвоночника.'
    },
    {
      id:'wall-slide', title:'Скольжение руками по стене', volume:'8–10 повторов', time:'≈ 60 сек', seconds:60,
      goal:'Активировать мышцы вокруг лопаток и улучшить контролируемое поднятие рук без лишнего прогиба.',
      how:['Встаньте спиной к стене, стопы можно отнести немного вперёд.','Слегка соберите рёбра и сохраняйте спокойное положение таза.','Согните руки и медленно скользите ими вверх по стене.','Поднимайтесь только до той высоты, где плечи не тянутся к ушам и поясница не прогибается.'],
      feel:'Работу верхней части спины, области подмышек и мягкое движение лопаток вверх.',
      mistakes:['Поясница сильно отрывается от стены.','Плечи поднимаются к ушам.','Попытка любой ценой прижать кисти к стене.'],
      easy:'Отойдите от стены и выполняйте движение без постоянного контакта кистей.',
      progression:'Добавьте паузу 1–2 секунды в верхнем комфортном положении.',
      key:'Руки идут вверх настолько высоко, насколько получается сохранить рёбра и шею спокойными.'
    },
    {
      id:'incline-push-scap', title:'Отжимание от высокой опоры + доталкивание лопаток', volume:'10–12 повторов', time:'≈ 75–90 сек', seconds:80,
      goal:'Разогреть грудь и руки и одновременно включить переднюю зубчатую мышцу через контролируемое движение лопаток.',
      how:['Поставьте ладони на устойчивую высокую опору чуть шире плеч.','Выстройте тело одной линией от головы до пят.','Согните локти и опустите грудь к опоре без провала между лопатками.','Выжмите себя вверх и в конце слегка дотолкните опору от себя, позволяя лопаткам разойтись.'],
      feel:'Грудь, трицепсы и дополнительную работу по бокам грудной клетки под подмышками.',
      mistakes:['Таз провисает или уходит назад.','Локти раскрываются строго в стороны.','Голова тянется вперёд.','В финале плечи пожимаются к ушам вместо доталкивания лопаток.'],
      easy:'Используйте более высокую опору — стену или высокий стол.',
      progression:'На 4-й неделе немного понизьте опору при сохранении прямой линии корпуса.',
      key:'Сначала обычное контролируемое отжимание, затем маленькое дополнительное движение лопатками.'
    },
    {
      id:'hip-hinge', title:'Hip Hinge / наклон тазом назад', volume:'10–12 повторов', time:'≈ 60–70 сек', seconds:65,
      goal:'Научить таз двигаться назад при стабильной спине и включить заднюю поверхность бёдер.',
      how:['Встаньте устойчиво, стопы примерно на ширине таза.','Слегка согните колени и направьте таз назад, будто хотите коснуться стены позади.','Наклоняйте корпус как единый блок, сохраняя нейтральную спину.','Когда почувствуете натяжение задней поверхности бёдер, сожмите ягодицы и вернитесь вверх.'],
      feel:'Растяжение задней поверхности бёдер внизу и работу ягодиц при возвращении.',
      mistakes:['Присед вместо движения таза назад.','Округление спины.','Сильное переразгибание в верхней точке.'],
      easy:'Уменьшите наклон и потренируйтесь у стены, касаясь её тазом.',
      progression:'На 3-й неделе опускайтесь за 3 секунды и сохраняйте короткую паузу в нижнем положении.',
      key:'Таз назад, спина длинная, голени почти вертикальны.'
    },
    {
      id:'glute-bridge', title:'Ягодичный мост с паузой 2 сек', volume:'10–12 повторов', time:'≈ 75–90 сек', seconds:80,
      goal:'Включить ягодицы без тяжёлой осевой нагрузки и дать тазу активное разгибание.',
      how:['Лягте на спину, согните колени, стопы поставьте устойчиво на пол.','Слегка напрягите живот и поднимите таз за счёт ягодиц.','В верхней точке удерживайте 2 секунды без сильного прогиба в пояснице.','Опускайтесь подконтрольно и повторите.'],
      feel:'Основную работу ягодиц, умеренное напряжение задней поверхности бёдер.',
      mistakes:['Толчок поясницей вместо ягодиц.','Стопы слишком далеко от таза.','Колени разваливаются наружу или сходятся внутрь.'],
      easy:'Поднимайте таз ниже и сократите паузу до 1 секунды.',
      progression:'На 3-й неделе опускайтесь за 3 секунды. Позже можно добавить лёгкую резинку над коленями.',
      key:'Подъём заканчивается там, где ягодицы напряжены, а поясница ещё не начинает прогибаться.'
    },
    {
      id:'calf-raise', title:'Медленный подъём на носки', volume:'12–15 повторов', time:'≈ 60–75 сек', seconds:65,
      goal:'Разогреть голеностоп и икры и добавить контролируемую нагрузку на стопы.',
      how:['Встаньте ровно, при необходимости легко держитесь рукой за опору.','Сохраняя давление через основание большого пальца, мизинца и пятку, плавно поднимитесь на носки.','Задержитесь на секунду наверху.','Медленно опустите пятки без падения вниз.'],
      feel:'Икры и устойчивую опору через переднюю часть стопы.',
      mistakes:['Стопы заваливаются наружу.','Подъём выполняется рывком.','Колени сильно сгибаются.'],
      easy:'Держитесь двумя руками за стену или опору и уменьшите высоту подъёма.',
      progression:'На 3-й неделе опускайтесь за 3 секунды; позже увеличьте паузу наверху.',
      key:'Поднимайтесь вертикально вверх, сохраняя большой палец стопы в контакте с полом.'
    },
    {
      id:'short-foot', title:'Short Foot', volume:'4 × 5 сек', time:'≈ 40–60 сек', seconds:45,
      goal:'Активировать внутренние мышцы стопы без скручивания пальцев и подготовить свод к нагрузке.',
      how:['Встаньте или сядьте так, чтобы стопа полностью касалась пола.','Сохраняйте три точки опоры: пятка, основание большого пальца и основание мизинца.','Не сгибая пальцы, мягко подтяните переднюю часть стопы к пятке, будто хотите сделать стопу чуть короче.','Удерживайте 5 секунд, полностью расслабьте и повторите 4 раза.'],
      feel:'Небольшое напряжение по внутреннему своду стопы, без судороги пальцев.',
      mistakes:['Сильное поджимание пальцев.','Перенос веса только на внешний край стопы.','Чрезмерное напряжение голени.'],
      easy:'Начните сидя и выполняйте очень небольшое движение.',
      progression:'Перейдите к выполнению стоя, затем удерживайте свод при лёгком сгибании коленей.',
      key:'Свод становится активнее, но пальцы остаются длинными и расслабленными.'
    }
  ];

  const todayKey=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const blankRoutine=()=>({step:0,completedUntil:0,completed:false});
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{days:{},timers:{}}}catch{return {days:{},timers:{}}}};
  const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
  const state=load();
  if(!state.days)state.days={}; if(!state.timers)state.timers={};
  if(!state.days[todayKey()])state.days[todayKey()]={routines:{morning:blankRoutine(),day:blankRoutine(),evening:blankRoutine()}};
  if(!state.days[todayKey()].routines)state.days[todayKey()].routines={};
  if(!state.days[todayKey()].routines[ROUTINE_KEY])state.days[todayKey()].routines[ROUTINE_KEY]=blankRoutine();
  const routine=state.days[todayKey()].routines[ROUTINE_KEY];
  if(typeof routine.completedUntil!=='number')routine.completedUntil=routine.completed?exercises.length:Math.max(0,Number(routine.step)||0);
  if(typeof routine.step!=='number')routine.step=Math.min(routine.completedUntil,exercises.length-1);
  if(routine.step>=exercises.length)routine.step=exercises.length-1;
  if(routine.step<0)routine.step=0;
  if(!state.timers[ROUTINE_KEY])state.timers[ROUTINE_KEY]={};
  save();
  const resumedFromStep=!routine.completed && routine.step>0 ? routine.step : null;

  const $=s=>document.querySelector(s);
  const toast=msg=>{const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('show'),1700)};
  const haptic=(kind='tap')=>{if(!navigator.vibrate)return;const map={tap:10,soft:16,next:[14,28,14],success:[40,45,90]};try{navigator.vibrate(map[kind]||10)}catch{}};
  let current=routine.step;
  let tickerFrame=null;
  let wakeLock=null;
  let lastFinishState=false;

  function timerData(ex){
    if(!state.timers[ROUTINE_KEY][ex.id])state.timers[ROUTINE_KEY][ex.id]={duration:ex.seconds,remaining:ex.seconds,running:false,endAt:null};
    const t=state.timers[ROUTINE_KEY][ex.id];
    if(!Number.isFinite(t.duration)||t.duration<10)t.duration=ex.seconds;
    if(!Number.isFinite(t.remaining))t.remaining=t.duration;
    if(t.running&&t.endAt){
      const left=Math.max(0,Math.ceil((t.endAt-Date.now())/1000));
      t.remaining=left;
    }
    return t;
  }

  function fmt(sec){sec=Math.max(0,Math.round(sec));return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}

  async function requestWakeLock(){
    if(!('wakeLock' in navigator))return;
    try{wakeLock=await navigator.wakeLock.request('screen');}catch{}
  }
  async function releaseWakeLock(){
    if(wakeLock){try{await wakeLock.release();}catch{}wakeLock=null;}
  }

  function stopInterval(){
    if(tickerFrame!==null){
      cancelAnimationFrame(tickerFrame);
      tickerFrame=null;
    }
  }

  function updateTimerUI(){
    const ex=exercises[current],t=timerData(ex);
    let preciseRemaining=t.remaining;
    if(t.running&&t.endAt){
      preciseRemaining=Math.max(0,(t.endAt-Date.now())/1000);
      t.remaining=Math.max(0,Math.ceil(preciseRemaining));
    }
    if(t.running&&preciseRemaining<=0){
      preciseRemaining=0;t.remaining=0;t.running=false;t.endAt=null;stopInterval();releaseWakeLock();save();
      if(navigator.vibrate)navigator.vibrate([180,100,180]);
      toast('Таймер завершён');
    }
    const progress=t.duration>0?Math.min(100,Math.max(0,(1-preciseRemaining/t.duration)*100)):0;
    $('#timerRing').style.setProperty('--timer-progress',progress.toFixed(3));
    $('#timerValue').textContent=fmt(t.remaining);
    const stateLabel=t.running?'Таймер запущен':t.remaining===0?'Таймер завершён':'Таймер готов';
    const timerState=$('#timerState'); if(timerState)timerState.textContent=stateLabel;
    $('#timerToggle').textContent=t.running?'Пауза':t.remaining===0?'Сначала':'Старт';
    $('#timerLabel').textContent=t.remaining===0?'завершено':'осталось';
    $('#timerRing').classList.toggle('is-running',t.running);
    $('#timerRing').classList.toggle('is-ending',Boolean(t.running&&preciseRemaining>0&&preciseRemaining<=5));
    const timerCard=$('#timerCard'); if(timerCard)timerCard.classList.toggle('is-running',t.running);
  }

  function startTicker(){
    stopInterval();
    const tick=()=>{
      updateTimerUI();
      const t=timerData(exercises[current]);
      if(t.running)tickerFrame=requestAnimationFrame(tick);
      else tickerFrame=null;
    };
    tickerFrame=requestAnimationFrame(tick);
  }

  function pauseCurrentTimer(){
    const t=timerData(exercises[current]);
    if(t.running){
      t.remaining=Math.max(0,Math.ceil((t.endAt-Date.now())/1000));
      t.running=false;t.endAt=null;stopInterval();releaseWakeLock();save();
    }
  }

  function animateExercise(direction='forward'){
    const card=$('.exercise-main');
    if(card){
      card.classList.remove('is-entering','enter-forward','enter-back');
      void card.offsetWidth;
      card.classList.add(direction==='back'?'enter-back':'enter-forward');
    }
    ['#headerProgress'].forEach(selector=>{
      const badge=$(selector);
      if(!badge)return;
      badge.classList.remove('is-updating');
      void badge.offsetWidth;
      badge.classList.add('is-updating');
    });
  }

  function renderStepSegments(){
    const done=routine.completed?exercises.length:Math.min(routine.completedUntil||0,exercises.length);
    const markup=exercises.map((_,i)=>`<i class="${i<done?'is-done ':''}${i===current?'is-current':''}"></i>`).join('');
    ['#stepSegments'].forEach(selector=>{
      const wrap=$(selector);
      if(wrap)wrap.innerHTML=markup;
    });
  }

  function renderVisual(ex){
    const box=$('#exerciseVisual');
    if(!box)return;
    if(Array.isArray(ex.visuals)&&ex.visuals.length){
      box.classList.add('has-visuals');
      box.style.removeProperty('aspect-ratio');
      box.innerHTML=`<div class="visual-phases" style="--phase-count:${Math.min(ex.visuals.length,3)}">${ex.visuals.map((src,i)=>`<figure class="visual-phase"><img src="${src}" alt="${ex.title}, фаза ${i+1}" loading="eager" decoding="async"></figure>`).join('')}</div>`;
    }else{
      box.classList.remove('has-visuals');
      box.innerHTML=`<div class="visual-placeholder__inner"><span class="visual-placeholder__icon">◎</span><div><strong>Визуал упражнения</strong><span>Здесь появятся понятные фазы движения.</span></div></div>`;
    }
  }

  function updateNextButton(){
    const button=$('#nextButton');
    const isFinish=current===exercises.length-1;
    button.textContent=isFinish?'Завершить утро':'След. шаг';
    button.classList.toggle('is-finish',isFinish);
    if(isFinish!==lastFinishState){
      button.classList.remove('is-morphing');
      void button.offsetWidth;
      button.classList.add('is-morphing');
      lastFinishState=isFinish;
    }
  }


  function setDetailState(card,open){
    card.classList.toggle('is-open',open);
    const toggle=card.querySelector('.detail-card__toggle');
    if(toggle)toggle.setAttribute('aria-expanded',String(open));
  }

  document.querySelectorAll('.detail-card__toggle').forEach(toggle=>{
    toggle.addEventListener('click',()=>{
      const card=toggle.closest('.detail-card');
      const willOpen=!card.classList.contains('is-open');
      document.querySelectorAll('.detail-card').forEach(item=>setDetailState(item,false));
      if(willOpen)setDetailState(card,true);
      haptic('tap');
    });
  });

  function render(direction='forward',scrollMode='smooth'){
    stopInterval();
    routine.step=current; save();
    const ex=exercises[current];
    renderVisual(ex);
    $('#exerciseTitle').textContent=ex.title;
    $('#exerciseGoal').textContent=ex.goal;
    $('#exerciseVolume').textContent=ex.volume;
    $('#exerciseTime').textContent=ex.time;
    $('#howToList').innerHTML=ex.how.map(x=>`<li>${x}</li>`).join('');
    $('#feelText').textContent=ex.feel;
    $('#mistakesList').innerHTML=ex.mistakes.map(x=>`<li>${x}</li>`).join('');
    $('#easyText').textContent=ex.easy;
    $('#progressionText').textContent=ex.progression;
    $('#keyText').textContent=ex.key;
    $('#headerProgress').textContent=`${current+1} / ${exercises.length}`;
    $('#navStepLabel').textContent=`Шаг ${current+1} из ${exercises.length}`;
    $('#prevButton').disabled=current===0;
    updateNextButton();
    renderStepSegments();
    document.querySelectorAll('.detail-card').forEach((el,index)=>setDetailState(el,index===0));
    const done=routine.completed?exercises.length:Math.min(routine.completedUntil||0,exercises.length);
    const progressText=$('#progressText'),progressBar=$('#sessionProgressBar');
    if(progressText)progressText.textContent=`${done} из ${exercises.length} упражнений`;
    if(progressBar)progressBar.style.width=`${done/exercises.length*100}%`;
    updateTimerUI();
    const t=timerData(ex); if(t.running){startTicker();requestWakeLock();}
    animateExercise(direction);
    requestAnimationFrame(()=>{
      const scroller=$('#exerciseScroll');
      if(scroller)scroller.scrollTo({top:0,behavior:scrollMode});
      else window.scrollTo({top:0,behavior:scrollMode});
    });
  }

  $('#prevButton').addEventListener('click',()=>{
    if(current>0){haptic('soft');pauseCurrentTimer();current--;render('back');}
  });
  $('#nextButton').addEventListener('click',()=>{
    pauseCurrentTimer();
    routine.completedUntil=Math.max(routine.completedUntil||0,current+1);
    if(current<exercises.length-1){
      haptic('next');current++; routine.step=current; save(); render('forward');
    }else{
      routine.completed=true; routine.completedUntil=exercises.length; routine.step=exercises.length-1; save();
      haptic('success');
      const overlay=$('#completionOverlay');
      if(overlay){overlay.classList.add('is-visible');overlay.setAttribute('aria-hidden','false');}
      setTimeout(()=>location.href='index.html',1200);
    }
  });

  $('#timerToggle').addEventListener('click',()=>{
    haptic('soft');
    const ex=exercises[current],t=timerData(ex);
    if(t.running){
      t.remaining=Math.max(0,Math.ceil((t.endAt-Date.now())/1000));t.running=false;t.endAt=null;stopInterval();releaseWakeLock();
    }else{
      if(t.remaining<=0)t.remaining=t.duration;
      t.running=true;t.endAt=Date.now()+t.remaining*1000;startTicker();requestWakeLock();
    }
    save();updateTimerUI();
  });
  $('#timerReset').addEventListener('click',()=>{
    haptic('tap');
    const ex=exercises[current],t=timerData(ex);t.duration=ex.seconds;t.remaining=ex.seconds;t.running=false;t.endAt=null;stopInterval();releaseWakeLock();save();updateTimerUI();
  });
  $('#minusTen').addEventListener('click',()=>{haptic('tap');adjustTimer(-10)});
  $('#plusTen').addEventListener('click',()=>{haptic('tap');adjustTimer(10)});
  function adjustTimer(delta){
    const ex=exercises[current],t=timerData(ex);
    if(t.running){
      t.remaining=Math.max(10,t.remaining+delta);
      t.duration=Math.max(t.remaining,Math.max(10,t.duration+delta));
      t.endAt=Date.now()+t.remaining*1000;
    }else if(t.remaining===t.duration || t.remaining<=0){
      t.duration=Math.max(10,t.duration+delta);
      t.remaining=t.duration;
    }else{
      t.remaining=Math.max(10,t.remaining+delta);
      t.duration=Math.max(t.duration,t.remaining);
    }
    save();updateTimerUI();
  }

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'){
      updateTimerUI();
      const t=timerData(exercises[current]);if(t.running){startTicker();requestWakeLock();}
    }else releaseWakeLock();
  });
  window.addEventListener('beforeunload',()=>{routine.step=current;save();releaseWakeLock();});

  window.addEventListener('load',()=>{
    setTimeout(()=>{
      $('#pageLoader').classList.add('is-hidden');
      if(resumedFromStep!==null)toast(`Продолжено с упражнения ${resumedFromStep+1}`);
    },180);
  });
  render('forward','auto');
})();
