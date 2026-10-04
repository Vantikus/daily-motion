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
      state.animations.forEach(animation=>animation.cancel());
    };

    const finishDetailMotion=()=>{
      if(!detailMotion)return;
      // The animation already reaches the natural height. Cleanup must not
      // shorten the scroll range again or move the page at the last frame.
      detailStack.style.height=`${detailMotion.toHeight}px`;
      cancelDetailAnimations();
      clearDetailLayout();
      detailStack.style.removeProperty('height');
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
      // Read the currently displayed geometry before cancelling anything.
      // A second tap reverses from here, without first settling the old target.
      const oldHeight=detailStack.getBoundingClientRect().height;
      const oldRows=detailCards.map(card=>{
        const box=card.getBoundingClientRect();
        const style=getComputedStyle(card);
        const inset=style.clipPath.match(/^inset\(([^)]+)\)/);
        const values=inset?inset[1].trim().split(/\s+/):[];
        const clipped=values.length>2?parseFloat(values[2])||0:0;
        return {top:box.top,height:Math.max(0,box.height-clipped),
          arrow:getComputedStyle(card.querySelector('.detail-toggle-icon')).transform};
      });
      // Keep the current scroll range while measuring the next natural layout.
      detailStack.style.height=`${oldHeight}px`;
      cancelDetailAnimations();
      clearDetailLayout();
      setDetailState(selected,willOpen);
      const stackBox=detailStack.getBoundingClientRect();
      const stackStyle=getComputedStyle(detailStack);
      const borderTop=parseFloat(stackStyle.borderTopWidth)||0;
      const borderBottom=parseFloat(stackStyle.borderBottomWidth)||0;
      const rows=detailCards.map(card=>{
        const panel=card.querySelector('.detail-card__panel');
        const inner=card.querySelector('.detail-card__inner');
        const arrow=card.querySelector('.detail-toggle-icon');
        const box=card.getBoundingClientRect();
        return {card,panel,inner,arrow,box,
          contentHeight:inner.getBoundingClientRect().height,
          open:card.classList.contains('is-open'),
          arrowTarget:getComputedStyle(arrow).transform};
      });
      const toHeight=rows.reduce((sum,row)=>sum+row.box.height,borderTop+borderBottom);
      if(reducedMotion()||typeof detailStack.animate!=='function'){
        detailStack.style.removeProperty('height');
        return;
      }

      const selectedIndex=detailCards.indexOf(selected);
      const distance=Math.abs(oldRows[selectedIndex].height-rows[selectedIndex].box.height);
      const duration=Math.max(90,detailDuration*Math.min(1,distance/Math.max(1,rows[selectedIndex].contentHeight)));
      const options={duration,easing:detailEase,fill:'both'};
      const state={animations:[],toHeight,timer:null};
      detailMotion=state;
      detailStack.classList.add('is-detail-animating');
      rows.forEach((row,index)=>{
        const old=oldRows[index];
        const expanding=row.open||old.height>row.box.height+.5;
        const height=Math.max(old.height,row.box.height);
        Object.assign(row.card.style,{
          position:'absolute',left:'0',
          top:`${row.box.top-stackBox.top-borderTop}px`,
          width:`${row.box.width}px`,height:`${height}px`,zIndex:String(index+1)
        });
        row.panel.style.height=expanding?`${row.contentHeight}px`:'0px';
        row.panel.style.opacity=expanding?'1':'0';
        row.inner.style.opacity=expanding?'1':'0';
        const delta=old.top-row.box.top;
        const resizing=Math.abs(old.height-row.box.height)>.1;
        const clip=visible=>`inset(0px 0px ${Math.max(0,height-visible)}px 0px)`;
        if(resizing||Math.abs(delta)>.1){
          row.card.style.willChange=resizing?'transform,clip-path':'transform';
          state.animations.push(row.card.animate([
            {transform:`translateY(${delta}px)`,...(resizing?{clipPath:clip(old.height)}:{})},
            {transform:'translateY(0)',...(resizing?{clipPath:clip(row.box.height)}:{})}
          ],options));
        }
        if(old.arrow!==row.arrowTarget){
          state.animations.push(row.arrow.animate([
            {transform:old.arrow},{transform:row.arrowTarget}
          ],options));
        }
      });
      // Only the empty shell changes height; its text is laid out once and
      // its rows move independently. Native scrolling remains free throughout.
      state.animations.push(detailStack.animate([
        {height:`${oldHeight}px`},{height:`${toHeight}px`}
      ],options));
      const startTime=document.timeline.currentTime;
      state.animations.forEach(animation=>{animation.startTime=startTime;});
      const finish=()=>{
        if(!destroyed&&!signal?.aborted&&detailMotion===state)finishDetailMotion();
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
    on(window,'resize',finishDetailMotion,{passive:true});

    const resetDetails=()=>{
      finishDetailMotion();
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
