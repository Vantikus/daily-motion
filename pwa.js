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
    const OPEN_DURATION=420;
    const CLOSE_DURATION=320;
    const SNAP_DURATION=360;
    const EASING='cubic-bezier(.32,.72,0,1)';
    const CLOSED_PAD=44;

    let phase='closed';
    let pointerId=null;
    let startY=0;
    let currentY=0;
    let sheetHeight=0;
    let samples=[];
    let sheetAnimation=null;
    let backdropAnimation=null;
    let frameId=null;

    const cancelAnimation=animation=>{
      if(!animation)return;
      try{animation.cancel();}catch{}
    };

    const cancelMotion=()=>{
      cancelAnimation(sheetAnimation);
      cancelAnimation(backdropAnimation);
      sheetAnimation=null;
      backdropAnimation=null;
      if(frameId!==null){
        cancelAnimationFrame(frameId);
        frameId=null;
      }
    };

    const parseTranslateY=transform=>{
      if(!transform||transform==='none')return 0;
      if(transform.startsWith('matrix3d(')){
        const values=transform.slice(9,-1).split(',').map(Number);
        return Number.isFinite(values[13])?values[13]:0;
      }
      if(transform.startsWith('matrix(')){
        const values=transform.slice(7,-1).split(',').map(Number);
        return Number.isFinite(values[5])?values[5]:0;
      }
      return 0;
    };

    const readY=()=>parseTranslateY(getComputedStyle(sheet).transform);

    const readBackdrop=()=>{
      const value=getComputedStyle(overlay).backgroundColor;
      const match=value.match(/rgba?\(([^)]+)\)/);
      if(!match)return .18;
      const parts=match[1].split(',').map(part=>part.trim());
      const alpha=parts.length>3?Number(parts[3]):1;
      return Number.isFinite(alpha)?alpha:.18;
    };

    const transformFor=y=>`translate3d(0,${y.toFixed(2)}px,0)`;
    const backdropFor=alpha=>`rgba(23,25,23,${clamp(alpha,0,.18).toFixed(3)})`;
    const closedY=()=>Math.ceil((sheetHeight||sheet.getBoundingClientRect().height)+CLOSED_PAD);

    const setVisualState=(y,alpha)=>{
      currentY=y;
      sheet.style.transform=transformFor(y);
      overlay.style.backgroundColor=backdropFor(alpha);
    };

    const finishClosed=()=>{
      cancelMotion();
      overlay.classList.remove('is-visible','is-dragging','is-settling','is-dismissing');
      sheet.classList.remove('is-dragging');
      overlay.setAttribute('aria-hidden','true');
      sheet.style.transform='';
      overlay.style.backgroundColor='';
      pointerId=null;
      samples=[];
      currentY=0;
      phase='closed';
      onClosed?.();
    };

    const finishOpen=()=>{
      cancelMotion();
      overlay.classList.remove('is-dragging','is-settling','is-dismissing');
      sheet.classList.remove('is-dragging');
      sheet.style.transform='translate3d(0,0,0)';
      overlay.style.backgroundColor=backdropFor(.18);
      currentY=0;
      phase='open';
      onOpened?.();
    };

    const animateTo=(targetY,targetAlpha,duration,{closing=false}={})=>{
      cancelMotion();

      const fromY=readY();
      const fromAlpha=readBackdrop();
      sheet.style.transform=transformFor(fromY);
      overlay.style.backgroundColor=backdropFor(fromAlpha);

      if(reduceMotion.matches||duration<=0){
        setVisualState(targetY,targetAlpha);
        if(closing)finishClosed();
        else finishOpen();
        return;
      }

      sheetAnimation=sheet.animate(
        [
          {transform:transformFor(fromY)},
          {transform:transformFor(targetY)}
        ],
        {duration,easing:EASING,fill:'forwards'}
      );

      backdropAnimation=overlay.animate(
        [
          {backgroundColor:backdropFor(fromAlpha)},
          {backgroundColor:backdropFor(targetAlpha)}
        ],
        {duration:Math.min(duration,280),easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'}
      );

      let settled=false;
      const finish=()=>{
        if(settled)return;
        settled=true;
        sheet.style.transform=transformFor(targetY);
        overlay.style.backgroundColor=backdropFor(targetAlpha);
        cancelMotion();
        if(closing)finishClosed();
        else finishOpen();
      };

      sheetAnimation.addEventListener('finish',finish,{once:true});
      sheetAnimation.addEventListener('cancel',()=>{settled=true;},{once:true});
      setTimeout(()=>{
        if(!settled)finish();
      },duration+90);
    };

    const open=()=>{
      if(phase==='open'||phase==='opening')return;
      cancelMotion();
      phase='opening';
      pointerId=null;
      samples=[];

      overlay.classList.remove('is-dragging','is-settling','is-dismissing');
      sheet.classList.remove('is-dragging');
      overlay.setAttribute('aria-hidden','false');
      overlay.classList.add('is-visible');

      sheetHeight=sheet.getBoundingClientRect().height;
      const start=closedY();
      setVisualState(start,0);
      void sheet.offsetWidth;
      animateTo(0,.18,OPEN_DURATION);
    };

    const close=(velocity=0)=>{
      if(phase==='closed'||phase==='closing')return;
      onBeforeClose?.();

      sheetHeight=sheetHeight||sheet.getBoundingClientRect().height;
      const fromY=phase==='dragging'?currentY:Math.max(0,readY());
      const fromAlpha=readBackdrop();
      setVisualState(fromY,fromAlpha);

      phase='closing';
      pointerId=null;
      samples=[];
      overlay.classList.remove('is-dragging');
      overlay.classList.add('is-settling','is-dismissing');
      sheet.classList.remove('is-dragging');

      const target=closedY();
      const remaining=Math.max(0,target-fromY);
      const speed=Math.max(.8,Math.min(2.4,Math.abs(velocity)));
      const duration=reduceMotion.matches?0:clamp(remaining/(speed*2.25),220,CLOSE_DURATION);
      animateTo(target,0,duration,{closing:true});
    };

    const snapOpen=()=>{
      if(phase!=='dragging')return;

      const fromY=currentY;
      const fromAlpha=readBackdrop();
      setVisualState(fromY,fromAlpha);
      phase='settling';
      pointerId=null;
      samples=[];
      overlay.classList.remove('is-dragging');
      overlay.classList.add('is-settling');
      sheet.classList.remove('is-dragging');

      const duration=reduceMotion.matches?0:clamp(250+Math.abs(fromY)*.32,250,SNAP_DURATION);
      animateTo(0,.18,duration);
    };

    const releaseCapture=()=>{
      if(pointerId===null)return;
      try{handle.releasePointerCapture?.(pointerId);}catch{}
    };

    const scheduleDrag=(y,alpha)=>{
      currentY=y;
      if(frameId!==null)return;
      frameId=requestAnimationFrame(()=>{
        frameId=null;
        sheet.style.transform=transformFor(currentY);
        overlay.style.backgroundColor=backdropFor(alpha());
      });
    };

    handle.addEventListener('pointerdown',event=>{
      if(phase!=='open'||!overlay.classList.contains('is-visible'))return;
      if(event.pointerType==='mouse'&&event.button!==0)return;

      cancelMotion();
      phase='dragging';
      pointerId=event.pointerId;
      startY=event.clientY;
      sheetHeight=sheet.getBoundingClientRect().height;
      currentY=Math.max(0,readY());
      samples=[{y:event.clientY,t:performance.now()}];

      sheet.style.transform=transformFor(currentY);
      overlay.style.backgroundColor=backdropFor(readBackdrop());
      overlay.classList.add('is-dragging');
      sheet.classList.add('is-dragging');
      handle.setPointerCapture?.(pointerId);
    });

    handle.addEventListener('pointermove',event=>{
      if(phase!=='dragging'||event.pointerId!==pointerId)return;
      event.preventDefault();

      const raw=event.clientY-startY;
      const y=raw>=0?raw:-Math.min(10,Math.sqrt(Math.abs(raw))*1.35);
      const progress=clamp(Math.max(0,y)/(Math.max(1,sheetHeight)*.72),0,1);

      const now=performance.now();
      samples.push({y:event.clientY,t:now});
      while(samples.length>2&&now-samples[0].t>90)samples.shift();

      scheduleDrag(y,()=>.18*(1-progress));
    },{passive:false});

    const finishGesture=event=>{
      if(phase!=='dragging'||event.pointerId!==pointerId)return;

      if(frameId!==null){
        cancelAnimationFrame(frameId);
        frameId=null;
      }
      sheet.style.transform=transformFor(currentY);

      const now=performance.now();
      samples.push({y:event.clientY,t:now});
      const first=samples[0];
      const last=samples[samples.length-1];
      const dt=Math.max(1,last.t-first.t);
      const velocity=(last.y-first.y)/dt;
      const y=Math.max(0,currentY);
      const threshold=clamp(sheetHeight*.24,96,172);
      const projected=y+Math.max(0,velocity)*180;
      const dismiss=y>threshold||(y>24&&velocity>.60)||projected>threshold*1.08;

      releaseCapture();
      if(dismiss)close(velocity);
      else snapOpen();
    };

    handle.addEventListener('pointerup',finishGesture);
    handle.addEventListener('pointercancel',event=>{
      if(phase!=='dragging'||event.pointerId!==pointerId)return;
      releaseCapture();
      snapOpen();
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
