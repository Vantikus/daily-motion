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
    const detailSurface=detailStack?document.createElement('div'):null;
    if(detailSurface){
      detailSurface.className='detail-stack-surface';
      detailSurface.setAttribute('aria-hidden','true');
      detailStack.prepend(detailSurface);
    }
    let scrollReserve=0;
    const detailStyle=detailStack?getComputedStyle(detailStack):null;
    const detailDuration=parseFloat(detailStyle?.getPropertyValue('--detail-duration'))||280;
    const detailEase=detailStyle?.getPropertyValue('--detail-ease').trim()||'cubic-bezier(.25,.5,.25,1)';
    let detailMotion=null;
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
      const toggle=card.querySelector('.detail-card__toggle');
      const panel=card.querySelector('.detail-card__panel');
      const inner=card.querySelector('.detail-card__inner');
      card.classList.toggle('is-open',open);
      toggle?.setAttribute('aria-expanded',String(open));
      if(panel){
        panel.inert=!open;
        panel.setAttribute('aria-hidden',String(!open));
        panel.style.height=open?'auto':'0px';
        panel.style.opacity=open?'1':'0';
      }
      if(inner){
        inner.style.opacity=open?'1':'0';
        inner.style.transform='none';
      }
    };

    const clearDetailLayout=()=>{
      detailStack.classList.remove('is-detail-animating');
      detailCards.forEach(card=>{
        for(const property of ['position','top','left','width','height','transform','clip-path','will-change','z-index']){
          card.style.removeProperty(property);
        }
        setDetailState(card,card.classList.contains('is-open'));
      });
    };

    const cancelDetailAnimations=()=>{
      const state=detailMotion;
      detailMotion=null;
      if(!state)return;
      clearTimeout(state.timer);
      cancelAnimationFrame(state.scrollFrame);
      state.animations.forEach(animation=>animation.cancel());
    };

    const setScrollReserve=value=>{
      scrollReserve=Math.max(0,value);
      if(scrollReserve)detailShell.style.setProperty('--detail-scroll-reserve',`${scrollReserve}px`);
      else detailShell.style.removeProperty('--detail-scroll-reserve');
    };

    const releaseScrollReserve=()=>{
      if(detailMotion||!scrollReserve)return;
      const naturalMax=Math.max(0,detailScroll.scrollHeight-detailScroll.clientHeight-scrollReserve);
      setScrollReserve(Math.min(scrollReserve,Math.max(0,detailScroll.scrollTop-naturalMax)));
    };

    const finishDetailMotion=()=>{
      const state=detailMotion;
      if(!state)return;
      // If a manual gesture took over, retain only the range still needed by
      // that position. It disappears as the user scrolls back, without a clamp.
      const naturalMax=detailScroll.scrollHeight-detailScroll.clientHeight-scrollReserve-state.layoutHeight+state.toHeight;
      setScrollReserve(Math.max(0,detailScroll.scrollTop-Math.max(0,naturalMax)));
      detailStack.style.height=`${state.toHeight}px`;
      cancelDetailAnimations();
      clearDetailLayout();
      detailStack.style.removeProperty('height');
      releaseScrollReserve();
    };

    const stopDetailAutoScroll=()=>{
      if(!detailMotion)return;
      detailMotion.manualScroll=true;
      cancelAnimationFrame(detailMotion.scrollFrame);
    };

    const detailScrollTarget=(rows,index,willOpen,finalMax)=>{
      const from=detailScroll.scrollTop;
      if(!willOpen)return Math.min(from,finalMax);
      const view=detailScroll.getBoundingClientRect();
      const row=rows[index];
      const next=rows[index+1];
      const extra=next?next.card.querySelector('.detail-card__heading').getBoundingClientRect().height+8:0;
      const top=row.box.top-view.top+from;
      const bottom=top+row.box.height+extra;
      const room=detailScroll.clientHeight-28;
      let target=from;
      if(bottom-top>room||top<from+12)target=top-12;
      else if(bottom>from+detailScroll.clientHeight-16)target=bottom-detailScroll.clientHeight+16;
      return Math.max(0,Math.min(target,finalMax));
    };

    const revealDetailCard=card=>{
      if(!detailScroll||!card)return;
      const scrollBox=detailScroll.getBoundingClientRect();
      const cardBox=card.getBoundingClientRect();
      const top=scrollBox.top+12;
      const bottom=scrollBox.bottom-16;
      const headerHeight=card.querySelector('.detail-card__heading').getBoundingClientRect().height;
      let delta=0;
      if(cardBox.top<top)delta=cardBox.top-top;
      else if(cardBox.top+headerHeight>bottom)delta=cardBox.top+headerHeight-bottom;
      if(Math.abs(delta)>1)detailScroll.scrollTop+=delta;
    };

    const animateDetails=(selected,willOpen)=>{
      // Keep text in its normal flow: only the two changing panels resize.
      // Snapshot their actual heights before cancelling an interrupted motion.
      const scrollFrom=detailScroll.scrollTop;
      const oldHeight=detailMotion
        ?detailSurface.getBoundingClientRect().height
        :detailStack.getBoundingClientRect().height;
      const oldRows=detailCards.map(card=>({
        height:card.querySelector('.detail-card__panel').getBoundingClientRect().height,
        arrow:getComputedStyle(card.querySelector('.detail-toggle-icon')).transform
      }));
      const previousLayoutHeight=detailStack.getBoundingClientRect().height;
      detailStack.style.height=`${Math.max(oldHeight,previousLayoutHeight)}px`;
      cancelDetailAnimations();
      clearDetailLayout();
      detailCards.forEach(card=>setDetailState(card,card===selected&&willOpen));
      const stackStyle=getComputedStyle(detailStack);
      const borders=(parseFloat(stackStyle.borderTopWidth)||0)+(parseFloat(stackStyle.borderBottomWidth)||0);
      const rows=detailCards.map(card=>{
        const panel=card.querySelector('.detail-card__panel');
        const inner=card.querySelector('.detail-card__inner');
        const arrow=card.querySelector('.detail-toggle-icon');
        return {card,panel,inner,arrow,box:card.getBoundingClientRect(),
          contentHeight:inner.getBoundingClientRect().height,
          targetHeight:panel.getBoundingClientRect().height,
          arrowTarget:getComputedStyle(arrow).transform};
      });
      const toHeight=rows.reduce((sum,row)=>sum+row.box.height,borders);
      const selectedIndex=detailCards.indexOf(selected);
      const finalMax=Math.max(0,detailScroll.scrollHeight-detailScroll.clientHeight-scrollReserve-parseFloat(detailStack.style.height)+toHeight);
      const scrollTarget=detailScrollTarget(rows,selectedIndex,willOpen,finalMax);
      if(reducedMotion()||typeof detailStack.animate!=='function'){
        setScrollReserve(0);
        detailStack.style.removeProperty('height');
        detailScroll.scrollTop=scrollTarget;
        return;
      }

      // A small newly selected panel must not rush the much larger closing one.
      const travel=Math.max(...rows.map((row,index)=>
        Math.abs(oldRows[index].height-row.targetHeight)/Math.max(1,row.contentHeight)));
      const duration=Math.max(150,detailDuration*Math.min(1,travel));
      const options={duration,easing:detailEase,fill:'both'};
      const layoutHeight=Math.max(previousLayoutHeight,oldHeight,toHeight);
      const state={animations:[],toHeight,layoutHeight,timer:null,scrollFrame:null,manualScroll:false};
      detailMotion=state;
      detailStack.style.height=`${layoutHeight}px`;
      detailSurface.style.height=`${toHeight}px`;
      detailStack.classList.add('is-detail-animating');
      rows.forEach((row,index)=>{
        const old=oldRows[index];
        if(old.height>.1||row.targetHeight>.1){
          row.panel.style.opacity='1';
          row.inner.style.opacity='1';
          state.animations.push(row.panel.animate([
            {height:`${old.height}px`},{height:`${row.targetHeight}px`}
          ],options));
        }
        if(old.arrow!==row.arrowTarget){
          state.animations.push(row.arrow.animate([
            {transform:old.arrow},{transform:row.arrowTarget}
          ],{...options,duration:Math.min(200,duration)}));
        }
      });
      // The fixed flow height protects the scroll range until the motion ends.
      const surfaceMotion=detailSurface.animate([
        {height:`${oldHeight}px`},{height:`${toHeight}px`}
      ],options);
      state.animations.push(surfaceMotion);
      const startTime=document.timeline.currentTime;
      state.animations.forEach(animation=>{animation.startTime=startTime;});
      const paintScroll=()=>{
        if(detailMotion!==state||destroyed||signal?.aborted||state.manualScroll)return;
        const progress=surfaceMotion.effect.getComputedTiming().progress??0;
        detailScroll.scrollTop=scrollFrom+(scrollTarget-scrollFrom)*progress;
        if(progress<1)state.scrollFrame=requestAnimationFrame(paintScroll);
      };
      if(Math.abs(scrollTarget-scrollFrom)>.5)state.scrollFrame=requestAnimationFrame(paintScroll);
      const finish=()=>{
        if(!destroyed&&!signal?.aborted&&detailMotion===state){
          if(!state.manualScroll)detailScroll.scrollTop=scrollTarget;
          finishDetailMotion();
        }
      };
      Promise.allSettled(state.animations.map(animation=>animation.finished)).then(finish);
      state.timer=setTimeout(finish,duration+80);
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
        finishDetailMotion();
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
    on(detailScroll,'scroll',releaseScrollReserve,{passive:true});
    on(window,'resize',finishDetailMotion,{passive:true});

    const resetDetails=()=>{
      finishDetailMotion();
      setScrollReserve(0);
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
      $('#headerProgress').textContent=`${current+1} из ${exercises.length}`;
      $('#navStepLabel').textContent=`Упражнение ${current+1} из ${exercises.length}`;
      $('#prevButton').disabled=current===0;
    };

    const destroy=()=>{
      if(destroyed)return;
      destroyed=true;
      finishDetailMotion();
      setScrollReserve(0);
      detailSurface?.remove();
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
