import * as T from 'three';
import type {SceneId} from './scenes';
import {grassTuftGeometry,addWind} from './watercolor';

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
 const lanterns:T.Mesh[]=[],smoke:T.Mesh[]=[];
 const hut=(x:number,z:number,scale:number,temple=false)=>{
  const home=new T.Group();home.position.set(x,height(x,z),z);home.scale.setScalar(scale);group.add(home);
  mesh(new T.BoxGeometry(5,2.8,3.8),plaster,home).position.y=1.4;
  const vertices=[-3,2.8,-2.6,3,2.8,-2.6,0,4.5,-2.6,-3,2.8,2.6,3,2.8,2.6,0,4.5,2.6];
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex([0,3,2,3,5,2,2,5,1,5,4,1,0,2,1,3,4,5]);g.computeVertexNormals();roof.side=T.DoubleSide;mesh(g,roof,home);
  mesh(new T.BoxGeometry(1.05,2.1,.07),wood,home).position.set(0,1.05,1.94);
  for(const x of [-1.7,1.7]){mesh(new T.BoxGeometry(.8,.9,.08),temple?lampMaterial:wood,home).position.set(x,1.6,1.95);}
  if(temple){
   for(const x of [-2.7,2.7])mesh(new T.CylinderGeometry(.12,.16,3,8),wood,home).position.set(x,1.5,2.6);
   const light=new T.PointLight('#ffb660',5,13,2);light.position.set(0,1.7,3);home.add(light);
  }
  return home;
 };
 const lantern=(x:number,z:number,y:number)=>{
  const l=mesh(new T.SphereGeometry(.22,12,8),lampMaterial);l.position.set(x,y,z);l.scale.y=1.4;lanterns.push(l);
  const reflectionMesh=mesh(new T.PlaneGeometry(.35,3),reflection);reflectionMesh.rotation.x=-Math.PI/2;reflectionMesh.position.set(x,.19,z);lanterns.push(reflectionMesh);
 };
 if(id==='snow'){
  // The single fisherman belongs to the boat, not to the walking camera.
  const fisher=new T.Group();fisher.position.set(riverX(-18),.4,-18);group.add(fisher);
  const hull=mesh(new T.SphereGeometry(1,20,10),wood,fisher);hull.scale.set(.8,.23,2.8);
  mesh(new T.ConeGeometry(.37,1.15,20),material('#73695a'),fisher).position.y=.7;
  mesh(new T.SphereGeometry(.16,12,8),wood,fisher).position.y=1.4;
  mesh(new T.ConeGeometry(.53,.17,24),material('#b3a588'),fisher).position.y=1.58;
  const rod=mesh(new T.CylinderGeometry(.014,.025,3.7,5),wood,fisher);rod.position.set(.75,1.35,.3);rod.rotation.z=-.8;
  const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(2.1,2.6,0),new T.Vector3(2.2,-.1,0)]),new T.LineBasicMaterial({color:'#717d81'}));fisher.add(line);
 }
 if(id==='maple'){
  const temple=hut(-19,-22,2.2,true);temple.rotation.y=.25;
  // A tiered bell tower and low enclosing wall sit across the water.
  for(let tier=0;tier<3;tier++){
   mesh(new T.BoxGeometry(5-tier,.6,5-tier),roof).position.set(-29,5+tier*3,-28);
   mesh(new T.BoxGeometry(2.8-tier*.4,2.5,2.8-tier*.4),plaster).position.set(-29,6.4+tier*3,-28);
  }
  mesh(new T.ConeGeometry(2.8,1.7,4),roof).position.set(-29,14,-28);
  mesh(new T.BoxGeometry(30,1.4,.5),plaster).position.set(-23,2,-16);
  for(let i=0;i<7;i++){
   const z=16-i*9,x=riverX(z)-1.5+Math.sin(i)*2;
   const boat=mesh(new T.SphereGeometry(1,16,8),wood);boat.position.set(x,.2,z);boat.scale.set(.7,.23,2.1);lantern(x,z,1);
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
   for(let n=0;n<180;n++){const xx=x-4+(n%15)*.55,zz=z-4+Math.floor(n/15)*.65;d.position.set(xx,height(xx,zz)+.03,zz);d.scale.set(1.4,1.2,1.4);d.updateMatrix();crop.setMatrixAt(n,d.matrix);}crop.computeBoundingSphere();
  }
  // A soft breath of cooking smoke, and tiny village figures beyond the passage.
  const smokeMat=new T.MeshBasicMaterial({color:'#ece8d7',transparent:true,opacity:.10,depthWrite:false});
  for(let i=0;i<7;i++){const puff=mesh(new T.SphereGeometry(1,10,8),smokeMat);puff.position.set(20+i*.2,6+i*.6,-31);puff.scale.set(.6+i*.12,.7,.5+i*.1);smoke.push(puff);}
  for(let i=0;i<5;i++){const x=12+i*4,z=-32+(i%2)*5,y=height(x,z);mesh(new T.ConeGeometry(.24,1,16),material(i%2?'#a08868':'#7e9075')).position.set(x,y+.6,z);mesh(new T.SphereGeometry(.14,10,8),wood).position.set(x,y+1.25,z);}
 }
 let torch:T.PointLight|null=null;
 const torchProp=new T.Group();group.add(torchProp);torchProp.visible=false;
 if(id==='peach'||id==='cave'){
  const start=id==='peach'?5:-7,end=id==='peach'?-10:-44,width=id==='peach'?1.8:2.6;
  const positions:number[]=[],indices:number[]=[],rings=70,segments=28;
  for(let i=0;i<=rings;i++){
   const z=T.MathUtils.lerp(start,end,i/rings),cx=riverX(z)+10,ground=height(cx,z);
   for(let j=0;j<=segments;j++){
    const a=j/segments*Math.PI,w=width*(1+Math.sin(z*.7)*.1),h=(id==='peach'?4.6:5.4)+Math.sin(z*.8)*.35;
    positions.push(cx+Math.cos(a)*w,ground-.15+Math.sin(a)*h,z);
    if(i<rings&&j<segments){const n=i*(segments+1)+j;indices.push(n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1);}
   }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();rock.side=T.DoubleSide;mesh(g,rock);
  // Broad shoulders frame the small entrance and hide the village until the gap.
  for(let i=0;i<30;i++){
   const z=start+(end-start)*random(),side=i%2?1:-1,sx=3+random()*4,x=riverX(z)+10+side*(width+sx+.1+random()*5);
   const b=mesh(new T.IcosahedronGeometry(1,2),rock);b.position.set(x,height(x,z)+2,z);b.scale.set(sx,6+random()*8,4+random()*3);
  }
  if(id==='cave'){
   const stele=mesh(new T.BoxGeometry(1.3,2.5,.38),material('#999c86'));stele.position.set(18,height(18,18)+.5,18);stele.rotation.z=-1;
   hut(-17,24,1.5);
   const mineral=material('#a5a18a');
   for(let i=0;i<50;i++){
    const z=-11-random()*32,side=i%2?1:-1,x=riverX(z)+10+side*(1.85+random()*.2),h=.5+random()*1.4;
    const m=mesh(new T.ConeGeometry(.15+random()*.3,h,10),mineral);m.position.set(x,height(x,z)+(i%3===0?4.2:h/2),z);if(i%3===0)m.rotation.z=Math.PI;
   }
   // Cap the designed route in rock; the essay never claims to reach the cave's end.
   const endRock=mesh(new T.SphereGeometry(1,16,12),rock);endRock.position.set(riverX(-45)+10,3,-45);endRock.scale.set(3,5,2);
   torch=new T.PointLight('#ffb86a',0,22,1.5);group.add(torch);
   const handle=mesh(new T.CylinderGeometry(.035,.045,.5,8),wood,torchProp);handle.position.set(.36,-.59,-.8);handle.rotation.z=-.15;
   const flame=mesh(new T.SphereGeometry(.028,16,12),new T.MeshBasicMaterial({color:'#ffce7c'}),torchProp);flame.position.set(.4,-.3,-.8);flame.scale.y=2.3;
  }
 }
 return {tick:(time:number,shelter:number,reduced:boolean)=>{
  if(torch){torchProp.visible=shelter>.1;torchProp.position.copy(camera.position);torchProp.quaternion.copy(camera.quaternion);torch.position.copy(camera.position).add(new T.Vector3(.2,-.35,-.1));torch.intensity=18*shelter*(reduced?1:1+Math.sin(time*8)*.04+Math.sin(time*13)*.025);}
  if(!reduced){lanterns.forEach((l,i)=>{if(i%2===0)l.scale.y=1.4+Math.sin(time*3+i)*.07;else l.scale.y=1+Math.sin(time*1.3+i)*.13;});smoke.forEach((p,i)=>p.position.x=20+i*.2+Math.sin(time*.3+i*.6)*.4);}
 }};
}
