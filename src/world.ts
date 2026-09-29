import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { landmarks, type Mode } from './poem';
import { createWatercolorMaterials, mountainRange, grassTuftGeometry } from './watercolor';

export type WorldAPI = { mode: (mode: Mode) => void; go: (index: number) => void; reset: () => void; tour: (on: boolean) => void; quality: (low: boolean) => void; motion: (reduce: boolean) => void; pause: (on: boolean) => void; input: (x: number, y: number) => void; dispose: () => void };
type Events = { ready: () => void; discover: (index: number) => void; tourEnd: () => void; failure: () => void };
export const riverX = (z: number) => Math.sin(z * .065) * 7 - 4;
const height = (x: number, z: number) => {
  const bank = Math.max(0, Math.abs(x - riverX(z)) - 4.6);
  return .25 + Math.min(1, bank / 4) * (.65 + Math.sin(x * .14 + z * .07) * .3) + Math.max(0, bank - 13) * .13;
};

export function createWorld(host: HTMLDivElement, events: Events): WorldAPI {
  let dirty=true,paused=false,disposed=false,sceneReady=false,artReady=false;
  const scene = new T.Scene();
  scene.background = new T.Color('#e9e9dd');
  scene.fog = new T.FogExp2('#e9e9dd', .007);
  const camera = new T.PerspectiveCamera(43, 1, .1, 420);
  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', '山居秋暝三维山水，拖动环顾，滚轮缩放');
  renderer.domElement.setAttribute('tabindex', '0');
  const onLost = (e: Event) => { e.preventDefault(); events.failure(); };
  renderer.domElement.addEventListener('webglcontextlost', onLost);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .065;
  controls.maxPolarAngle = Math.PI * .47; controls.minPolarAngle = .22;
  controls.minDistance = 5; controls.maxDistance = 125;
  controls.enablePan = false;
  controls.addEventListener('change',()=>{dirty=true;});
  scene.add(new T.HemisphereLight('#fff8ed', '#86959b', 2.1));
  const sunlight = new T.DirectionalLight('#fff1d8', 1.35);
  sunlight.position.set(-35, 65, -20); scene.add(sunlight);
  const fill = new T.DirectionalLight('#96bab0', .7); fill.position.set(30, 12, 40); scene.add(fill);
  let seed = 48372;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const paints = createWatercolorMaterials();
  const material = paints.material;
  const earth = material('#b1ba97'), pine = material('#416b62'), pineLight = material('#67816a'), bark = material('#726b5b'), rock = material('#a0aaa5'), stone = material('#c9c7b7');
  const darkWood = material('#8b7761'), roof = material('#526e73'), sand = material('#d8ceb1');
  const mesh = (geo: T.BufferGeometry, mat: T.Material, parent: T.Object3D = scene) => { const m = new T.Mesh(geo, mat); parent.add(m); return m; };
  const terrain = new T.PlaneGeometry(240, 240, 150, 150); terrain.rotateX(-Math.PI / 2);
  const pos = terrain.attributes.position;
  const colors = [];
  for (let i=0;i<pos.count;i++) {
    const x = pos.getX(i), z = pos.getZ(i), dist = Math.abs(x - riverX(z));
    pos.setY(i, dist < 4.5 ? -.7 : height(x,z));
    const c = new T.Color('#b4bd99').lerp(new T.Color('#dbd2b4'),1-T.MathUtils.smoothstep(dist,5,12));
    c.multiplyScalar(.97 + Math.sin(x*.23+Math.sin(z*.13))*Math.sin(z*.17)*.045); colors.push(c.r,c.g,c.b);
  }
  terrain.setAttribute('color', new T.Float32BufferAttribute(colors,3)); terrain.computeVertexNormals();
  earth.vertexColors = true; earth.color.set('#ffffff'); mesh(terrain, earth);

  // Connected ridgelines have asymmetric summits and eroded folds, not cones.
  for (let layer=0;layer<4;layer++) {
    const mat = material(['#789699','#92a9af','#acbbc0','#c1cccb'][layer],1.2);
    mat.vertexColors=true;
    const m=mesh(mountainRange(layer,random),mat);
    m.position.set(layer%2?15:-12,0,-94-layer*35);
  }
  const moon = mesh(new T.SphereGeometry(5.1,32,24),new T.MeshBasicMaterial({color:'#ffffe7',fog:false}));
  moon.position.set(-31,53,-160);

  const waterPositions:number[] = [], waterIndices:number[]=[];
  for(let i=0;i<=210;i++) {
    const z=-145+i*1.3, x=riverX(z), width=5.2+(Math.sin(z*.035)+1)*1.3;
    waterPositions.push(x-width,.07,z,x+width,.07,z);
    if(i<210) { const n=i*2; waterIndices.push(n,n+2,n+1,n+1,n+2,n+3); }
  }
  const waterGeo=new T.BufferGeometry(); waterGeo.setAttribute('position',new T.Float32BufferAttribute(waterPositions,3));waterGeo.setIndex(waterIndices);waterGeo.computeVertexNormals();
  const waterMat = material('#a6c4c1',.6);
  waterMat.transparent=true;waterMat.opacity=.93;waterMat.side=T.DoubleSide;
  const waterTime = {value:0};
  const paintWater=waterMat.onBeforeCompile.bind(waterMat);
  waterMat.onBeforeCompile = (shader,renderer) => {paintWater(shader,renderer);shader.uniforms.uTime=waterTime; shader.vertexShader='uniform float uTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.y += sin(position.z * 1.7 + uTime * 0.8) * 0.035;'); };
  waterMat.customProgramCacheKey=()=> 'watercolor-river-v1';
  mesh(waterGeo,waterMat);
  // Broken horizontal strokes on the water catch the evening light.
  const rippleMat = new T.LineBasicMaterial({color:'#e7e7c7',transparent:true,opacity:.36});
  const rippleVertices:number[]=[];
  for(let i=0;i<180;i++) { const z=random()*130-85,x=riverX(z)+(random()-.5)*9,w=.25+random()*1.4;rippleVertices.push(x,.13,z,x+w,.13,z+.015); }
  const ripples=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(rippleVertices,3)),rippleMat);scene.add(ripples);

  type Bucket = { geo:T.BufferGeometry;mat:T.Material;transforms:T.Matrix4[] };
  const artComplete=()=>{artReady=true;dirty=true;if(sceneReady&&!disposed)events.ready();};
  const foliageTexture=new T.TextureLoader().load('/art/pine-watercolor.png',artComplete,undefined,()=>{
    // Keep a usable scene if a texture fails; the leaf geometry still has volume.
    foliageMat.map=null;foliageMat.alphaTest=0;foliageMat.color.set('#688d70');foliageMat.needsUpdate=true;artComplete();
  });
  foliageTexture.colorSpace=T.SRGBColorSpace;
  foliageTexture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const foliageMat=new T.MeshBasicMaterial({map:foliageTexture,color:'#e3ebde',alphaTest:.16,side:T.DoubleSide,alphaToCoverage:true});
  const grassMat=material('#80946c');grassMat.side=T.DoubleSide;
  const roundedRock=new T.IcosahedronGeometry(1,2);
  const rockPos=roundedRock.attributes.position;
  for(let i=0;i<rockPos.count;i++){const x=rockPos.getX(i),y=rockPos.getY(i),z=rockPos.getZ(i),r=1+Math.sin(x*5+y*3)*Math.cos(z*4)*.09;rockPos.setXYZ(i,x*r,y*r,z*r);}
  // Preserve smooth sphere normals after the small surface deformation.
  const buckets:Record<string,Bucket>={
    leaves:{geo:new T.PlaneGeometry(2,1),mat:foliageMat,transforms:[]},
    light:{geo:new T.PlaneGeometry(2,1),mat:foliageMat,transforms:[]},
    trunk:{geo:new T.CylinderGeometry(.65,1,1,9),mat:bark,transforms:[]},
    rocks:{geo:roundedRock,mat:rock,transforms:[]},
    bamboo:{geo:new T.CylinderGeometry(.07,.11,1,8),mat:pine,transforms:[]},
    bambooLeaf:{geo:new T.SphereGeometry(1,10,6),mat:pineLight,transforms:[]},
    grass:{geo:grassTuftGeometry(),mat:grassMat,transforms:[]}
  };
  const dummy=new T.Object3D();
  const instance=(name:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,rz=0,ry=0,rx=0)=>{
    dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();buckets[name].transforms.push(dummy.matrix.clone());
  };
  const branch=(from:T.Vector3,to:T.Vector3,radius:number)=>{
    const direction=to.clone().sub(from);
    dummy.position.copy(from).add(to).multiplyScalar(.5);
    dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.clone().normalize());
    dummy.scale.set(radius,direction.length(),radius);dummy.updateMatrix();buckets.trunk.transforms.push(dummy.matrix.clone());
  };
  const tree=(x:number,z:number,size:number)=>{
    const ground=height(x,z),bend=(random()-.5)*1.1,phase=random()*6.28;
    const spine=(t:number)=>new T.Vector3(x+Math.sin(t*2.8)*bend*size,ground+t*6.8*size,z+Math.sin(t*3+phase)*size*.22);
    for(let j=0;j<6;j++)branch(spine(j/6),spine((j+1)/6),size*(.19-j*.022));
    for(let tier=0;tier<5;tier++) {
      const t=.4+tier*.115,start=spine(t),radius=size*(2.7-tier*.35);
      for(let j=0;j<3;j++) {
        const a=j*2.399+tier*1.7+phase,len=radius*(.7+random()*.45);
        const joint=start.clone().add(new T.Vector3(Math.cos(a)*len*.65,-.2*size,Math.sin(a)*len*.65));
        const tip=start.clone().add(new T.Vector3(Math.cos(a)*len,.38*size,Math.sin(a)*len));
        branch(start,joint,size*.072);branch(joint,tip,size*.041);
        for(let card=0;card<3;card++)instance('leaves',tip.x,tip.y+size*.15,tip.z,size*1.32,size*1.65,size,(random()-.5)*.22,a+card*Math.PI/3,card===2?-1.1:-.22);
      }
    }
  };
  const blockers:{x:number;z:number;r:number}[]=[];
  for(let i=0;i<90;i++) {
    const x=(random()-.5)*145,z=random()*105-70,dist=Math.abs(x-riverX(z));
    if(dist<10 || (x>0&&x<26&&z>-41&&z<31)) continue;
    tree(x,z,.55+random()*1.1);blockers.push({x,z,r:.9});
  }
  [[16,17,1.55],[20,12,1.1],[24,22,1.55],[17,24,.9],[-19,20,1.65],[-24,11,1.1],[-22,-12,1.1],[22,-34,1.05]].forEach(([x,z,s])=>{tree(x,z,s);blockers.push({x,z,r:.9});});
  for(let i=0;i<200;i++) {
    const z=random()*120-70,side=random()>.5?1:-1,x=riverX(z)+side*(5.5+random()*3),s=.25+random()*1.2;
    instance('rocks',x,height(x,z)-.05,z,s,s*.65,s*.8,random()*.6,random()*6);
  }
  for(let i=0;i<55;i++) {
    const x=16+random()*7,z=-23+random()*12,h=4+random()*4,g=height(x,z);
    instance('bamboo',x,g+h/2,z,1,h,1,(random()-.5)*.1);
    for(let j=0;j<5;j++) {
      const a=random()*6.28,y=g+h*.5+j*.55;
      instance('bambooLeaf',x+Math.cos(a)*.7,y,z+Math.sin(a)*.7,.85,.055,.2,.3,a);
    }
  }
  for(let i=0;i<1900;i++) {
    const z=random()*110-60,x=(random()-.5)*90,dist=Math.abs(x-riverX(z));
    if(dist<6||Math.abs(x-(riverX(z)+10))<1.6)continue;
    const h=.35+random()*.6;instance('grass',x,height(x,z),z,.8,h,.8,(random()-.5)*.25,random()*6);
  }
  for(const b of Object.values(buckets)) {
    const instanced=new T.InstancedMesh(b.geo,b.mat,b.transforms.length);
    b.transforms.forEach((m,i)=>instanced.setMatrixAt(i,m));instanced.computeBoundingSphere();scene.add(instanced);
  }
  // A continuous ribbon path follows the east bank.
  const pathVertices:number[]=[],pathIndices:number[]=[];
  for(let i=0;i<=100;i++) { const z=36-i*.8,c=riverX(z)+10;for(const dx of [-1.1,1.1])pathVertices.push(c+dx,height(c+dx,z)+.035,z);if(i<100){const n=i*2;pathIndices.push(n,n+1,n+2,n+1,n+3,n+2);} }
  const pathGeo=new T.BufferGeometry();pathGeo.setAttribute('position',new T.Float32BufferAttribute(pathVertices,3));pathGeo.setIndex(pathIndices);pathGeo.computeVertexNormals();sand.side=T.DoubleSide;mesh(pathGeo,sand);

  // An open waterside pavilion: columns, railings, and swept roof rings.
  const pavilion=new T.Group();pavilion.position.set(-16,height(-16,8),8);scene.add(pavilion);
  mesh(new T.CylinderGeometry(4.3,4.6,.5,8),stone,pavilion).position.y=.15;
  for(let i=0;i<6;i++) {
    const a=i/6*Math.PI*2,x=Math.cos(a)*3.2,z=Math.sin(a)*3.2;
    mesh(new T.CylinderGeometry(.12,.17,4.7,8),darkWood,pavilion).position.set(x,2.5,z);
    if(i!==0) {const railing=mesh(new T.BoxGeometry(3.1,.13,.13),darkWood,pavilion);railing.position.set(Math.cos(a+.52)*2.8,1.2,Math.sin(a+.52)*2.8);railing.rotation.y=-a-.52+Math.PI/2;}
  }
  const makeRoof=(radius:number,y:number)=>{
    const vertices:number[]=[],indices:number[]=[];
    [[radius,.3],[radius*.8,0],[radius*.25,1.4],[.05,2]].forEach(([r,h])=>{for(let i=0;i<=8;i++){const a=i/8*Math.PI*2;vertices.push(Math.cos(a)*r,y+h,Math.sin(a)*r);}});
    for(let ring=0;ring<3;ring++)for(let i=0;i<8;i++){const n=ring*9+i;indices.push(n,n+1,n+9,n+1,n+10,n+9);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();roof.side=T.DoubleSide;mesh(g,roof,pavilion);
    const edge=new T.LineSegments(new T.EdgesGeometry(g,28),new T.LineBasicMaterial({color:'#a1b394'}));pavilion.add(edge);
  };
  makeRoof(5.2,4.8);makeRoof(3.4,6.35);
  mesh(new T.SphereGeometry(.2,8,8),darkWood,pavilion).position.y=8.5;
  // Arched footbridge, composed from weathered timber.
  const bridgeZ=7,bridgeCenter=riverX(bridgeZ);
  for(let i=0;i<29;i++) {
    const x=bridgeCenter-9+i*.64,t=i/28,y=.65+Math.sin(t*Math.PI)*1.35;
    const plank=mesh(new T.BoxGeometry(.65,.16,1.8),darkWood);plank.position.set(x,y,bridgeZ);
    if(i%3===0)for(const s of [-1,1])mesh(new T.BoxGeometry(.1,.9,.1),darkWood).position.set(x,y+.5,bridgeZ+s*.85);
    for(const s of [-1,1]){const rail=mesh(new T.BoxGeometry(.68,.09,.09),darkWood);rail.position.set(x,y+.95,bridgeZ+s*.85);rail.rotation.z=Math.cos(t*Math.PI)*.23;}
  }
  const boat=new T.Group();boat.position.set(riverX(-35),.22,-35);boat.rotation.y=-.15;scene.add(boat);
  const hull=mesh(new T.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI/2),darkWood,boat);hull.rotation.x=Math.PI;hull.scale.set(.85,.45,2.4);
  mesh(new T.BoxGeometry(1.25,.1,3.5),sand,boat).position.y=.04;
  const canopy=mesh(new T.CylinderGeometry(.75,.75,1.8,12,1,true,0,Math.PI),material('#c0aa76'),boat);canopy.rotation.x=Math.PI/2;canopy.position.y=.25;
  for(let i=0;i<28;i++){const z=-30-random()*13,x=riverX(z)+(random()-.5)*7;const leaf=mesh(new T.CircleGeometry(.2+random()*.3,9),pineLight);leaf.rotation.x=-Math.PI/2;leaf.position.set(x,.15,z);}

  const player=new T.Group();scene.add(player);player.visible=false;
  const robe=mesh(new T.ConeGeometry(.39,1.2,24),material('#c7bba2'),player);robe.position.y=.9;
  mesh(new T.SphereGeometry(.18,12,8),material('#c2a17f'),player).position.y=1.65;
  mesh(new T.ConeGeometry(.49,.2,32),material('#8b7753'),player).position.y=1.88;
  const legs=[-.15,.15].map(x=>{const m=mesh(new T.CylinderGeometry(.065,.055,.45,6),darkWood,player);m.position.set(x,.23,0);return m;});
  const staff=mesh(new T.CylinderGeometry(.025,.03,1.65,5),bark,player);staff.position.set(.48,.82,.1);staff.rotation.z=-.12;
  player.position.set(10,height(10,27),27);

  // Small stone markers with a warm paper lantern above each discovery point.
  const markers:T.Group[]=[];
  landmarks.forEach((point,i)=>{
    const g=new T.Group();g.position.set(point.x,height(point.x,point.z),point.z);scene.add(g);markers.push(g);
    mesh(new T.BoxGeometry(.42,.75,.25),stone,g).position.set(-1,.38,0);
    const lamp=mesh(new T.OctahedronGeometry(.16),new T.MeshBasicMaterial({color:'#f5d997'}),g);lamp.position.y=2.6;
    const ring=mesh(new T.RingGeometry(.65,.69,32),new T.MeshBasicMaterial({color:'#f1e0a4',transparent:true,opacity:.55,side:T.DoubleSide}),g);ring.rotation.x=-Math.PI/2;ring.position.y=.04;
    g.userData.index=i;
  });
  const birds=new T.Group();scene.add(birds);
  for(let i=0;i<7;i++) {const geo=new T.BufferGeometry().setFromPoints([new T.Vector3(-.5,0,0),new T.Vector3(0,-.16,.05),new T.Vector3(.5,0,0)]);const b=new T.Line(geo,new T.LineBasicMaterial({color:'#536e63'}));b.position.set(i*2,Math.sin(i)*.7,i*.8);birds.add(b);}

  let mode:Mode='view',autoTour=false,tourTarget=0,tourPause=0,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let keys=new Set<string>(),touch={x:0,y:0},frame=0,previous=0,elapsed=0,checkTimer=0;
  let transition:{pos:T.Vector3;target:T.Vector3}|null=null;
  const found=new Set<number>();
  const discoverAtPlayer=()=>landmarks.forEach((p,i)=>{if(Math.hypot(player.position.x-p.x,player.position.z-p.z)<4&&!found.has(i)){found.add(i);events.discover(i);}});
  const initialCamera=new T.Vector3(46,25,66),initialTarget=new T.Vector3(-4,6,-19);
  camera.position.copy(initialCamera);controls.target.copy(initialTarget);controls.update();
  const stopTour=()=>{if(autoTour){autoTour=false;events.tourEnd();}};
  const onKey=(e:KeyboardEvent)=>{
    if((e.target as HTMLElement).closest('button,input,select,textarea,[role="dialog"]'))return;
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();keys.add(e.code);stopTour();}
  };
  const onUp=(e:KeyboardEvent)=>keys.delete(e.code);
  const clear=()=>{keys.clear();touch={x:0,y:0};previous=0;};
  window.addEventListener('keydown',onKey);window.addEventListener('keyup',onUp);window.addEventListener('blur',clear);
  const resize=()=>{const {width,height:h}=host.getBoundingClientRect();camera.aspect=width/h;camera.updateProjectionMatrix();renderer.setSize(width,h);dirty=true;};
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  const startControl=()=>{transition=null;};controls.addEventListener('start',startControl);
  const movePlayer=(dx:number,dz:number,dt:number)=>{
    const x=player.position.x+dx*dt*4,z=T.MathUtils.clamp(player.position.z+dz*dt*4,-42,31);
    const safeX=T.MathUtils.clamp(x,riverX(z)+7,28);
    if(!blockers.some(b=>Math.hypot(safeX-b.x,z-b.z)<b.r+.35))player.position.set(safeX,height(safeX,z),z);
    if(Math.abs(dx)+Math.abs(dz)>.02){player.rotation.y=Math.atan2(dx,dz);legs.forEach((l,i)=>l.rotation.x=Math.sin(elapsed*9+i*Math.PI)*.45);}
    else legs.forEach(l=>l.rotation.x=0);
  };
  const direction=new T.Vector3(),right=new T.Vector3(),up=new T.Vector3(0,1,0);
  const animate=(now:number)=>{
    if(disposed)return;
    frame=requestAnimationFrame(animate);
    if(document.hidden||paused||!artReady){previous=0;return;}
    const dt=previous?Math.min((now-previous)/1000,.05):0;previous=now;elapsed+=dt;
    if(!reduced){waterTime.value=elapsed;boat.position.y=.22+Math.sin(elapsed*.7)*.035;birds.position.set(Math.sin(elapsed*.018)*60,30,-60+Math.cos(elapsed*.018)*15);markers.forEach((g,i)=>g.children[1].position.y=2.6+Math.sin(elapsed*1.4+i)*.13);}
    if(mode==='walk') {
      const old=player.position.clone();
      if(autoTour) {
        const target=landmarks[tourTarget],tx=Math.max(target.x,riverX(target.z)+7.4),delta=new T.Vector2(tx-player.position.x,target.z-player.position.z);
        if(delta.length()<1.4){tourPause+=dt;if(tourPause>4){tourPause=0;tourTarget++;if(tourTarget>=landmarks.length)stopTour();}}
        else {delta.normalize();movePlayer(delta.x,delta.y,dt*.65);}
      } else {
        const vertical=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-touch.y;
        const horizontal=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+touch.x;
        camera.getWorldDirection(direction);direction.y=0;direction.normalize();right.crossVectors(direction,up).normalize();
        direction.multiplyScalar(vertical).addScaledVector(right,horizontal);if(direction.length()>1)direction.normalize();movePlayer(direction.x,direction.z,dt);
      }
      const delta=player.position.clone().sub(old);camera.position.add(delta);controls.target.copy(player.position).add(new T.Vector3(0,1,0));
      camera.position.y=Math.max(camera.position.y,height(camera.position.x,camera.position.z)+1.8);
      checkTimer+=dt;if(checkTimer>.25){checkTimer=0;discoverAtPlayer();}
    }
    if(transition){const factor=reduced?1:1-Math.exp(-dt*3);camera.position.lerp(transition.pos,factor);controls.target.lerp(transition.target,factor);if(camera.position.distanceTo(transition.pos)<.05)transition=null;}
    controls.update();if(!reduced||dirty){renderer.render(scene,camera);dirty=false;}
  };
  sceneReady=true;frame=requestAnimationFrame(animate);
  const setMode=(next:Mode)=>{
    mode=next;keys.clear();touch={x:0,y:0};player.visible=next==='walk';transition=null;
    if(next==='walk'){controls.minDistance=4;controls.maxDistance=17;camera.position.copy(player.position).add(new T.Vector3(-7,6,12));controls.target.copy(player.position).add(new T.Vector3(0,1,0));}
    else{stopTour();controls.minDistance=12;controls.maxDistance=125;transition={pos:initialCamera.clone(),target:initialTarget.clone()};}
    controls.update();
  };
  return {
    mode:setMode,
    go:(index)=>{const p=landmarks[index];if(!p)return;stopTour();if(mode==='walk'){player.position.set(Math.max(p.x,riverX(p.z)+7.4),height(Math.max(p.x,riverX(p.z)+7.4),p.z),p.z);camera.position.copy(player.position).add(new T.Vector3(-7,6,12));controls.target.copy(player.position).add(new T.Vector3(0,1,0));discoverAtPlayer();}else{transition={pos:new T.Vector3(p.x+18,16,p.z+22),target:new T.Vector3(p.x,2,p.z)};}},
    reset:()=>{stopTour();player.position.set(10,height(10,27),27);setMode(mode);},
    tour:(on)=>{autoTour=on;tourTarget=0;tourPause=0;if(on){setMode('walk');autoTour=true;}},
    quality:(low)=>{renderer.setPixelRatio(low?1:Math.min(window.devicePixelRatio,1.6));dirty=true;},
    motion:(reduce)=>{reduced=reduce;controls.enableDamping=!reduce;dirty=true;},
    pause:(on)=>{paused=on;dirty=true;},
    input:(x,y)=>{touch={x,y};if(x||y)stopTour();},
    dispose:()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('keydown',onKey);window.removeEventListener('keyup',onUp);window.removeEventListener('blur',clear);controls.dispose();renderer.domElement.removeEventListener('webglcontextlost',onLost);const geos=new Set<T.BufferGeometry>(),mats=new Set<T.Material>();scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){geos.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));}});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());foliageTexture.dispose();paints.dispose();renderer.dispose();renderer.domElement.remove();}
  };
}
