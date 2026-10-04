import {createWorld,type CinemaFrame} from '../src/world';
import {renderScore} from './score';
import {riverCenter,landscapeHeight} from '../src/landscape';

export const duration=60;
type V=[number,number,number];
// One uninterrupted take. Every key has a continuous position and gaze tangent.
const keys=[
 {t:0,z:30,lift:2.3,look:[-5,2.5,3]},
 {t:10,z:18,lift:1.9,look:[riverCenter(14)+7.8,1.3,14]},
 {t:18,z:7,lift:1.8,look:[-14,14,-85]},
 {t:24,z:-2,lift:1.8,look:[-5,.5,-16]},
 {t:31,z:-11,lift:1.9,look:[18,3.3,-21]},
 {t:37,z:-19,lift:1.9,look:[0,2,-37]},
 {t:43,z:-27,lift:2.0,look:[-11,.8,-35]},
 {t:51,z:-35,lift:2.2,look:[-11,1.5,-32]},
 {t:60,z:-43,lift:2.6,look:[-11,4,-25]},
].map(k=>{const x=riverCenter(k.z)+10,position:V=[x,landscapeHeight('autumn',x,k.z)+k.lift,k.z],dx=k.look[0]-x,dy=k.look[1]-position[1],dz=k.look[2]-k.z;return {...k,position,yaw:Math.atan2(dx,-dz),pitch:Math.atan2(dy,Math.hypot(dx,dz))};});
for(let i=1;i<keys.length;i++){while(keys[i].yaw-keys[i-1].yaw>Math.PI)keys[i].yaw-=Math.PI*2;while(keys[i].yaw-keys[i-1].yaw < -Math.PI)keys[i].yaw+=Math.PI*2;}
const verses=[
 [4.3,10,'空山新雨后','After rain, the empty mountains.'],
 [10.3,16,'天气晚来秋','Evening carries autumn in.'],
 [16.3,22,'明月松间照','Moonlight falls among the pines.'],
 [22.3,29,'清泉石上流','Clear water flows over stone.'],
 [29.3,36,'竹喧归浣女','Through bamboo, the washerwomen return.'],
 [36.3,43,'莲动下渔舟','Lotus leaves stir. A fishing boat drifts down.'],
 [43.3,50,'随意春芳歇','Let the flowers of spring fade.'],
 [50.3,56.7,'王孙自可留','Here, I could stay.'],
] as const;
function sample(t:number,get:(k:typeof keys[number])=>number){
 const i=Math.min(keys.length-2,Math.max(0,keys.findIndex((k,j)=>j<keys.length-1&&t>=k.t&&t<=keys[j+1].t))),a=keys[i],b=keys[i+1],dt=b.t-a.t,u=Math.max(0,Math.min(1,(t-a.t)/dt));
 const prev=keys[Math.max(0,i-1)],next=keys[Math.min(keys.length-1,i+2)],m0=i===0?0:(get(b)-get(prev))/(b.t-prev.t),m1=i===keys.length-2?0:(get(next)-get(a))/(next.t-a.t);
 return (2*u**3-3*u*u+1)*get(a)+(u**3-2*u*u+u)*dt*m0+(-2*u**3+3*u*u)*get(b)+(u**3-u*u)*dt*m1;
}
const smooth=(v:number)=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
const film=document.querySelector<HTMLCanvasElement>('#film')!;
const ctx=film.getContext('2d',{alpha:false})!;
const host=document.querySelector<HTMLDivElement>('#world')!;
const W=1080,H=1920;film.width=W;film.height=H;
const buffer=document.createElement('canvas');buffer.width=W;buffer.height=H;const bctx=buffer.getContext('2d')!;
let ready=false;
const world=createWorld(host,{ready:()=>{world.pause(true);ready=true;},time:()=>{},discover:()=>{},tourEnd:()=>{},failure:()=>{throw Error('WebGL context lost');},soundPosition:()=>{}});
const exposure=(t:number,start:number,end:number)=>smooth((t-start)/.9)*smooth((end-t)/.8);
function spaced(text:string,x:number,y:number,size:number,spacing:number){
 ctx.font=`${size}px KaiTi, STKaiti, serif`;const chars=[...text],width=chars.reduce((s,c)=>s+ctx.measureText(c).width,0)+(chars.length-1)*spacing;
 let left=x-width/2;ctx.textAlign='left';for(const c of chars){ctx.fillText(c,left,y);left+=ctx.measureText(c).width+spacing;}ctx.textAlign='center';
}
function render(t:number){
 if(!ready)throw Error('Scene is not ready');
 const position=[0,1,2].map(axis=>sample(t,k=>k.position[axis])) as V,yaw=sample(t,k=>k.yaw),pitch=sample(t,k=>k.pitch);
 const target:V=[position[0]+Math.sin(yaw)*Math.cos(pitch)*40,position[1]+Math.sin(pitch)*40,position[2]-Math.cos(yaw)*Math.cos(pitch)*40];
 const shot:CinemaFrame={time:t+25,position,target,fov:56,hour:19.1,moon:[-24,39,-125],boatZ:-35+(t-36)*.10};
 ctx.globalAlpha=1;ctx.drawImage(world.cinema(shot),0,0,W,H);
 // Soft lens diffusion, cooler shadows and a restrained photographic vignette.
 bctx.drawImage(film,0,0);ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.065;ctx.filter='blur(12px)';ctx.drawImage(buffer,0,0);ctx.restore();
 ctx.fillStyle='rgba(13,38,37,.075)';ctx.fillRect(0,0,W,H);
 const vignette=ctx.createRadialGradient(W*.48,H*.44,W*.18,W*.5,H*.48,H*.68);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'rgba(3,15,18,.55)');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
 const shade=ctx.createLinearGradient(0,H*.58,0,H*.93);shade.addColorStop(0,'transparent');shade.addColorStop(1,'rgba(5,22,25,.29)');ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
 ctx.textAlign='center';ctx.fillStyle='#f5eedc';ctx.shadowColor='rgba(3,15,18,.85)';ctx.shadowBlur=16;
 const titleAlpha=exposure(t,.2,4);if(titleAlpha>0){ctx.globalAlpha=titleAlpha;spaced('山居秋暝',W/2,590,76,17);ctx.font='italic 35px Georgia';ctx.fillText('A place to stay',W/2,660);ctx.font='22px Georgia';ctx.fillText('WANG WEI  /  王维',W/2,720);}
 for(const [start,end,zh,en] of verses){const a=exposure(t,start,end);if(!a)continue;ctx.globalAlpha=a;spaced(zh,W/2,1400,51,9);ctx.font='italic 30px Georgia';ctx.fillText(en,W/2,1460);}
 const endAlpha=exposure(t,57,60.3);if(endAlpha>0){ctx.globalAlpha=endAlpha;spaced('诗境',W/2,1210,46,14);ctx.font='20px Georgia';ctx.fillText('SHIJING  ·  A LIVING POEM',W/2,1256);}
 ctx.shadowBlur=0;ctx.globalAlpha=1;
 const black=1-smooth(t/1.4)*smooth((60-t)/1.5);if(black>0){ctx.fillStyle=`rgba(5,15,17,${black})`;ctx.fillRect(0,0,W,H);}
 return film.toDataURL('image/jpeg',.94).split(',')[1];
}
(window as any).film={render,audio:renderScore,get ready(){return ready;},duration,keys,verses};
