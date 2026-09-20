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

  window.DailyMotionPWA={
    canInstall:()=>Boolean(deferredPrompt)&&!isStandalone(),
    install,
    isStandalone,
    update:()=>registration?.update?.()
  };
})();
