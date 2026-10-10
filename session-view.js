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
    const detailStyle=getComputedStyle(detailStack);
    const detailDuration=parseFloat(detailStyle.getPropertyValue('--detail-duration'))||420;
    const detailEase=detailStyle.getPropertyValue('--detail-ease').trim()||'cubic-bezier(.25,.1,.25,1)';
    const detailSurface=document.createElement('div');
    detailSurface.className='detail-motion-surface';
    detailSurface.setAttribute('aria-hidden','true');
    const surfaceParts=['top','fill','bottom'].map(part=>{
      const node=document.createElement('span');
      node.className=`detail-motion-surface__${part}`;
      detailSurface.append(node);
      return node;
    });
    const [,surfaceFill,surfaceBottom]=surfaceParts;
    detailStack.prepend(detailSurface);
    let exerciseAnimation=null;
    let destroyed=false;
    const on=(node,type,handler,options={})=>{
      if(!node)return;
      node.addEventListener(type,handler,signal?{...options,signal}:options);
    };

    let visualState=null;
    const clearVisual=()=>{
      if(!visualState)return;
      visualState.controller.abort();
      visualState=null;
    };

    const renderVisual=exercise=>{
      clearVisual();
      if(destroyed||signal?.aborted)return;
      const box=$('#exerciseVisual');
      if(!box)return;
      const phases=exercise.visual?.phases;
      const hasPhases=Array.isArray(phases)&&phases.length>0;
      box.hidden=!hasPhases;
      box.classList.remove('has-visuals','visual-placeholder');
      box.innerHTML='';
      if(!hasPhases)return;
      box.classList.add('has-visuals');
      const rail=document.createElement('div');
      rail.className='visual-phases';
      rail.tabIndex=0;
      rail.setAttribute('role','group');
      rail.setAttribute('aria-label',`Этапы упражнения: ${phases.length}`);
      rail.setAttribute('aria-describedby','exerciseVisualCaption');
      const caption=document.createElement('p');
      caption.className='visual-caption';
      caption.id='exerciseVisualCaption';
      caption.setAttribute('aria-live','polite');
      caption.setAttribute('aria-atomic','true');
      const title=document.createElement('strong');
      const label=document.createElement('span');
      caption.append(title,label);
      const controls=document.createElement('div');
      controls.className='visual-stage-controls';
      controls.setAttribute('role','group');
      controls.setAttribute('aria-label','Выбор этапа упражнения');
      const frames=[];
      const buttons=[];
      phases.forEach((phase,index)=>{
        const figure=document.createElement('figure');
        figure.className='visual-phase';
        figure.setAttribute('aria-label',`Этап ${index+1} из ${phases.length}`);
        const img=document.createElement('img');
        img.src=phase.src;
        img.alt=phase.alt;
        img.width=1200;
        img.height=750;
        img.decoding='async';
        figure.append(img);
        rail.append(figure);
        frames.push(figure);
        const button=document.createElement('button');
        button.type='button';
        button.className='visual-stage-button';
        button.textContent=String(index+1);
        button.setAttribute('aria-label',`Этап ${index+1} из ${phases.length}: ${phase.title||phase.breath||''}${phase.label?`, ${phase.label}`:''}`);
        button.setAttribute('aria-controls','exerciseVisualCaption');
        controls.append(button);
        buttons.push(button);
      });
      box.append(rail,caption,controls);
      const state={controller:new AbortController(),index:-1,width:rail.clientWidth};
      visualState=state;
      const active=()=>!destroyed&&!signal?.aborted&&!state.controller.signal.aborted&&visualState===state;
      const listen=(node,type,handler,options={})=>node.addEventListener(type,handler,{...options,signal:state.controller.signal});
      const setPhase=index=>{
        if(!active())return;
        index=Math.max(0,Math.min(phases.length-1,index));
        if(state.index===index)return;
        state.index=index;
        const phase=phases[index];
        title.textContent=phase.title||phase.breath||'';
        label.textContent=phase.label?` · ${phase.label}`:'';
        buttons.forEach((button,i)=>{
          button.classList.toggle('is-current',i===index);
          if(i===index)button.setAttribute('aria-current','step');
          else button.removeAttribute('aria-current');
          frames[i].setAttribute('aria-hidden',String(i!==index));
        });
      };
      const selectPhase=index=>{
        if(!active())return;
        index=Math.max(0,Math.min(phases.length-1,index));
        // Number buttons select a still image without traversing intermediate stages.
        rail.scrollTo({left:frames[index].offsetLeft-frames[0].offsetLeft,behavior:'instant'});
        setPhase(index);
      };
      const syncVisiblePhase=()=>{
        if(!active()||rail.clientWidth<=0)return;
        const origin=frames[0].offsetLeft;
        let nearest=0;
        let distance=Infinity;
        frames.forEach((frame,index)=>{
          const delta=Math.abs(frame.offsetLeft-origin-rail.scrollLeft);
          if(delta<distance){distance=delta;nearest=index;}
        });
        // Commit only a discrete stage change; native scrolling owns all motion.
        setPhase(nearest);
      };
      buttons.forEach((button,index)=>listen(button,'click',()=>selectPhase(index)));
      listen(rail,'keydown',event=>{
        const targets={ArrowLeft:state.index-1,ArrowRight:state.index+1,Home:0,End:phases.length-1};
        if(!(event.key in targets)||event.altKey||event.ctrlKey||event.metaKey)return;
        event.preventDefault();
        selectPhase(targets[event.key]);
      });
      listen(rail,'scroll',syncVisiblePhase,{passive:true});
      listen(rail,'scrollend',syncVisiblePhase,{passive:true});
      listen(window,'resize',()=>{
        if(!active()||rail.clientWidth<=0||rail.clientWidth===state.width)return;
        state.width=rail.clientWidth;
        selectPhase(state.index);
      },{passive:true});
      setPhase(0);
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

    const clearDetailLayout=()=>{
      detailStack.classList.remove('is-detail-animating');
      detailCards.forEach(card=>{
        for(const property of ['position','top','left','width','height','transform','will-change','z-index'])card.style.removeProperty(property);
        for(const node of [card.querySelector('.detail-card__panel'),card.querySelector('.detail-card__content')]){
          for(const property of ['height','transform','will-change'])node.style.removeProperty(property);
        }
      });
    };

    const cancelDetailMotion=()=>{
      const state=detailMotion;
      detailMotion=null;
      if(!state)return;
      clearTimeout(state.timer);
      state.animations.forEach(animation=>animation.cancel());
    };

    const finishDetailMotion=()=>{
      const state=detailMotion;
      if(!state)return;
      // Commit the natural layout without clamping a native scroll or gesture.
      const naturalMax=Math.max(0,detailScroll.scrollHeight-detailScroll.clientHeight-scrollReserve-state.layoutHeight+state.toHeight);
      setScrollReserve(Math.max(0,detailScroll.scrollTop-naturalMax));
      cancelDetailMotion();
      clearDetailLayout();
      detailStack.style.removeProperty('height');
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

    const translateY=node=>{
      const transform=getComputedStyle(node).transform;
      return !transform||transform==='none'?0:new DOMMatrixReadOnly(transform).m42;
    };
    const moveY=value=>`translate3d(0,${value}px,0)`;

    const animateDetails=(selected,willOpen)=>{
      clearTimeout(reserveTimer);
      stopDetailAutoScroll();
      const from=detailScroll.scrollTop;
      const before=detailStack.getBoundingClientRect();
      const oldHeight=detailMotion?surfaceBottom.getBoundingClientRect().bottom-before.top:before.height;
      // All layout reads happen on the tap, never on an animation frame.
      const oldRows=detailCards.map(card=>{
        const panel=card.querySelector('.detail-card__panel');
        const box=card.getBoundingClientRect();
        const panelHeight=panel.getBoundingClientRect().height;
        const visible=Math.max(0,Math.min(panelHeight,panelHeight+translateY(panel)));
        return {top:box.top-before.top-1,visible,
          opacity:Number(getComputedStyle(card.querySelector('.detail-card__content')).opacity),
          arrow:getComputedStyle(card.querySelector('.detail-toggle-icon')).transform};
      });
      detailStack.style.height=`${before.height}px`;
      cancelDetailMotion();
      clearDetailLayout();
      detailStack.classList.add('is-detail-animating');
      detailCards.forEach(card=>setDetailState(card,card===selected&&willOpen));
      const stackBox=detailStack.getBoundingClientRect();
      const rows=detailCards.map(card=>{
        const panel=card.querySelector('.detail-card__panel');
        const content=card.querySelector('.detail-card__content');
        const inner=card.querySelector('.detail-card__inner');
        const box=card.getBoundingClientRect();
        return {card,panel,content,box,
          top:box.top-stackBox.top-1,
          contentHeight:inner.getBoundingClientRect().height,
          target:panel.getBoundingClientRect().height,
          arrow:card.querySelector('.detail-toggle-icon')};
      });
      const toHeight=rows.reduce((sum,row)=>sum+row.box.height,2);
      const index=detailCards.indexOf(selected);
      const view=detailScroll.getBoundingClientRect();
      const finalMax=Math.max(0,detailScroll.scrollHeight-detailScroll.clientHeight-scrollReserve-before.height+toHeight);
      let target=Math.min(from,finalMax);
      if(willOpen){
        const top=rows[index].box.top-view.top+from;
        const next=rows[index+1];
        const extra=next?next.box.height-next.target+8:0;
        const bottom=top+rows[index].box.height+extra;
        if(bottom-top>detailScroll.clientHeight-28||top<from+12)target=top-12;
        else if(bottom>from+detailScroll.clientHeight-16)target=bottom-detailScroll.clientHeight+16;
        target=Math.max(0,Math.min(target,finalMax));
      }
      if(reducedMotion()||typeof detailStack.animate!=='function'){
        clearDetailLayout();
        detailStack.style.removeProperty('height');
        setScrollReserve(0);
        detailScroll.scrollTo({top:target,behavior:'instant'});
        return;
      }
      const travel=Math.max(...rows.map((row,i)=>Math.abs(oldRows[i].visible-row.target)/Math.max(1,row.contentHeight)));
      // Short reversals keep a soft pace instead of snapping through 90 ms.
      const duration=detailDuration*Math.max(.6,Math.sqrt(Math.min(1,travel)));
      const options={duration,easing:detailEase,fill:'both'};
      const layoutHeight=Math.max(before.height,oldHeight,toHeight);
      const state={animations:[],layoutHeight,toHeight,timer:null};
      detailMotion=state;
      detailStack.style.height=`${layoutHeight}px`;
      const animate=(node,first,last)=>{
        state.animations.push(node.animate([first,last],options));
      };
      rows.forEach((row,i)=>{
        const old=oldRows[i];
        const header=row.box.height-row.target;
        const contentHeight=Math.max(row.contentHeight,old.visible);
        Object.assign(row.card.style,{position:'absolute',left:'0',top:`${row.top}px`,
          width:`${row.box.width}px`,height:`${header+contentHeight}px`,zIndex:String(i+1)});
        if(Math.abs(old.top-row.top)>.1){
          row.card.style.willChange='transform';
          animate(row.card,{transform:moveY(old.top-row.top)},{transform:moveY(0)});
        }
        if(old.visible>.1||row.target>.1){
          row.panel.style.height=`${contentHeight}px`;
          row.panel.style.willChange='transform';
          row.content.style.willChange='transform, opacity';
          // A fixed clipping window moves; its contents move by the exact
          // opposite amount. Text keeps its size and position inside the row.
          animate(row.panel,{transform:moveY(old.visible-contentHeight)},{transform:moveY(row.target-contentHeight)});
          animate(row.content,
            {transform:moveY(contentHeight-old.visible),opacity:old.opacity},
            {transform:moveY(contentHeight-row.target),opacity:row.target>.1?1:0});
        }
        const end=row.card.classList.contains('is-open')?'rotate(180deg)':'rotate(0deg)';
        animate(row.arrow,{transform:old.arrow},{transform:end});
      });
      // Only the empty background stretches. Separate caps retain their radius.
      const fillHeight=Math.max(1,layoutHeight-30);
      surfaceFill.style.height=`${fillHeight}px`;
      animate(surfaceFill,{transform:`scaleY(${Math.max(0,oldHeight-30)/fillHeight})`},{transform:`scaleY(${Math.max(0,toHeight-30)/fillHeight})`});
      animate(surfaceBottom,{transform:moveY(oldHeight-16)},{transform:moveY(toHeight-16)});
      const startTime=document.timeline.currentTime;
      state.animations.forEach(animation=>{animation.startTime=startTime;});
      detailAutoScrolling=Math.abs(target-from)>.5;
      detailScroll.scrollTo({top:target,behavior:'smooth'});
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
      cancelDetailMotion();
      clearDetailLayout();
      detailStack.style.removeProperty('height');
      clearTimeout(reserveTimer);
      stopDetailAutoScroll();
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
        paintNextButton('На главную');
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
      clearVisual();
      finishDetailMotion();
      setScrollReserve(0);
      clearTimeout(reserveTimer);
      stopDetailAutoScroll();
      detailSurface.remove();
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
