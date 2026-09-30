(() => {
  const createLifecycle=()=>{
    const controller=new AbortController();
    const timers=new Set();
    const frames=new Set();
    const listen=(target,type,handler,options={})=>{
      if(!controller.signal.aborted)target?.addEventListener(type,handler,{...options,signal:controller.signal});
    };
    const defer=(callback,delay=0)=>{
      if(controller.signal.aborted)return null;
      const timer=setTimeout(()=>{
        timers.delete(timer);
        if(!controller.signal.aborted)callback();
      },delay);
      timers.add(timer);
      return timer;
    };
    const cancelDeferred=timer=>{clearTimeout(timer);timers.delete(timer);};
    const frame=callback=>{
      if(controller.signal.aborted)return null;
      const id=requestAnimationFrame(time=>{
        frames.delete(id);
        if(!controller.signal.aborted)callback(time);
      });
      frames.add(id);
      return id;
    };
    const abort=()=>{
      controller.abort();
      timers.forEach(timer=>clearTimeout(timer));
      frames.forEach(id=>cancelAnimationFrame(id));
      timers.clear();
      frames.clear();
    };
    return {signal:controller.signal,listen,defer,cancelDeferred,frame,abort};
  };
  const focusableSelector='button:not([disabled]):not([hidden]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  const syncPressed=(root,value,attribute='data-value')=>{
    if(!root)return;
    root.querySelectorAll(`[${attribute}]`).forEach(button=>{
      button.setAttribute('aria-pressed',String(button.getAttribute(attribute)===String(value)));
    });
  };

  const createToast=(node,{duration=1600}={})=>{
    const storageMessage='Не удалось сохранить изменения. Сделайте резервную копию прогресса.';
    let timer=null;
    const show=(message,{storageIndependent=false}={})=>{
      if(!node)return;
      node.textContent=!storageIndependent&&window.DailyMotionState?.getPersistenceStatus?.().ok===false
        ?storageMessage:message;
      node.classList.add('show');
      if(timer!==null)clearTimeout(timer);
      timer=setTimeout(()=>{
        timer=null;
        node.classList.remove('show');
      },duration);
    };
    const onStorageStatus=event=>{
      if(event.detail?.ok===false)show(storageMessage);
    };
    window.addEventListener('daily-motion-storage-status-change',onStorageStatus);
    if(window.DailyMotionState?.getPersistenceStatus?.().ok===false)show(storageMessage);
    const destroy=()=>{
      window.removeEventListener('daily-motion-storage-status-change',onStorageStatus);
      if(timer!==null)clearTimeout(timer);
      timer=null;
      node?.classList.remove('show');
    };
    return {show,destroy};
  };

  const trapFocus=(event,root,{wrapUnknown=true}={})=>{
    if(event.key!=='Tab'||!root)return false;
    const focusable=[...root.querySelectorAll(focusableSelector)]
      .filter(node=>node.offsetParent!==null&&!node.closest('[inert]')&&getComputedStyle(node).visibility!=='hidden');
    if(!focusable.length)return false;
    const first=focusable[0];
    const last=focusable[focusable.length-1];
    const active=document.activeElement;
    const outside=!focusable.includes(active);
    if(event.shiftKey&&(active===first||(wrapUnknown&&outside))){
      event.preventDefault();
      last.focus();
      return true;
    }
    if(!event.shiftKey&&(active===last||(wrapUnknown&&outside))){
      event.preventDefault();
      first.focus();
      return true;
    }
    return false;
  };

  const createConfirmFlow=({block,panel,trigger,accept,showDelay=70,focusDelay=300}={})=>{
    let stateTimer=null;
    let focusTimer=null;
    const clear=()=>{
      if(stateTimer!==null){clearTimeout(stateTimer);stateTimer=null;}
      if(focusTimer!==null){clearTimeout(focusTimer);focusTimer=null;}
    };
    const apply=(confirming,focusTarget=null)=>{
      if(!block||!panel||!trigger)return;
      block.classList.toggle('is-confirming',confirming);
      panel.setAttribute('aria-hidden',confirming?'false':'true');
      panel.inert=!confirming;
      trigger.inert=confirming;
      if(focusTarget){
        focusTimer=setTimeout(()=>{
          focusTimer=null;
          focusTarget.focus({preventScroll:true});
        },focusDelay);
      }
    };
    const hide=(restoreFocus=false,delay=0)=>{
      clear();
      const done=()=>apply(false,restoreFocus?trigger:null);
      if(delay){
        stateTimer=setTimeout(()=>{stateTimer=null;done();},delay);
        return;
      }
      done();
    };
    const show=()=>{
      if(!block||block.classList.contains('is-confirming')||stateTimer!==null)return;
      clear();
      stateTimer=setTimeout(()=>{
        stateTimer=null;
        apply(true,accept||null);
      },showDelay);
    };
    const destroy=()=>{clear();apply(false,null);};
    return {show,hide,destroy,isConfirming:()=>Boolean(block?.classList.contains('is-confirming'))};
  };

  const bindSettingsControls=({store,audio,theme,elements,signal,onChange}={})=>{
    if(!store||!elements)return null;
    let settings=store.getSettings();
    const on=(node,type,handler)=>node?.addEventListener(type,handler,signal?{signal}:undefined);
    const publish=next=>{
      settings=next;
      onChange?.(settings);
      return settings;
    };
    const sync=()=>{
      settings=store.getSettings();
      if(elements.sound)elements.sound.checked=Boolean(settings.sound);
      if(elements.autoNext)elements.autoNext.checked=Boolean(settings.autoNext);
      if(elements.countdown)elements.countdown.value=String(settings.countdownSeconds);
      if(elements.rest)elements.rest.value=String(settings.restSeconds);
      syncPressed(elements.countdownButtons,settings.countdownSeconds);
      syncPressed(elements.restButtons,settings.restSeconds);
      syncPressed(elements.themeButtons,settings.theme,'data-theme-value');
      return publish(settings);
    };
    const update=patch=>publish(store.updateSettings(patch));

    on(elements.sound,'change',async event=>{
      const next=update({sound:event.target.checked});
      if(next.sound){
        const ready=await audio?.unlock?.();
        if(ready&&!signal?.aborted)audio?.confirm?.();
      }
    });
    on(elements.autoNext,'change',event=>update({autoNext:event.target.checked}));
    on(elements.countdown,'change',event=>{
      const next=update({countdownSeconds:Number(event.target.value)});
      syncPressed(elements.countdownButtons,next.countdownSeconds);
    });
    on(elements.rest,'change',event=>{
      const next=update({restSeconds:Number(event.target.value)});
      syncPressed(elements.restButtons,next.restSeconds);
    });
    on(elements.countdownButtons,'click',event=>{
      const button=event.target.closest?.('[data-value]');
      if(!button)return;
      const next=update({countdownSeconds:Number(button.dataset.value)});
      if(elements.countdown)elements.countdown.value=String(next.countdownSeconds);
      syncPressed(elements.countdownButtons,next.countdownSeconds);
    });
    on(elements.restButtons,'click',event=>{
      const button=event.target.closest?.('[data-value]');
      if(!button)return;
      const next=update({restSeconds:Number(button.dataset.value)});
      if(elements.rest)elements.rest.value=String(next.restSeconds);
      syncPressed(elements.restButtons,next.restSeconds);
    });
    on(elements.themeButtons,'click',event=>{
      const button=event.target.closest?.('[data-theme-value]');
      if(!button)return;
      const value=button.dataset.themeValue;
      if(settings.theme===value)return;
      const next=update({theme:value});
      syncPressed(elements.themeButtons,next.theme,'data-theme-value');
      theme?.applyAnimated?.(next.theme);
    });

    sync();
    return {sync,get:()=>settings};
  };

  window.DailyMotionUI=Object.freeze({
    createLifecycle,
    createToast,
    trapFocus,
    createConfirmFlow,
    bindSettingsControls
  });
})();
