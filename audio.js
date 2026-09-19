(() => {
  let context=null;

  const getContext=()=>{
    try{
      if(!context){
        const AudioContextClass=window.AudioContext||window.webkitAudioContext;
        if(!AudioContextClass)return null;
        context=new AudioContextClass();
      }
      return context;
    }catch{return null;}
  };

  const unlock=async()=>{
    const ctx=getContext();
    if(!ctx)return false;
    try{
      if(ctx.state==='suspended')await ctx.resume();
      return ctx.state==='running';
    }catch{return false;}
  };

  const tone=(frequency,duration=.14,volume=.14,delay=0,type='sine')=>{
    const ctx=getContext();
    if(!ctx||ctx.state!=='running')return;
    const startAt=ctx.currentTime+delay;
    const oscillator=ctx.createOscillator();
    const gain=ctx.createGain();
    oscillator.type=type;
    oscillator.frequency.setValueAtTime(frequency,startAt);
    gain.gain.setValueAtTime(.0001,startAt);
    gain.gain.exponentialRampToValueAtTime(volume,startAt+.015);
    gain.gain.exponentialRampToValueAtTime(.0001,startAt+duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt+duration+.025);
  };

  const tick=()=>tone(660,.14,.13);
  const start=()=>{
    tone(760,.14,.14);
    tone(1040,.20,.18,.11);
  };
  const finish=()=>{
    tone(760,.16,.14);
    tone(980,.19,.17,.12);
    tone(1240,.24,.20,.27);
  };
  const test=async()=>{
    const ready=await unlock();
    if(!ready)return false;
    start();
    return true;
  };

  window.DailyMotionAudio={unlock,tick,start,finish,test};
})();
