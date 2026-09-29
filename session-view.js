(() => {
  const $=selector=>document.querySelector(selector);
  const reducedMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const create=({exercises,routine,getCurrent,getTimer,motionTokens,haptic,signal}={})=>{
    if(!Array.isArray(exercises)||!routine||typeof getCurrent!=='function'||typeof getTimer!=='function'){
      throw new Error('DailyMotionSessionView.create: invalid session dependencies');
    }

    const detailAnimations=new WeakMap();
    const detailTimers=new Set();
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
      detailAnimations.get(card)?.forEach?.(animation=>animation.cancel());
      detailAnimations.delete(card);

      const toggle=card.querySelector('.detail-card__toggle');
      const panel=card.querySelector('.detail-card__panel');
      const inner=card.querySelector('.detail-card__inner');

      card.classList.toggle('is-open',open);
      if(panel){
        panel.inert=!open;
        panel.setAttribute('aria-hidden',String(!open));
        panel.style.height=open?'auto':'0px';
        panel.style.opacity=open?'1':'0';
      }
      toggle?.setAttribute('aria-expanded',String(open));
      if(inner){
        inner.style.opacity=open?'1':'0';
        inner.style.transform=open?'translate3d(0,0,0)':'translate3d(0,-2px,0)';
      }
    };

    const animateDetailState=(card,open)=>{
      const toggle=card.querySelector('.detail-card__toggle');
      const panel=card.querySelector('.detail-card__panel');
      const inner=card.querySelector('.detail-card__inner');
      if(!panel||!inner){
        setDetailState(card,open);
        return;
      }

      const previous=detailAnimations.get(card)||[];
      const currentHeight=panel.getBoundingClientRect().height;
      previous.forEach(animation=>animation.cancel());

      panel.style.height=`${currentHeight}px`;
      panel.style.opacity=currentHeight>0?'1':'0';
      inner.style.opacity=currentHeight>0?'1':'0';
      inner.style.transform=currentHeight>0?'translate3d(0,0,0)':'translate3d(0,-2px,0)';

      card.classList.toggle('is-open',open);
      toggle?.setAttribute('aria-expanded',String(open));
      panel.inert=!open;
      panel.setAttribute('aria-hidden',String(!open));

      const targetHeight=open?inner.scrollHeight:0;
      if(reducedMotion()){
        setDetailState(card,open);
        return;
      }

      const panelAnimation=panel.animate(
        [
          {height:`${currentHeight}px`,opacity:currentHeight>0?1:.25},
          {height:`${targetHeight}px`,opacity:open?1:.2}
        ],
        {
          duration:open?270:190,
          easing:open?motionTokens.easeEnter:motionTokens.easeExit,
          fill:'forwards'
        }
      );

      const innerAnimation=inner.animate(
        open
          ?[
            {opacity:currentHeight>0?1:0,transform:currentHeight>0?'translate3d(0,0,0)':'translate3d(0,-3px,0)'},
            {opacity:1,transform:'translate3d(0,0,0)'}
          ]
          :[
            {opacity:1,transform:'translate3d(0,0,0)'},
            {opacity:0,transform:'translate3d(0,-2px,0)'}
          ],
        {
          duration:open?190:110,
          delay:open?35:0,
          easing:open?motionTokens.easeEnter:motionTokens.easeExit,
          fill:'forwards'
        }
      );

      const animations=[panelAnimation,innerAnimation];
      detailAnimations.set(card,animations);

      let finished=false;
      const finish=()=>{
        if(finished||detailAnimations.get(card)!==animations)return;
        finished=true;
        animations.forEach(animation=>animation.cancel());
        detailAnimations.delete(card);

        if(open){
          card.classList.add('is-open');
          panel.style.height='auto';
          panel.style.opacity='1';
          inner.style.opacity='1';
          inner.style.transform='translate3d(0,0,0)';
        }else{
          card.classList.remove('is-open');
          panel.style.height='0px';
          panel.style.opacity='0';
          inner.style.opacity='0';
          inner.style.transform='translate3d(0,-2px,0)';
        }
      };

      panelAnimation.addEventListener('finish',finish,{once:true});
      const timer=setTimeout(()=>{
        detailTimers.delete(timer);
        finish();
      },(open?270:190)+70);
      detailTimers.add(timer);
    };

    document.querySelectorAll('.detail-card__toggle').forEach(toggle=>{
      on(toggle,'click',()=>{
        const card=toggle.closest('.detail-card');
        if(!card)return;
        const willOpen=!card.classList.contains('is-open');
        if(willOpen){
          document.querySelectorAll('.detail-card.is-open').forEach(other=>{
            if(other!==card)animateDetailState(other,false);
          });
        }
        animateDetailState(card,willOpen);
        if(willOpen){
          const timer=setTimeout(()=>{
            detailTimers.delete(timer);
            toggle.scrollIntoView({block:'nearest',behavior:reducedMotion()?'auto':'smooth'});
          },110);
          detailTimers.add(timer);
        }
        haptic?.('tap');
      });
    });

    const resetDetails=()=>{
      document.querySelectorAll('.detail-card').forEach((card,index)=>setDetailState(card,index===0));
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
      void card.offsetWidth;
      card.classList.add(direction==='back'?'enter-back':'enter-forward');
      const badge=$('#headerProgress');
      if(!badge)return;
      badge.classList.remove('is-updating');
      void badge.offsetWidth;
      badge.classList.add('is-updating');
    };

    const updateNextButton=()=>{
      const current=getCurrent();
      const button=$('#nextButton');
      if(!button)return;
      const timer=getTimer();
      const isDone=routine.completed||Number(routine.completedUntil||0)>current||timer.remaining===0;
      const hasProgress=(timer.paused||timer.remaining<timer.duration)&&timer.remaining>0;

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
      $('#headerProgress').textContent=`${current+1} / ${exercises.length}`;
      $('#navStepLabel').textContent=`Упражнение ${current+1} из ${exercises.length}`;
      $('#prevButton').disabled=current===0;
    };

    const destroy=()=>{
      detailTimers.forEach(timer=>clearTimeout(timer));
      detailTimers.clear();
      document.querySelectorAll('.detail-card').forEach(card=>{
        detailAnimations.get(card)?.forEach?.(animation=>animation.cancel());
        detailAnimations.delete(card);
      });
    };

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
