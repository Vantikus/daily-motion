(() => {
  const $=selector=>document.querySelector(selector);
  const reducedMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const create=({exercises,routine,getCurrent,getTimer,motionTokens,haptic,signal}={})=>{
    if(!Array.isArray(exercises)||!routine||typeof getCurrent!=='function'||typeof getTimer!=='function'){
      throw new Error('DailyMotionSessionView.create: invalid session dependencies');
    }

    const detailAnimations=new WeakMap();
    const detailTimers=new Map();
    const detailCards=[...document.querySelectorAll('.detail-card')];
    const detailDuration=280;
    // Linear time on x makes this exactly the cubic ease used by scroll below.
    const detailEase='cubic-bezier(.333333,1,.666667,1)';
    let detailScrollFrame=0;
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

    const cancelDetailMotion=card=>{
      const timer=detailTimers.get(card);
      if(timer!==undefined)clearTimeout(timer);
      detailTimers.delete(card);
      const animations=detailAnimations.get(card)||[];
      detailAnimations.delete(card);
      animations.forEach(animation=>animation.cancel());
      card.querySelector('.detail-card__inner')?.style.removeProperty('will-change');
    };

    const cancelDetailScroll=()=>{
      if(detailScrollFrame)cancelAnimationFrame(detailScrollFrame);
      detailScrollFrame=0;
    };

    const setDetailState=(card,open)=>{
      cancelDetailMotion(card);

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
        inner.style.transform='translate3d(0,0,0)';
      }
    };

    const scrollDetailBy=(scroll,delta)=>{
      cancelDetailScroll();
      if(reducedMotion()){
        scroll.scrollTop+=delta;
        return;
      }

      const target=scroll.scrollTop+delta;
      const start=scroll.scrollTop;
      const distance=target-start;
      if(Math.abs(distance)<=1)return;

      const started=performance.now();
      const tick=now=>{
        if(destroyed||signal?.aborted){detailScrollFrame=0;return;}
        const progress=Math.min(1,(now-started)/detailDuration);
        const eased=1-Math.pow(1-progress,3);
        scroll.scrollTop=start+distance*eased;
        if(progress<1){
          detailScrollFrame=requestAnimationFrame(tick);
        }else{
          detailScrollFrame=0;
        }
      };
      detailScrollFrame=requestAnimationFrame(tick);
    };

    const revealDetailCard=(card,{heightDelta=0,topDelta=0,behavior}={})=>{
      const scroll=$('#exerciseScroll');
      if(!scroll||!card)return;

      const scrollBox=scroll.getBoundingClientRect();
      const cardBox=card.getBoundingClientRect();
      const projectedTop=cardBox.top+topDelta;
      const projectedHeight=Math.max(0,cardBox.height+heightDelta);
      const projectedBottom=projectedTop+projectedHeight;
      const topGuard=12;
      const bottomGuard=16;
      const availableHeight=scrollBox.height-topGuard-bottomGuard;
      let delta=0;

      if(projectedHeight<=availableHeight){
        if(projectedBottom>scrollBox.bottom-bottomGuard){
          delta=projectedBottom-(scrollBox.bottom-bottomGuard);
        }else if(projectedTop<scrollBox.top+topGuard){
          delta=projectedTop-(scrollBox.top+topGuard);
        }
      }else if(projectedTop<scrollBox.top+topGuard||projectedBottom>scrollBox.bottom-bottomGuard){
        delta=projectedTop-(scrollBox.top+topGuard);
      }

      if(Math.abs(delta)>1){
        if(behavior==='auto'||reducedMotion()){
          scroll.scrollTop+=delta;
        }else{
          scrollDetailBy(scroll,delta);
        }
      }
    };

    const animateDetailState=(card,open,{currentHeight,targetHeight})=>{
      const toggle=card.querySelector('.detail-card__toggle');
      const panel=card.querySelector('.detail-card__panel');
      const inner=card.querySelector('.detail-card__inner');
      if(!panel||!inner){
        setDetailState(card,open);
        return;
      }

      cancelDetailMotion(card);

      panel.style.height=`${currentHeight}px`;
      panel.style.opacity='1';
      inner.style.opacity='1';
      inner.style.transform='translate3d(0,0,0)';

      card.classList.toggle('is-open',open);
      toggle?.setAttribute('aria-expanded',String(open));
      panel.inert=!open;
      panel.setAttribute('aria-hidden',String(!open));

      if(reducedMotion()){
        setDetailState(card,open);
        return;
      }

      // Rasterize the text at its final size; only its clipping box changes.
      inner.style.willChange='transform';
      const panelAnimation=panel.animate(
        [
          {height:`${currentHeight}px`},
          {height:`${open?targetHeight:0}px`}
        ],
        {
          duration:detailDuration,
          easing:detailEase,
          fill:'forwards'
        }
      );

      const animations=[panelAnimation];
      detailAnimations.set(card,animations);

      let finished=false;
      const finish=()=>{
        if(finished||destroyed||signal?.aborted||detailAnimations.get(card)!==animations)return;
        finished=true;
        setDetailState(card,open);
      };

      panelAnimation.addEventListener('finish',finish,{once:true});
      const timer=setTimeout(()=>{
        detailTimers.delete(card);
        finish();
      },detailDuration+70);
      detailTimers.set(card,timer);
    };

    detailCards.forEach(card=>{
      const toggle=card.querySelector('.detail-card__toggle');
      on(toggle,'click',()=>{
        if(destroyed||signal?.aborted)return;
        cancelDetailScroll();
        const willOpen=!card.classList.contains('is-open');
        // Read every box before mutating any panel: switching sections needs
        // one layout measurement, rather than alternating reads and writes.
        const boxes=detailCards.map(other=>({
          card:other,
          currentHeight:other.querySelector('.detail-card__panel')?.getBoundingClientRect().height||0,
          targetHeight:other.querySelector('.detail-card__inner')?.getBoundingClientRect().height||0
        }));
        if(willOpen){
          const {currentHeight,targetHeight}=boxes.find(box=>box.card===card);
          let closingShift=0;
          boxes.forEach(box=>{
            if(box.card!==card&&(box.card.compareDocumentPosition(card)&Node.DOCUMENT_POSITION_FOLLOWING)){
              closingShift+=box.currentHeight;
            }
          });

          revealDetailCard(card,{
            heightDelta:targetHeight-currentHeight,
            topDelta:-closingShift
          });

        }
        boxes.forEach(box=>{
          if(box.card===card||box.currentHeight>0||detailAnimations.has(box.card)){
            animateDetailState(box.card,box.card===card&&willOpen,box);
          }
        });
        if(willOpen&&reducedMotion())revealDetailCard(card,{behavior:'auto'});
        haptic?.('tap');
      });
    });

    const resetDetails=()=>{
      cancelDetailScroll();
      detailCards.forEach((card,index)=>setDetailState(card,index===0));
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
      $('#headerProgress').textContent=`${current+1} / ${exercises.length}`;
      $('#navStepLabel').textContent=`Упражнение ${current+1} из ${exercises.length}`;
      $('#prevButton').disabled=current===0;
    };

    const destroy=()=>{
      if(destroyed)return;
      destroyed=true;
      cancelDetailScroll();
      exerciseAnimation?.cancel();
      exerciseAnimation=null;
      detailCards.forEach(cancelDetailMotion);
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
