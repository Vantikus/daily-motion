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
      const duration=Math.max(.03,Number(part.duration)||.1);
      const gap=Math.max(0,Number(part.gap)||0);
      const frequency=Math.max(80,Number(part.frequency)||392);
      const volume=Math.min(.2,Math.max(.005,Number(part.volume)||.05));
      const attackSeconds=Math.max(.008,Number(part.attack)||.018);
      const releaseSeconds=Math.max(.035,Math.min(duration*.9,Number(part.release)||.09));
      const toneSamples=Math.max(1,Math.floor(sampleRate*duration));
      const gapSamples=Math.floor(sampleRate*gap);
      const attackSamples=Math.max(1,Math.floor(sampleRate*attackSeconds));
      const releaseSamples=Math.max(1,Math.floor(sampleRate*releaseSeconds));

      for(let i=0;i<toneSamples;i++){
        const attackPhase=Math.min(1,i/attackSamples);
        const releasePhase=Math.min(1,(toneSamples-i)/releaseSamples);
        const attack=Math.sin(attackPhase*Math.PI*.5)**2;
        const release=Math.sin(releasePhase*Math.PI*.5)**2;
        const envelope=Math.max(0,Math.min(attack,release));
        const phase=2*Math.PI*frequency*i/sampleRate;
        samples.push(Math.sin(phase)*volume*envelope);
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

  // Quiet Motion v60: pure, low-gain sine cues tuned for phone speakers.
  const sources={
    prime:makeWav([{frequency:330,duration:.03,volume:.005,release:.025}]),
    tick:makeWav([{frequency:330,duration:.07,volume:.04,attack:.014,release:.055}]),
    warning10:makeWav([{frequency:294,duration:.12,volume:.042,attack:.02,release:.09}]),
    warning5:makeWav([
      {frequency:330,duration:.08,volume:.045,gap:.035,attack:.016,release:.06},
      {frequency:392,duration:.12,volume:.052,attack:.018,release:.09}
    ]),
    endingTick:makeWav([{frequency:349,duration:.06,volume:.046,attack:.012,release:.045}]),
    start:makeWav([
      {frequency:349,duration:.09,volume:.05,gap:.04,attack:.018,release:.065},
      {frequency:440,duration:.14,volume:.06,attack:.02,release:.10}
    ]),
    pause:makeWav([
      {frequency:349,duration:.08,volume:.043,gap:.03,attack:.016,release:.055},
      {frequency:294,duration:.11,volume:.038,attack:.018,release:.08}
    ]),
    resume:makeWav([
      {frequency:330,duration:.08,volume:.043,gap:.03,attack:.016,release:.055},
      {frequency:392,duration:.12,volume:.05,attack:.018,release:.085}
    ]),
    ready:makeWav([{frequency:392,duration:.13,volume:.05,attack:.02,release:.095}]),
    finish:makeWav([
      {frequency:392,duration:.09,volume:.047,gap:.04,attack:.017,release:.065},
      {frequency:494,duration:.16,volume:.057,attack:.02,release:.115}
    ]),
    complete:makeWav([
      {frequency:330,duration:.09,volume:.042,gap:.035,attack:.017,release:.065},
      {frequency:392,duration:.10,volume:.048,gap:.04,attack:.018,release:.072},
      {frequency:494,duration:.18,volume:.06,attack:.022,release:.13}
    ]),
    confirm:makeWav([{frequency:392,duration:.10,volume:.04,attack:.018,release:.075}])
  };

  const players=Object.fromEntries(
    Object.entries(sources)
      .filter(([name])=>name!=='prime')
      .map(([name,src])=>[name,new Audio(src)])
  );

  Object.values(players).forEach(player=>{
    player.preload='auto';
    player.volume=.62;
  });

  const primePlayer=new Audio(sources.prime);
  primePlayer.preload='auto';
  primePlayer.volume=.01;

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

  const webTone=(frequency,duration=.11,volume=.035,delay=0)=>{
    const ctx=getContext();
    if(!ctx||ctx.state!=='running')return;
    try{
      const startAt=ctx.currentTime+delay;
      const oscillator=ctx.createOscillator();
      const gain=ctx.createGain();
      oscillator.type='sine';
      oscillator.frequency.setValueAtTime(frequency,startAt);
      gain.gain.setValueAtTime(.0001,startAt);
      gain.gain.exponentialRampToValueAtTime(volume,startAt+.02);
      gain.gain.exponentialRampToValueAtTime(.0001,startAt+duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt+duration+.03);
    }catch{}
  };

  const webFallback=kind=>{
    if(kind==='tick'){
      webTone(330,.07,.025);
      return;
    }
    if(kind==='warning10'){
      webTone(294,.12,.027);
      return;
    }
    if(kind==='warning5'){
      webTone(330,.08,.027);
      webTone(392,.12,.031,.075);
      return;
    }
    if(kind==='endingTick'){
      webTone(349,.06,.028);
      return;
    }
    if(kind==='pause'){
      webTone(349,.08,.026);
      webTone(294,.11,.022,.07);
      return;
    }
    if(kind==='resume'){
      webTone(330,.08,.025);
      webTone(392,.12,.029,.07);
      return;
    }
    if(kind==='ready'||kind==='confirm'){
      webTone(392,.12,.028);
      return;
    }
    if(kind==='finish'){
      webTone(392,.09,.027);
      webTone(494,.16,.032,.08);
      return;
    }
    if(kind==='complete'){
      webTone(330,.09,.024);
      webTone(392,.10,.028,.08);
      webTone(494,.18,.034,.18);
      return;
    }
    webTone(349,.09,.028);
    webTone(440,.14,.033,.085);
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
