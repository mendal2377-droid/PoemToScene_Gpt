import * as T from 'three';
import {woodenBoat,flame} from './models';
import {caveSection,waterEdges} from './landscape';
import type {SceneId} from './scenes';
import {grassTuftGeometry,addWind} from './watercolor';
import {mountainShell} from './massif';
import {keptGround} from './presence';

/** Small painted marks generated in canvas, arranged in real 3D branches. */
export function paintedLeaves(id:SceneId,random:()=>number){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=160;const c=canvas.getContext('2d')!;
 for(let i=0;i<210;i++){
  const x=25+random()*205,y=30+random()*95,r=3+random()*12;
  c.save();c.translate(x,y);c.rotate(random()*6.28);c.globalAlpha=.35+random()*.5;
  if(id==='peach'){
   c.fillStyle=['#f1bdc5','#e4a2b0','#ffd9d2','#fff0df','#cd7c94'][i%5];
   for(let j=0;j<5;j++){const a=j*6.28/5;c.beginPath();c.ellipse(Math.cos(a)*r*.45,Math.sin(a)*r*.45,r*.58,r*.35,a,0,6.28);c.fill();}
  }else{
   c.fillStyle=['#b74c34','#d97b3d','#d6a653','#8b422f','#e8ba72'][i%5];c.beginPath();
   for(let j=0;j<10;j++){const a=j*Math.PI/5,rr=j%2?r*.43:r;c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}c.closePath();c.fill();
  }c.restore();
 }
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture;
}

type Options={scene:T.Scene;id:SceneId;random:()=>number;height:(x:number,z:number)=>number;riverX:(z:number)=>number;material:(color:string,roughness?:number)=>T.MeshStandardMaterial;camera:T.Camera;time:{value:number}};
export function buildSceneDetails({scene,id,random,height,riverX,material,camera,time:windTime}:Options){
 const group=new T.Group();scene.add(group);
 const mesh=(g:T.BufferGeometry,m:T.Material,parent:T.Object3D=group)=>{const o=new T.Mesh(g,m);parent.add(o);return o;};
 const wood=material('#594734'),plaster=material('#ded4b3'),roof=material('#4f5550'),rock=material('#62736b');
 const lampMaterial=new T.MeshBasicMaterial({color:'#ffd699'}),reflection=new T.MeshBasicMaterial({color:'#edb46e',transparent:true,opacity:.5,depthWrite:false});
 const lanterns:T.Mesh[]=[],smoke:T.Mesh[]=[],boats:T.Group[]=[],people:T.Group[]=[];
 const hut=(x:number,z:number,scale:number,temple=false)=>{
  const home=new T.Group();home.position.set(x,height(x,z),z);home.scale.setScalar(scale);group.add(home);
  mesh(new T.BoxGeometry(5,2.8,3.8),plaster,home).position.y=1.4;
  const vertices=[-3,2.8,-2.6,3,2.8,-2.6,0,4.5,-2.6,-3,2.8,2.6,3,2.8,2.6,0,4.5,2.6];
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex([0,3,2,3,5,2,2,5,1,5,4,1,0,2,1,3,4,5]);g.computeVertexNormals();roof.side=T.DoubleSide;mesh(g,roof,home);
  mesh(new T.BoxGeometry(1.05,2.1,.07),wood,home).position.set(0,1.05,1.94);
  for(const x of [-2.4,2.4])mesh(new T.BoxGeometry(.13,2.8,.13),wood,home).position.set(x,1.4,1.96);
  mesh(new T.BoxGeometry(5,.16,.15),wood,home).position.set(0,2.65,1.96);
  mesh(new T.BoxGeometry(5.4,.12,.3),wood,home).position.set(0,2.8,2.3);
  for(const x of [-1.7,1.7]){mesh(new T.BoxGeometry(.8,.9,.08),temple?lampMaterial:wood,home).position.set(x,1.6,1.95);}
  if(temple){
   for(const x of [-2.7,2.7])mesh(new T.CylinderGeometry(.12,.16,3,8),wood,home).position.set(x,1.5,2.6);
   const light=new T.PointLight('#ffb660',5,13,2);light.position.set(0,1.7,3);home.add(light);
  }
  return home;
 };
 const lantern=(x:number,z:number,y:number)=>{
  const l=mesh(new T.CircleGeometry(.1,12),reflection);l.rotation.x=-Math.PI/2;l.position.set(x,y,z);lanterns.push(l);
  const reflectionMesh=mesh(new T.PlaneGeometry(.35,3),reflection);reflectionMesh.rotation.x=-Math.PI/2;reflectionMesh.position.set(x,.19,z);lanterns.push(reflectionMesh);
 };
 if(id==='maple'){
  const temple=hut(-39,-22,2.2,true);temple.rotation.y=.25;
  // The crossing itself shares its geometry and elevation with pedestrian navigation.
  const bridgeStone=material('#8a8f89');
  const quay=mesh(new T.BoxGeometry(8,1.5,64),bridgeStone);quay.position.set(-34,-.35,-17);
  // A tiered bell tower and low enclosing wall sit across the water.
  for(let tier=0;tier<3;tier++){
   mesh(new T.BoxGeometry(5-tier,.6,5-tier),roof).position.set(-49,5+tier*3,-28);
   mesh(new T.BoxGeometry(2.8-tier*.4,2.5,2.8-tier*.4),plaster).position.set(-49,6.4+tier*3,-28);
  }
  mesh(new T.ConeGeometry(2.8,1.7,4),roof).position.set(-49,14,-28);
  const gate=waterEdges(id,-16).left-4.2;
  for(const [a,b] of [[-58,gate-1.5],[gate+1.5,-28]])if(b>a)mesh(new T.BoxGeometry(b-a,1.4,.5),plaster).position.set((a+b)/2,height((a+b)/2,-16)+.7,-16);
  for(let i=0;i<7;i++){
   const z=16-i*9,x=riverX(z)-1.5+Math.sin(i)*2;
   const boat=woodenBoat(material,i%3===0);boat.position.set(x,.18,z);boat.rotation.y=.12*Math.sin(i);boat.scale.setScalar(.8);group.add(boat);boats.push(boat);
   const post=mesh(new T.CylinderGeometry(.022,.03,1.15,8),wood,boat);post.position.set(.42,.85,1.6);const lamp=mesh(new T.CylinderGeometry(.14,.14,.25,12),lampMaterial,boat);lamp.position.set(.42,1.15,1.6);for(const y of [1.01,1.28])mesh(new T.CylinderGeometry(.17,.17,.035,12),wood,boat).position.set(.42,y,1.6);lantern(x+.34,z+1.28,.13);
  }
 }
 if(id==='peach'){
  const cropMat=material('#95a953');cropMat.side=T.DoubleSide;addWind(cropMat,windTime,.12,true);
  for(let i=0;i<7;i++)hut(31+(i%3)*7,-20-Math.floor(i/3)*11,.85+(i%2)*.2);
  for(let i=0;i<4;i++){
   const x=14+(i%2)*12,z=-20-Math.floor(i/2)*14;
   const fieldGeometry=new T.PlaneGeometry(10,10,12,12);fieldGeometry.rotateX(-Math.PI/2);const fp=fieldGeometry.attributes.position;
   for(let v=0;v<fp.count;v++){const xx=fp.getX(v)+x,zz=fp.getZ(v)+z;fp.setXYZ(v,xx,height(xx,zz)+.03,zz);}fieldGeometry.computeVertexNormals();
   mesh(fieldGeometry,material(i%2?'#a3b36b':'#b6ba78'));
   const crop=new T.InstancedMesh(grassTuftGeometry(),cropMat,180);group.add(crop);const d=new T.Object3D();
   let count=0;for(let n=0;n<180;n++){const xx=x-4+(n%15)*.55,zz=z-4+Math.floor(n/15)*.65;if(keptGround(id,xx,zz))continue;d.position.set(xx,height(xx,zz)+.03,zz);d.scale.set(1.4,1.2,1.4);d.updateMatrix();crop.setMatrixAt(count++,d.matrix);}crop.count=count;crop.computeBoundingSphere();
  }
  // Quiet ponds and low woven boundaries distinguish a lived-in pastoral basin.
  const pondMat=material('#8db6a5');pondMat.transparent=true;pondMat.opacity=.86;
  for(const [x,z,rx,rz] of [[20,-10,4,2.5],[22,-39,5,3]]){
   const pond=mesh(new T.CircleGeometry(1,48),pondMat);pond.rotation.x=-Math.PI/2;pond.scale.set(rx,rz,1);pond.position.set(x,height(x,z)+.12,z);
   for(let j=0;j<18;j++){const a=j/18*Math.PI*2,px=x+Math.cos(a)*(rx+.3),pz=z+Math.sin(a)*(rz+.3);const stone=mesh(new T.SphereGeometry(.3,10,8),rock);stone.position.set(px,height(px,pz)+.13,pz);stone.scale.y=.45;}
  }
  for(let i=0;i<25;i++){
   const x=28+i*.7,z=-12,y=height(x,z);mesh(new T.CylinderGeometry(.035,.055,1,5),wood).position.set(x,y+.5,z);
   for(const dy of [.3,.65])mesh(new T.BoxGeometry(.85,.055,.06),wood).position.set(x,y+dy,z);
  }
  const arrivalBoat=woodenBoat(material,true);arrivalBoat.position.set(riverX(12),.16,12);group.add(arrivalBoat);boats.push(arrivalBoat);
 }
 let torch:T.PointLight|null=null;
 const torchProp=new T.Group();group.add(torchProp);torchProp.visible=false;
 if(id==='peach'||id==='cave'){
  const start=id==='peach'?5:-7,end=id==='peach'?-10:-86,width=id==='peach'?1.8:2.6;
  const positions:number[]=[],indices:number[]=[],rings=70,segments=28;
  for(let i=0;i<=rings;i++){
   const z=T.MathUtils.lerp(start,end,i/rings),cx=riverX(z)+10,ground=height(cx,z);
   for(let j=0;j<=segments;j++){
    const a=j/segments*Math.PI,w=(id==='cave'?caveSection(z).width:width)*(1+Math.sin(z*.7)*.06),h=(id==='peach'?4.6:caveSection(z).ceiling)+Math.sin(z*.8)*.35;
    positions.push(cx+Math.cos(a)*w,ground-.15+Math.sin(a)*h,z);
    if(i<rings&&j<segments){const n=i*(segments+1)+j;indices.push(n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1);}
   }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();rock.side=T.DoubleSide;mesh(g,rock);
  const cliff=material(id==='cave'?'#737a74':'#7e8c5e',1.25);cliff.vertexColors=true;cliff.side=T.DoubleSide;
  const outer=mesh(mountainShell(start,end,id==='cave'?37:19,id==='cave'?65:12,width,id==='cave'?5.4:4.6,z=>riverX(z)+10,height),cliff);
  outer.name=id==='cave'?'Baochan connected limestone massif':'Peach valley low mossy ridge';
  if(id==='cave'){
   const stele=mesh(new T.BoxGeometry(1.3,2.5,.38),material('#999c86'));stele.position.set(18,height(18,18)+.5,18);stele.rotation.z=-1;
   const monastery=hut(-5,27,1.4,true);monastery.rotation.y=-.2;
   // Real stone treads rise with the ground; the walking camera follows the same elevation.
   const steps=new T.InstancedMesh(new T.BoxGeometry(2.55,.25,.6),material('#a5a592'),64),tread=new T.Object3D();group.add(steps);
   for(let i=0;i<64;i++){
    const z=26-i*.51,x=riverX(z)+10,y=height(x,z);
    tread.position.set(x,y-.03,z);tread.rotation.y=Math.atan(Math.cos(z*.065)*7*.065);tread.updateMatrix();steps.setMatrixAt(i,tread.matrix);steps.setColorAt(i,new T.Color(i%5?'#d7d9cd':'#f0e5c8'));
   }
   steps.computeBoundingSphere();
   for(let i=0;i<9;i++){const z=24-i*3.8,x=riverX(z)+11.65;mesh(new T.CylinderGeometry(.08,.12,.9,8),rock).position.set(x,height(x,z)+.4,z);}
   // A warm ember marks the cave mouth, with no floating text or waypoint.
   const mouthX=riverX(-7)+10,mouthY=height(mouthX,-7);
   mesh(new T.CylinderGeometry(.045,.06,1.2,8),wood).position.set(mouthX+2.1,mouthY+1,-6.7);
   const mouthFlame=flame(windTime,.65);group.add(mouthFlame);mouthFlame.position.set(mouthX+2.1,mouthY+1.6,-6.7);
   const mouthLight=new T.PointLight('#ffb96e',12,12,1.8);mouthLight.position.copy(mouthFlame.position);group.add(mouthLight);
   const mineral=material('#a5a18a');
   for(let i=0;i<50;i++){
    const z=-11-random()*65,side=i%2?1:-1,x=riverX(z)+10+side*(caveSection(z).width-.6-random()*.3),h=.5+random()*1.8;
    const m=mesh(new T.LatheGeometry([new T.Vector2(.2+random()*.25,0),new T.Vector2(.18,h*.25),new T.Vector2(.13,h*.55),new T.Vector2(.06,h*.82),new T.Vector2(.008,h)],16),mineral);m.position.set(x,height(x,z)+(i%3===0?caveSection(z).ceiling-.4:0),z);if(i%3===0)m.rotation.z=Math.PI;
   }
   // The narrow approach opens into a cavern, with a passage continuing into darkness.
   const cx=riverX(-52)+10,cy=height(cx,-52);
   const poolGeometry=new T.CircleGeometry(2.2,48);poolGeometry.rotateX(-Math.PI/2);const pp=poolGeometry.attributes.position;for(let i=0;i<pp.count;i++){const x=pp.getX(i)+cx-4.7,z=pp.getZ(i)*1.5-52;pp.setXYZ(i,x,height(x,z)+.09,z);}poolGeometry.computeVertexNormals();mesh(poolGeometry,material('#496b66'));
   for(let i=0;i<22;i++){const a=i/22*Math.PI*2,x=cx-4.7+Math.cos(a)*2.5,z=-52+Math.sin(a)*3.7;const stone=mesh(new T.IcosahedronGeometry(.45,2),rock);stone.position.set(x,height(x,z)+.1,z);stone.scale.set(1,.45,1);}
   const pillar=mesh(new T.LatheGeometry([new T.Vector2(1.25,0),new T.Vector2(.85,1.4),new T.Vector2(.55,4),new T.Vector2(.8,6),new T.Vector2(1.35,8)],24),rock);pillar.position.set(cx+4,height(cx+4,-53),-53);
   const poolLight=new T.PointLight('#91bcb3',7,22,1.7);poolLight.position.set(cx-4,cy+6,-53);group.add(poolLight);
   for(let i=0;i<3;i++){const z=-40-i*10,x=riverX(z)+10+3,y=height(x,z);const fire=flame(windTime,.45);fire.position.set(x,y+1.1,z);group.add(fire);mesh(new T.CylinderGeometry(.04,.06,1.15,8),wood).position.set(x,y+.55,z);const light=new T.PointLight('#ffb56c',9,15,1.8);light.position.set(x,y+1.4,z);group.add(light);}
   torch=new T.PointLight('#ffb86a',0,22,1.5);group.add(torch);
   const handle=mesh(new T.CylinderGeometry(.035,.045,.5,8),wood,torchProp);handle.position.set(.36,-.59,-.8);handle.rotation.z=-.15;
   const fire=flame(windTime,.23);torchProp.add(fire);fire.position.set(.4,-.32,-.8);for(const y of [-.39,-.43])mesh(new T.CylinderGeometry(.047,.047,.024,12),rock,torchProp).position.set(.39,y,-.8);
  }
 }
 return {tick:(time:number,shelter:number,reduced:boolean)=>{
  if(torch){torchProp.visible=shelter>.1;torchProp.position.copy(camera.position);torchProp.quaternion.copy(camera.quaternion);torch.position.copy(camera.position).add(new T.Vector3(.2,-.35,-.1));torch.intensity=18*shelter*(reduced?1:1+Math.sin(time*8)*.04+Math.sin(time*13)*.025);}
  if(!reduced){boats.forEach((b,i)=>{b.position.y=.18+Math.sin(time*.65+i)*.025;b.rotation.z=Math.sin(time*.5+i)*.012;});people.forEach((p,i)=>{p.rotation.z=Math.sin(time*.65+i)*.012;p.children.filter(c=>c.name==='sleeve').forEach((a,j)=>a.rotation.x=Math.sin(time*.8+i+j)*.07);});lanterns.forEach((l,i)=>{if(i%2===0)l.scale.y=1.4+Math.sin(time*3+i)*.07;else l.scale.y=1+Math.sin(time*1.3+i)*.13;});smoke.forEach((p,i)=>p.position.x=20+i*.2+Math.sin(time*.3+i*.6)*.4);}
 }};
}
