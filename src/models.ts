import * as T from 'three';

type Paint=(color:string,roughness?:number)=>T.MeshStandardMaterial;
const add=(parent:T.Object3D,g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;};
const rod=(parent:T.Object3D,a:T.Vector3,b:T.Vector3,r:number,m:T.Material)=>{const d=b.clone().sub(a),o=add(parent,new T.CylinderGeometry(r*.75,r,d.length(),8),m);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;};

/** Open, planked hull: raised bow/stern, ribs, seats, oar and optional woven shelter. */
export function woodenBoat(paint:Paint,covered=false){
 const group=new T.Group(),wood=paint('#66503a'),trim=paint('#927452'),inside=paint('#b29770');wood.side=T.DoubleSide;
 const vertices:number[]=[],indices:number[]=[];
 for(let i=0;i<=24;i++){
  const t=i/24,z=(t-.5)*5.8,width=.08+.9*Math.pow(Math.sin(t*Math.PI),.65),rise=Math.pow(Math.abs(t-.5)*2,3)*.55;
  for(const [x,y] of [[-width,.4],[-width*.68,-.08],[0,-.23],[width*.68,-.08],[width,.4]])vertices.push(x,y+rise,z);
  if(i<24)for(let j=0;j<4;j++){const n=i*5+j;indices.push(n,n+5,n+1,n+1,n+5,n+6);}
 }
 const hull=new T.BufferGeometry();hull.setAttribute('position',new T.Float32BufferAttribute(vertices,3));hull.setIndex(indices);hull.computeVertexNormals();add(group,hull,wood);
 for(const side of [-1,1]){
  const points=Array.from({length:25},(_,i)=>{const t=i/24;return new T.Vector3(side*(.08+.9*Math.pow(Math.sin(t*Math.PI),.65)),.4+Math.pow(Math.abs(t-.5)*2,3)*.55,(t-.5)*5.8);});
  add(group,new T.TubeGeometry(new T.CatmullRomCurve3(points),32,.055,6,false),trim);
 }
 for(let i=0;i<7;i++)add(group,new T.BoxGeometry(.15,.09,3.6),inside,(i-3)*.16,.02,0);
 for(const z of [-1.65,-.7,.8,1.7]){const w=.72*Math.pow(Math.cos(z/5.8*Math.PI),.65);add(group,new T.BoxGeometry(w*2,.09,.23),trim,0,.27,z);}
 const oar=add(group,new T.CylinderGeometry(.025,.04,3.5,8),trim,.9,.24,.6);oar.rotation.z=1.3;
 const blade=add(group,new T.SphereGeometry(1,12,8),trim,2.55,-.21,.6);blade.scale.set(.16,.43,.045);blade.rotation.z=1.3;
 if(covered){
  const cover=paint('#a49466');cover.side=T.DoubleSide;
  const canopy=add(group,new T.CylinderGeometry(.81,.81,2.1,24,1,true,0,Math.PI),cover,0,.43,-.3);canopy.rotation.x=Math.PI/2;
  for(let i=0;i<8;i++){
   const points=Array.from({length:17},(_,j)=>new T.Vector3(Math.cos(j/16*Math.PI)*.83,.43+Math.sin(j/16*Math.PI)*.83,-1.35+i*.3));
   add(group,new T.TubeGeometry(new T.CatmullRomCurve3(points),20,.022,5,false),trim);
  }
 }
 return group;
}

/** Human proportions, folded robe, belt, sleeves, hands and a woven hat. */
export function villager(paint:Paint,color:string,hat=false,seated=false){
 const group=new T.Group(),cloth=paint(color),skin=paint('#b99170'),dark=paint('#3d3931'),belt=paint('#797059');
 const drop=seated?.38:0;
 const profile=seated?[new T.Vector2(.3,.18),new T.Vector2(.36,.36),new T.Vector2(.35,.55),new T.Vector2(.21,.67),new T.Vector2(.27,.92),new T.Vector2(.14,1.04)]:[new T.Vector2(.29,.3),new T.Vector2(.32,.4),new T.Vector2(.25,.78),new T.Vector2(.21,1.05),new T.Vector2(.27,1.3),new T.Vector2(.14,1.42)];
 const robe=new T.LatheGeometry(profile,24);const p=robe.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),a=Math.atan2(z,x),s=1+Math.sin(a*12)*.045;p.setX(i,x*s);p.setZ(i,z*s);}robe.computeVertexNormals();add(group,robe,cloth);
 add(group,new T.CylinderGeometry(.221,.23,.07,24),belt,0,1.03-drop,0);
 add(group,new T.CylinderGeometry(.065,.08,.12,12),skin,0,1.44-drop,0);
 const gaze=new T.Group();gaze.name='gaze';gaze.position.y=1.59-drop;group.add(gaze);
 const head=add(gaze,new T.SphereGeometry(.145,20,16),skin);head.scale.set(.85,1.16,.95);
 add(gaze,new T.SphereGeometry(.139,16,12,0,Math.PI*2,0,Math.PI*.53),dark,0,.05,0);
 add(gaze,new T.SphereGeometry(.065,12,10),dark,0,.19,-.035);
 // A few painted features give a direction of gaze without a cartoon face.
 for(const side of [-1,1]){const eye=add(gaze,new T.SphereGeometry(.009,8,6),dark,side*.048,.025,.125);eye.scale.x=1.7;}
 const nose=add(gaze,new T.SphereGeometry(.021,10,8),skin,0,-.005,.135);nose.scale.set(.65,1.3,1);
 for(const side of [-1,1]){
  const leg=new T.Group();leg.name='stride';leg.position.set(side*.11,.4,seated?.25:0);group.add(leg);
  rod(leg,new T.Vector3(),new T.Vector3(side*.01,-.31,.03),.065,dark);
  const shoe=add(leg,new T.SphereGeometry(1,12,8),dark,side*.01,-.345,.08);shoe.scale.set(.075,.055,.16);
  const arm=new T.Group();arm.position.set(side*.21,1.29-drop,0);group.add(arm);
  rod(arm,new T.Vector3(),new T.Vector3(side*.2,-.28,.03),.125,cloth);
  rod(arm,new T.Vector3(side*.2,-.28,.03),new T.Vector3(side*.16,-.51,.12),.09,cloth);
  add(arm,new T.SphereGeometry(.065,12,8),skin,side*.16,-.54,.12);arm.name='sleeve';
 }
 // Crossed lapels lie over the chest, catching a different pigment wash.
 rod(group,new T.Vector3(-.13,1.39-drop,.17),new T.Vector3(.16,1.08-drop,.21),.022,belt);
 if(hat){add(gaze,new T.ConeGeometry(.45,.19,32),paint('#ac9566'),0,.25,0);add(gaze,new T.TorusGeometry(.43,.018,5,32),belt,0,.16,0).rotation.x=Math.PI/2;}
 return group;
}

export function flame(time:{value:number},size=1){
 const group=new T.Group();
 const material=new T.ShaderMaterial({uniforms:{uTime:time},transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
  vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`varying vec2 vUv; uniform float uTime; void main(){
   float y=vUv.y;float sway=sin(y*9.0-uTime*6.0)*.055*y+sin(y*17.0-uTime*9.0)*.03*y;
   float width=.26*pow(1.0-y,.65);float edge=1.0-smoothstep(width*.55,width,abs(vUv.x-.5-sway));
   float tongues=.8+.2*sin(y*25.0-uTime*11.0+vUv.x*13.0);float a=edge*smoothstep(0.0,.14,y)*(1.0-smoothstep(.72,1.0,y))*tongues;
   vec3 c=mix(vec3(1.0,.18,.015),vec3(1.0,.85,.3),edge*(1.0-y));gl_FragColor=vec4(c,a*.87);
  }`});
 for(const angle of [0,Math.PI/2]){const f=add(group,new T.PlaneGeometry(size*.65,size),material,0,size*.43,0);f.rotation.y=angle;}
 return group;
}

/** Thin tapered bamboo leaves in an airy spray, not thick horizontal spikes. */
export function bambooSpray(){
 const positions:number[]=[],indices:number[]=[];
 for(let i=0;i<11;i++){
  const angle=(i%2?1:-1)*(.3+(i%4)*.2),base=i*.055,length=.25+(i%3)*.13,n=positions.length/3;
  for(let j=0;j<=5;j++){
   const t=j/5,w=Math.sin(Math.PI*t)*.036,x=base+Math.cos(angle)*length*t,z=Math.sin(angle)*length*t,y=.12*Math.sin(t*Math.PI)-.22*t*t;
   positions.push(x,y,z-w,x,y,z+w);if(j<5){const k=n+j*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
