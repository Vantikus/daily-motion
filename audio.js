(() => {
  let context=null;
  let mediaPrimed=false;

  const setPlaybackSession=()=>{
    try{
      if(navigator.audioSession)navigator.audioSession.type='playback';
    }catch{}
  };

  const writeString=(view,offset,value)=>{
    for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));
  };

  const makeWav=parts=>{
    const sampleRate=22050;
    const samples=[];
    parts.forEach(part=>{
      const duration=Math.max(.02,Number(part.duration)||.1);
      const gap=Math.max(0,Number(part.gap)||0);
      const frequency=Math.max(80,Number(part.frequency)||660);
      const volume=Math.min(.9,Math.max(.02,Number(part.volume)||.35));
      const toneSamples=Math.floor(sampleRate*duration);
      const gapSamples=Math.floor(sampleRate*gap);

      for(let i=0;i<toneSamples;i++){
        const attack=Math.min(1,i/(sampleRate*.008));
        const release=Math.min(1,(toneSamples-i)/(sampleRate*.025));
        const envelope=Math.max(0,Math.min(attack,release));
        samples.push(Math.sin(2*Math.PI*frequency*i/sampleRate)*volume*envelope);
      }
      for(let i=0;i<gapSamples;i++)samples.push(0);
    });

    const buffer=new ArrayBuffer(44+samples.length*2);
    const view=new DataView(buffer);
    writeString(view,0,'RIFF');
    view.setUint32(4,36+samples.length*2,true);
    writeString(view,8,'WAVE');
    writeString(view,12,'fmt ');
    view.setUint32(16,16,true);
    view.setUint16(20,1,true);
    view.setUint16(22,1,true);
    view.setUint32(24,sampleRate,true);
    view.setUint32(28,sampleRate*2,true);
    view.setUint16(32,2,true);
    view.setUint16(34,16,true);
    writeString(view,36,'data');
    view.setUint32(40,samples.length*2,true);

    samples.forEach((sample,index)=>{
      const clamped=Math.max(-1,Math.min(1,sample));
      view.setInt16(44+index*2,clamped<0?clamped*32768:clamped*32767,true);
    });

    const bytes=new Uint8Array(buffer);
    let binary='';
    const chunk=0x8000;
    for(let i=0;i<bytes.length;i+=chunk){
      binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
    }
    return 'data:audio/wav;base64,'+btoa(binary);
  };

  const sources={
    prime:makeWav([{frequency:440,duration:.025,volume:.02}]),
    tick:makeWav([{frequency:660,duration:.12,volume:.42}]),
    start:makeWav([
      {frequency:760,duration:.12,volume:.42,gap:.055},
      {frequency:1040,duration:.18,volume:.48}
    ]),
    finish:makeWav([
      {frequency:760,duration:.12,volume:.42,gap:.05},
      {frequency:980,duration:.14,volume:.46,gap:.05},
      {frequency:1240,duration:.22,volume:.52}
    ])
  };

  const players={
    tick:new Audio(sources.tick),
    start:new Audio(sources.start),
    finish:new Audio(sources.finish)
  };

  Object.values(players).forEach(player=>{
    player.preload='auto';
    player.volume=1;
  });

  const primePlayer=new Audio(sources.prime);
  primePlayer.preload='auto';
  primePlayer.volume=.04;

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
    setPlaybackSession();

    let mediaReady=mediaPrimed;
    if(!mediaPrimed){
      try{
        primePlayer.currentTime=0;
        await primePlayer.play();
        primePlayer.pause();
        primePlayer.currentTime=0;
        mediaPrimed=true;
        mediaReady=true;
      }catch{}
    }

    let webReady=false;
    const ctx=getContext();
    if(ctx){
      try{
        if(ctx.state==='suspended'){
          const resumed=ctx.resume();
          await Promise.race([
            resumed,
            new Promise(resolve=>setTimeout(resolve,250))
          ]);
        }
        webReady=ctx.state==='running';
      }catch{}
    }

    return mediaReady||webReady;
  };

  const webTone=(frequency,duration=.16,volume=.2,delay=0)=>{
    const ctx=getContext();
    if(!ctx||ctx.state!=='running')return;
    try{
      const startAt=ctx.currentTime+delay;
      const oscillator=ctx.createOscillator();
      const gain=ctx.createGain();
      oscillator.type='sine';
      oscillator.frequency.setValueAtTime(frequency,startAt);
      gain.gain.setValueAtTime(.0001,startAt);
      gain.gain.exponentialRampToValueAtTime(volume,startAt+.012);
      gain.gain.exponentialRampToValueAtTime(.0001,startAt+duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt+duration+.025);
    }catch{}
  };

  const webFallback=kind=>{
    if(kind==='tick'){
      webTone(660,.14,.2);
      return;
    }
    if(kind==='start'){
      webTone(760,.14,.2);
      webTone(1040,.2,.24,.11);
      return;
    }
    webTone(760,.15,.2);
    webTone(980,.18,.24,.12);
    webTone(1240,.23,.28,.28);
  };

  const play=kind=>{
    setPlaybackSession();
    const player=players[kind];
    if(!player){
      webFallback(kind);
      return;
    }

    try{
      player.pause();
      player.currentTime=0;
      player.volume=1;
      const result=player.play();
      if(result&&typeof result.catch==='function'){
        result.catch(()=>webFallback(kind));
      }
    }catch{
      webFallback(kind);
    }
  };

  const tick=()=>play('tick');
  const start=()=>play('start');
  const finish=()=>play('finish');

  const test=async()=>{
    const ready=await unlock();
    if(!ready)return false;
    start();
    return true;
  };

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')setPlaybackSession();
  });

  setPlaybackSession();
  window.DailyMotionAudio={unlock,tick,start,finish,test};
})();
