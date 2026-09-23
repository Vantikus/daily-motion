(() => {
  const SW_URL='/sw.js';
  const UPDATE_CHECK_INTERVAL=60_000;
  let registration=null;
  let waitingWorker=null;
  let deferredPrompt=null;
  let refreshRequested=false;
  let updateCheckTimer=null;
  let updateCheckInFlight=false;
  let banner=null;
  const SHEET_MOTION=Object.freeze({
    openDuration:.38,
    closeDuration:.30,
    closeGestureMin:.18,
    closeGestureMax:.32,
    snapFastDuration:.22,
    snapDuration:.55,
    dismissRatio:.28,
    dismissMin:110,
    dismissMax:190,
    flingMinY:52,
    flingVelocity:700,
    flingProjection:.12,
    openEase:'power3.out',
    closeEase:'power2.inOut',
    snapEase:'power2.out'
  });

  const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
  const isIOS=()=>{
    const ua=navigator.userAgent||'';
    return /iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  };
  const getInstallMode=()=>{
    if(isStandalone())return 'unavailable';
    if(deferredPrompt)return 'prompt';
    if(isIOS())return 'ios-manual';
    return 'unavailable';
  };

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
    const selector='button:not([disabled]),a[href],summary';
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
      if(event.pointerType==='mouse'&&event.button!==0)return;
      const target=event.target.closest?.(selector);
      if(!target)return;
      press(target);
    },{passive:true,capture:true});

    const release=()=>{
      if(!active)return;
      const target=active;
      const elapsed=performance.now()-pressedAt;
      const delay=Math.max(0,135-elapsed);
      releaseTimer=setTimeout(()=>{
        target.classList.remove('is-pressing');
        if(active===target)active=null;
        releaseTimer=null;
      },delay);
    };
    document.addEventListener('pointerup',release,{passive:true,capture:true});

    document.addEventListener('pointercancel',clear,{passive:true,capture:true});
    window.addEventListener('blur',clear);
    window.addEventListener('scroll',clear,{passive:true,capture:true});

    document.addEventListener('keydown',event=>{
      if(event.repeat||!(event.key==='Enter'||event.key===' '))return;
      const target=event.target.closest?.(selector);
      if(target)press(target);
    },true);
    document.addEventListener('keyup',event=>{
      if(event.key==='Enter'||event.key===' ')release();
    },true);
  };

  installPressFeedback();


  const createBottomSheet=({overlay,sheet,handle,onBeforeClose,onClosed,onOpened,lockPage=false}={})=>{
    const gsap=window.gsap;
    if(!overlay||!sheet||!handle||!gsap)return null;

    const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktopModal=window.matchMedia('(min-width:700px)');
    const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
    let phase='closed';
    let pointerId=null;
    let startY=0;
    let dragOrigin=0;
    let currentY=0;
    let sheetHeight=0;
    let travel=0;
    let samples=[];
    let motion=null;
    let pageLock=null;
    let desktopCloseTimer=null;
    const isDesktop=()=>desktopModal.matches;

    const measure=()=>{
      const rect=sheet.getBoundingClientRect();
      sheetHeight=rect.height;
      travel=Math.max(sheetHeight+44,window.innerHeight-(rect.top-currentY)+44);
    };
    const lockScroll=()=>{
      if(!lockPage||pageLock)return;
      const style=document.body.style;
      pageLock={x:window.scrollX,y:window.scrollY,styles:{}};
      ['position','top','left','width'].forEach(key=>{pageLock.styles[key]=style[key];});
      Object.assign(style,{position:'fixed',top:`-${pageLock.y}px`,left:`-${pageLock.x}px`,width:'100%'});
    };
    const unlockScroll=()=>{
      if(!pageLock)return;
      const saved=pageLock;
      pageLock=null;
      Object.assign(document.body.style,saved.styles);
      window.scrollTo({left:saved.x,top:saved.y,behavior:'instant'});
    };
    const kill=()=>{
      motion?.kill();
      motion=null;
    };
    const paint=y=>{
      currentY=y;
      gsap.set(sheet,{y,force3D:true});
      const progress=clamp(Math.max(0,y)/Math.max(1,travel),0,1);
      gsap.set(overlay,{backgroundColor:`rgba(23,25,23,${.18*(1-progress)})`});
    };
    const clearGesture=()=>{
      const id=pointerId;
      pointerId=null;
      if(id!==null){try{handle.releasePointerCapture?.(id);}catch{}}
      samples=[];
      overlay.classList.remove('is-dragging');
      sheet.classList.remove('is-dragging');
    };
    const finishClosed=()=>{
      motion=null;
      if(desktopCloseTimer!==null){
        clearTimeout(desktopCloseTimer);
        desktopCloseTimer=null;
      }
      clearGesture();
      overlay.classList.remove('is-visible','is-moving','is-settling','is-dismissing','is-desktop-modal');
      overlay.setAttribute('aria-hidden','true');
      gsap.set(sheet,{clearProps:'transform'});
      gsap.set(overlay,{clearProps:'backgroundColor'});
      currentY=0;
      phase='closed';
      unlockScroll();
      onClosed?.();
    };
    const finishOpen=()=>{
      motion=null;
      clearGesture();
      overlay.classList.remove('is-moving','is-settling','is-dismissing');
      if(!isDesktop())paint(0);
      phase='open';
      onOpened?.();
    };
    const moveTo=(target,duration,ease,done)=>{
      kill();
      if(reduceMotion.matches){paint(target);done();return;}
      const position={y:currentY};
      motion=gsap.to(position,{y:target,duration,ease,onUpdate:()=>paint(position.y),onComplete:done});
    };
    const open=()=>{
      if(phase==='open'||phase==='opening')return;
      const wasClosed=phase==='closed';
      kill();
      clearGesture();
      phase='opening';
      lockScroll();
      overlay.setAttribute('aria-hidden','false');
      overlay.classList.remove('is-settling','is-dismissing');

      if(isDesktop()){
        gsap.set(sheet,{clearProps:'transform'});
        gsap.set(overlay,{clearProps:'backgroundColor'});
        overlay.classList.add('is-desktop-modal','is-visible');
        requestAnimationFrame(()=>{
          if(phase==='opening')finishOpen();
        });
        return;
      }

      overlay.classList.add('is-visible','is-moving');
      if(wasClosed){paint(0);measure();paint(travel);}
      moveTo(0,SHEET_MOTION.openDuration,SHEET_MOTION.openEase,finishOpen);
    };
    const close=(velocity=0,fromGesture=false)=>{
      if(phase==='closed'||phase==='closing')return;
      onBeforeClose?.();
      kill();
      phase='closing';
      clearGesture();

      if(isDesktop()){
        overlay.classList.remove('is-visible');
        if(reduceMotion.matches){
          finishClosed();
        }else{
          desktopCloseTimer=setTimeout(finishClosed,220);
        }
        return;
      }

      measure();
      overlay.classList.add('is-moving','is-settling','is-dismissing');
      const remaining=Math.max(1,travel-currentY);
      const duration=fromGesture?clamp(remaining/Math.max(1000,velocity),SHEET_MOTION.closeGestureMin,SHEET_MOTION.closeGestureMax):SHEET_MOTION.closeDuration;
      // Cubic Hermite: match release velocity, settle at rest, no overshoot.
      const slope=clamp(velocity*duration/remaining,0,3);
      const ease=fromGesture?t=>(slope-2)*t*t*t+(3-2*slope)*t*t+slope*t:SHEET_MOTION.closeEase;
      moveTo(travel,duration,ease,finishClosed);
    };
    const snapOpen=velocity=>{
      if(phase!=='dragging')return;
      kill();
      phase='settling';
      clearGesture();
      overlay.classList.add('is-moving','is-settling');
      if(reduceMotion.matches){finishOpen();return;}
      if(currentY<=0){moveTo(0,SHEET_MOTION.snapFastDuration,SHEET_MOTION.snapEase,finishOpen);return;}
      // Critically damped return: retain gesture momentum, never bounce past zero.
      const origin=currentY;
      const omega=20;
      const speed=clamp(velocity,-omega*origin,1600);
      const clock={t:0};
      motion=gsap.to(clock,{t:SHEET_MOTION.snapDuration,duration:SHEET_MOTION.snapDuration,ease:'none',
        onUpdate:()=>paint((origin+(speed+omega*origin)*clock.t)*Math.exp(-omega*clock.t)),
        onComplete:finishOpen
      });
    };
    handle.addEventListener('pointerdown',event=>{
      if(isDesktop()||phase==='closed'||phase==='closing'||pointerId!==null)return;
      if(event.pointerType==='mouse'&&event.button!==0)return;
      kill();
      measure();
      phase='dragging';
      pointerId=event.pointerId;
      startY=event.clientY;
      dragOrigin=currentY;
      samples=[{y:event.clientY,t:performance.now()}];
      overlay.classList.remove('is-moving','is-settling','is-dismissing');
      overlay.classList.add('is-dragging');
      sheet.classList.add('is-dragging');
      try{handle.setPointerCapture?.(pointerId);}catch{}
    });
    handle.addEventListener('pointermove',event=>{
      if(phase!=='dragging'||event.pointerId!==pointerId)return;
      event.preventDefault();
      const raw=dragOrigin+event.clientY-startY;
      paint(raw>=0?raw:-Math.min(9,Math.sqrt(-raw)));
      const now=performance.now();
      samples.push({y:event.clientY,t:now});
      while(samples.length>2&&now-samples[0].t>100)samples.shift();
    },{passive:false});
    handle.addEventListener('pointerup',event=>{
      if(phase!=='dragging'||event.pointerId!==pointerId)return;
      const now=performance.now();
      // A hold before release is not a fling.
      samples=samples.filter(sample=>now-sample.t<=100);
      samples.push({y:event.clientY,t:now});
      const first=samples[0];
      const velocity=clamp((event.clientY-first.y)/Math.max(1,now-first.t)*1000,-2200,2200);
      const y=Math.max(0,currentY);
      const threshold=clamp(sheetHeight*SHEET_MOTION.dismissRatio,SHEET_MOTION.dismissMin,SHEET_MOTION.dismissMax);
      const dismiss=y>=threshold||(y>=SHEET_MOTION.flingMinY&&velocity>SHEET_MOTION.flingVelocity&&y+velocity*SHEET_MOTION.flingProjection>=threshold);
      if(dismiss)close(Math.max(0,velocity),true);
      else snapOpen(velocity);
    });
    const cancelGesture=event=>{
      if(phase==='dragging'&&event.pointerId===pointerId)snapOpen(0);
    };
    handle.addEventListener('pointercancel',cancelGesture);
    handle.addEventListener('lostpointercapture',cancelGesture);
    window.addEventListener('resize',()=>{
      if(phase==='open')measure();
    });
    reduceMotion.addEventListener('change',()=>{
      if(!reduceMotion.matches||!motion)return;
      kill();
      if(phase==='closing')finishClosed();else finishOpen();
    });
    return {open,close:()=>close(0,false),isOpen:()=>phase!=='closed',state:()=>phase};
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
  const isReloadSafe=()=>{
    try{
      return window.DailyMotionReloadGuard?.isSafe?.()!==false;
    }catch{
      return false;
    }
  };

  const showUpdate=worker=>{
    waitingWorker=worker;
    if(!isReloadSafe()){
      showBanner('Обновление готово — обновить можно после тренировки');
      return;
    }
    showBanner('Доступна новая версия Daily Motion','Обновить',()=>{
      if(!isReloadSafe()){
        showUpdate(waitingWorker);
        return;
      }
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

  const checkForUpdate=async()=>{
    if(!registration||updateCheckInFlight||!navigator.onLine||document.visibilityState==='hidden')return;
    updateCheckInFlight=true;
    try{
      await registration.update();
      if(registration.waiting&&navigator.serviceWorker.controller)showUpdate(registration.waiting);
    }catch{}
    finally{
      updateCheckInFlight=false;
    }
  };

  const startUpdateChecks=()=>{
    if(updateCheckTimer!==null)return;
    updateCheckTimer=setInterval(checkForUpdate,UPDATE_CHECK_INTERVAL);
  };

  if('serviceWorker' in navigator){
    window.addEventListener('load',async()=>{
      try{
        const reg=await navigator.serviceWorker.register(SW_URL);
        watchRegistration(reg);
        startUpdateChecks();
        setTimeout(checkForUpdate,1200);
      }catch{}
    });

    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible')checkForUpdate();
    });
    window.addEventListener('pageshow',checkForUpdate);

    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(!isReloadSafe()){
        refreshRequested=false;
        waitingWorker=null;
        showBanner('Обновление установлено — применится после тренировки');
        return;
      }
      if(refreshRequested)location.reload();
    });
  }

  window.addEventListener('daily-motion-reload-safety-change',()=>{
    if(waitingWorker)showUpdate(waitingWorker);
  });

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
    checkForUpdate();
    if(!waitingWorker){
      showBanner('Соединение восстановлено');
      setTimeout(()=>{
        if(!waitingWorker)hideBanner();
      },1400);
    }
  });

  const install=async()=>{
    const mode=getInstallMode();
    if(mode==='ios-manual')return {outcome:'manual-ios'};
    if(mode!=='prompt'||!deferredPrompt)return {outcome:'unavailable'};
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

  window.DailyMotionMotion={createBottomSheet,sheetMotion:SHEET_MOTION};

  window.DailyMotionPWA={
    canInstall:()=>getInstallMode()!=='unavailable',
    getInstallMode,
    install,
    isStandalone,
    isUpdateSafe:isReloadSafe,
    update:()=>registration?.update?.()
  };
})();

