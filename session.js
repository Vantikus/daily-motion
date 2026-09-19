(() => {
  const ROUTINE_KEY=new URLSearchParams(location.search).get('routine')||'morning';
  const exercises=[
    {
      id:'cat-cow', title:'Кошка-корова', volume:'6–8 плавных циклов', time:'≈ 45–55 сек', seconds:50,
      goal:'Мягко разбудить позвоночник и провести его через комфортное сгибание и разгибание без рывков.',
      how:[
        'Встаньте на четвереньки: ладони под плечами, колени под тазом, шея продолжает линию позвоночника.',
        'На выдохе мягко подкрутите таз, округлите спину и дайте лопаткам разойтись.',
        'На вдохе переведите таз в обратное положение и спокойно раскройте грудную клетку.',
        'Двигайтесь последовательно от таза через грудной отдел; голову не запрокидывайте.',
        'Амплитуда должна оставаться комфортной: не пытайтесь любой ценой сделать спину максимально круглой или прогнутой.'
      ],
      breathing:'Выдох — округление, вдох — мягкое разгибание. Темп медленный: примерно 3–4 секунды на полный цикл.',
      feel:'Плавное движение вдоль всей спины, особенно между лопатками. Допустимо лёгкое ощущение растяжения, но не боль или защемление.',
      mistakes:[
        'Всё движение идёт только из поясницы — уменьшите амплитуду и начните движение тазом, затем подключайте грудной отдел.',
        'Голова резко запрокидывается — держите шею продолжением позвоночника и смотрите чуть перед ладонями.',
        'Движение выполняется рывком — замедлитесь и связывайте каждую фазу с дыханием.',
        'Локти сгибаются и плечи поднимаются к ушам — мягко отталкивайте пол ладонями и держите плечи далеко от ушей.'
      ],
      easy:'Сделайте движение меньше и медленнее. Если опора на кисти неприятна, поставьте предплечья на устойчивую высокую поверхность.',
      progression:'Увеличивайте не амплитуду, а контроль: попробуйте провести движение по позвоночнику более последовательно, без ускорений.',
      stop:'Остановитесь при резкой боли в спине или шее, простреле, онемении, головокружении или ощущении защемления.',
      key:'Плавность важнее амплитуды: таз начинает движение, грудной отдел продолжает, шея остаётся спокойной.'
    },
    {
      id:'thoracic-rotation', title:'Поворот грудного отдела на четвереньках', volume:'6 повторов на сторону', time:'≈ 55–65 сек', seconds:60,
      goal:'Добавить контролируемое вращение грудного отдела и движение лопатки без скручивания через поясницу.',
      how:[
        'Останьтесь на четвереньках: ладони под плечами, колени под тазом.',
        'Одну ладонь положите на затылок, локоть направьте вниз.',
        'Слегка подтяните живот и оставьте таз максимально неподвижным.',
        'На выдохе поверните грудную клетку и локоть вверх настолько, насколько получается без движения таза.',
        'Вернитесь в исходное положение и выполните все повторы, затем смените сторону.'
      ],
      breathing:'Вдох в исходном положении, выдох во время поворота вверх. Двигайтесь медленно, без пружинящих движений.',
      feel:'Мягкое вращение в верхней и средней части спины, работу мышц вокруг лопаток. Поясница не должна быть главным местом движения.',
      mistakes:[
        'Таз уходит в сторону вместе с плечами — уменьшите амплитуду и представьте, что тазовые кости смотрят строго в пол.',
        'Поворот делается за счёт поясницы — слегка напрягите живот и концентрируйтесь на движении рёбер и грудной клетки.',
        'Локоть тянут вверх любой ценой — остановитесь там, где движение остаётся свободным и без боли.',
        'Опорное плечо проваливается — активно, но без напряжения отталкивайте пол опорной ладонью.'
      ],
      easy:'Положите обе ладони на высокую опору и выполняйте небольшой поворот корпуса стоя, одной рукой скользя вверх.',
      progression:'Добавьте короткую паузу 1 секунду в верхнем положении, не увеличивая движение таза.',
      stop:'Прекратите при резкой боли между рёбрами, в плече, шее или пояснице, а также при онемении руки.',
      key:'Поворачивается грудная клетка, а не таз: амплитуда небольшая, движение чистое.'
    },
    {
      id:'wall-slide', title:'Скольжение руками по стене', volume:'8–10 повторов', time:'≈ 55–65 сек', seconds:60,
      goal:'Подготовить плечи и лопатки к подъёму рук и научить двигать ими без компенсации поясницей.',
      how:[
        'Встаньте спиной к стене; стопы можно вынести немного вперёд, чтобы положение было устойчивым.',
        'Слегка соберите рёбра и сохраните нейтральное положение таза.',
        'Согните руки примерно под прямым углом и начните медленно скользить ими вверх.',
        'Поднимайте руки только до высоты, где плечи не тянутся к ушам и поясница не усиливает прогиб.',
        'Спокойно верните руки вниз и повторите.'
      ],
      breathing:'Спокойно выдыхайте при подъёме рук и вдыхайте при возвращении. Примерно 2 секунды вверх и 2 секунды вниз.',
      feel:'Работу верхней части спины и области вокруг лопаток, лёгкое натяжение грудных мышц. Плечевой сустав должен двигаться свободно.',
      mistakes:[
        'Поясница выгибается, чтобы поднять руки выше — уменьшите высоту и держите нижние рёбра собранными.',
        'Плечи пожимаются к ушам — сделайте амплитуду меньше и оставьте шею длинной.',
        'Кисти и локти силой прижимают к стене — контакт со стеной вторичен; важнее свободное движение без боли.',
        'Движение слишком быстрое — замедлитесь, чтобы контролировать лопатки на всём пути.'
      ],
      easy:'Отойдите от стены и выполняйте тот же подъём рук без требования сохранять постоянный контакт.',
      progression:'Добавьте паузу 1–2 секунды в верхней комфортной точке, не меняя положение рёбер.',
      stop:'Не продолжайте через острую боль, щелчок с болью, онемение или ощущение нестабильности в плече.',
      key:'Руки поднимаются только настолько, насколько удаётся сохранить спокойные рёбра, шею и поясницу.'
    },
    {
      id:'leg-swings', title:'Махи ногой вперёд-назад с опорой', volume:'8–10 махов на ногу', time:'≈ 60–70 сек', seconds:65,
      goal:'Динамически подготовить тазобедренные суставы и мышцы передней и задней поверхности бедра перед приседами и выпадами.',
      how:[
        'Встаньте боком к стене или устойчивой опоре и легко держитесь одной рукой.',
        'Перенесите вес на опорную ногу и слегка подтяните живот.',
        'Свободной ногой сделайте небольшой контролируемый мах вперёд, затем назад.',
        'Сохраняйте корпус почти неподвижным и постепенно увеличивайте амплитуду только до комфортной.',
        'Выполните повторы без остановки и смените ногу.'
      ],
      breathing:'Дышите свободно, без задержки. Темп ритмичный, но контролируемый: примерно один полный мах за 1–2 секунды.',
      feel:'Постепенное увеличение свободы движения в тазобедренном суставе и лёгкое динамическое натяжение передней и задней поверхности бедра.',
      mistakes:[
        'Мах превращается в резкий бросок ноги — уменьшите амплитуду и контролируйте разворот в каждой крайней точке.',
        'Корпус раскачивается вместе с ногой — держитесь за опору и оставьте рёбра над тазом.',
        'Опорное колено жёстко заблокировано — сохраните небольшой естественный сгиб.',
        'Нога уходит выше комфортной амплитуды — увеличивайте диапазон постепенно, без боли.'
      ],
      easy:'Сделайте очень небольшие маятниковые движения и сильнее опирайтесь рукой о стену.',
      progression:'Постепенно увеличивайте контролируемую амплитуду или уменьшайте поддержку рукой, если баланс остаётся стабильным.',
      stop:'Остановитесь при резкой боли в паху, тазобедренном суставе, колене или пояснице, а также при потере равновесия.',
      key:'Нога движется свободно, но корпус почти не раскачивается; амплитуда растёт постепенно.'
    },
    {
      id:'calf-raise', title:'Медленный подъём на носки', volume:'12–15 повторов', time:'≈ 55–65 сек', seconds:60,
      goal:'Разогреть икроножные мышцы, голеностоп и стопы перед более активной работой ног.',
      how:[
        'Встаньте ровно рядом со стеной или опорой, стопы примерно на ширине таза.',
        'Распределите вес через основание большого пальца, основание мизинца и пятку.',
        'Плавно поднимите пятки и поднимитесь вертикально вверх на переднюю часть стоп.',
        'Задержитесь наверху примерно на секунду, не заваливая стопы наружу.',
        'Медленно опустите пятки на пол и повторите.'
      ],
      breathing:'Выдох на подъёме, вдох при опускании. Подъём около 1 секунды, пауза 1 секунду, опускание 2 секунды.',
      feel:'Равномерную работу икр и устойчивое давление через переднюю часть обеих стоп.',
      mistakes:[
        'Стопы заваливаются на наружный край — сохраняйте давление у основания большого пальца.',
        'Подъём делается рывком — замедлитесь и контролируйте верхнюю точку.',
        'Колени сильно сгибаются — оставьте их мягкими, но почти прямыми.',
        'Пятки падают вниз без контроля — опускайтесь медленнее, чем поднимаетесь.'
      ],
      easy:'Держитесь двумя руками за устойчивую опору и уменьшите высоту подъёма.',
      progression:'Увеличьте паузу наверху до 2 секунд или выполняйте более медленное опускание.',
      stop:'Остановитесь при резкой боли в ахилловом сухожилии, стопе или голеностопе, а также при внезапной судороге, которая не проходит.',
      key:'Поднимайтесь вертикально вверх и не теряйте опору через большой палец стопы.'
    },
    {
      id:'hip-hinge', title:'Наклон тазом назад / Hip Hinge', volume:'10–12 повторов', time:'≈ 60–70 сек', seconds:65,
      goal:'Подготовить заднюю поверхность бёдер и ягодицы и закрепить движение тазом назад при стабильной спине.',
      how:[
        'Встаньте устойчиво, стопы примерно на ширине таза.',
        'Слегка согните колени и представьте, что тазом хотите коснуться стены позади.',
        'Отводите таз назад, а корпус наклоняйте вперёд как единый блок.',
        'Остановитесь, когда почувствуете заметное, но комфортное натяжение задней поверхности бёдер.',
        'Напрягите ягодицы и вернитесь в стойку без переразгибания поясницы.'
      ],
      breathing:'Вдох при движении таза назад, выдох при возвращении вверх. Темп: около 2 секунд вниз и 2 секунды вверх.',
      feel:'Натяжение задней поверхности бёдер в нижней точке и работу ягодиц при возвращении.',
      mistakes:[
        'Получается присед вместо наклона — отправляйте таз дальше назад и оставляйте голени почти вертикальными.',
        'Спина округляется — уменьшите глубину и сохраняйте длинную линию от таза до затылка.',
        'Вес уходит полностью на носки — держите всю стопу на полу и ощущайте давление ближе к середине стопы и пятке.',
        'В верхней точке таз резко выталкивается вперёд — просто встаньте вертикально и остановитесь.'
      ],
      easy:'Встаньте примерно в 15–20 см от стены и учитесь мягко касаться стены тазом, почти не наклоняясь.',
      progression:'Увеличьте контролируемую глубину или выполняйте опускание за 3 секунды.',
      stop:'Прекратите при резкой боли в пояснице, простреле, онемении или боли, уходящей по ноге.',
      key:'Это движение таза назад, а не присед: спина остаётся длинной, голени почти вертикальны.'
    },
    {
      id:'squat-reach', title:'Присед + подъём рук вверх', volume:'10–12 повторов', time:'≈ 65–75 сек', seconds:70,
      goal:'Включить крупные мышцы ног и корпуса и постепенно поднять общую интенсивность разминки.',
      how:[
        'Поставьте стопы примерно на ширине плеч; носки направьте так, чтобы положение было естественным.',
        'Начните присед, одновременно сгибая колени и отводя таз назад и вниз.',
        'Держите всю стопу на полу, а колени направляйте примерно по линии носков.',
        'Поднимитесь без рывка и плавно вытяните руки вверх.',
        'В верхней точке не выталкивайте рёбра вперёд и не прогибайтесь в пояснице.'
      ],
      breathing:'Вдох при опускании, выдох при подъёме и вытяжении рук. Темп спокойный: 2 секунды вниз, 1–2 секунды вверх.',
      feel:'Работу ягодиц и передней поверхности бёдер, умеренное учащение дыхания и свободное движение плеч вверх.',
      mistakes:[
        'Колени заметно заваливаются внутрь — уменьшите глубину и направляйте их по линии стоп.',
        'Пятки отрываются — сделайте присед мельче и сохраняйте всю стопу на полу.',
        'Поясница округляется внизу — остановитесь выше и сохраняйте положение корпуса, которое можете контролировать.',
        'Руки поднимаются за счёт сильного прогиба поясницы — держите рёбра собранными и сократите амплитуду рук.'
      ],
      easy:'Выполняйте неглубокий присед к стулу или высокой опоре и поднимайте руки только до комфортной высоты.',
      progression:'Постепенно увеличивайте глубину или замедляйте фазу опускания до 3 секунд, сохраняя ту же технику.',
      stop:'Остановитесь при резкой боли в колене, тазобедренном суставе или пояснице, нестабильности или головокружении.',
      key:'Вся стопа на полу, колени следуют за стопами, глубина только та, которую можно контролировать.'
    },
    {
      id:'reverse-lunge-reach', title:'Обратный выпад + подъём рук', volume:'6–8 повторов на сторону', time:'≈ 75–85 сек', seconds:80,
      goal:'Динамично включить ягодицы и бёдра, добавить работу баланса и подготовить тело к более активным движениям.',
      how:[
        'Встаньте ровно, стопы примерно на ширине таза.',
        'Сделайте одной ногой достаточно длинный шаг назад и поставьте носок на пол.',
        'Мягко опуститесь вниз, сгибая обе ноги; переднее колено направляйте по линии стопы.',
        'Одновременно поднимите руки вверх настолько, насколько получается без прогиба поясницы.',
        'Оттолкнитесь всей передней стопой, вернитесь в стойку и повторите другой ногой.'
      ],
      breathing:'Вдох при шаге назад и опускании, выдох при возвращении в стойку. Не спешите: один повтор примерно 3–4 секунды.',
      feel:'Основную работу ягодицы и бедра передней ноги, умеренное растяжение передней поверхности бедра задней ноги и работу корпуса для равновесия.',
      mistakes:[
        'Шаг назад слишком короткий и переднее колено сильно уходит вперёд — сделайте шаг длиннее и опускайтесь почти вертикально вниз.',
        'Переднее колено заваливается внутрь — уменьшите глубину и удерживайте колено по линии второго–третьего пальца стопы.',
        'Корпус сильно заваливается или разворачивается — сократите глубину и смотрите прямо перед собой.',
        'Руки поднимаются ценой прогиба поясницы — оставьте рёбра над тазом и поднимайте руки ниже.',
        'Возврат выполняется рывком задней ногой — отталкивайтесь преимущественно передней стопой.'
      ],
      easy:'Держитесь одной рукой за стену или стул и делайте неглубокий обратный выпад без подъёма рук.',
      progression:'Увеличьте контролируемую глубину или добавьте паузу 1 секунду в нижней точке, не меняя положение колена.',
      stop:'Прекратите при острой боли в колене, паху, голеностопе или пояснице либо если не удаётся удерживать равновесие.',
      key:'Длинный шаг назад, передняя стопа полностью на полу, колено смотрит туда же, куда носок.'
    },
    {
      id:'incline-push-scap', title:'Отжимание от опоры + доталкивание лопаток', volume:'8–10 повторов', time:'≈ 65–75 сек', seconds:70,
      goal:'Подготовить грудь, руки, плечевой пояс и переднюю зубчатую мышцу через контролируемое отжимание от высокой опоры.',
      how:[
        'Поставьте ладони на устойчивую стену, стол или высокую опору чуть шире плеч.',
        'Отойдите назад и выстройте прямую линию от головы до пят.',
        'Согните локти примерно под углом 30–45° к корпусу и приблизьте грудь к опоре.',
        'Выжмите себя назад, сохраняя корпус единым.',
        'В самом конце слегка дотолкните опору от себя, позволяя лопаткам разойтись, но не пожимайте плечами.'
      ],
      breathing:'Вдох при приближении к опоре, выдох при отжимании. Темп: 2 секунды к опоре, короткая пауза, 2 секунды обратно.',
      feel:'Грудь, трицепсы, мышцы вокруг лопаток и по бокам грудной клетки. Живот слегка работает, чтобы удерживать корпус.',
      mistakes:[
        'Таз провисает или уходит назад — выберите более высокую опору и держите тело одной линией.',
        'Локти раскрываются строго в стороны — направляйте их немного назад, примерно под 30–45°.',
        'Голова тянется вперёд — держите затылок продолжением корпуса и смотрите на опору.',
        'В финале плечи поднимаются к ушам — доталкивайте опору лопатками, сохраняя шею длинной.',
        'Используется неустойчивая мебель — выбирайте только неподвижную опору, которая не может сдвинуться.'
      ],
      easy:'Выполняйте упражнение от стены: чем вертикальнее корпус, тем легче нагрузка.',
      progression:'Постепенно используйте более низкую устойчивую опору, только если корпус и плечи остаются стабильными.',
      stop:'Остановитесь при резкой боли в плече, запястье или груди, онемении руки или ощущении, что опора нестабильна.',
      key:'Корпус остаётся одной линией; после отжимания добавьте только небольшое контролируемое движение лопатками.'
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

  const PROGRAM_VERSION='morning-v2-2026-09-19';
  const PROGRAM_VERSION_KEY='dailyMotion.morningProgramVersion';
  if(ROUTINE_KEY==='morning'&&localStorage.getItem(PROGRAM_VERSION_KEY)!==PROGRAM_VERSION){
    Store.resetRoutine(ROUTINE_KEY);
    localStorage.setItem(PROGRAM_VERSION_KEY,PROGRAM_VERSION);
  }

  const routine=Store.getRoutine(ROUTINE_KEY);
  let settings=Store.getSettings();
  routine.step=Math.max(0,Math.min(Number(routine.step)||0,exercises.length-1));
  if(!routine.completed&&!routine.startedAt)routine.startedAt=new Date().toISOString();
  Store.save();

  const resumedFromStep=!routine.completed&&(routine.step>0||routine.completedUntil>0)?routine.step:null;
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
    timer.running=true;
    timer.endAt=Date.now()+timer.remaining*1000;
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
    sound('tick');

    countdownTimer=setInterval(()=>{
      remaining--;
      if(remaining<=0){
        clearInterval(countdownTimer);
        countdownTimer=null;
        $('#countdownValue').textContent='Старт';
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
        if(remaining===10)sound('warning10');
        else if(remaining===5)sound('warning5');
        else if(remaining>0&&remaining<5)sound('endingTick');
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
    box.innerHTML=`<div class="visual-placeholder__inner"><span class="visual-placeholder__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 6h8M12 3v6M7 12h10M9 12l-2 7M15 12l2 7"></path></svg></span><div><strong>Визуал техники</strong><span>Две понятные фазы движения</span></div></div>`;
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
    $('#stopText').textContent=exercise.stop;
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
    if(routine.startedAt){
      const elapsed=Math.max(0,Date.now()-new Date(routine.startedAt).getTime());
      const minutes=Math.max(1,Math.round(elapsed/60000));
      $('#completionMeta').textContent=`${exercises.length} упражнений · около ${minutes} мин`;
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
    routine.startedAt=new Date().toISOString();
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
      showExecution('timer');
      updateTimerUI();
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
    timer.running=false;
    timer.endAt=null;
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
      if(routine.completed)toast('Комплекс уже завершён сегодня');
      else if(resumedFromStep!==null)toast(`Продолжено с упражнения ${resumedFromStep+1}`);
    },120);
  });

  render('forward','auto');
})(exercises,ROUTINE_KEY);
})();
