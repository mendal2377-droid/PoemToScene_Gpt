import * as T from 'three';
import {villager,woodenBoat,flame} from './models';
import {waterEdges,riverCenter} from './landscape';
import type {SceneId} from './scenes';

type Options={scene:T.Scene;id:SceneId;height:(x:number,z:number)=>number;riverX:(z:number)=>number;material:(color:string,strength?:number)=>T.MeshStandardMaterial;camera:T.Camera;time:{value:number};boat?:T.Group};
const ease=(v:number)=>{v=T.MathUtils.clamp(v,0,1);return v*v*(3-2*v);};

/** Keep occupied ground and the village's approach free of intersecting vegetation. */
export function keptGround(id:SceneId,x:number,z:number){
 if(id==='autumn')return Math.hypot(x-(riverCenter(14)+7.8),z-14)<2.2||(z<-14&&z>-25&&x>17.5&&x<19.6);
 if(id!=='peach')return false;
 if(Math.hypot(x-24,z+27)<3.2)return true;
 const t=T.MathUtils.clamp((-12-z)/15,0,1),cx=T.MathUtils.lerp(riverCenter(z)+12,24,t);
 return z<-11&&z>-28&&Math.abs(x-cx)<.85;
}

/** Small, situated stories. Nothing is labelled; the visitor notices them by looking. */
export function createPresence({scene,id,height,riverX,material:paint,camera,time,boat:mainBoat}:Options){
 const root=new T.Group();root.name=`${id}: signs of a lived moment`;scene.add(root);
 const wood=paint('#66503c'),woven=paint('#a58b62'),ceramic=paint('#ab765a'),ivory=paint('#d7cbb4');
 const mesh=(parent:T.Object3D,g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;};
 const beam=(parent:T.Object3D,a:T.Vector3,b:T.Vector3,r:number,m:T.Material=wood)=>{const d=b.clone().sub(a),o=mesh(parent,new T.CylinderGeometry(r*.8,r,d.length(),8),m);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;};
 const radial=document.createElement('canvas');radial.width=radial.height=128;const ctx=radial.getContext('2d')!,gradient=ctx.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'rgba(255,255,255,.7)');gradient.addColorStop(.35,'rgba(255,255,255,.24)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
 const glowMap=new T.CanvasTexture(radial);
 const lights:{light:T.PointLight;halo:T.Sprite;intensity:number}[]=[];
 const patches:{mesh:T.Mesh;night:boolean}[]=[];
 const animated:((t:number)=>void)[]=[];
 const spot=(x:number,z:number)=>{const g=new T.Group();g.position.set(x,height(x,z),z);root.add(g);return g;};
 const shadow=(parent:T.Object3D,r=.7)=>{const m=mesh(parent,new T.PlaneGeometry(r*2,r*2),new T.MeshBasicMaterial({map:glowMap,color:'#192a26',transparent:true,opacity:.55,depthWrite:false}),0,.04,0);m.rotation.x=-Math.PI/2;return m;};
 const cup=(parent:T.Object3D,x:number,y:number,z:number,scale=1)=>{
  const c=mesh(parent,new T.LatheGeometry([new T.Vector2(.02,0),new T.Vector2(.075,.015),new T.Vector2(.1,.11),new T.Vector2(.087,.11),new T.Vector2(.055,.025)],20),ceramic,x,y,z);c.scale.setScalar(scale);c.material.side=T.DoubleSide;return c;
 };
 const basket=(parent:T.Object3D,x:number,y:number,z:number,scale=1)=>{
  const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);
  mesh(g,new T.LatheGeometry([new T.Vector2(.14,0),new T.Vector2(.23,.1),new T.Vector2(.28,.35)],20),woven).material.side=T.DoubleSide;
  for(let i=0;i<7;i++)mesh(g,new T.TorusGeometry(.17+i*.017,.009,4,24),wood,0,.025+i*.045,0).rotation.x=Math.PI/2;
  const handle=mesh(g,new T.TorusGeometry(.29,.014,5,24,Math.PI),wood,0,.34,0);handle.rotation.y=Math.PI/2;return g;
 };
 const kettle=(parent:T.Object3D,x:number,y:number,z:number)=>{
  const g=new T.Group();g.position.set(x,y,z);parent.add(g);
  mesh(g,new T.LatheGeometry([new T.Vector2(.12,0),new T.Vector2(.2,.1),new T.Vector2(.19,.24),new T.Vector2(.1,.29)],24),ceramic);
  mesh(g,new T.SphereGeometry(.115,16,8),ceramic,0,.28,0).scale.y=.3;
  beam(g,new T.Vector3(.12,.14,0),new T.Vector3(.32,.27,0),.04,ceramic);
  mesh(g,new T.TorusGeometry(.15,.016,6,24,Math.PI),wood,0,.28,0);return g;
 };
 const cloth=(parent:T.Object3D,x:number,y:number,z:number,w:number,h:number,color:string,phase=0)=>{
  const geo=new T.PlaneGeometry(w,h,12,12),mat=paint(color);mat.side=T.DoubleSide;
  const old=mat.onBeforeCompile.bind(mat);mat.onBeforeCompile=(shader,renderer)=>{old(shader,renderer);shader.uniforms.uClothTime=time;shader.vertexShader='uniform float uClothTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\n float hem=clamp(.5-position.y/${h.toFixed(3)},0.0,1.0); transformed.z += hem*(sin(position.x*6.0+uClothTime*.7+${phase.toFixed(2)})*.09+sin(position.y*8.0)*.045);`);};mat.customProgramCacheKey=()=>`lived-cloth-${w}-${h}-${phase}`;
  return mesh(parent,geo,mat,x,y,z);
 };
 const lamp=(parent:T.Object3D,x:number,y:number,z:number,scale=1,intensity=3)=>{
  const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);
  mesh(g,new T.CylinderGeometry(.17,.2,.32,12),new T.MeshBasicMaterial({color:'#f5ba70'}),0,.2,0);
  for(const y of [.02,.38])mesh(g,new T.CylinderGeometry(.23,.23,.055,12),wood,0,y,0);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;mesh(g,new T.CylinderGeometry(.014,.014,.33,6),wood,Math.cos(a)*.19,.2,Math.sin(a)*.19);}
  const halo=new T.Sprite(new T.SpriteMaterial({map:glowMap,color:'#fbc680',transparent:true,opacity:.24,depthWrite:false,blending:T.AdditiveBlending}));halo.position.y=.2;halo.scale.set(1.6,1.6,1);g.add(halo);
  const light=new T.PointLight('#ffc27a',intensity,8,1.8);light.position.y=.3;g.add(light);lights.push({light,halo,intensity});return g;
 };
 const patch=(x:number,z:number,w:number,d:number,color:string,opacity:number,night=false)=>{
  const geo=new T.PlaneGeometry(w,d,10,14);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const px=x+p.getX(i),pz=z+p.getZ(i);p.setXYZ(i,px,height(px,pz)+.055,pz);}geo.computeVertexNormals();
  const m=mesh(root,geo,new T.MeshBasicMaterial({map:glowMap,color,transparent:true,opacity,depthWrite:false}));m.userData.opacity=opacity;patches.push({mesh:m,night});return m;
 };
 const person=(parent:T.Object3D,color:string,x:number,y:number,z:number,scale=1,hat=false,seated=false)=>{
  const p=villager(paint,color,hat,seated);p.position.set(x,y,z);p.scale.setScalar(scale);parent.add(p);shadow(p,.65);return p;
 };
 const gesture=(p:T.Group,t:number,walk=0,reach=0,gaze=0)=>{
  p.children.filter(c=>c.name==='stride').forEach((l,i)=>l.rotation.x=Math.sin(t*3+i*Math.PI)*.24*walk);
  p.children.filter(c=>c.name==='sleeve').forEach((a,i)=>{a.rotation.x=-reach*.65+Math.sin(t*3+i*Math.PI)*.17*walk;a.rotation.z=(i?1:-1)*reach*.12;});
  const head=p.getObjectByName('gaze');if(head){head.rotation.y=gaze;head.rotation.x=.03+Math.sin(t*.31)*.015;}
 };
 const wake=(boat:T.Group,width:number)=>{
  const edges=new T.Group();root.add(edges);const rings:T.Mesh[]=[];
  for(let i=0;i<3;i++){const g=new T.RingGeometry(width+i*.32,width+i*.32+.018,48);g.rotateX(-Math.PI/2);const m=mesh(edges,g,new T.MeshBasicMaterial({color:'#c5d8c3',transparent:true,opacity:.15,depthWrite:false}));m.scale.z=1.7;rings.push(m);}
  animated.push(t=>{edges.position.set(boat.position.x,.105,boat.position.z);rings.forEach((r,i)=>{const phase=(t*.1+i/3)%1;r.scale.set(1+phase*.3,1,(1+phase*.3)*1.7);(r.material as T.MeshBasicMaterial).opacity=.14*(1-phase);});});
 };

 if(id==='autumn'){
  // A place is being kept for someone: a second cup, a basket, a lamp left burning.
  const rest=spot(riverX(14)+7.8,14);rest.rotation.y=.2;
  for(const x of [-.55,.55])for(const z of [-.35,.35])mesh(rest,new T.BoxGeometry(.07,.65,.07),wood,x,.34,z);
  mesh(rest,new T.BoxGeometry(1.3,.08,.86),wood,0,.7,0);cup(rest,-.35,.75,.16);cup(rest,.3,.75,-.2);kettle(rest,0,.75,.14);lamp(rest,.48,.75,.18,.65,3);
  mesh(rest,new T.BoxGeometry(1.3,.12,.45),wood,0,.42,1.05);for(const x of [-.45,.45])mesh(rest,new T.BoxGeometry(.08,.4,.3),wood,x,.2,1.05);
  basket(rest,-.9,.02,.4,1.1);cloth(rest,-.7,.45,.28,.42,.6,'#b0bab0');patch(rest.position.x,14,4,5,'#efbd73',.2,true);
  const pavilion=spot(-16,8);lamp(pavilion,0,1.0,0,1.3,4);patch(-16,8,7,7,'#e4be7a',.15,true);
  if(mainBoat){
   const boatman=person(mainBoat,'#8f9989',0,.15,1.65,.83,true,true);boatman.name='a boat returning through lotus';
   lamp(mainBoat,-.35,.4,.7,.5,1.5);
   animated.push(t=>gesture(boatman,t,0,.5+Math.sin(t*.5)*.1,Math.sin(t*.12)*.05));wake(mainBoat,1.2);
  }
  for(let i=0;i<2;i++){
   const woman=person(root,i?'#b1b6a4':'#859c97',18+i*.7,0,-20+i*1.4,1.03);woman.name='returning washerwoman';
   basket(woman,.43,.54,.05,.8);cloth(woman,.46,.64,.09,.22,.36,'#d0d7c6',i);
   animated.push(t=>{const phase=(t+i*1.1)%76,travel=ease(phase/31)-ease((phase-39)/31),z=-24+travel*7+i*1.4,x=18+i*.65+Math.sin(z*.2)*.25;
    const walking=(phase<31||phase>39)?Math.sin(Math.PI*((phase<31?phase:phase-39)/31)):0;woman.position.set(x,height(x,z)+Math.abs(Math.sin(t*3+i))*.018*walking,z);woman.rotation.y=phase<35?0:Math.PI;
    gesture(woman,t+i,walking,0,phase>31&&phase<39?-.3:0);
   });
  }
  // A few cool pools of light fall through the canopy, rather than lighting every blade equally.
  for(const [x,z,w] of [[12,25,5],[16,2,4],[17,-26,5]])patch(x,z,w,9,'#c6ddbc',.17);
  const dew=new T.InstancedMesh(new T.SphereGeometry(.014,6,4),new T.MeshBasicMaterial({color:'#d7ece1'}),48),d=new T.Object3D();root.add(dew);
  for(let i=0;i<48;i++){const z=22-i*.91,x=riverX(z)+6.4+(i%3)*.28;d.position.set(x,height(x,z)+.16+(i%4)*.11,z);d.updateMatrix();dew.setMatrixAt(i,d.matrix);}dew.computeBoundingSphere();
 }
 if(id==='snow'){
  const boat=woodenBoat(paint);boat.position.set(riverX(-18)+1,.18,-18);root.add(boat);boat.name='one fisherman, one boat';
  const fisher=person(boat,'#737b77',0,.18,.6,.86,true,true);fisher.rotation.x=.13;
  // Weathered reed cape and snow settling on the raised gunwale.
  const cape=mesh(fisher,new T.ConeGeometry(.34,.65,24,1,true),woven,0,.75,-.075);cape.scale.z=.7;
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2;beam(fisher,new T.Vector3(Math.cos(a)*.16,1.02,Math.sin(a)*.1-.07),new T.Vector3(Math.cos(a)*.34,.47,Math.sin(a)*.24-.07),.008,woven);}
  const rod=beam(boat,new T.Vector3(.3,1.05,.8),new T.Vector3(2.2,2.15,1),.018);
  const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(2.2,2.15,1),new T.Vector3(2.35,-.12,1.1)]),new T.LineBasicMaterial({color:'#67757a',transparent:true,opacity:.6}));boat.add(line);
  basket(boat,-.42,.19,-1.5,.85);kettle(boat,.22,.2,-.8);
  const snow=paint('#e5e9e3');for(let i=0;i<16;i++){const z=(i/15-.5)*5,w=.08+.9*Math.pow(Math.cos(z/5.8*Math.PI),.65);for(const s of [-1,1]){const cap=mesh(boat,new T.SphereGeometry(.12,8,6),snow,s*w,.43+Math.pow(Math.abs(z)/2.9,3)*.55,z);cap.scale.set(.7,.15,1.5);}}
  animated.push(t=>{boat.rotation.z=Math.sin(t*.42)*.009;boat.position.y=.18+Math.sin(t*.53)*.018;gesture(fisher,t,0,.5+.015*Math.sin(t*.24),-.12);rod.rotation.z=Math.sin(t*.18)*.008;});wake(boat,1.15);
 }
 if(id==='maple'){
  const boat=woodenBoat(paint,true);boat.position.set(riverX(2)+3.3,.18,2);boat.rotation.y=.08;root.add(boat);boat.name='the sleepless guest boat';
  const traveler=person(boat,'#6e737d',.08,.12,1.2,.9,false,true);traveler.rotation.y=-.8;traveler.rotation.x=.07;
  lamp(boat,-.42,.45,.8,.8,5);kettle(boat,.28,.1,-1.5);cup(boat,-.2,.1,-1.4);
  const box=mesh(boat,new T.BoxGeometry(.62,.27,.48),wood,-.25,.18,-1.75);
  cloth(boat,.16,.33,-.6,.8,.95,'#8a9299');cloth(boat,.16,.35,-.9,.8,.65,'#ac9e87',2);
  const letter=mesh(boat,new T.BoxGeometry(.26,.014,.16),ivory,box.position.x,.33,box.position.z);letter.rotation.y=.18;
  mesh(boat,new T.BoxGeometry(.04,.006,.04),ceramic,box.position.x,.344,box.position.z);
  const tether=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(boat.position.x,.5,4.6),new T.Vector3(riverX(5)+6.2,height(riverX(5)+6.2,5)+.8,5)]),new T.LineBasicMaterial({color:'#887b68'}));root.add(tether);
  const post=spot(riverX(5)+6.2,5);mesh(post,new T.CylinderGeometry(.06,.085,1.1,10),wood,0,.55,0);
  const reflectionMat=new T.MeshBasicMaterial({color:'#f4b775',transparent:true,opacity:.26,depthWrite:false});
  const reflections:T.Mesh[]=[];for(let i=0;i<22;i++){const r=mesh(root,new T.PlaneGeometry(.12+(i%4)*.09,.06),reflectionMat,boat.position.x-.4,.12,2.8+i*.17);r.rotation.x=-Math.PI/2;reflections.push(r);}
  animated.push(t=>{boat.position.y=.18+Math.sin(t*.5)*.018;boat.rotation.z=Math.sin(t*.32)*.012;gesture(traveler,t,0,.35,-.1+Math.sin(t*.12)*.08);reflections.forEach((r,i)=>r.scale.x=.8+Math.sin(t*1.1+i)*.3);});wake(boat,1.4);
 }
 if(id==='peach'){
  const courtyard=spot(24,-27);courtyard.name='a table set for the arriving guest';
  mesh(courtyard,new T.CylinderGeometry(1.1,1.12,.12,32),wood,0,.8,0);for(const x of [-.65,.65])for(const z of [-.65,.65])mesh(courtyard,new T.BoxGeometry(.09,.76,.09),wood,x,.4,z);
  for(const a of [0,2.1,4.2]){cup(courtyard,Math.cos(a)*.65,.87,Math.sin(a)*.65,1.3);const stool=mesh(courtyard,new T.CylinderGeometry(.28,.32,.42,12),wood,Math.cos(a)*1.65,.22,Math.sin(a)*1.65);stool.rotation.y=a;}
  kettle(courtyard,-.1,.87,.1);basket(courtyard,-1.3,.02,-.5,1.3);
  const elder=person(root,'#ada18c',20,0,-24,1.02);elder.position.y=height(20,-24);elder.rotation.y=-1.4;elder.name='an elder welcomes the visitor';
  const child=person(root,'#be9c7d',22,0,-28,.62);child.position.y=height(22,-28);child.rotation.y=-1;
  const gardener=person(root,'#809784',17,0,-33,1,true);gardener.name='tending the garden';gardener.position.y=height(17,-33);gardener.rotation.x=.28;
  beam(gardener,new T.Vector3(.45,.7,.1),new T.Vector3(.7,-.03,.9),.025);mesh(gardener,new T.BoxGeometry(.25,.025,.14),wood,.7,-.015,.9);
  animated.push(t=>{const close=ease((22-camera.position.distanceTo(elder.position))/15),direction=Math.atan2(camera.position.x-elder.position.x,camera.position.z-elder.position.z),turn=Math.atan2(Math.sin(direction+1.4),Math.cos(direction+1.4));elder.rotation.y=-1.4+turn*close;gesture(elder,t,0,.18+close*.75,-.1*close);gesture(child,t+2,0,.15,-.2+Math.sin(t*.2)*.13);gardener.rotation.x=.22+Math.sin(t*.65)*.07;gesture(gardener,t,0,.7,0);});
  // The village is recognised by care and daily use, not a row of idle figures.
  const washing=spot(28,-28);for(const x of [-2,2])mesh(washing,new T.CylinderGeometry(.035,.06,2.1,8),wood,x,1.05,0);
  beam(washing,new T.Vector3(-2,2,0),new T.Vector3(2,1.98,0),.008);
  for(let i=0;i<3;i++){cloth(washing,-1.25+i*1.15,1.45,0,.75,1.02,['#e3dac1','#a8b5a7','#cdb4a0'][i],i);for(const x of [-.26,.26])mesh(washing,new T.BoxGeometry(.025,.06,.028),wood,-1.25+i*1.15+x,1.98,.02);}
  patch(22,-21,12,14,'#f9e7b0',.16);
  const smoke=new T.InstancedMesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:glowMap,color:'#e6ddc4',transparent:true,opacity:.16,depthWrite:false,side:T.DoubleSide}),14),d=new T.Object3D();root.add(smoke);
  animated.push(t=>{for(let i=0;i<14;i++){const p=(t*.045+i/14)%1,x=31+p*1.8,z=-20+Math.sin(p*4)*.15;d.position.set(x,height(31,-20)+3.8+p*5,z);d.quaternion.copy(camera.quaternion);d.scale.setScalar(.3+Math.sin(p*Math.PI)*1.1);d.updateMatrix();smoke.setMatrixAt(i,d.matrix);}smoke.instanceMatrix.needsUpdate=true;});smoke.frustumCulled=false;
  // A broken garden path links the narrow opening to a hospitable threshold.
  for(let i=0;i<25;i++){const t=i/24,z=-12-t*15,x=T.MathUtils.lerp(riverX(z)+12,24,t),stone=mesh(root,new T.IcosahedronGeometry(.45,1),paint('#b1af91'));stone.position.set(x,height(x,z)+.015,z);stone.scale.set(1,.09,.65);stone.rotation.y=i*.8;}
 }
 if(id==='cave'){
  for(let i=0;i<2;i++){
   const z=i?-48:-23,x=riverX(z)+10+(i?2.8:1.65),y=height(x,z),scholar=person(root,i?'#909b8e':'#ab9b7e',x,y,z,1);
   scholar.name=i?'a companion waits at the chamber':'a companion turns back';scholar.rotation.y=i?Math.PI-.3:.35;
   const arm=scholar.children.find(c=>c.name==='sleeve')!;beam(arm,new T.Vector3(-.17,-.5,.12),new T.Vector3(-.2,.25,.18),.025);
   const fire=flame(time,.37);fire.position.set(-.2,.27,.18);arm.add(fire);arm.rotation.x=-.55;
   const light=new T.PointLight('#ffbf7e',7,9,1.7);light.position.set(-.3,1.9,.55);scholar.add(light);
   animated.push(t=>{const nearby=ease((16-camera.position.distanceTo(scholar.position))/12);gesture(scholar,t,0,.35+nearby*.35,.35*nearby);arm.rotation.x=-.55+Math.sin(t*.35)*.025;light.intensity=6.5+Math.sin(t*7.3)*.25;});
  }
  // Water travelling down stone is visible evidence of time, with a reflected glint.
  const drips=new T.Points(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(new Float32Array(12*3),3)),new T.PointsMaterial({color:'#c0cfc4',size:.035,transparent:true,opacity:.4,depthWrite:false}));root.add(drips);
  animated.push(t=>{const p=drips.geometry.attributes.position;for(let i=0;i<12;i++){const z=-47-i*.62,x=riverX(z)+5.7+(i%3)*.23,h=height(x,z);p.setXYZ(i,x,h+6-((t*.9+i*.49)%6),z);}p.needsUpdate=true;});
 }
 // Water receives a broken moon path; it is absent in the village and sheltered cave.
 const moonPath=new T.InstancedMesh(new T.PlaneGeometry(1,.06),new T.MeshBasicMaterial({color:'#d2dfd6',transparent:true,opacity:0,depthWrite:false}),64),d=new T.Object3D();root.add(moonPath);
 for(let i=0;i<64;i++){const z=16-i*.72,edges=waterEdges(id,z),x=T.MathUtils.lerp(edges.left,edges.right,.38)+Math.sin(i*3.7)*.35;d.position.set(x,.115,z);d.rotation.x=-Math.PI/2;d.scale.set(.2+(i%5)*.11,1,1);d.updateMatrix();moonPath.setMatrixAt(i,d.matrix);}moonPath.computeBoundingSphere();
 return {
  tick:(t:number,reduced:boolean,hour:number,moonVisible=true)=>{
   const daylight=1-ease(Math.min(Math.abs(hour-12),12)/6),darkness=1-daylight;
   lights.forEach(({light,halo,intensity})=>{light.intensity=intensity*(.12+darkness*.88)*(reduced?1:1+Math.sin(t*3.1)*.025);halo.material.opacity=.08+darkness*.2;});
   patches.forEach(({mesh:m,night:n})=>{(m.material as T.MeshBasicMaterial).opacity=m.userData.opacity*(n?darkness:daylight);});
   (moonPath.material as T.MeshBasicMaterial).opacity=(id==='autumn'?.14:id==='maple'?.07:0)*darkness*(moonVisible?1:0);
   // Reduced motion keeps the narrative tableau, but never advances it.
   animated.forEach(fn=>fn(reduced?12:t));
  },
  dispose:()=>glowMap.dispose(),
 };
}
