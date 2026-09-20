(() => {
  const SW_URL='/sw.js';
  let registration=null;
  let waitingWorker=null;
  let deferredPrompt=null;
  let refreshRequested=false;
  let banner=null;

  const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;

  const installDoubleTapGuard=()=>{
    let lastTapAt=0;
    let lastX=0;
    let lastY=0;

    document.addEventListener('touchstart',event=>{
      if(event.touches.length>1)lastTapAt=0;
    },{passive:true,capture:true});

    document.addEventListener('touchend',event=>{
      if(event.changedTouches.length!==1){
        lastTapAt=0;
        return;
      }

      const touch=event.changedTouches[0];
      const now=Date.now();
      const elapsed=now-lastTapAt;
      const distance=Math.hypot(touch.clientX-lastX,touch.clientY-lastY);

      if(lastTapAt&&elapsed>0&&elapsed<320&&distance<36){
        event.preventDefault();
        lastTapAt=0;
        return;
      }

      lastTapAt=now;
      lastX=touch.clientX;
      lastY=touch.clientY;
    },{passive:false,capture:true});

    document.addEventListener('dblclick',event=>{
      event.preventDefault();
    },{passive:false,capture:true});
  };

  installDoubleTapGuard();

  const installPressFeedback=()=>{
    const selector='button:not([disabled]),a[href],.routine-card';
    let active=null;
    let releaseTimer=null;
    let pressedAt=0;

    const clear=()=>{
      if(releaseTimer!==null){
        clearTimeout(releaseTimer);
        releaseTimer=null;
      }
      if(active){
        active.classList.remove('is-pressing');
        active=null;
      }
    };

    const press=target=>{
      clear();
      active=target;
      pressedAt=performance.now();
      target.classList.add('is-pressing');
    };

    document.addEventListener('pointerdown',event=>{
      const target=event.target.closest?.(selector);
      if(!target)return;
      press(target);
    },{passive:true,capture:true});

    document.addEventListener('pointerup',()=>{
      if(!active)return;
      const target=active;
      const elapsed=performance.now()-pressedAt;
      const delay=Math.max(0,135-elapsed);
      releaseTimer=setTimeout(()=>{
        target.classList.remove('is-pressing');
        if(active===target)active=null;
        releaseTimer=null;
      },delay);
    },{passive:true,capture:true});

    document.addEventListener('pointercancel',clear,{passive:true,capture:true});
    window.addEventListener('blur',clear);
    window.addEventListener('scroll',clear,{passive:true,capture:true});

    document.addEventListener('keydown',event=>{
      if(event.repeat||!(event.key==='Enter'||event.key===' '))return;
      const target=event.target.closest?.(selector);
      if(target)press(target);
    },true);
    document.addEventListener('keyup',event=>{
      if(event.key==='Enter'||event.key===' ')clear();
    },true);
  };

  installPressFeedback();


  const createBottomSheet=({overlay,sheet,handle,onBeforeClose,onClosed,onOpened}={})=>{
    if(!overlay||!sheet||!handle)return null;

    const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
    const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
    const CLOSED_PAD=48;

    let phase='closed';
    let pointerId=null;
    let startY=0;
    let currentY=0;
    let currentVelocity=0;
    let sheetHeight=0;
    let samples=[];
    let frameId=null;
    let lastFrameAt=0;
    let springStartedAt=0;

    const transformFor=y=>`translate3d(0,${y.toFixed(2)}px,0)`;
    const closedY=()=>Math.ceil((sheetHeight||sheet.getBoundingClientRect().height)+CLOSED_PAD);

    const backdropAlphaFor=y=>{
      const target=closedY();
      const progress=clamp(Math.max(0,y)/Math.max(1,target),0,1);
      return .18*(1-progress);
    };

    const paint=y=>{
      currentY=y;
      sheet.style.transform=transformFor(y);
      overlay.style.backgroundColor=`rgba(23,25,23,${backdropAlphaFor(y).toFixed(3)})`;
    };

    const stopSpring=()=>{
      if(frameId!==null){
        cancelAnimationFrame(frameId);
        frameId=null;
      }
    };

    const clearGesture=()=>{
      pointerId=null;
      samples=[];
      overlay.classList.remove('is-dragging');
      sheet.classList.remove('is-dragging');
    };

    const finishClosed=()=>{
      stopSpring();
      clearGesture();
      overlay.classList.remove('is-visible','is-settling','is-dismissing');
      overlay.setAttribute('aria-hidden','true');
      sheet.style.transform='';
      overlay.style.backgroundColor='';
      currentY=0;
      currentVelocity=0;
      phase='closed';
      onClosed?.();
    };

    const finishOpen=()=>{
      stopSpring();
      clearGesture();
      overlay.classList.remove('is-settling','is-dismissing');
      sheet.style.transform='translate3d(0,0,0)';
      overlay.style.backgroundColor='rgba(23,25,23,.18)';
      currentY=0;
      currentVelocity=0;
      phase='open';
      onOpened?.();
    };

    const runSpring=({
      target,
      velocity=currentVelocity,
      stiffness,
      damping,
      closing=false,
      maxDuration=1100
    })=>{
      stopSpring();

      if(reduceMotion.matches){
        paint(target);
        closing?finishClosed():finishOpen();
        return;
      }

      currentVelocity=velocity;
      lastFrameAt=performance.now();
      springStartedAt=lastFrameAt;

      const step=now=>{
        const dt=clamp((now-lastFrameAt)/1000,.001,.032);
        lastFrameAt=now;

        const displacement=currentY-target;
        const acceleration=-stiffness*displacement-damping*currentVelocity;

        currentVelocity+=acceleration*dt;
        currentY+=currentVelocity*dt;

        if(closing&&currentY>target)currentY=target;
        paint(currentY);

        const settled=Math.abs(currentY-target)<.7&&Math.abs(currentVelocity)<9;
        const timedOut=now-springStartedAt>maxDuration;

        if(settled||timedOut){
          paint(target);
          closing?finishClosed():finishOpen();
          return;
        }

        frameId=requestAnimationFrame(step);
      };

      frameId=requestAnimationFrame(step);
    };

    const open=()=>{
      if(phase==='open'||phase==='opening')return;

      stopSpring();
      clearGesture();
      phase='opening';
      overlay.classList.remove('is-settling','is-dismissing');
      overlay.setAttribute('aria-hidden','false');
      overlay.classList.add('is-visible');

      sheetHeight=sheet.getBoundingClientRect().height;
      currentY=closedY();
      currentVelocity=0;
      paint(currentY);

      requestAnimationFrame(()=>{
        runSpring({
          target:0,
          velocity:0,
          stiffness:185,
          damping:27,
          maxDuration:900
        });
      });
    };

    const close=(velocityPxPerSecond=0)=>{
      if(phase==='closed'||phase==='closing')return;

      onBeforeClose?.();
      stopSpring();
      sheetHeight=sheetHeight||sheet.getBoundingClientRect().height;

      phase='closing';
      clearGesture();
      overlay.classList.add('is-settling','is-dismissing');

      runSpring({
        target:closedY(),
        velocity:Math.max(0,velocityPxPerSecond),
        stiffness:90,
        damping:19,
        closing:true,
        maxDuration:1150
      });
    };

    const snapOpen=(velocityPxPerSecond=0)=>{
      if(phase!=='dragging')return;

      stopSpring();
      phase='settling';
      clearGesture();
      overlay.classList.add('is-settling');

      runSpring({
        target:0,
        velocity:clamp(velocityPxPerSecond*.28,-260,420),
        stiffness:205,
        damping:29,
        maxDuration:850
      });
    };

    const releaseCapture=()=>{
      if(pointerId===null)return;
      try{handle.releasePointerCapture?.(pointerId);}catch{}
    };

    handle.addEventListener('pointerdown',event=>{
      if(phase!=='open'||!overlay.classList.contains('is-visible'))return;
      if(event.pointerType==='mouse'&&event.button!==0)return;

      stopSpring();
      phase='dragging';
      pointerId=event.pointerId;
      startY=event.clientY;
      sheetHeight=sheet.getBoundingClientRect().height;
      currentY=0;
      currentVelocity=0;
      samples=[{y:event.clientY,t:performance.now()}];

      overlay.classList.remove('is-settling','is-dismissing');
      overlay.classList.add('is-dragging');
      sheet.classList.add('is-dragging');
      handle.setPointerCapture?.(pointerId);
    });

    handle.addEventListener('pointermove',event=>{
      if(phase!=='dragging'||event.pointerId!==pointerId)return;
      event.preventDefault();

      const raw=event.clientY-startY;
      const y=raw>=0?raw:-Math.min(10,Math.sqrt(Math.abs(raw))*1.25);
      paint(y);

      const now=performance.now();
      samples.push({y:event.clientY,t:now});
      while(samples.length>2&&now-samples[0].t>100)samples.shift();
    },{passive:false});

    const finishGesture=event=>{
      if(phase!=='dragging'||event.pointerId!==pointerId)return;

      const now=performance.now();
      samples.push({y:event.clientY,t:now});
      const first=samples[0];
      const last=samples[samples.length-1];
      const dt=Math.max(1,last.t-first.t);
      const velocityMs=(last.y-first.y)/dt;
      const velocityPxPerSecond=velocityMs*1000;

      const y=Math.max(0,currentY);
      const distanceThreshold=clamp(sheetHeight*.32,132,210);
      const flickDismiss=y>=72&&velocityPxPerSecond>=950;
      const projected=y+Math.max(0,velocityPxPerSecond)*.11;
      const projectedDismiss=y>=64&&projected>=distanceThreshold*1.14;
      const dismiss=y>=distanceThreshold||flickDismiss||projectedDismiss;

      releaseCapture();

      if(dismiss){
        close(clamp(velocityPxPerSecond,0,1900));
      }else{
        snapOpen(velocityPxPerSecond);
      }
    };

    handle.addEventListener('pointerup',finishGesture);
    handle.addEventListener('pointercancel',event=>{
      if(phase!=='dragging'||event.pointerId!==pointerId)return;
      releaseCapture();
      snapOpen(0);
    });

    return {
      open,
      close:()=>close(0),
      isOpen:()=>phase!=='closed',
      state:()=>phase
    };
  };

  const ensureBanner=()=>{
    if(banner)return banner;
    banner=document.createElement('div');
    banner.className='pwa-banner';
    banner.setAttribute('role','status');
    banner.setAttribute('aria-live','polite');
    banner.innerHTML='<span class="pwa-banner__text"></span><button class="pwa-banner__action" type="button" hidden></button>';
    document.body.appendChild(banner);
    return banner;
  };

  const hideBanner=()=>{
    if(!banner)return;
    banner.classList.remove('is-visible');
    banner.querySelector('.pwa-banner__action').hidden=true;
  };

  const showBanner=(message,actionLabel=null,onAction=null)=>{
    const node=ensureBanner();
    const label=node.querySelector('.pwa-banner__text');
    const action=node.querySelector('.pwa-banner__action');
    label.textContent=message;
    if(actionLabel&&onAction){
      action.hidden=false;
      action.textContent=actionLabel;
      action.onclick=onAction;
    }else{
      action.hidden=true;
      action.onclick=null;
    }
    node.classList.add('is-visible');
  };

  const emitInstallChange=()=>window.dispatchEvent(new CustomEvent('daily-motion-install-change'));

  const showUpdate=worker=>{
    waitingWorker=worker;
    showBanner('Доступна новая версия Daily Motion','Обновить',()=>{
      refreshRequested=true;
      waitingWorker?.postMessage({type:'SKIP_WAITING'});
    });
  };

  const watchRegistration=reg=>{
    registration=reg;
    if(reg.waiting&&navigator.serviceWorker.controller)showUpdate(reg.waiting);
    reg.addEventListener('updatefound',()=>{
      const worker=reg.installing;
      if(!worker)return;
      worker.addEventListener('statechange',()=>{
        if(worker.state==='installed'&&navigator.serviceWorker.controller)showUpdate(worker);
      });
    });
  };

  if('serviceWorker' in navigator){
    window.addEventListener('load',async()=>{
      try{
        const reg=await navigator.serviceWorker.register(SW_URL);
        watchRegistration(reg);
        setTimeout(()=>reg.update().catch(()=>{}),1200);
      }catch{}
    });

    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(refreshRequested)location.reload();
    });
  }

  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    deferredPrompt=event;
    emitInstallChange();
  });

  window.addEventListener('appinstalled',()=>{
    deferredPrompt=null;
    emitInstallChange();
    showBanner('Daily Motion установлен');
    setTimeout(hideBanner,1800);
  });

  window.addEventListener('offline',()=>showBanner('Нет сети — приложение продолжит работать офлайн'));
  window.addEventListener('online',()=>{
    if(!waitingWorker){
      showBanner('Соединение восстановлено');
      setTimeout(hideBanner,1400);
    }
  });

  const install=async()=>{
    if(!deferredPrompt||isStandalone())return {outcome:'unavailable'};
    try{
      deferredPrompt.prompt();
      const choice=await deferredPrompt.userChoice;
      deferredPrompt=null;
      emitInstallChange();
      return choice;
    }catch{
      return {outcome:'unavailable'};
    }
  };

  window.DailyMotionMotion={createBottomSheet};

  window.DailyMotionPWA={
    canInstall:()=>Boolean(deferredPrompt)&&!isStandalone(),
    install,
    isStandalone,
    update:()=>registration?.update?.()
  };
})();
