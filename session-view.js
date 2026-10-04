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

    const finishDetailMotion=()=>{
      const state=detailMotion;
      if(!state)return;
      detailMotion=null;
      clearTimeout(state.timer);
      state.animations.forEach(animation=>animation.cancel());
      state.dividers.forEach(node=>node.remove());
      state.skin?.remove();
      detailStack.classList.remove('is-detail-animating');
      detailStack.style.removeProperty('height');
      detailCards.forEach(card=>{
        for(const property of ['position','top','left','width','height','transform','clip-path','will-change','z-index']){
          card.style.removeProperty(property);
        }
        setDetailState(card,card.classList.contains('is-open'));
      });
    };

    const revealDetailCard=(card,preview=true)=>{
      if(!detailScroll||!card)return;
      const scrollBox=detailScroll.getBoundingClientRect();
      const cardBox=card.getBoundingClientRect();
      const top=scrollBox.top+12;
      const bottom=scrollBox.bottom-16;
      const headerHeight=card.querySelector('.detail-card__heading').getBoundingClientRect().height;
      // Reveal the heading and a useful start of the instructions, not the
      // whole panel. Long instructions remain under the user's scroll control.
      const visibleBottom=Math.min(cardBox.bottom,cardBox.top+headerHeight+(preview?112:0));
      let delta=0;
      if(cardBox.top<top)delta=cardBox.top-top;
      else if(visibleBottom>bottom)delta=Math.min(visibleBottom-bottom,cardBox.top-top);
      // Set the final scroll once. A shell transform compensates this change
      // during the motion; no JavaScript scroll loop runs on every frame.
      if(Math.abs(delta)>1)detailScroll.scrollTop+=delta;
    };

    const createDetailSkin=(appearance,fromHeight,toHeight,state,options)=>{
      const skin=document.createElement('div');
      skin.className='dm-detail-skin';
      skin.setAttribute('aria-hidden','true');
      Object.assign(skin.style,{
        top:`-${appearance.topWidth}px`,
        left:`-${appearance.leftWidth}px`,
        width:`calc(100% + ${appearance.leftWidth+appearance.rightWidth}px)`,
        height:`${toHeight}px`
      });
      const cap=Math.max(1,...appearance.radii);
      const top=document.createElement('div');
      const middle=document.createElement('div');
      const bottom=document.createElement('div');
      for(const node of [top,middle,bottom]){
        Object.assign(node.style,{
          position:'absolute',left:'0',width:'100%',boxSizing:'border-box',
          background:appearance.background,borderLeft:appearance.left,borderRight:appearance.right
        });
      }
      Object.assign(top.style,{
        top:'0',height:`${cap}px`,borderTop:appearance.top,
        borderRadius:`${appearance.radii[0]}px ${appearance.radii[1]}px 0 0`
      });
      Object.assign(middle.style,{
        top:`${cap}px`,height:`${toHeight-2*cap}px`,transformOrigin:'top'
      });
      Object.assign(bottom.style,{
        top:`${toHeight-cap}px`,height:`${cap}px`,borderBottom:appearance.bottom,
        borderRadius:`0 0 ${appearance.radii[2]}px ${appearance.radii[3]}px`
      });
      skin.append(top,middle,bottom);
      detailStack.prepend(skin);
      state.skin=skin;
      state.bottomCap=bottom;
      // Keep the 1px border and corner radii constant: only the middle fill
      // scales, and the rounded bottom cap moves without being resized.
      state.animations.push(
        middle.animate([
          {transform:`scaleY(${(fromHeight-2*cap)/(toHeight-2*cap)})`},
          {transform:'scaleY(1)'}
        ],options),
        bottom.animate([
          {transform:`translateY(${fromHeight-toHeight}px)`},
          {transform:'translateY(0)'}
        ],options)
      );
    };

    const animateDetails=(selected,willOpen)=>{
      const oldStackBox=detailStack.getBoundingClientRect();
      const oldStackHeight=detailMotion
        ?detailMotion.bottomCap.getBoundingClientRect().bottom-oldStackBox.top
        :oldStackBox.height;
      const oldShellTop=detailShell.getBoundingClientRect().top;
      const oldRows=detailCards.map(card=>{
        const box=card.getBoundingClientRect();
        const inset=getComputedStyle(card).clipPath.match(/^inset\(([^)]+)\)/);
        const values=inset?inset[1].split(' round ')[0].trim().split(/\s+/):[];
        const clipped=values.length>2?parseFloat(values[2])||0:0;
        return {
          top:box.top,height:Math.max(0,box.height-clipped)
        };
      });
      const style=getComputedStyle(detailStack);
      const appearance=detailMotion?.appearance||{
        background:style.backgroundColor,
        top:style.borderTop,bottom:style.borderBottom,left:style.borderLeft,right:style.borderRight,
        topWidth:parseFloat(style.borderTopWidth)||0,
        leftWidth:parseFloat(style.borderLeftWidth)||0,
        rightWidth:parseFloat(style.borderRightWidth)||0,
        radii:[style.borderTopLeftRadius,style.borderTopRightRadius,style.borderBottomRightRadius,style.borderBottomLeftRadius].map(value=>parseFloat(value)||0)
      };

      // Commit the final layout once, then animate its already laid-out rows.
      // This also gives the correct final scroll range before compensating it.
      finishDetailMotion();
      setDetailState(selected,willOpen);
      if(reducedMotion()||typeof detailStack.animate!=='function')return;

      const stackBox=detailStack.getBoundingClientRect();
      const shellDelta=oldShellTop-detailShell.getBoundingClientRect().top;
      const rows=detailCards.map(card=>{
        const panel=card.querySelector('.detail-card__panel');
        const inner=card.querySelector('.detail-card__inner');
        const box=card.getBoundingClientRect();
        const cardStyle=getComputedStyle(card);
        return {
          card,panel,inner,box,
          headerHeight:card.querySelector('.detail-card__heading').getBoundingClientRect().height,
          contentHeight:inner.getBoundingClientRect().height,
          borderWidth:parseFloat(cardStyle.borderBottomWidth)||0,
          borderColor:cardStyle.borderBottomColor,
          open:card.classList.contains('is-open')
        };
      });
      const options={duration:detailDuration,easing:detailEase,fill:'both'};
      const state={animations:[],dividers:[],skin:null,bottomCap:null,timer:null,appearance};
      detailMotion=state;
      detailStack.classList.add('is-detail-animating');
      detailStack.style.height=`${Math.max(oldStackHeight,stackBox.height)}px`;
      createDetailSkin(appearance,oldStackHeight,stackBox.height,state,options);

      rows.forEach((row,index)=>{
        const old=oldRows[index];
        const wasVisible=old.height>row.headerHeight+row.borderWidth+.5;
        const expanded=row.open||wasVisible;
        const height=Math.max(old.height,row.box.height,expanded?row.headerHeight+row.contentHeight+row.borderWidth:0);
        Object.assign(row.card.style,{
          position:'absolute',left:'0',
          top:`${row.box.top-stackBox.top-appearance.topWidth}px`,
          width:`${row.box.width}px`,height:`${height}px`,zIndex:String(index+1)
        });
        row.panel.style.height=expanded?`${row.contentHeight}px`:'0px';
        row.panel.style.opacity=expanded?'1':'0';
        // Keep the text fixed within its row. Only the row boundary reveals
        // or conceals it, so content does not slide against the disclosure.
        row.inner.style.opacity=expanded?'1':'0';
        row.inner.style.transform='none';
        const radii=[
          index===0?Math.max(0,appearance.radii[0]-appearance.leftWidth):0,
          index===0?Math.max(0,appearance.radii[1]-appearance.rightWidth):0,
          index===rows.length-1?Math.max(0,appearance.radii[2]-appearance.rightWidth):0,
          index===rows.length-1?Math.max(0,appearance.radii[3]-appearance.leftWidth):0
        ].map(value=>`${value}px`).join(' ');
        const clip=visible=>`inset(0px 0px ${Math.max(0,height-visible)}px 0px round ${radii})`;
        const resizing=Math.abs(old.height-row.box.height)>.1;
        row.card.style.willChange=resizing?'transform,clip-path':'transform';
        row.card.style.clipPath=clip(row.box.height);
        state.animations.push(row.card.animate([
          {transform:`translateY(${old.top-row.box.top-shellDelta}px)`,...(resizing?{clipPath:clip(old.height)}:{})},
          {transform:'translateY(0)',...(resizing?{clipPath:clip(row.box.height)}:{})}
        ],options));
        if(row.borderWidth){
          // Draw boundaries in the stack, not inside moving/clipped rows.
          // A single translation avoids combining two independent transforms.
          const fromY=old.top+old.height-stackBox.top-appearance.topWidth-shellDelta-row.borderWidth;
          const toY=row.box.bottom-stackBox.top-appearance.topWidth-row.borderWidth;
          const divider=document.createElement('div');
          divider.className='dm-detail-divider';
          divider.setAttribute('aria-hidden','true');
          Object.assign(divider.style,{
            height:`${row.borderWidth}px`,background:row.borderColor,
            transform:`translateY(${toY}px)`
          });
          detailStack.append(divider);
          state.dividers.push(divider);
          if(Math.abs(fromY-toY)>.1)state.animations.push(divider.animate([
            {transform:`translateY(${fromY}px)`},
            {transform:`translateY(${toY}px)`}
          ],options));
        }
      });
      if(Math.abs(shellDelta)>.1){
        state.animations.push(detailShell.animate([
          {transform:`translateY(${shellDelta}px)`},
          {transform:'translateY(0)'}
        ],options));
      }

      // All boundaries, rows and scroll compensation share the same clock.
      const startTime=document.timeline.currentTime;
      state.animations.forEach(animation=>{animation.startTime=startTime;});

      const finish=()=>{
        if(!destroyed&&!signal?.aborted&&detailMotion===state)finishDetailMotion();
      };
      Promise.allSettled(state.animations.map(animation=>animation.finished)).then(finish);
      state.timer=setTimeout(finish,detailDuration+70);
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
        revealDetailCard(detailCards[next],false);
      });
      on(card.querySelector('.detail-card__toggle'),'click',()=>{
        if(destroyed||signal?.aborted||!detailStack||!detailShell)return;
        animateDetails(card,!card.classList.contains('is-open'));
        haptic?.('tap');
      });
    });
    on(detailScroll,'wheel',finishDetailMotion,{passive:true});
    on(detailScroll,'touchmove',finishDetailMotion,{passive:true});
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
