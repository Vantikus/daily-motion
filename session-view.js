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
    const detailShell=document.querySelector('.session-shell');
    let scrollReserve=0;
    let reserveTimer=null;
    let detailAutoScrolling=false;
    let detailMotion=null;
    const detailDuration=parseFloat(getComputedStyle(detailStack).getPropertyValue('--detail-duration'))||260;
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
      card.querySelector('.detail-card__toggle').setAttribute('aria-expanded',String(open));
      const panel=card.querySelector('.detail-card__panel');
      panel.inert=!open;
      panel.setAttribute('aria-hidden',String(!open));
    };

    const setScrollReserve=value=>{
      scrollReserve=Math.max(0,value);
      if(scrollReserve)detailShell.style.setProperty('--detail-scroll-reserve',`${scrollReserve}px`);
      else detailShell.style.removeProperty('--detail-scroll-reserve');
    };

    const releaseScrollReserve=()=>{
      clearTimeout(reserveTimer);
      if(detailMotion||!scrollReserve)return;
      const naturalMax=Math.max(0,detailScroll.scrollHeight-detailScroll.clientHeight-scrollReserve);
      setScrollReserve(Math.min(scrollReserve,Math.max(0,detailScroll.scrollTop-naturalMax)));
    };

    const finishDetailMotion=()=>{
      const state=detailMotion;
      if(!state)return;
      clearTimeout(state.timer);
      detailMotion=null;
      // Release the temporary range without clamping an active touch gesture
      // or a native smooth scroll. Remaining space is reclaimed at scroll end.
      const naturalMax=Math.max(0,detailScroll.scrollHeight-detailScroll.clientHeight-scrollReserve);
      setScrollReserve(Math.max(0,detailScroll.scrollTop-naturalMax));
      releaseScrollReserve();
    };

    const stopDetailAutoScroll=()=>{
      // One native cancellation per gesture; never a frame loop.
      if(!detailAutoScrolling)return;
      detailAutoScrolling=false;
      detailScroll.scrollTo({top:detailScroll.scrollTop,behavior:'instant'});
    };

    const revealDetailCard=card=>{
      if(!detailScroll||!card)return;
      const view=detailScroll.getBoundingClientRect();
      const box=card.getBoundingClientRect();
      const heading=card.querySelector('.detail-card__heading').getBoundingClientRect().height;
      let delta=0;
      if(box.top<view.top+12)delta=box.top-view.top-12;
      else if(box.top+heading>view.bottom-16)delta=box.top+heading-view.bottom+16;
      if(Math.abs(delta)>1)detailScroll.scrollTo({top:detailScroll.scrollTop+delta,behavior:reducedMotion()?'instant':'smooth'});
    };

    const animateDetails=(selected,willOpen)=>{
      clearTimeout(detailMotion?.timer);
      clearTimeout(reserveTimer);
      stopDetailAutoScroll();
      const from=detailScroll.scrollTop;
      const stackBox=detailStack.getBoundingClientRect();
      const view=detailScroll.getBoundingClientRect();
      const index=detailCards.indexOf(selected);
      // Measure only on interaction. CSS owns interpolation and reversal.
      const rows=detailCards.map(card=>({
        heading:card.querySelector('.detail-card__heading').getBoundingClientRect().height,
        border:parseFloat(getComputedStyle(card).borderTopWidth)||0,
        content:card.querySelector('.detail-card__inner').getBoundingClientRect().height
      }));
      const heights=rows.map((row,i)=>row.heading+row.border+(willOpen&&i===index?row.content:0));
      const naturalHeight=heights.reduce((sum,height)=>sum+height,2);
      const finalMax=Math.max(0,detailScroll.scrollHeight-detailScroll.clientHeight-scrollReserve-stackBox.height+naturalHeight);
      let target=Math.min(from,finalMax);
      if(willOpen){
        const top=stackBox.top-view.top+from+1+heights.slice(0,index).reduce((sum,height)=>sum+height,0);
        const extra=rows[index+1]?rows[index+1].heading+rows[index+1].border+8:0;
        const bottom=top+heights[index]+extra;
        if(bottom-top>detailScroll.clientHeight-28||top<from+12)target=top-12;
        else if(bottom>from+detailScroll.clientHeight-16)target=bottom-detailScroll.clientHeight+16;
        target=Math.max(0,Math.min(target,finalMax));
      }
      setScrollReserve(scrollReserve+Math.abs(naturalHeight-stackBox.height));
      detailCards.forEach(card=>setDetailState(card,card===selected&&willOpen));
      const state={timer:null};
      detailMotion=state;
      detailAutoScrolling=!reducedMotion()&&Math.abs(target-from)>.5;
      detailScroll.scrollTo({top:target,behavior:reducedMotion()?'instant':'smooth'});
      if(reducedMotion())finishDetailMotion();
      else state.timer=setTimeout(()=>{
        if(!destroyed&&!signal?.aborted&&detailMotion===state)finishDetailMotion();
      },detailDuration+40);
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
        stopDetailAutoScroll();
        detailToggles[next].focus({preventScroll:true});
        revealDetailCard(detailCards[next]);
      });
      on(card.querySelector('.detail-card__toggle'),'click',()=>{
        if(destroyed||signal?.aborted||!detailStack)return;
        animateDetails(card,!card.classList.contains('is-open'));
        haptic?.('tap');
      });
    });
    on(detailScroll,'wheel',stopDetailAutoScroll,{passive:true});
    on(detailScroll,'touchmove',stopDetailAutoScroll,{passive:true});
    on(detailScroll,'scrollend',()=>{
      detailAutoScrolling=false;
      releaseScrollReserve();
    },{passive:true});
    on(detailScroll,'scroll',()=>{
      clearTimeout(reserveTimer);
      reserveTimer=setTimeout(releaseScrollReserve,160);
    },{passive:true});
    on(window,'resize',finishDetailMotion,{passive:true});

    const resetDetails=()=>{
      clearTimeout(detailMotion?.timer);
      clearTimeout(reserveTimer);
      detailMotion=null;
      stopDetailAutoScroll();
      setScrollReserve(0);
      detailStack.classList.add('is-detail-resetting');
      detailCards.forEach((card,index)=>setDetailState(card,index===0));
      void detailStack.offsetHeight;
      detailStack.classList.remove('is-detail-resetting');
    };

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
      finishDetailMotion();
      setScrollReserve(0);
      clearTimeout(reserveTimer);
      stopDetailAutoScroll();
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
