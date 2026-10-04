import * as T from 'three';
import {bridgeLayout,bridgeRoads} from './bridges';
import {landscapeHeight} from './landscape';
import type {SceneId} from './scenes';

export function buildConnectedBridge(scene:T.Scene,id:SceneId,material:(color:string)=>T.MeshStandardMaterial,sand:T.Material){
 const b=bridgeLayout(id);if(!b)return;
 const group=new T.Group();group.name='connected-bridge';scene.add(group);
 const mesh=(geo:T.BufferGeometry,mat:T.Material)=>{const m=new T.Mesh(geo,mat);m.receiveShadow=true;group.add(m);return m;};
 const paint=material(id==='maple'?'#8a8f89':'#8b7761'),span=b.right-b.left;
 // Joined ribbons end at the same surface elevation as the bridge deck.
 for(const points of bridgeRoads(id)){
  const vertices:number[]=[],indices:number[]=[];
  const samples:typeof points=[];
  for(let i=1;i<points.length;i++){
   const a=points[i-1],p=points[i],steps=Math.max(1,Math.ceil(Math.hypot(p.x-a.x,p.z-a.z)/.35));
   for(let j=i===1?0:1;j<=steps;j++)samples.push({x:a.x+(p.x-a.x)*j/steps,z:a.z+(p.z-a.z)*j/steps});
  }
  samples.forEach((p,i)=>{const a=samples[Math.max(0,i-1)],next=samples[Math.min(samples.length-1,i+1)],dx=next.x-a.x,dz=next.z-a.z,length=Math.hypot(dx,dz)||1;
   for(const side of [-1,1]){const x=p.x-dz/length*1.1*side,z=p.z+dx/length*1.1*side;vertices.push(x,landscapeHeight(id,x,z)+.06,z);}
   if(i<samples.length-1){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
  });
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();mesh(g,sand);
 }
 if(id==='autumn'){
  const count=Math.ceil(span/.4),step=span/count;
  for(let i=0;i<count;i++){
   const x=b.left+(i+.5)*step,y=b.deck(x),slope=(b.deck(x+.01)-b.deck(x-.01))/.02;
   const plank=mesh(new T.BoxGeometry(step+.015,.16,b.width),paint);plank.position.set(x,y-.08,b.z);plank.rotation.z=Math.atan(slope);
  }
 }else{
  const outline=new T.Shape();outline.moveTo(b.left,-.6);outline.lineTo(b.right,-.6);
  for(let i=60;i>=0;i--){const x=b.left+span*i/60;outline.lineTo(x,b.deck(x));}outline.closePath();
  for(let arch=0;arch<3;arch++){
   const cx=b.left+(arch+.5)*span/3,half=span/6-1.1,hole=new T.Path();
   hole.moveTo(cx-half,-.45);hole.lineTo(cx+half,-.45);
   for(let i=0;i<=32;i++){const dx=half*(1-i/16),x=cx+dx,y=.15+(b.deck(cx)-.9)*Math.sqrt(Math.max(0,1-(dx/half)**2));hole.lineTo(x,Math.min(y,b.deck(x)-.55));}
   hole.closePath();outline.holes.push(hole);
  }
  const body=mesh(new T.ExtrudeGeometry(outline,{depth:b.width,bevelEnabled:false,curveSegments:16}),paint);body.position.z=b.z-b.width/2;body.castShadow=true;
 }
 // Continuous parallel handrails with closed ends, rather than isolated T shapes.
 const count=Math.ceil(span/.65),step=span/count,railOffset=b.width/2-.1;
 for(let i=0;i<=count;i++)for(const side of [-1,1]){
  const x=b.left+i*step,y=b.deck(x),post=mesh(new T.BoxGeometry(.12,.85,.12),paint);post.position.set(x,y+.425,b.z+side*railOffset);
  if(i<count){const end=x+step,dy=b.deck(end)-y,rail=mesh(new T.BoxGeometry(Math.hypot(step,dy)+.03,.11,.12),paint);rail.position.set(x+step/2,y+dy/2+.85,b.z+side*railOffset);rail.rotation.z=Math.atan2(dy,step);}
 }
}
