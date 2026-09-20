(() => {
  const ROUTINE_KEY=new URLSearchParams(location.search).get('routine')||'morning';
  const exercises=[
    {
      id:'cat-cow', title:'Кошка-корова', volume:'10 плавных циклов', time:'40 сек', seconds:40,
      goal:'Быстро разбудить позвоночник и подготовить спину к более активной части разминки.',
      how:[
        'Встаньте на четвереньки: ладони под плечами, колени под тазом, шея продолжает линию спины.',
        'На выдохе мягко подкрутите таз, округлите спину и слегка оттолкните пол ладонями.',
        'На вдохе переведите таз в обратное положение и раскройте грудную клетку.',
        'Проводите движение через всю спину, а не только через поясницу.',
        'Не задерживайтесь в крайних положениях — это короткое динамическое включение.'
      ],
      breathing:'Выдох — округление, вдох — разгибание. Один полный цикл примерно за 3–4 секунды.',
      feel:'Плавное движение по всей спине, особенно между лопатками. Допустима лёгкая скованность, которая уменьшается по мере повторов.',
      mistakes:[
        'Движение идёт только из поясницы — начните его тазом и постепенно подключайте грудной отдел.',
        'Голова резко запрокидывается — держите шею продолжением позвоночника.',
        'Вы зависаете в крайней точке — двигайтесь непрерывно, без долгой статической растяжки.',
        'Плечи тянутся к ушам — мягко отталкивайте пол и сохраняйте шею длинной.'
      ],
      easy:'Сделайте меньшую амплитуду и двигайтесь медленнее.',
      progression:'Сохраняйте тот же объём, но делайте переход между положениями более плавным и сегментарным.',
      key:'Не растягивайтесь до предела — плавно разбудите всю спину и двигайтесь дальше.'
    },
    {
      id:'thoracic-rotation', title:'Поворот грудного отдела', volume:'5 повторов / сторона', time:'45 сек', seconds:45,
      goal:'Подготовить грудной отдел, плечи и лопатки к движениям руками и работе корпуса.',
      how:[
        'Останьтесь на четвереньках и положите одну ладонь на затылок.',
        'Слегка подтяните живот и оставьте таз неподвижным.',
        'Поверните локоть и грудную клетку вверх до комфортной амплитуды.',
        'Вернитесь вниз без рывка и повторите.',
        'После всех повторов смените сторону.'
      ],
      breathing:'Вдох внизу, выдох во время поворота вверх. Двигайтесь ритмично, но без рывка.',
      feel:'Движение в верхней и средней части спины и работу мышц вокруг лопаток.',
      mistakes:[
        'Таз разворачивается вместе с плечами — уменьшите амплитуду и удерживайте таз направленным в пол.',
        'Поворот уходит в поясницу — слегка напрягите живот и двигайте прежде всего грудной клеткой.',
        'Локоть тянут вверх силой — остановитесь раньше и сохраните свободное движение.',
        'Опорное плечо проваливается — оттолкните пол ладонью и сохраните устойчивость.'
      ],
      easy:'Выполняйте небольшой поворот стоя, опираясь обеими руками на стол или стену.',
      progression:'Добавьте короткую паузу около 1 секунды в верхнем положении.',
      key:'Таз почти неподвижен — поворачиваются рёбра и грудная клетка.'
    },
    {
      id:'leg-swings', title:'Махи ногой вперёд-назад', volume:'12–15 махов / нога', time:'50 сек', seconds:50,
      goal:'Динамически разогреть тазобедренные суставы и подготовить ноги к приседам и выпадам.',
      how:[
        'Встаньте боком к устойчивой опоре и легко держитесь одной рукой.',
        'Перенесите вес на опорную ногу, корпус держите вертикально.',
        'Свободной ногой сделайте контролируемый мах вперёд, затем назад.',
        'Первые 2–3 маха сделайте небольшими, затем постепенно увеличьте амплитуду.',
        'Не останавливаясь надолго, смените ногу.'
      ],
      breathing:'Дышите свободно. Темп живой, но контролируемый: примерно один полный мах за 1–1,5 секунды.',
      feel:'Постепенное увеличение свободы в тазобедренном суставе и лёгкое динамическое натяжение передней и задней поверхности бедра.',
      mistakes:[
        'Нога бросается рывком — уменьшите амплитуду и контролируйте разворот движения.',
        'Корпус раскачивается вместе с ногой — сильнее используйте опору и держите рёбра над тазом.',
        'Опорное колено жёстко заблокировано — оставьте его слегка мягким.',
        'Амплитуда сразу максимальная — увеличивайте её постепенно после первых повторов.'
      ],
      easy:'Делайте небольшие маятниковые движения и сильнее держитесь за опору.',
      progression:'Увеличивайте контролируемую амплитуду или уменьшайте поддержку рукой.',
      key:'Мах живой, но не резкий: нога движется свободно, корпус остаётся стабильным.'
    },
    {
      id:'squat-reach', title:'Присед + подъём рук', volume:'15–18 повторов', time:'60 сек', seconds:60,
      goal:'Включить крупные мышцы ног и корпуса и заметно поднять температуру тела и дыхание.',
      how:[
        'Поставьте стопы примерно на ширине плеч в естественном для вас положении.',
        'Отведите таз назад и вниз, одновременно сгибая колени.',
        'Сохраняйте всю стопу на полу, а колени направляйте по линии носков.',
        'Поднимитесь в устойчивом темпе и одновременно вытяните руки вверх.',
        'Сразу начинайте следующий повтор, не задерживаясь надолго вверху.'
      ],
      breathing:'Вдох при опускании, выдох при подъёме. Темп бодрый: около 2 секунд вниз и 1 секунды вверх.',
      feel:'Работу ягодиц и бёдер, тепло в ногах и небольшое учащение дыхания без ощущения максимальной нагрузки.',
      mistakes:[
        'Колени заваливаются внутрь — уменьшите глубину и направляйте их по линии стоп.',
        'Пятки отрываются — приседайте чуть мельче и сохраняйте всю стопу на полу.',
        'Поясница округляется внизу — остановитесь выше и сохраните контролируемое положение корпуса.',
        'Руки поднимаются за счёт сильного прогиба поясницы — держите рёбра над тазом.'
      ],
      easy:'Приседайте неглубоко к стулу или высокой опоре и поднимайте руки только до комфортной высоты.',
      progression:'Сделайте 15–18 повторов за то же время, не ускоряя технику до рывков.',
      key:'Работайте ритмично: вся стопа на полу, колени по линии стоп, корпус под контролем.'
    },
    {
      id:'reverse-lunge-reach', title:'Обратный выпад + подъём рук', volume:'8 повторов / сторона', time:'70 сек', seconds:70,
      goal:'Сильнее включить ягодицы и бёдра, добавить баланс и продолжить плавное повышение нагрузки.',
      how:[
        'Встаньте ровно, стопы примерно на ширине таза.',
        'Сделайте одной ногой достаточно длинный шаг назад и опуститесь вниз.',
        'Переднее колено направляйте по линии стопы, а переднюю стопу оставляйте полностью на полу.',
        'Во время опускания плавно поднимите руки вверх без прогиба поясницы.',
        'Оттолкнитесь передней ногой, вернитесь в стойку и сразу выполните другой стороной.'
      ],
      breathing:'Вдох при шаге назад, выдох при возвращении в стойку. Один повтор примерно 3 секунды.',
      feel:'Работу ягодицы и бедра передней ноги, умеренное учащение дыхания и необходимость стабилизировать корпус.',
      mistakes:[
        'Шаг назад слишком короткий — сделайте его длиннее, чтобы опускаться вниз, а не складываться вперёд.',
        'Переднее колено заваливается внутрь — уменьшите глубину и удерживайте его по линии стопы.',
        'Корпус сильно наклоняется или разворачивается — сократите амплитуду и смотрите прямо.',
        'Руки поднимаются ценой прогиба поясницы — оставьте рёбра над тазом и поднимайте руки ниже.',
        'Возврат идёт рывком задней ногой — отталкивайтесь преимущественно передней стопой.'
      ],
      easy:'Держитесь рукой за стену или стул и делайте неглубокий выпад без подъёма рук.',
      progression:'Добавьте 1–2 повтора на сторону или чуть увеличьте глубину, если колено и баланс остаются стабильными.',
      key:'Длинный шаг назад, передняя стопа полностью на полу, колено смотрит туда же, куда носок.'
    },
    {
      id:'lateral-lunge', title:'Боковой выпад', volume:'8 повторов / сторона', time:'60 сек', seconds:60,
      goal:'Добавить движение в боковой плоскости и активнее включить ягодицы, приводящие мышцы и бёдра.',
      how:[
        'Встаньте широко, стопы направьте вперёд или слегка наружу.',
        'Перенесите таз к одной ноге, сгибая её в колене и отводя таз назад.',
        'Вторая нога остаётся почти прямой, а её стопа полностью на полу.',
        'Оттолкнитесь согнутой ногой и вернитесь в центр.',
        'Чередуйте стороны в ровном темпе.'
      ],
      breathing:'Вдох при уходе в сторону, выдох при возврате в центр. Не задерживайте дыхание.',
      feel:'Работу ягодицы и бедра согнутой ноги и умеренное натяжение внутренней поверхности противоположного бедра.',
      mistakes:[
        'Колено заваливается внутрь — уменьшите глубину и направляйте колено по линии стопы.',
        'Таз не уходит назад, а колено уезжает вперёд — представьте, что садитесь назад на высокий стул.',
        'Прямая нога разворачивается носком вверх — сохраняйте стопу полностью на полу.',
        'Корпус резко падает вперёд — держите грудную клетку открытой и двигайтесь тазом.'
      ],
      easy:'Сделайте стойку уже и переносите вес в сторону без глубокого выпада.',
      progression:'Слегка увеличьте глубину и выполняйте переход между сторонами без длинной паузы в центре.',
      key:'Таз уходит назад к согнутой ноге, а обе стопы остаются уверенно на полу.'
    },
    {
      id:'hip-hinge-reach', title:'Hip Hinge + вытяжение рук', volume:'15 повторов', time:'55 сек', seconds:55,
      goal:'Активно включить заднюю поверхность тела и закрепить наклон тазом назад после выпадов.',
      how:[
        'Встаньте устойчиво, стопы примерно на ширине таза, колени слегка мягкие.',
        'Отведите таз назад и наклоните корпус вперёд как единый блок.',
        'Одновременно вытяните руки вперёд, сохраняя шею продолжением спины.',
        'Почувствовав натяжение задней поверхности бёдер, напрягите ягодицы и вернитесь вверх.',
        'Работайте непрерывно, но не превращайте движение в рывок.'
      ],
      breathing:'Вдох при наклоне, выдох при подъёме. Около 2 секунд вниз и 1–2 секунды вверх.',
      feel:'Натяжение задней поверхности бёдер внизу и выраженную работу ягодиц при возвращении.',
      mistakes:[
        'Получается присед — отводите таз дальше назад и оставляйте голени почти вертикальными.',
        'Спина округляется — уменьшите глубину и сохраняйте длинную линию от таза до затылка.',
        'Вес полностью уходит на носки — удерживайте давление через всю стопу.',
        'Вверху появляется переразгибание поясницы — просто вернитесь в вертикальную стойку.'
      ],
      easy:'Выполняйте движение к стене: мягко касайтесь её тазом и не тяните руки далеко вперёд.',
      progression:'Увеличьте до 15–18 контролируемых повторов за то же время.',
      key:'Таз назад, спина длинная, затем сильное и спокойное возвращение ягодицами.'
    },
    {
      id:'incline-push-scap', title:'Отжимание от опоры + лопатки', volume:'12–15 повторов', time:'60 сек', seconds:60,
      goal:'Добавить работу груди, рук, плечевого пояса и корпуса, сохраняя умеренную общую нагрузку.',
      how:[
        'Поставьте ладони на устойчивую стену, стол или высокую опору чуть шире плеч.',
        'Отойдите назад и выстройте тело одной линией от головы до пят.',
        'Согните локти примерно под углом 30–45° к корпусу и приблизьте грудь к опоре.',
        'Выжмите себя назад, сохраняя корпус единым.',
        'В конце слегка дотолкните опору от себя, позволив лопаткам разойтись без пожимания плеч.'
      ],
      breathing:'Вдох при приближении к опоре, выдох при отжимании. Темп ритмичный: около 2 секунд вниз и 1 секунды вверх.',
      feel:'Работу груди, трицепсов, мышц вокруг лопаток и умеренное напряжение живота.',
      mistakes:[
        'Таз провисает или уходит назад — выберите более высокую опору и держите тело одной линией.',
        'Локти раскрываются строго в стороны — направляйте их немного назад.',
        'Голова тянется вперёд — держите затылок продолжением корпуса.',
        'Плечи поднимаются к ушам в финале — доталкивайте опору лопатками, сохраняя шею длинной.',
        'Опора может сдвинуться — используйте только устойчивую стену или неподвижную мебель.'
      ],
      easy:'Выполняйте упражнение от стены.',
      progression:'Используйте чуть более низкую устойчивую опору или добавьте 2 повтора.',
      key:'Тело одной линией; после отжимания добавьте маленькое движение лопатками, а не пожимание плеч.'
    },
    {
      id:'bear-hover-taps', title:'Bear Hover + касания плеч', volume:'16–24 касания', time:'45 сек', seconds:45,
      goal:'Финишировать разминку работой всего корпуса: плечи, живот, таз и координация без прыжков.',
      how:[
        'Встаньте на четвереньки: ладони под плечами, колени под тазом.',
        'Подверните носки и поднимите колени примерно на 2–4 см от пола.',
        'Слегка напрягите живот и удерживайте спину почти неподвижной.',
        'Поочерёдно отрывайте одну ладонь и касайтесь противоположного плеча.',
        'Ставьте ладонь обратно мягко и не позволяйте тазу раскачиваться из стороны в сторону.'
      ],
      breathing:'Дышите коротко и спокойно, не задерживайте дыхание. Работайте в контролируемом ритме, а не на максимальную скорость.',
      feel:'Заметную работу живота, плеч и бёдер и более выраженное учащение дыхания к концу комплекса.',
      mistakes:[
        'Таз сильно раскачивается — расставьте стопы чуть шире и делайте касания медленнее.',
        'Колени поднимаются слишком высоко — держите их всего в нескольких сантиметрах от пола.',
        'Поясница провисает — слегка подтяните живот и сократите время подхода.',
        'Вес резко падает на опорную руку — переносите его плавно перед каждым касанием.',
        'Движение выполняется на задержке дыхания — замедлитесь и восстановите спокойный ритм вдохов и выдохов.'
      ],
      easy:'Просто удерживайте Bear Hover 10–20 секунд без касаний плеч. Ещё легче — выполняйте касания плеч из высокой опоры на стол.',
      progression:'Сохраняйте таз всё стабильнее и постепенно выполняйте больше качественных касаний за тот же 45-секундный интервал.',
      key:'Колени низко, живот включён, таз почти неподвижен — качество важнее скорости касаний.'
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

  const PROGRAM_VERSION='morning-v3-active-2026-09-19';
  if(Store.getProgramVersion(ROUTINE_KEY)!==PROGRAM_VERSION)Store.setProgramVersion(ROUTINE_KEY,PROGRAM_VERSION);

  const routine=Store.getRoutine(ROUTINE_KEY);
  let settings=Store.getSettings();
  routine.step=Math.max(0,Math.min(Number(routine.step)||0,exercises.length-1));

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
  const Audio=window.DailyMotionAudio;
  const exerciseApp=$('.exercise-app');
  let modalReturnFocus=null;

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
        {transform:'scale(.94)',opacity:.72},
        {transform:'scale(1.055)',opacity:1,offset:.58},
        {transform:'scale(1)',opacity:1}
      ],
      {duration:210,easing:'cubic-bezier(.2,.75,.2,1)'}
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
    return document.querySelector('.execution-overlay.is-visible,.completion-overlay.is-visible');
  }

  function syncModalState(){
    const hasModal=Boolean(visibleModal());
    if(exerciseApp)exerciseApp.inert=hasModal;
    document.body.classList.toggle('modal-open',hasModal);
  }

  function setExecutionCopy(){
    const exercise=exercises[current];
    $('#executionMeta').textContent=`Утро · ${current+1} из ${exercises.length}`;
    $('#executionTitle').textContent=exercise.title;
    $('#executionCountdownTitle').textContent=exercise.title;
    $('#executionKey').textContent=exercise.key;
  }

  function setExecutionStage(stage){
    executionStage=stage;
    const stages={
      countdown:$('#executionCountdownStage'),
      timer:$('#timerCard'),
      rest:$('#executionRestStage')
    };
    Object.entries(stages).forEach(([name,node])=>{
      if(node)node.hidden=name!==stage;
    });
    setExecutionCopy();
  }

  function showExecution(stage){
    const overlay=$('#executionOverlay');
    if(!overlay)return;
    if(!overlay.classList.contains('is-visible'))modalReturnFocus=document.activeElement;
    setExecutionStage(stage);
    overlay.classList.add('is-visible');
    overlay.setAttribute('aria-hidden','false');
    syncModalState();
    const focusTarget=stage==='timer'
      ?$('#timerToggle')
      :stage==='rest'
        ?$('#restSkip')
        :$('#countdownCancel');
    requestAnimationFrame(()=>focusTarget?.focus({preventScroll:true}));
  }

  function hideExecution(){
    const overlay=$('#executionOverlay');
    if(!overlay)return;
    if(stageTimer!==null){
      clearTimeout(stageTimer);
      stageTimer=null;
    }
    overlay.classList.remove('is-visible');
    overlay.setAttribute('aria-hidden','true');
    executionStage='idle';
    syncModalState();
    if(!visibleModal()&&modalReturnFocus?.isConnected){
      modalReturnFocus.focus({preventScroll:true});
      modalReturnFocus=null;
    }
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
    current++;
    routine.step=current;
    Store.save();
    render('forward');
  }

  function startRest(afterRest){
    const seconds=Number(settings.restSeconds)||0;
    if(seconds<=0){
      hideExecution();
      afterRest();
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
        hideExecution();
        if(finish)finish();
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
      hideExecution();
      finishRoutine();
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
    $('#timerLabel').textContent=timer.remaining===0?'готово':'осталось';

    const hasProgress=timer.remaining<timer.duration&&timer.remaining>0;
    $('#timerState').textContent=timer.running?'Идёт':timer.remaining===0?'Завершён':hasProgress?'Пауза':'Готов';
    $('#timerToggle').textContent=timer.running?'Пауза':hasProgress?'Продолжить':'Старт';
    $('#timerRing').classList.toggle('is-running',timer.running);
    $('#timerRing').classList.toggle('is-ending',Boolean(timer.running&&preciseRemaining>0&&preciseRemaining<=5));
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
    const segments=$('#stepSegments');
    segments.style.setProperty('--step-count',String(exercises.length));
    segments.innerHTML=exercises.map((_,index)=>`<i class="${index<done?'is-done ':''}${index===current?'is-current':''}"></i>`).join('');
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
    const hasProgress=timer.remaining<timer.duration&&timer.remaining>0;

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

    animateExercise(direction);
    requestAnimationFrame(()=>$('#exerciseScroll').scrollTo({top:0,behavior:scrollMode}));
  }

  function finishRoutine(){
    pauseCurrentTimer();
    cancelCountdown();
    cancelRest();
    routine.completed=true;
    routine.completedUntil=exercises.length;
    routine.step=exercises.length-1;
    routine.completedAt=new Date().toISOString();
    Store.save();
    renderStepSegments();
    sound('complete');
    haptic('success');

    const overlay=$('#completionOverlay');
    const activeSeconds=Math.max(0,Number(routine.activeSeconds)||0);
    if(activeSeconds>0){
      const minutes=Math.max(1,Math.round(activeSeconds/60));
      $('#completionMeta').textContent=`${exercises.length} упражнений · ${minutes} мин в движении`;
    }else{
      $('#completionMeta').textContent=`${exercises.length} упражнений завершено`;
    }
    modalReturnFocus=document.activeElement;
    overlay.classList.add('is-visible');
    overlay.setAttribute('aria-hidden','false');
    syncModalState();
    $('#completionHome').focus({preventScroll:true});
  }

  $('#routineResetButton').addEventListener('click',()=>{
    const approved=confirm('Сбросить прогресс этой тренировки? Все пройденные упражнения и таймеры этого комплекса будут сброшены.');
    if(!approved)return;

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
    toast('Прогресс тренировки сброшен');
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

    const hasProgress=timer.remaining<timer.duration&&timer.remaining>0;
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

  document.addEventListener('pointerdown',()=>{unlockAudio();},{once:true,passive:true});

  document.addEventListener('keydown',event=>{
    const modal=visibleModal();
    if(!modal)return;

    if(event.key==='Escape'){
      if($('#executionOverlay').classList.contains('is-visible')){
        $('#executionClose').click();
      }
      return;
    }

    if(event.key!=='Tab')return;
    const focusable=[...modal.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select:not([disabled])')].filter(node=>node.offsetParent!==null);
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

  $('#executionTechnique').addEventListener('click',()=>{
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

  $('#restSkip').addEventListener('click',()=>{
    const finish=restFinish;
    if(restTimer!==null)clearInterval(restTimer);
    restTimer=null;
    restFinish=null;
    releaseWakeLock();
    hideExecution();
    haptic('next');
    if(finish)finish();
  });
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
  window.addEventListener('pagehide',persist);
  window.addEventListener('beforeunload',persist);

  window.addEventListener('load',()=>{
    setTimeout(()=>{
      $('#pageLoader').classList.add('is-hidden');
      if(routine.completed)toast('Комплекс уже завершён сегодня');
      else if(resumedFromStep!==null)toast(`Продолжено с упражнения ${resumedFromStep+1}`);
    },120);
  });

  render('forward','auto');
})(exercises,ROUTINE_KEY);
})();
