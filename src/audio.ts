export type SoundPosition = { x:number; z:number; yaw:number; riverX:number };

export function environmentMix(position:SoundPosition) {
  const {x,z,yaw,riverX}=position;
  const distance=Math.abs(x-riverX),bambooDistance=Math.hypot(x-19,z+17);
  const pan=(dx:number,dz:number)=>Math.max(-.85,Math.min(.85,(dx*Math.cos(yaw)-dz*Math.sin(yaw))/Math.max(4,Math.hypot(dx,dz))));
  return {
    river:.18+.65/(1+Math.pow(Math.max(0,distance-5)/7,2)),
    riverPan:pan(riverX-x,0),
    bamboo:.015+.38/(1+Math.pow(bambooDistance/9,2)),
    bambooPan:pan(19-x,-17-z),
    wind:.16+.06*Math.min(1,distance/20),
  };
}

// Procedural sound design, not field recordings. Independent filtered noise
// layers follow the river and bamboo grove instead of playing a fixed backdrop.
export function createSoundscape(context:BaseAudioContext) {
  const master=context.createGain();master.gain.value=.28;master.connect(context.destination);
  const sources:AudioScheduledSourceNode[]=[];
  const layer=(type:BiquadFilterType,frequency:number,q:number,rate:number,depth:number)=>{
    const buffer=context.createBuffer(1,context.sampleRate*8,context.sampleRate),channel=buffer.getChannelData(0);
    let brown=0;
    for(let i=0;i<channel.length;i++){
      const white=Math.random()*2-1;brown=(brown+white*.02)/1.02;
      channel[i]=type==='lowpass'?brown*3:white*.35;
    }
    const source=context.createBufferSource();source.buffer=buffer;source.loop=true;
    const filter=context.createBiquadFilter();filter.type=type;filter.frequency.value=frequency;filter.Q.value=q;
    const level=context.createGain();level.gain.value=0;
    const swell=context.createGain();swell.gain.value=1-depth;
    const panner=context.createStereoPanner();
    const breeze=context.createOscillator();breeze.frequency.value=rate;
    const modulation=context.createGain();modulation.gain.value=depth;
    breeze.connect(modulation).connect(swell.gain);
    source.connect(filter).connect(swell).connect(level).connect(panner).connect(master);
    source.start();breeze.start();sources.push(source,breeze);
    return {level,panner};
  };
  const river=layer('bandpass',950,.55,.17,.13),wind=layer('lowpass',650,.5,.075,.28),bamboo=layer('bandpass',2600,.7,.31,.35);
  const update=(position:SoundPosition)=>{
    const mix=environmentMix(position),time=context.currentTime;
    river.level.gain.setTargetAtTime(mix.river,time,.35);river.panner.pan.setTargetAtTime(mix.riverPan,time,.2);
    wind.level.gain.setTargetAtTime(mix.wind,time,.7);
    bamboo.level.gain.setTargetAtTime(mix.bamboo,time,.35);bamboo.panner.pan.setTargetAtTime(mix.bambooPan,time,.2);
  };
  update({x:13,z:27,yaw:.35,riverX:3});
  return {update,dispose:()=>sources.forEach(source=>source.stop())};
}

export function createAmbience() {
  const context=new AudioContext(),scape=createSoundscape(context);
  let enabled=false,disposed=false;
  const visibility=()=>{
    if(disposed)return;
    if(document.hidden)void context.suspend();else if(enabled)void context.resume().catch(()=>{});
  };
  document.addEventListener('visibilitychange',visibility);
  return {
    update:scape.update,
    start:async()=>{await context.resume();enabled=true;if(document.hidden)await context.suspend();},
    stop:async()=>{enabled=false;await context.suspend();},
    dispose:()=>{disposed=true;enabled=false;document.removeEventListener('visibilitychange',visibility);scape.dispose();void context.close();},
  };
}
