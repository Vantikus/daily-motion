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
    let phase='closed';
    let pointerId=null;
    let startY=0;
    let currentY=0;
    let samples=[];
    let transitionTimer=null;
    let transitionCleanup=null;

    const clearTransitionWait=()=>{
      if(transitionTimer!==null){
        clearTimeout(transitionTimer);
        transitionTimer=null;
      }
      transitionCleanup?.();
      transitionCleanup=null;
    };

    const readY=()=>{
      const transform=getComputedStyle(sheet).transform;
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

    const setY=value=>{
      currentY=value;
      sheet.style.setProperty('--sheet-y',`${value.toFixed(2)}px`);
    };

    const setBackdrop=alpha=>{
      overlay.style.setProperty('--sheet-backdrop-alpha',String(clamp(alpha,0,.18)));
    };

    const setDuration=ms=>{
      sheet.style.setProperty('--sheet-duration',`${Math.round(ms)}ms`);
    };

    const clearInlineMotion=()=>{
      sheet.style.removeProperty('--sheet-y');
      sheet.style.removeProperty('--sheet-duration');
      overlay.style.removeProperty('--sheet-backdrop-alpha');
      currentY=0;
    };

    const waitForTransform=(duration,done)=>{
      clearTransitionWait();
      let finished=false;
      const finish=event=>{
        if(finished)return;
        if(event&&(event.target!==sheet||event.propertyName!=='transform'))return;
        finished=true;
        clearTransitionWait();
        done();
      };
      const onEnd=event=>finish(event);
      sheet.addEventListener('transitionend',onEnd);
      transitionCleanup=()=>sheet.removeEventListener('transitionend',onEnd);
      transitionTimer=setTimeout(()=>finish(),Math.max(0,duration)+120);
    };

    const closedY=()=>Math.ceil(sheet.getBoundingClientRect().height+40);

    const finishOpen=()=>{
      if(phase!=='opening')return;
      phase='open';
      sheet.style.removeProperty('--sheet-duration');
      onOpened?.();
    };

    const finishClose=()=>{
      clearTransitionWait();
      overlay.classList.remove('is-visible','is-dragging','is-settling','is-dismissing');
      sheet.classList.remove('is-dragging');
      overlay.setAttribute('aria-hidden','true');
      clearInlineMotion();
      pointerId=null;
      samples=[];
      phase='closed';
      onClosed?.();
    };

    const open=()=>{
      if(phase==='open'||phase==='opening')return;
      clearTransitionWait();
      phase='opening';
      pointerId=null;
      samples=[];
      overlay.classList.remove('is-dragging','is-settling','is-dismissing','is-visible');
      sheet.classList.remove('is-dragging');
      clearInlineMotion();
      overlay.setAttribute('aria-hidden','false');
      setDuration(reduceMotion.matches?0:430);
      void sheet.offsetHeight;
      overlay.classList.add('is-visible');
      if(reduceMotion.matches){
        finishOpen();
        return;
      }
      waitForTransform(430,finishOpen);
    };

    const close=(velocity=0)=>{
      if(phase==='closed'||phase==='closing')return;
      clearTransitionWait();
      onBeforeClose?.();

      const renderedY=phase==='dragging'?currentY:Math.max(0,readY());
      setY(renderedY);
      phase='closing';
      pointerId=null;
      samples=[];
      overlay.classList.remove('is-dragging');
      overlay.classList.add('is-settling','is-dismissing');
      sheet.classList.remove('is-dragging');

      const target=closedY();
      const distance=Math.max(0,target-renderedY);
      const projectedSpeed=Math.max(.65,Math.min(2.2,Math.abs(velocity)));
      const duration=reduceMotion.matches?0:clamp(distance/(projectedSpeed*2.1),220,340);
      setDuration(duration);
      void sheet.offsetHeight;

      requestAnimationFrame(()=>{
        setY(target);
        setBackdrop(0);
        if(reduceMotion.matches){
          finishClose();
          return;
        }
        waitForTransform(duration,finishClose);
      });
    };

    const snapOpen=()=>{
      if(phase!=='dragging')return;
      clearTransitionWait();
      phase='settling';
      pointerId=null;
      samples=[];
      overlay.classList.remove('is-dragging');
      overlay.classList.add('is-settling');
      sheet.classList.remove('is-dragging');

      const distance=Math.abs(currentY);
      const duration=reduceMotion.matches?0:clamp(250+distance*.45,250,390);
      setDuration(duration);
      void sheet.offsetHeight;

      requestAnimationFrame(()=>{
        setY(0);
        overlay.style.removeProperty('--sheet-backdrop-alpha');
        if(reduceMotion.matches){
          overlay.classList.remove('is-settling');
          clearInlineMotion();
          phase='open';
          return;
        }
        waitForTransform(duration,()=>{
          if(phase!=='settling')return;
          overlay.classList.remove('is-settling');
          clearInlineMotion();
          phase='open';
        });
      });
    };

    const releaseCapture=()=>{
      if(pointerId===null)return;
      try{handle.releasePointerCapture?.(pointerId);}catch{}
    };

    handle.addEventListener('pointerdown',event=>{
      if(phase!=='open'||!overlay.classList.contains('is-visible'))return;
      if(event.pointerType==='mouse'&&event.button!==0)return;

      clearTransitionWait();
      phase='dragging';
      pointerId=event.pointerId;
      startY=event.clientY;
      currentY=Math.max(0,readY());
      samples=[{y:event.clientY,t:performance.now()}];
      setY(currentY);
      overlay.classList.add('is-dragging');
      sheet.classList.add('is-dragging');
      handle.setPointerCapture?.(pointerId);
    });

    handle.addEventListener('pointermove',event=>{
      if(phase!=='dragging'||event.pointerId!==pointerId)return;
      event.preventDefault();

      const raw=event.clientY-startY;
      const y=raw>=0?raw:-Math.min(8,Math.abs(raw)*.08);
      setY(y);

      const now=performance.now();
      samples.push({y:event.clientY,t:now});
      while(samples.length>2&&now-samples[0].t>90)samples.shift();

      const sheetHeight=Math.max(1,sheet.getBoundingClientRect().height);
      const progress=clamp(Math.max(0,y)/(sheetHeight*.72),0,1);
      setBackdrop(.18*(1-progress));
    },{passive:false});

    const finishGesture=event=>{
      if(phase!=='dragging'||event.pointerId!==pointerId)return;
      const now=performance.now();
      samples.push({y:event.clientY,t:now});
      const first=samples[0];
      const last=samples[samples.length-1];
      const dt=Math.max(1,last.t-first.t);
      const velocity=(last.y-first.y)/dt;
      const y=Math.max(0,currentY);
      const sheetHeight=Math.max(1,sheet.getBoundingClientRect().height);
      const threshold=clamp(sheetHeight*.24,92,168);
      const projected=y+Math.max(0,velocity)*180;
      const dismiss=y>threshold||(y>24&&velocity>.62)||projected>threshold*1.12;

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
