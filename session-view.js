(() => {
  const $=selector=>document.querySelector(selector);
  const reducedMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const create=({exercises,routine,getCurrent,getTimer,motionTokens,haptic,signal}={})=>{
    if(!Array.isArray(exercises)||!routine||typeof getCurrent!=='function'||typeof getTimer!=='function'){
      throw new Error('DailyMotionSessionView.create: invalid session dependencies');
    }

    const detailCards=[...document.querySelectorAll('.detail-card')];
    const detailStack=document.querySelector('.details-stack');
    const detailScroll=document.querySelector('#exerciseScroll');
    let exerciseAnimation=null;
    let destroyed=false;
    const on=(node,type,handler,options={})=>{
      if(!node)return;
      node.addEventListener(type,handler,signal?{...options,signal}:options);
    };

    const renderVisual=exercise=>{
      const box=$('#exerciseVisual');
      if(!box)return;
      if(Array.isArray(exercise.visuals)&&exercise.visuals.length){
        box.hidden=false;
        box.classList.add('has-visuals');
        box.innerHTML=`<div class="visual-phases" style="--phase-count:${Math.min(exercise.visuals.length,3)}">${exercise.visuals.map((src,index)=>`<figure class="visual-phase"><img src="${src}" alt="${exercise.title}, фаза ${index+1}" loading="eager" decoding="async"></figure>`).join('')}</div>`;
        return;
      }
      box.hidden=true;
      box.classList.remove('has-visuals','visual-placeholder');
      box.innerHTML='';
    };

    const setDetailState=(card,open)=>{
      card.classList.toggle('is-open',open);
      card.querySelector('.detail-card__toggle')?.setAttribute('aria-expanded',String(open));
      const panel=card.querySelector('.detail-card__panel');
      if(panel){
        panel.inert=!open;
        panel.setAttribute('aria-hidden',String(!open));
        panel.style.height=open?'auto':'0px';
      }
    };

    const settleDetails=(reset=false)=>{
      if(!detailStack)return;
      detailStack.classList.add('is-detail-resetting');
      detailCards.forEach((card,index)=>setDetailState(card,reset?index===0:card.classList.contains('is-open')));
      // One layout flush settles all panels; no frame loop or snapshot layers.
      void detailStack.offsetHeight;
      detailStack.classList.remove('is-detail-resetting');
    };

    const revealDetailHeading=card=>{
      if(!detailScroll||!card)return;
      const scrollBox=detailScroll.getBoundingClientRect();
      const heading=card.querySelector('.detail-card__heading').getBoundingClientRect();
      if(heading.top<scrollBox.top+12)detailScroll.scrollTop+=heading.top-scrollBox.top-12;
      else if(heading.bottom>scrollBox.bottom-16)detailScroll.scrollTop+=heading.bottom-scrollBox.bottom+16;
    };

    const animateDetails=(card,open)=>{
      const panel=card.querySelector('.detail-card__panel');
      const inner=card.querySelector('.detail-card__inner');
      if(!panel||!inner)return;
      if(reducedMotion()){
        setDetailState(card,open);
        return;
      }
      // CSS reverses an in-flight height transition from its current position.
      // Only a resting auto height needs freezing before a closing transition.
      if(!panel.style.height||panel.style.height==='auto'){
        panel.style.height=`${panel.getBoundingClientRect().height}px`;
        void panel.offsetHeight;
      }
      card.classList.toggle('is-open',open);
      card.querySelector('.detail-card__toggle').setAttribute('aria-expanded',String(open));
      panel.inert=!open;
      panel.setAttribute('aria-hidden',String(!open));
      panel.style.height=open?`${inner.getBoundingClientRect().height}px`:'0px';
      // Rows and their real separators stay in normal flow. No text transforms,
      // early opacity changes, artificial skins or forced pointer scrolling.
    };

    const detailToggles=detailCards.map(card=>card.querySelector('.detail-card__toggle'));
    detailCards.forEach((card,index)=>{
      on(detailToggles[index],'keydown',event=>{
        if(destroyed||signal?.aborted)return;
        const key=event.key;
        let next=index;
        if(key==='ArrowDown')next=(index+1)%detailCards.length;
        else if(key==='ArrowUp')next=(index+detailCards.length-1)%detailCards.length;
        else if(key==='Home')next=0;
        else if(key==='End')next=detailCards.length-1;
        else return;
        event.preventDefault();
        detailToggles[next].focus({preventScroll:true});
        revealDetailHeading(detailCards[next]);
      });
      const panel=card.querySelector('.detail-card__panel');
      on(panel,'transitionend',event=>{
        if(destroyed||signal?.aborted||event.target!==panel||event.propertyName!=='height')return;
        if(card.classList.contains('is-open'))panel.style.height='auto';
      });
      on(card.querySelector('.detail-card__toggle'),'click',()=>{
        if(destroyed||signal?.aborted||!detailStack)return;
        animateDetails(card,!card.classList.contains('is-open'));
        haptic?.('tap');
      });
    });
    on(window,'resize',()=>settleDetails(),{passive:true});

    const resetDetails=()=>settleDetails(true);

    const renderStepSegments=()=>{
      const current=getCurrent();
      const done=routine.completed?exercises.length:Math.min(routine.completedUntil||0,exercises.length);
      const segments=$('#stepSegments');
      if(!segments)return;
      segments.style.setProperty('--step-count',String(exercises.length));
      if(segments.children.length!==exercises.length){
        segments.innerHTML=exercises.map(()=>'<i></i>').join('');
      }
      [...segments.children].forEach((segment,index)=>{
        segment.classList.toggle('is-done',index<done);
        segment.classList.toggle('is-current',index===current&&!routine.completed);
      });
    };

    const animateExercise=(direction='forward')=>{
      const card=$('.exercise-main');
      if(!card)return;
      card.classList.remove('enter-forward','enter-back');
      const appleMobile=document.documentElement.classList.contains('dm-apple-mobile');
      exerciseAnimation?.cancel();
      exerciseAnimation=null;
      if(reducedMotion())return;
      if(appleMobile){
        if(typeof card.animate==='function'){
          exerciseAnimation=card.animate([
            {transform:`translate3d(${direction==='back'?-24:24}px,0,0)`},
            {transform:'translate3d(0,0,0)'}
          ],{duration:240,easing:motionTokens.easeStandard});
        }
        return;
      }
      void card.offsetWidth;
      card.classList.add(direction==='back'?'enter-back':'enter-forward');
      const badge=$('#headerProgress');
      if(!badge)return;
      badge.classList.remove('is-updating');
      void badge.offsetWidth;
      badge.classList.add('is-updating');
    };

    const nextButton=$('#nextButton');
    let lastNextButtonState=null;
    const paintNextButton=(text,disabled=false,finish=false)=>{
      const state=[text,disabled,finish].join(':');
      if(state===lastNextButtonState)return;
      lastNextButtonState=state;
      nextButton.textContent=text;
      nextButton.disabled=disabled;
      nextButton.classList.toggle('is-finish',finish);
    };
    const updateNextButton=(timer=getTimer())=>{
      const current=getCurrent();
      if(!nextButton)return;
      const isDone=routine.completed||Number(routine.completedUntil||0)>current||timer.remaining===0;
      const hasProgress=(timer.paused||timer.remaining<timer.duration)&&timer.remaining>0;

      if(routine.completed){
        paintNextButton('Комплекс завершён',true);
        return;
      }

      if(isDone){
        const isFinish=current===exercises.length-1;
        paintNextButton(isFinish?'Завершить комплекс':'Следующее упражнение',false,isFinish);
        return;
      }

      paintNextButton(timer.running?'Открыть таймер':hasProgress?'Продолжить':'Начать упражнение');
    };

    const renderExercise=exercise=>{
      const current=getCurrent();
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
      $('#headerProgress').textContent=`${current+1} из ${exercises.length}`;
      $('#navStepLabel').textContent=`Упражнение ${current+1} из ${exercises.length}`;
      $('#prevButton').disabled=current===0;
    };

    const destroy=()=>{
      if(destroyed)return;
      destroyed=true;
      settleDetails();
      exerciseAnimation?.cancel();
      exerciseAnimation=null;
      signal?.removeEventListener('abort',destroy);
    };
    signal?.addEventListener('abort',destroy,{once:true});

    return Object.freeze({
      renderExercise,
      renderStepSegments,
      resetDetails,
      animateExercise,
      updateNextButton,
      destroy
    });
  };

  window.DailyMotionSessionView=Object.freeze({create});
})();
