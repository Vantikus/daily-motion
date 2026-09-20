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
    const gsap=window.gsap;
    if(!overlay||!sheet||!handle||!gsap)return null;

    const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
    const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
    const CLOSED_PAD=44;
    let phase='closed';
    let pointerId=null;
    let startY=0;
    let currentY=0;
    let sheetHeight=0;
    let samples=[];

    const closedY=()=>Math.ceil((sheetHeight||sheet.getBoundingClientRect().height)+CLOSED_PAD);
    const backdropFor=y=>{
      const progress=clamp(Math.max(0,y)/Math.max(1,closedY()),0,1);
      return .18*(1-Math.pow(progress,.82));
    };

    const kill=()=>{
      gsap.killTweensOf(sheet);
      gsap.killTweensOf(overlay);
    };

    const paint=y=>{
      currentY=y;
      gsap.set(sheet,{y,force3D:true});
      gsap.set(overlay,{backgroundColor:`rgba(23,25,23,${backdropFor(y)})`});
    };

    const clearGesture=()=>{
      pointerId=null;
      samples=[];
      overlay.classList.remove('is-dragging');
      sheet.classList.remove('is-dragging');
    };

    const finishClosed=()=>{
      kill();
      clearGesture();
      overlay.classList.remove('is-visible','is-moving','is-settling','is-dismissing');
      overlay.setAttribute('aria-hidden','true');
      gsap.set(sheet,{clearProps:'transform'});
      gsap.set(overlay,{clearProps:'backgroundColor'});
      currentY=0;
      phase='closed';
      onClosed?.();
    };

    const finishOpen=()=>{
      kill();
      clearGesture();
      overlay.classList.remove('is-moving','is-settling','is-dismissing');
      gsap.set(sheet,{y:0,force3D:true});
      gsap.set(overlay,{backgroundColor:'rgba(23,25,23,.18)'});
      currentY=0;
      phase='open';
      onOpened?.();
    };

    const open=()=>{
      if(phase==='open'||phase==='opening')return;
      kill();
      clearGesture();
      phase='opening';
      overlay.setAttribute('aria-hidden','false');
      overlay.classList.remove('is-settling','is-dismissing');
      overlay.classList.add('is-visible','is-moving');

      sheetHeight=sheet.getBoundingClientRect().height;
      currentY=closedY();
      gsap.set(sheet,{y:currentY,force3D:true});
      gsap.set(overlay,{backgroundColor:'rgba(23,25,23,0)'});

      if(reduceMotion.matches){
        finishOpen();
        return;
      }

      gsap.timeline({onComplete:finishOpen})
        .to(overlay,{backgroundColor:'rgba(23,25,23,.18)',duration:.26,ease:'power2.out'},0)
        .to(sheet,{y:0,duration:.44,ease:'power4.out',force3D:true},0);
    };

    const close=(velocityPxPerSecond=0,fromGesture=false)=>{
      if(phase==='closed'||phase==='closing')return;
      onBeforeClose?.();
      kill();

      sheetHeight=sheetHeight||sheet.getBoundingClientRect().height;
      currentY=Number(gsap.getProperty(sheet,'y'))||currentY||0;
      const target=closedY();
      const remaining=Math.max(0,target-currentY);

      phase='closing';
      clearGesture();
      overlay.classList.add('is-moving','is-settling','is-dismissing');

      if(reduceMotion.matches){
        paint(target);
        finishClosed();
        return;
      }

      const speed=Math.max(900,Math.min(2200,Math.abs(velocityPxPerSecond)||1100));
      const duration=fromGesture
        ?clamp(remaining/speed,.20,.31)
        :.34;
      const ease=fromGesture?'power3.out':'power2.inOut';

      gsap.timeline({onComplete:finishClosed})
        .to(sheet,{y:target,duration,ease,force3D:true},0)
        .to(overlay,{backgroundColor:'rgba(23,25,23,0)',duration:Math.min(.27,duration),ease:'power2.inOut'},Math.min(.04,duration*.12));
    };

    const snapOpen=velocityPxPerSecond=>{
      if(phase!=='dragging')return;
      kill();
      phase='settling';
      clearGesture();
      overlay.classList.add('is-moving','is-settling');

      currentY=Number(gsap.getProperty(sheet,'y'))||currentY||0;
      const ratio=clamp(Math.abs(currentY)/Math.max(1,sheetHeight),0,1);
      const duration=clamp(.27+ratio*.11,.27,.38);

      if(reduceMotion.matches){
        finishOpen();
        return;
      }

      gsap.timeline({onComplete:finishOpen})
        .to(sheet,{
          y:0,
          duration,
          ease:'back.out(1.08)',
          force3D:true
        },0)
        .to(overlay,{
          backgroundColor:'rgba(23,25,23,.18)',
          duration:Math.min(.24,duration),
          ease:'power2.out'
        },0);
    };

    const releaseCapture=()=>{
      if(pointerId===null)return;
      try{handle.releasePointerCapture?.(pointerId);}catch{}
    };

    handle.addEventListener('pointerdown',event=>{
      if(phase!=='open'||!overlay.classList.contains('is-visible'))return;
      if(event.pointerType==='mouse'&&event.button!==0)return;

      kill();
      phase='dragging';
      pointerId=event.pointerId;
      startY=event.clientY;
      sheetHeight=sheet.getBoundingClientRect().height;
      currentY=0;
      samples=[{y:event.clientY,t:performance.now()}];

      overlay.classList.remove('is-moving','is-settling','is-dismissing');
      overlay.classList.add('is-dragging');
      sheet.classList.add('is-dragging');
      handle.setPointerCapture?.(pointerId);
    });

    handle.addEventListener('pointermove',event=>{
      if(phase!=='dragging'||event.pointerId!==pointerId)return;
      event.preventDefault();

      const raw=event.clientY-startY;
      const y=raw>=0?raw:-Math.min(9,Math.sqrt(Math.abs(raw))*1.15);
      currentY=y;
      gsap.set(sheet,{y,force3D:true});
      gsap.set(overlay,{backgroundColor:`rgba(23,25,23,${backdropFor(y)})`});

      const now=performance.now();
      samples.push({y:event.clientY,t:now});
      while(samples.length>2&&now-samples[0].t>90)samples.shift();
    },{passive:false});

    const finishGesture=event=>{
      if(phase!=='dragging'||event.pointerId!==pointerId)return;

      const now=performance.now();
      samples.push({y:event.clientY,t:now});
      const first=samples[0];
      const last=samples[samples.length-1];
      const dt=Math.max(1,last.t-first.t);
      const velocityPxPerSecond=((last.y-first.y)/dt)*1000;
      const y=Math.max(0,Number(gsap.getProperty(sheet,'y'))||currentY||0);
      const distanceThreshold=clamp(sheetHeight*.28,118,190);
      const projected=y+Math.max(0,velocityPxPerSecond)*.105;
      const dismiss=
        y>=distanceThreshold||
        (y>=58&&velocityPxPerSecond>=880)||
        (y>=52&&projected>=distanceThreshold*1.1);

      releaseCapture();

      if(dismiss){
        close(clamp(velocityPxPerSecond,0,2200),true);
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
      close:()=>close(0,false),
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
