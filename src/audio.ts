import type {SceneId} from './scenes';
export type SoundPosition = { x:number; z:number; yaw:number; riverX:number; rain?:number;scene?:SceneId;shelter?:number;hour?:number };

export function environmentMix(position:SoundPosition) {
  const {x,z,yaw,riverX}=position;
  const distance=Math.abs(x-riverX),bambooDistance=Math.hypot(x-19,z+17);
  const pan=(dx:number,dz:number)=>Math.max(-.85,Math.min(.85,(dx*Math.cos(yaw)-dz*Math.sin(yaw))/Math.max(4,Math.hypot(dx,dz))));
  const id=position.scene||'autumn',shelter=Math.max(0,Math.min(1,position.shelter||0)),day=(position.hour??9)>=6&&(position.hour??9)<19;
  const outdoors=1-shelter;
  const sceneRiver=id==='snow'?.28:id==='maple'?.5:id==='cave'?.32:1;
  return {
    river:(.18+.65/(1+Math.pow(Math.max(0,distance-5)/7,2)))*sceneRiver*(1-shelter*.95)*(id==='cave'?1/(1+Math.pow((z-2)/16,2)):1),
    riverPan:pan(riverX-x,id==='cave'?2-z:0),
    bamboo:(id==='autumn'?1:id==='peach'?.25:0)*(.015+.38/(1+Math.pow(bambooDistance/9,2)))*outdoors,
    bambooPan:pan(19-x,-17-z),
    wind:(.16+.06*Math.min(1,distance/20))*(1+(position.rain||0)*.35)*outdoors*(id==='snow'?.7:id==='cave'?1.7:id==='peach'?.65:1),
    rain:Math.max(0,Math.min(1,position.rain||0))*.55*outdoors,
    torch:id==='cave'?shelter*.13:0,
    drip:id==='cave'?shelter*.28:0,
    birds:id==='peach'&&day?outdoors*(1-(position.rain||0)*.75)*.25:0,
    village:id==='peach'&&z<-10?outdoors*.22/(1+Math.pow(Math.hypot(x-20,z+32)/18,2)):0,
    bell:id==='maple'?.48/(1+Math.pow(Math.hypot(x+39,z+22)/45,2)):0,
    crow:id==='maple'?.09:0,
    cuePan:pan(id==='maple'?-39-x:20-x,id==='maple'?-22-z:-32-z),
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
  const river=layer('bandpass',950,.55,.17,.13),wind=layer('lowpass',650,.5,.075,.28),bamboo=layer('bandpass',2600,.7,.31,.35),rain=layer('highpass',1500,.5,.23,.07),torch=layer('bandpass',1800,.8,7,.22);
  const cueBus=context.createGain();cueBus.connect(master);
  const cueSources=new Set<OscillatorNode>();
  let profile:SceneId='autumn',nextCue=0,cueIndex=0;
  // Sparse irregular phrases, with a real decaying echo path for cave droplets.
  const echo=context.createDelay(1);echo.delayTime.value=.23;const feedback=context.createGain();feedback.gain.value=.36;echo.connect(feedback).connect(echo);echo.connect(cueBus);
  const tone=(frequency:number,endFrequency:number,at:number,duration:number,gain:number,pan:number,type:OscillatorType='sine',reverb=false)=>{
    if(gain<.00001)return;
    const oscillator=context.createOscillator(),envelope=context.createGain(),panner=context.createStereoPanner();oscillator.type=type;
    oscillator.frequency.setValueAtTime(frequency,at);oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,endFrequency),at+Math.min(duration,.18));
    envelope.gain.setValueAtTime(0,at);envelope.gain.linearRampToValueAtTime(gain,at+.012);envelope.gain.exponentialRampToValueAtTime(.00001,at+duration);panner.pan.value=pan;
    oscillator.connect(envelope).connect(panner).connect(cueBus);if(reverb)panner.connect(echo);
    cueSources.add(oscillator);oscillator.onended=()=>{cueSources.delete(oscillator);oscillator.disconnect();envelope.disconnect();panner.disconnect();};oscillator.start(at);oscillator.stop(at+duration+.02);
  };
  const update=(position:SoundPosition)=>{
    const mix=environmentMix(position),time=context.currentTime,id=position.scene||'autumn';
    if(id!==profile){
      for(const source of cueSources){source.stop();source.disconnect();}cueSources.clear();
      profile=id;nextCue=time;cueIndex=0;
    }
    if(time>=nextCue){
      const at=time+.04;
      if(id==='maple'){
        if(cueIndex%3===0){[1,2.05,2.72,4.1].forEach((partial,i)=>tone(146*partial,146*partial,at,7-i, mix.bell*.30/(i+1),mix.cuePan));}
        else{for(let i=0;i<2;i++)tone(430,260,at+i*.4,.3,mix.crow*.25,mix.cuePan,'sawtooth');}
        nextCue=time+11+Math.random()*6;
      }else if(id==='peach'){
        if(cueIndex%4===2&&mix.village>.05){ // distant rooster, then an occasional low village dog
          for(let i=0;i<4;i++)tone(580+i*85,800,at+i*.18,i===3?.6:.15,mix.village*.25,mix.cuePan,'triangle');
        }else if(cueIndex%7===5&&mix.village>.05){tone(170,95,at,.17,mix.village*.22,mix.cuePan,'sawtooth');tone(165,90,at+.28,.16,mix.village*.18,mix.cuePan,'sawtooth');}
        else for(let i=0;i<3;i++)tone(2000+i*310,3100-i*120,at+i*.23,.15,mix.birds*.15,Math.sin(cueIndex)*.7);
        nextCue=time+5+Math.random()*5;
      }else if(id==='cave'){
        if(mix.drip>.01)tone(1700,720,at,.12,mix.drip*.18,Math.sin(cueIndex*2)*.65,'sine',true);
        nextCue=time+1.6+Math.random()*3;
      }else nextCue=time+8;
      cueIndex++;
    }
    torch.level.gain.setTargetAtTime(mix.torch,time,.5);
    river.level.gain.setTargetAtTime(mix.river,time,.35);river.panner.pan.setTargetAtTime(mix.riverPan,time,.2);
    wind.level.gain.setTargetAtTime(mix.wind,time,.7);rain.level.gain.setTargetAtTime(mix.rain,time,.7);
    bamboo.level.gain.setTargetAtTime(mix.bamboo,time,.35);bamboo.panner.pan.setTargetAtTime(mix.bambooPan,time,.2);
  };
  update({x:13,z:27,yaw:.35,riverX:3});
  return {update,dispose:()=>{sources.forEach(source=>source.stop());cueSources.forEach(source=>source.stop());echo.disconnect();feedback.disconnect();cueBus.disconnect();master.disconnect();}};
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
