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

  window.DailyMotionPWA={
    getInstallMode,
    install,
    isUpdateSafe:isReloadSafe
  };
})();

