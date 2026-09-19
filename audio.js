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
      const duration=Math.max(.025,Number(part.duration)||.1);
      const gap=Math.max(0,Number(part.gap)||0);
      const frequency=Math.max(80,Number(part.frequency)||440);
      const volume=Math.min(.35,Math.max(.01,Number(part.volume)||.12));
      const attackSeconds=Math.max(.004,Number(part.attack)||.014);
      const releaseSeconds=Math.max(.025,Math.min(duration*.8,Number(part.release)||.085));
      const toneSamples=Math.floor(sampleRate*duration);
      const gapSamples=Math.floor(sampleRate*gap);
      const attackSamples=Math.max(1,Math.floor(sampleRate*attackSeconds));
      const releaseSamples=Math.max(1,Math.floor(sampleRate*releaseSeconds));

      for(let i=0;i<toneSamples;i++){
        const attack=Math.min(1,i/attackSamples);
        const release=Math.min(1,(toneSamples-i)/releaseSamples);
        const envelope=Math.max(0,Math.min(attack,release));
        const phase=2*Math.PI*frequency*i/sampleRate;
        const fundamental=Math.sin(phase);
        const warmth=Math.sin(phase*.5)*.08;
        samples.push((fundamental+warmth)*volume*envelope);
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

  // Quiet Motion: softer, lower and shorter than notification-style beeps.
  const sources={
    prime:makeWav([{frequency:330,duration:.025,volume:.01,release:.02}]),
    tick:makeWav([{frequency:392,duration:.075,volume:.105,attack:.01,release:.055}]),
    start:makeWav([
      {frequency:440,duration:.10,volume:.12,gap:.035,release:.07},
      {frequency:554,duration:.16,volume:.14,release:.11}
    ]),
    pause:makeWav([
      {frequency:392,duration:.09,volume:.10,gap:.025,release:.06},
      {frequency:330,duration:.12,volume:.085,release:.085}
    ]),
    resume:makeWav([
      {frequency:392,duration:.08,volume:.09,gap:.025,release:.055},
      {frequency:494,duration:.13,volume:.115,release:.09}
    ]),
    ready:makeWav([{frequency:523,duration:.15,volume:.125,release:.105}]),
    finish:makeWav([
      {frequency:494,duration:.10,volume:.105,gap:.035,release:.07},
      {frequency:659,duration:.19,volume:.135,release:.13}
    ]),
    complete:makeWav([
      {frequency:440,duration:.10,volume:.095,gap:.035,release:.07},
      {frequency:554,duration:.11,volume:.11,gap:.04,release:.075},
      {frequency:659,duration:.22,volume:.14,release:.15}
    ]),
    confirm:makeWav([{frequency:523,duration:.11,volume:.095,release:.08}])
  };

  const players=Object.fromEntries(
    Object.entries(sources)
      .filter(([name])=>name!=='prime')
      .map(([name,src])=>[name,new Audio(src)])
  );

  Object.values(players).forEach(player=>{
    player.preload='auto';
    player.volume=.82;
  });

  const primePlayer=new Audio(sources.prime);
  primePlayer.preload='auto';
  primePlayer.volume=.02;

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

  const webTone=(frequency,duration=.13,volume=.075,delay=0)=>{
    const ctx=getContext();
    if(!ctx||ctx.state!=='running')return;
    try{
      const startAt=ctx.currentTime+delay;
      const oscillator=ctx.createOscillator();
      const gain=ctx.createGain();
      oscillator.type='sine';
      oscillator.frequency.setValueAtTime(frequency,startAt);
      gain.gain.setValueAtTime(.0001,startAt);
      gain.gain.exponentialRampToValueAtTime(volume,startAt+.014);
      gain.gain.exponentialRampToValueAtTime(.0001,startAt+duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt+duration+.025);
    }catch{}
  };

  const webFallback=kind=>{
    if(kind==='tick'){
      webTone(392,.08,.055);
      return;
    }
    if(kind==='pause'){
      webTone(392,.09,.055);
      webTone(330,.12,.045,.08);
      return;
    }
    if(kind==='resume'){
      webTone(392,.08,.05);
      webTone(494,.13,.06,.075);
      return;
    }
    if(kind==='ready'||kind==='confirm'){
      webTone(523,.14,.06);
      return;
    }
    if(kind==='finish'){
      webTone(494,.10,.055);
      webTone(659,.19,.07,.09);
      return;
    }
    if(kind==='complete'){
      webTone(440,.10,.05);
      webTone(554,.11,.06,.09);
      webTone(659,.22,.075,.20);
      return;
    }
    webTone(440,.10,.06);
    webTone(554,.16,.07,.09);
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
      const result=player.play();
      if(result&&typeof result.catch==='function'){
        result.catch(()=>webFallback(kind));
      }
    }catch{
      webFallback(kind);
    }
  };

  const api={unlock};
  Object.keys(players).forEach(kind=>{api[kind]=()=>play(kind);});

  api.test=async()=>{
    const ready=await unlock();
    if(!ready)return false;
    play('confirm');
    return true;
  };

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')setPlaybackSession();
  });

  setPlaybackSession();
  window.DailyMotionAudio=api;
})();
