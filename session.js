(() => {
  const ROUTINE_KEY=new URLSearchParams(location.search).get('routine')||'morning';
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
  (function SessionRuntime(exercises,ROUTINE_KEY){
  const Store=window.DailyMotionState;
  const $=selector=>document.querySelector(selector);

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
    window.addEventListener('load',()=>setTimeout(()=>$('#pageLoader')?.classList.add('is-hidden'),120));
    return;
  }

  const routine=Store.getRoutine(ROUTINE_KEY);
  if(typeof routine.completedUntil!=='number')routine.completedUntil=routine.completed?exercises.length:0;
  if(typeof routine.step!=='number')routine.step=Math.min(routine.completedUntil,exercises.length-1);
  routine.step=Math.max(0,Math.min(routine.step,exercises.length-1));
  if(!routine.completed&&!routine.startedAt)routine.startedAt=new Date().toISOString();
  Store.save();

  const resumedFromStep=!routine.completed&&(routine.step>0||routine.completedUntil>0)?routine.step:null;
  let current=routine.step;
  let tickerFrame=null;
  let wakeLock=null;
  let lastFinishState=current===exercises.length-1;

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

  const timerData=exercise=>Store.getTimer(ROUTINE_KEY,exercise.id,exercise.seconds);
  const fmt=seconds=>{
    const value=Math.max(0,Math.round(seconds));
    return `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
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

  function updateTimerUI(){
    const exercise=exercises[current];
    const timer=timerData(exercise);
    let preciseRemaining=timer.remaining;

    if(timer.running&&timer.endAt){
      preciseRemaining=Math.max(0,(timer.endAt-Date.now())/1000);
      timer.remaining=Math.max(0,Math.ceil(preciseRemaining));
    }

    if(timer.running&&preciseRemaining<=0){
      preciseRemaining=0;
      timer.remaining=0;
      timer.running=false;
      timer.endAt=null;
      stopTicker();
      releaseWakeLock();
      Store.save();
      if(navigator.vibrate)navigator.vibrate([180,100,180]);
      toast('Таймер завершён');
    }

    const progress=timer.duration>0?Math.min(100,Math.max(0,(1-preciseRemaining/timer.duration)*100)):0;
    $('#timerRing').style.setProperty('--timer-progress',progress.toFixed(3));
    $('#timerValue').textContent=fmt(timer.remaining);
    $('#timerLabel').textContent=timer.remaining===0?'готово':'осталось';

    const stateNode=$('#timerState');
    const hasProgress=timer.remaining<timer.duration&&timer.remaining>0;
    stateNode.textContent=timer.running?'Идёт':timer.remaining===0?'Завершён':hasProgress?'Пауза':'Готов';

    $('#timerToggle').textContent=timer.running?'Пауза':timer.remaining===0?'Сначала':hasProgress?'Продолжить':'Старт';
    $('#timerRing').classList.toggle('is-running',timer.running);
    $('#timerRing').classList.toggle('is-ending',Boolean(timer.running&&preciseRemaining>0&&preciseRemaining<=5));
    $('#timerCard').classList.toggle('is-running',timer.running);
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
    timer.running=false;
    timer.endAt=null;
    stopTicker();
    releaseWakeLock();
    Store.save();
  }

  function renderVisual(exercise){
    const box=$('#exerciseVisual');
    if(Array.isArray(exercise.visuals)&&exercise.visuals.length){
      box.classList.add('has-visuals');
      box.innerHTML=`<div class="visual-phases" style="--phase-count:${Math.min(exercise.visuals.length,3)}">${exercise.visuals.map((src,index)=>`<figure class="visual-phase"><img src="${src}" alt="${exercise.title}, фаза ${index+1}" loading="eager" decoding="async"></figure>`).join('')}</div>`;
      return;
    }
    box.classList.remove('has-visuals');
    box.innerHTML=`<div class="visual-placeholder__inner"><span class="visual-placeholder__icon">◎</span><div><strong>Визуал упражнения</strong><span>Здесь появятся понятные фазы движения.</span></div></div>`;
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

  function renderStepSegments(){
    const done=routine.completed?exercises.length:Math.min(routine.completedUntil||0,exercises.length);
    $('#stepSegments').innerHTML=exercises.map((_,index)=>`<i class="${index<done?'is-done ':''}${index===current?'is-current':''}"></i>`).join('');
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
    const isFinish=current===exercises.length-1;
    button.textContent=isFinish?'Завершить':'Следующее';
    button.classList.toggle('is-finish',isFinish);
    if(isFinish!==lastFinishState){
      button.classList.remove('is-morphing');
      void button.offsetWidth;
      button.classList.add('is-morphing');
      lastFinishState=isFinish;
    }
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

    animateExercise(direction);
    requestAnimationFrame(()=>$('#exerciseScroll').scrollTo({top:0,behavior:scrollMode}));
  }

  function finishRoutine(){
    pauseCurrentTimer();
    routine.completed=true;
    routine.completedUntil=exercises.length;
    routine.step=exercises.length-1;
    routine.completedAt=new Date().toISOString();
    Store.save();
    renderStepSegments();
    haptic('success');

    const overlay=$('#completionOverlay');
    const meta=$('#completionMeta');
    if(routine.startedAt){
      const elapsed=Math.max(0,Date.now()-new Date(routine.startedAt).getTime());
      const minutes=Math.max(1,Math.round(elapsed/60000));
      meta.textContent=`${exercises.length} упражнений · около ${minutes} мин`;
    }else{
      meta.textContent=`${exercises.length} упражнений завершено`;
    }
    overlay.classList.add('is-visible');
    overlay.setAttribute('aria-hidden','false');
    $('#completionHome').focus();
  }

  $('#prevButton').addEventListener('click',()=>{
    if(current<=0)return;
    haptic('soft');
    pauseCurrentTimer();
    current--;
    render('back');
  });

  $('#nextButton').addEventListener('click',()=>{
    pauseCurrentTimer();
    routine.completedUntil=Math.max(routine.completedUntil||0,current+1);
    if(current<exercises.length-1){
      haptic('next');
      current++;
      routine.step=current;
      Store.save();
      render('forward');
      return;
    }
    finishRoutine();
  });

  $('#timerToggle').addEventListener('click',()=>{
    haptic('soft');
    const exercise=exercises[current];
    const timer=timerData(exercise);
    if(timer.running){
      timer.remaining=Math.max(0,Math.ceil((timer.endAt-Date.now())/1000));
      timer.running=false;
      timer.endAt=null;
      stopTicker();
      releaseWakeLock();
    }else{
      if(timer.remaining<=0)timer.remaining=timer.duration;
      timer.running=true;
      timer.endAt=Date.now()+timer.remaining*1000;
      startTicker();
      requestWakeLock();
    }
    Store.save();
    updateTimerUI();
  });

  $('#timerReset').addEventListener('click',()=>{
    haptic('tap');
    const exercise=exercises[current];
    const timer=timerData(exercise);
    timer.duration=exercise.seconds;
    timer.remaining=exercise.seconds;
    timer.running=false;
    timer.endAt=null;
    stopTicker();
    releaseWakeLock();
    Store.save();
    updateTimerUI();
  });

  function adjustTimer(delta){
    const exercise=exercises[current];
    const timer=timerData(exercise);
    if(timer.running){
      timer.remaining=Math.max(10,timer.remaining+delta);
      timer.duration=Math.max(timer.remaining,Math.max(10,timer.duration+delta));
      timer.endAt=Date.now()+timer.remaining*1000;
    }else if(timer.remaining===timer.duration||timer.remaining<=0){
      timer.duration=Math.max(10,timer.duration+delta);
      timer.remaining=timer.duration;
    }else{
      timer.remaining=Math.max(10,timer.remaining+delta);
      timer.duration=Math.max(timer.duration,timer.remaining);
    }
    Store.save();
    updateTimerUI();
  }

  $('#minusTen').addEventListener('click',()=>{haptic('tap');adjustTimer(-10);});
  $('#plusTen').addEventListener('click',()=>{haptic('tap');adjustTimer(10);});
  $('#completionHome').addEventListener('click',()=>{location.href='index.html';});

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'){
      updateTimerUI();
      const timer=timerData(exercises[current]);
      if(timer.running){
        startTicker();
        requestWakeLock();
      }
    }else{
      releaseWakeLock();
    }
  });

  const persist=()=>{
    routine.step=current;
    Store.save();
    releaseWakeLock();
  };
  window.addEventListener('pagehide',persist);
  window.addEventListener('beforeunload',persist);

  window.addEventListener('load',()=>{
    setTimeout(()=>{
      $('#pageLoader').classList.add('is-hidden');
      if(resumedFromStep!==null)toast(`Продолжено с упражнения ${resumedFromStep+1}`);
    },120);
  });

  render('forward','auto');
})(exercises,ROUTINE_KEY);
})();
