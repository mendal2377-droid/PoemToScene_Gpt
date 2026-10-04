import {createSoundscape} from '../src/audio';

/** Original pentatonic miniature and procedural location sound; no borrowed recording. */
export async function renderScore(){
 const sr=48000,seconds=60,context=new OfflineAudioContext(2,sr*seconds,sr);
 const ambience=createSoundscape(context);
 ambience.update({x:5,z:10,yaw:.3,riverX:0,scene:'autumn',hour:19});
 const score=context.createGain();score.gain.value=.29;score.connect(context.destination);
 const reverb=context.createConvolver(),impulse=context.createBuffer(2,sr*3.2,sr);
 let seed=14831;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 for(let c=0;c<2;c++){const data=impulse.getChannelData(c);for(let i=0;i<data.length;i++)data[i]=(random()*2-1)*Math.exp(-i/sr*2.7)*.3;}
 reverb.buffer=impulse;const wet=context.createGain();wet.gain.value=.22;reverb.connect(wet).connect(score);
 const pluck=(at:number,f:number,velocity:number,pan:number)=>{
  const length=sr*7,buffer=context.createBuffer(1,length,sr),data=buffer.getChannelData(0);
  // A softened string fundamental, inharmonic overtones and a short finger transient.
  const phases=Array.from({length:7},()=>random()*Math.PI*2);
  for(let i=0;i<length;i++){
   const t=i/sr;let v=0;for(let h=1;h<=7;h++)v+=Math.sin(2*Math.PI*f*h*Math.sqrt(1+.00004*h*h)*t+phases[h-1])*Math.exp(-t*(.52+h*.20))/(h*h*.6);
   data[i]=v*(1-Math.exp(-t*220))*velocity*.2+(random()*2-1)*Math.exp(-t*140)*velocity*.03;
  }
  const source=context.createBufferSource();source.buffer=buffer;const p=context.createStereoPanner();p.pan.value=pan;source.connect(p);p.connect(score);p.connect(reverb);source.start(at);
 };
 // Space is part of the phrasing. No beat or dramatic swell competes with the poem.
 const notes=[
  [1.1,146.832,.8,-.15],[3.4,440,.4,.15],[6.4,293.665,.7,.1],[8.8,329.628,.45,-.1],
  [11.4,220,.55,-.25],[13.3,587.33,.5,.2],[16.1,440,.45,.1],
  [18.4,146.832,.8,-.2],[21,293.665,.6,.25],[23.2,369.994,.35,.1],
  [25.5,329.628,.5,-.15],[28,440,.4,.15],[30.7,220,.65,-.25],
  [33,293.665,.6,.2],[35.7,493.883,.35,.05],[38.1,440,.6,.15],
  [40.3,329.628,.5,-.1],[42.3,293.665,.75,.05],[44.6,146.832,.75,-.15],[45.1,440,.2,.25]
 ];notes.forEach(n=>pluck(n[0]*1.2,n[1],n[2],n[3]));
 // Individual water droplets, clearest during the river close-up.
 for(let i=0;i<22;i++){
  const at=22+random()*7,osc=context.createOscillator(),gain=context.createGain(),pan=context.createStereoPanner();
  osc.frequency.setValueAtTime(1100+random()*800,at);osc.frequency.exponentialRampToValueAtTime(520+random()*200,at+.07);
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.015+random()*.01,at+.005);gain.gain.exponentialRampToValueAtTime(.00001,at+.16);pan.pan.value=random()*.9-.45;
  osc.connect(gain).connect(pan).connect(score);pan.connect(reverb);osc.start(at);osc.stop(at+.17);
 }
 // A dry, distant rustle evokes returning steps in the bamboo without dialogue.
 for(let i=0;i<9;i++){
  const at=29.5+i*.52,buffer=context.createBuffer(1,sr*.12,sr),data=buffer.getChannelData(0);
  let low=0;for(let j=0;j<data.length;j++){low=.87*low+.13*(random()*2-1);data[j]=low*Math.exp(-j/sr*45)*.12;}
  const s=context.createBufferSource(),p=context.createStereoPanner();s.buffer=buffer;p.pan.value=.38;s.connect(p).connect(score);s.start(at);
 }
 const positions=[{at:15,x:10,z:16,riverX:2},{at:22,x:0,z:3,riverX:-2},{at:29.5,x:18,z:-17,riverX:-10},{at:36.5,x:-6,z:-25,riverX:-11},{at:45,x:8,z:-20,riverX:-11}];
 for(const position of positions){context.suspend(position.at).then(()=>{ambience.update({...position,yaw:.3,scene:'autumn',hour:19});context.resume();});}
 const rendered=await context.startRendering();
 const bytes=new ArrayBuffer(44+rendered.length*4),view=new DataView(bytes);
 const str=(offset:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
 str(0,'RIFF');view.setUint32(4,bytes.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,sr,true);view.setUint32(28,sr*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,rendered.length*4,true);
 for(let i=0;i<rendered.length;i++){const t=i/sr,fade=Math.min(1,t/1.6,Math.max(0,(60-t)/3.2));for(let c=0;c<2;c++)view.setInt16(44+(i*2+c)*2,Math.max(-1,Math.min(1,rendered.getChannelData(c)[i]*fade))*32767,true);}
 return new Promise<string>(resolve=>{const reader=new FileReader();reader.onload=()=>resolve((reader.result as string).split(',')[1]);reader.readAsDataURL(new Blob([bytes],{type:'audio/wav'}));});
}
