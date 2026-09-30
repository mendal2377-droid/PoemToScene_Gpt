import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { type Mode } from './poem';
import {scenes,shelterAt,type SceneDefinition} from './scenes';
import {buildSceneDetails,paintedLeaves} from './sceneDetails';
import { createWatercolorMaterials, mountainRange, grassTuftGeometry, fernGeometry, addWind } from './watercolor';
import type { SoundPosition } from './audio';
import {createAtmosphere,type EnvironmentSettings} from './environment';

export type WorldAPI = { environment: (settings:Partial<EnvironmentSettings>) => void; mode: (mode: Mode) => void; go: (index: number) => void; reset: () => void; tour: (on: boolean) => void; quality: (low: boolean) => void; motion: (reduce: boolean) => void; pause: (on: boolean) => void; input: (x: number, y: number) => void; dispose: () => void };
type Events = { time: (hour:number) => void; ready: () => void; discover: (index: number) => void; tourEnd: () => void; failure: () => void; soundPosition: (position:SoundPosition) => void };
export const riverX = (z: number) => Math.sin(z * .065) * 7 - 4;
const height = (x: number, z: number) => {
  const bank = Math.max(0, Math.abs(x - riverX(z)) - 4.6);
  return .25 + Math.min(1, bank / 4) * (.65 + Math.sin(x * .14 + z * .07) * .3) + Math.max(0, bank - 13) * .13;
};

export function createWorld(host: HTMLDivElement, events: Events, definition:SceneDefinition=scenes[0]): WorldAPI {
  const id=definition.id,landmarks=definition.landmarks;
  const winter=id==='snow',flower=id==='peach',maple=id==='maple',cave=id==='cave';
  let dirty=true,paused=false,disposed=false,sceneReady=false,artReady=false;
  const scene = new T.Scene();
  scene.background = new T.Color('#d5e3ce');
  scene.fog = new T.FogExp2('#d5e3ce', .008);
  const camera = new T.PerspectiveCamera(43, 1, .1, 420);
  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .92;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', `${definition.title}三维山水，拖动环顾，滚轮缩放`);
  renderer.domElement.setAttribute('tabindex', '0');
  const onLost = (e: Event) => { e.preventDefault(); events.failure(); };
  renderer.domElement.addEventListener('webglcontextlost', onLost);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .065;
  controls.maxPolarAngle = Math.PI * .47; controls.minPolarAngle = .22;
  controls.minDistance = 5; controls.maxDistance = 125;
  controls.enablePan = false;
  controls.addEventListener('change',()=>{dirty=true;});
  const hemisphere=new T.HemisphereLight('#eef5dc', '#345c44', 1.7);scene.add(hemisphere);
  const sunlight = new T.DirectionalLight('#fff1d8', 1.15);
  sunlight.position.set(-35, 65, -20); scene.add(sunlight);
  const fill = new T.DirectionalLight('#96bab0', .7); fill.position.set(30, 12, 40); scene.add(fill);
  let seed = 48372;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const paints = createWatercolorMaterials();
  const material = paints.material;
  const environmentTime={value:0};
  const earth = material('#b1ba97'), pine = material('#416b62'), pineLight = material('#67816a'), bark = material('#726b5b'), rock = material(winter?'#dce4df':'#a0aaa5'), stone = material('#c9c7b7');
  const darkWood = material('#8b7761'), roof = material('#526e73'), sand = material(winter?'#e3e5dc':cave?'#999a7e':'#b5b28b');
  const mesh = (geo: T.BufferGeometry, mat: T.Material, parent: T.Object3D = scene) => { const m = new T.Mesh(geo, mat); parent.add(m); return m; };
  const terrain = new T.PlaneGeometry(240, 240, 150, 150); terrain.rotateX(-Math.PI / 2);
  const pos = terrain.attributes.position;
  const colors = [];
  for (let i=0;i<pos.count;i++) {
    const x = pos.getX(i), z = pos.getZ(i), dist = Math.abs(x - riverX(z));
    pos.setY(i, dist < 4.5 ? -.7 : height(x,z));
    const c = new T.Color(winter?'#d7e0df':maple?'#696953':'#527d45').lerp(new T.Color(winter?'#f0eee5':maple?'#a09b7b':'#92a771'),1-T.MathUtils.smoothstep(dist,5,10));
    if(cave&&z<-7&&Math.abs(x-(riverX(z)+10))<3.2)c.set('#66695a');
    c.multiplyScalar(.94 + Math.sin(x*.23+Math.sin(z*.13))*Math.sin(z*.17)*.13); colors.push(c.r,c.g,c.b);
  }
  terrain.setAttribute('color', new T.Float32BufferAttribute(colors,3)); terrain.computeVertexNormals();
  earth.vertexColors = true; earth.color.set('#ffffff'); mesh(terrain, earth);

  // Connected ridgelines have asymmetric summits and eroded folds, not cones.
  for (let layer=0;layer<4;layer++) {
    const mat = material((winter?['#9aafb6','#b2c3c5','#d0dada','#e3e7de']:maple?['#435b62','#637881','#8c9d9e','#b2beba']:['#577e6c','#77988a','#9bb5a2','#bdd0b9'])[layer],1.2);
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
  const waterMat = material('#5aaba0',.6);
  waterMat.transparent=true;waterMat.opacity=.93;waterMat.side=T.DoubleSide;
  const paintWater=waterMat.onBeforeCompile.bind(waterMat);
  waterMat.onBeforeCompile = (shader,renderer) => {
    paintWater(shader,renderer);shader.uniforms.uTime=environmentTime;
    shader.vertexShader='uniform float uTime;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.y += sin(position.z * 1.7 - uTime * 1.3) * 0.035;');
    shader.fragmentShader='uniform float uTime;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
      float stream = vPigmentPosition.z * 3.8 - uTime * 2.0;
      float eddy = sin(vPigmentPosition.x * 3.1 + sin(vPigmentPosition.z * .8 - uTime * .35));
      float current = smoothstep(.78, 1.0, sin(stream + eddy * 2.3));
      float broken = smoothstep(.05, .8, sin(vPigmentPosition.x * 5.0 + vPigmentPosition.z * .6));
      outgoingLight += vec3(.15, .20, .13) * current * broken;
      #include <opaque_fragment>
    `);
  };
  waterMat.customProgramCacheKey=()=> 'watercolor-flowing-river-v2';
  mesh(waterGeo,waterMat);
  // Broken horizontal strokes on the water catch the evening light.
  const rippleMat = new T.LineBasicMaterial({color:'#e4f0c8',transparent:true,opacity:.48});
  const rippleVertices:number[]=[];
  const currents=Array.from({length:220},()=>({z:random()*130-85,offset:(random()-.5)*8,width:.2+random()*.7,speed:.5+random()*.45}));
  for(const c of currents){const x=riverX(c.z)+c.offset;rippleVertices.push(x,.13,c.z,x+c.width,.13,c.z+.05);}
  const ripples=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(rippleVertices,3)),rippleMat);scene.add(ripples);
  const currentPositions=ripples.geometry.attributes.position;

  // Transparent, softly feathered bands drift just above the distant river.
  const mistMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{uTime:environmentTime,uMistOpacity:{value:.13},uMistTint:{value:new T.Color('#c2dbba')}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`
    uniform float uTime; uniform float uMistOpacity; uniform vec3 uMistTint; varying vec2 vUv;
    void main(){
      float edge=pow(max(0.0, sin(vUv.x*3.14159)*sin(vUv.y*3.14159)),2.0);
      float wisp=.55+.45*sin(vUv.x*19.0+sin(vUv.y*10.0)+uTime*.16);
      gl_FragColor=vec4(uMistTint,edge*wisp*uMistOpacity);
    }`});
  for(let i=0;i<5;i++){const mist=mesh(new T.PlaneGeometry(35,4),mistMat);mist.position.set(riverX(-20-i*17),1.5+i*.3,-20-i*17);}

  type Bucket = { geo:T.BufferGeometry;mat:T.Material;transforms:T.Matrix4[] };
  const artComplete=()=>{artReady=true;dirty=true;if(sceneReady&&!disposed)events.ready();};
  const foliageTexture=flower||maple?paintedLeaves(id,random):new T.TextureLoader().load('/art/pine-watercolor.png',artComplete,undefined,()=>{
    // Keep a usable scene if a texture fails; the leaf geometry still has volume.
    foliageMat.map=null;foliageMat.alphaTest=0;foliageMat.color.set('#688d70');foliageMat.needsUpdate=true;artComplete();
  });
  if(flower||maple)queueMicrotask(artComplete);
  foliageTexture.colorSpace=T.SRGBColorSpace;
  foliageTexture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const foliageMat=new T.MeshBasicMaterial({map:foliageTexture,color:flower||maple?'#ffffff':'#9dbe7c',alphaTest:.16,side:T.DoubleSide,alphaToCoverage:true});
  const grassMat=material('#4f7f38');grassMat.side=T.DoubleSide;
  const fernMat=material('#608d4b');fernMat.side=T.DoubleSide;
  const reedMat=material('#74984b');reedMat.side=T.DoubleSide;
  addWind(foliageMat,environmentTime,.055);addWind(grassMat,environmentTime,.20,true);
  addWind(fernMat,environmentTime,.13,true);addWind(reedMat,environmentTime,.18,true);
  addWind(pineLight,environmentTime,.09);
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
    grass:{geo:grassTuftGeometry(),mat:grassMat,transforms:[]},
    fern:{geo:fernGeometry(),mat:fernMat,transforms:[]},
    reeds:{geo:grassTuftGeometry(),mat:reedMat,transforms:[]}
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
        if(!winter)for(let card=0;card<3;card++)instance('leaves',tip.x,tip.y+size*.15,tip.z,size*1.32,size*1.65,size,(random()-.5)*.22,a+card*Math.PI/3,card===2?-1.1:-.22);
      }
    }
  };
  const blockers:{x:number;z:number;r:number}[]=[];
  for(let i=0;i<(winter?28:90);i++) {
    const x=(random()-.5)*145,z=random()*105-70,dist=Math.abs(x-riverX(z));
    if(dist<10 || (x>0&&x<26&&z>-41&&z<31)) continue;
    if((flower&&z<5)||(cave&&z<-5))continue;
    tree(x,z,(flower?.45:.55)+random()*(flower?.55:1.1));blockers.push({x,z,r:.9});
  }
  [[16,17,1.55],[20,12,1.1],[24,22,1.55],[17,24,.9],[-19,20,1.65],[-24,11,1.1],[-22,-12,1.1],[22,-34,1.05],
    [19,29,1.35],[24,4,1.6],[21,-6,1.3],[17,-30,1.2],[23,-42,1.4],[-15,-28,1.2],[-20,-44,1.5],[-13,30,1.4]
  ].forEach(([x,z,s])=>{if((flower&&z<5)||(cave&&z<-5))return;tree(x,z,flower?s*.65:s);blockers.push({x,z,r:.9});});
  if(flower){for(let i=0;i<30;i++){const z=8+random()*30,x=riverX(z)+(i%2?-1:1)*(8+random()*4);tree(x,z,.65+random()*.35);}}
  for(let i=0;i<200;i++) {
    const z=random()*120-70,side=random()>.5?1:-1,x=riverX(z)+side*(5.5+random()*3),s=.25+random()*1.2;
    instance('rocks',x,height(x,z)-.05,z,s,s*.65,s*.8,random()*.6,random()*6);
  }
  for(let i=0;i<(id==='autumn'?55:flower?24:0);i++) {
    const x=flower?23+random()*6:16+random()*7,z=flower?-42+random()*4:-23+random()*12,h=4+random()*4,g=height(x,z);
    instance('bamboo',x,g+h/2,z,1,h,1,(random()-.5)*.1);
    for(let j=0;j<15;j++) {
      const a=random()*6.28,y=g+h*.4+j*.22;
      instance('bambooLeaf',x+Math.cos(a)*.7,y,z+Math.sin(a)*.7,.6,.045,.12,.3,a);
    }
  }
  for(let i=0;i<(winter?0:6500);i++) {
    const z=random()*110-60,x=(random()-.5)*90,dist=Math.abs(x-riverX(z));
    if((cave&&z<-6)||(flower&&z<6)||dist<6||Math.abs(x-(riverX(z)+10))<1.6)continue;
    const h=.45+random()*.8;instance('grass',x,height(x,z),z,1.2,h,1.2,(random()-.5)*.25,random()*6);
  }
  // Layered fern colonies hug the path; tall reeds soften the wet banks.
  for(let i=0;i<(winter?0:600);i++){
    const z=random()*91-49,side=random()>.5?1:-1,x=riverX(z)+10+side*(1.7+Math.pow(random(),2)*8);
    if((cave&&z<-6)||(flower&&z<6)||Math.abs(x-riverX(z))<6.4)continue;
    const s=.45+random()*.55;instance('fern',x,height(x,z),z,s,s,s,0,random()*6.28);
  }
  for(let i=0;i<(winter?0:1050);i++){
    const z=random()*110-65,x=riverX(z)+(random()>.5?1:-1)*(5.3+random()*1.6);
    instance('reeds',x,height(x,z)-.15,z,.9,1.3+random()*1.1,.9,0,random()*6.28);
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
  const scenic=new T.Group();scene.add(scenic);scenic.visible=id==='autumn'||maple;
  const pavilion=new T.Group();pavilion.position.set(-16,height(-16,8),8);scenic.add(pavilion);pavilion.visible=id==='autumn';
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
    const plank=mesh(new T.BoxGeometry(.65,.16,1.8),darkWood,scenic);plank.position.set(x,y,bridgeZ);
    if(i%3===0)for(const s of [-1,1])mesh(new T.BoxGeometry(.1,.9,.1),darkWood,scenic).position.set(x,y+.5,bridgeZ+s*.85);
    for(const s of [-1,1]){const rail=mesh(new T.BoxGeometry(.68,.09,.09),darkWood,scenic);rail.position.set(x,y+.95,bridgeZ+s*.85);rail.rotation.z=Math.cos(t*Math.PI)*.23;}
  }
  const boat=new T.Group();boat.position.set(riverX(-35),.22,-35);boat.rotation.y=-.15;scene.add(boat);boat.visible=id==='autumn'||maple;
  const hull=mesh(new T.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI/2),darkWood,boat);hull.rotation.x=Math.PI;hull.scale.set(.85,.45,2.4);
  mesh(new T.BoxGeometry(1.25,.1,3.5),sand,boat).position.y=.04;
  const canopy=mesh(new T.CylinderGeometry(.75,.75,1.8,12,1,true,0,Math.PI),material('#c0aa76'),boat);canopy.rotation.x=Math.PI/2;canopy.position.y=.25;
  for(let i=0;i<(id==='autumn'?28:0);i++){const z=-30-random()*13,x=riverX(z)+(random()-.5)*7;const leaf=mesh(new T.CircleGeometry(.2+random()*.3,9),pineLight);leaf.rotation.x=-Math.PI/2;leaf.position.set(x,.15,z);}

  const player=new T.Group();scene.add(player);player.visible=false;
  const robe=mesh(new T.ConeGeometry(.39,1.2,24),material('#c7bba2'),player);robe.position.y=.9;
  mesh(new T.SphereGeometry(.18,12,8),material('#c2a17f'),player).position.y=1.65;
  mesh(new T.ConeGeometry(.49,.2,32),material('#8b7753'),player).position.y=1.88;
  const legs=[-.15,.15].map(x=>{const m=mesh(new T.CylinderGeometry(.065,.055,.45,6),darkWood,player);m.position.set(x,.23,0);return m;});
  const staff=mesh(new T.CylinderGeometry(.025,.03,1.65,5),bark,player);staff.position.set(.48,.82,.1);staff.rotation.z=-.12;
  player.position.set(riverX(27)+10,height(riverX(27)+10,27),27);

  // Unobtrusive stones mark discoveries without floating game-like symbols.
  landmarks.forEach((point)=>{
    const g=new T.Group();g.position.set(point.x,height(point.x,point.z),point.z);scene.add(g);
    mesh(new T.BoxGeometry(.42,.75,.25),stone,g).position.set(-1,.38,0);
  });
  const driftingLeaves=new T.InstancedMesh(new T.SphereGeometry(1,6,4),new T.MeshBasicMaterial({color:flower?'#f1b5c6':maple?'#be723c':'#a5bd64'}),36);scene.add(driftingLeaves);driftingLeaves.visible=!winter&&!cave;
  const leafSeeds=Array.from({length:36},()=>({x:random()*42-16,z:random()*80-45,y:random()*8,phase:random()*6.28}));
  const updateLeaves=(time:number)=>{leafSeeds.forEach((p,i)=>{const y=1+(p.y-time*.18%8+8)%8;dummy.position.set(p.x+Math.sin(time*.25+p.phase)*1.5,height(p.x,p.z)+y,p.z+Math.sin(time*.19+p.phase)*2);dummy.scale.set(flower?.09:.11,.018,flower?.08:.045);dummy.rotation.set(time*.7+p.phase,0,time*.4+p.phase);dummy.updateMatrix();driftingLeaves.setMatrixAt(i,dummy.matrix);});driftingLeaves.instanceMatrix.needsUpdate=true;};
  updateLeaves(0);driftingLeaves.frustumCulled=false;
  const birds=new T.Group();scene.add(birds);birds.visible=!winter&&!cave&&!maple;birds.position.set(0,30,-50);
  for(let i=0;i<7;i++) {const geo=new T.BufferGeometry().setFromPoints([new T.Vector3(-.5,0,0),new T.Vector3(0,-.16,.05),new T.Vector3(.5,0,0)]);const b=new T.Line(geo,new T.LineBasicMaterial({color:'#536e63'}));b.position.set(i*2,Math.sin(i)*.7,i*.8);birds.add(b);}

  const atmosphere=createAtmosphere({scene,camera,renderer,hemisphere,sunlight,fill,moon,foliage:foliageMat,water:waterMat,ripples:rippleMat,mist:mistMat},id);
  const details=buildSceneDetails({scene,id,random,height,riverX,material,camera,time:environmentTime});

  let mode:Mode='view',autoTour=false,tourTarget=0,tourPause=0,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const eyeHeight=1.65;
  let yaw=.35,pitch=0,lookOverride=0,soundTimer=0;
  let lookPointer:{id:number;x:number;y:number}|null=null;
  const eyeCamera=()=>{
    camera.position.copy(player.position);camera.position.y+=eyeHeight;
    camera.rotation.set(pitch,yaw,0,'YXZ');dirty=true;
  };
  const lookDown=(event:PointerEvent)=>{
    if(mode!=='walk'||paused||event.button!==0||lookPointer)return;
    renderer.domElement.focus({preventScroll:true});
    lookPointer={id:event.pointerId,x:event.clientX,y:event.clientY};renderer.domElement.setPointerCapture(event.pointerId);
  };
  const lookMove=(event:PointerEvent)=>{
    if(!lookPointer||event.pointerId!==lookPointer.id||mode!=='walk'||paused)return;
    yaw-=(event.clientX-lookPointer.x)*.003;pitch=T.MathUtils.clamp(pitch-(event.clientY-lookPointer.y)*.003,-1.15,1.15);
    lookPointer.x=event.clientX;lookPointer.y=event.clientY;lookOverride=5;eyeCamera();
  };
  const lookUp=(event?:PointerEvent)=>{
    if(!lookPointer||(event&&event.pointerId!==lookPointer.id))return;
    const id=lookPointer.id;lookPointer=null;if(renderer.domElement.hasPointerCapture(id))renderer.domElement.releasePointerCapture(id);
  };
  renderer.domElement.addEventListener('pointerdown',lookDown);renderer.domElement.addEventListener('pointermove',lookMove);
  renderer.domElement.addEventListener('pointerup',lookUp);renderer.domElement.addEventListener('pointercancel',lookUp);renderer.domElement.addEventListener('lostpointercapture',lookUp);
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
  const clear=()=>{keys.clear();touch={x:0,y:0};previous=0;lookUp();};
  window.addEventListener('keydown',onKey);window.addEventListener('keyup',onUp);window.addEventListener('blur',clear);
  const resize=()=>{const {width,height:h}=host.getBoundingClientRect();camera.aspect=width/h;camera.updateProjectionMatrix();renderer.setSize(width,h);dirty=true;};
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  const startControl=()=>{transition=null;};controls.addEventListener('start',startControl);
  const moveStep=(dx:number,dz:number,dt:number)=>{
    const x=player.position.x+dx*dt*4,z=T.MathUtils.clamp(player.position.z+dz*dt*4,-42,31);
    const inPassage=(flower&&z<5&&z>-10)||(cave&&z<-7);
    const center=riverX(z)+10;
    const safeX=T.MathUtils.clamp(x,inPassage?center-1.05:riverX(z)+7,inPassage?center+1.05:28);
    if(!blockers.some(b=>Math.hypot(safeX-b.x,z-b.z)<b.r+.35))player.position.set(safeX,height(safeX,z),z);
    if(Math.abs(dx)+Math.abs(dz)>.02){player.rotation.y=Math.atan2(dx,dz);legs.forEach((l,i)=>l.rotation.x=Math.sin(elapsed*9+i*Math.PI)*.45);}
    else legs.forEach(l=>l.rotation.x=0);
  };
  const movePlayer=(dx:number,dz:number,dt:number)=>{
    // Keep collision steps short without slowing walking to a crawl on slower GPUs.
    for(let remaining=dt;remaining>0;remaining-=.05)moveStep(dx,dz,Math.min(.05,remaining));
  };
  const direction=new T.Vector3(),right=new T.Vector3(),up=new T.Vector3(0,1,0);
  const animate=(now:number)=>{
    if(disposed)return;
    frame=requestAnimationFrame(animate);
    if(document.hidden||paused||!artReady){previous=0;return;}
    const dt=previous?Math.min((now-previous)/1000,.25):0;previous=now;elapsed+=dt;
    const shelter=mode==='walk'?shelterAt(id,player.position.x,player.position.z):0;
    if(atmosphere.tick(dt,reduced,events.time,shelter))dirty=true;
    details.tick(environmentTime.value,shelter,reduced);
    if(!reduced){
      environmentTime.value+=dt;
      const time=environmentTime.value;
      const streamTime=time*(winter?.25:maple?.35:1);
      boat.position.y=.22+Math.sin(time*.7)*.055;boat.rotation.z=Math.sin(time*.55)*.018;
      birds.position.set(Math.sin(time*.018)*60,30,-60+Math.cos(time*.018)*15);
      currents.forEach((c,i)=>{const z=((c.z+85+streamTime*c.speed)%130)-85,x=riverX(z)+c.offset;currentPositions.setXYZ(i*2,x,.14,z);currentPositions.setXYZ(i*2+1,x+c.width,.14,z+.05);});
      currentPositions.needsUpdate=true;updateLeaves(time);
    }
    if(mode==='walk') {
      const old=player.position.clone(),oldYaw=yaw;lookOverride=Math.max(0,lookOverride-dt);
      if(autoTour) {
        const target=landmarks[tourTarget],inPassage=(flower&&target.z<5&&target.z>-10)||(cave&&target.z<-7),tx=inPassage?riverX(target.z)+10:Math.max(target.x,riverX(target.z)+7.4),delta=new T.Vector2(tx-player.position.x,target.z-player.position.z);
        if(delta.length()<1.4){tourPause+=dt;if(tourPause>4){tourPause=0;tourTarget++;if(tourTarget>=landmarks.length)stopTour();}}
        else {delta.normalize();movePlayer(delta.x,delta.y,dt*.65);
          if(!lookOverride){const targetYaw=Math.atan2(-delta.x,-delta.y);yaw+=Math.atan2(Math.sin(targetYaw-yaw),Math.cos(targetYaw-yaw))*(1-Math.exp(-dt*2));}
        }
      } else {
        const vertical=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-touch.y;
        const horizontal=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+touch.x;
        camera.getWorldDirection(direction);direction.y=0;direction.normalize();right.crossVectors(direction,up).normalize();
        direction.multiplyScalar(vertical).addScaledVector(right,horizontal);if(direction.length()>1)direction.normalize();movePlayer(direction.x,direction.z,dt);
      }
      if(!player.position.equals(old)||yaw!==oldYaw)eyeCamera();
      checkTimer+=dt;if(checkTimer>.25){checkTimer=0;discoverAtPlayer();}
    }
    if(transition){const factor=reduced?1:1-Math.exp(-dt*3);camera.position.lerp(transition.pos,factor);controls.target.lerp(transition.target,factor);if(camera.position.distanceTo(transition.pos)<.05)transition=null;}
    if(mode==='view')controls.update();
    soundTimer+=dt;
    if(soundTimer>.15){soundTimer=0;camera.getWorldDirection(direction);const position=mode==='walk'?player.position:camera.position;
      events.soundPosition({x:position.x,z:position.z,yaw:Math.atan2(-direction.x,-direction.z),riverX:riverX(position.z),rain:atmosphere.weather()==='rain'?1:0,scene:id,shelter,hour:atmosphere.hour()});
    }
    if(!reduced||dirty){renderer.render(scene,camera);dirty=false;}
  };
  sceneReady=true;frame=requestAnimationFrame(animate);
  const setMode=(next:Mode)=>{
    mode=next;keys.clear();touch={x:0,y:0};player.visible=false;transition=null;lookUp();
    controls.enabled=next==='view';camera.fov=next==='walk'?65:43;camera.updateProjectionMatrix();
    renderer.domElement.setAttribute('aria-label',next==='walk'?'诗人第一人称视角，拖动环顾，方向键行走':`${definition.title}三维山水，拖动环顾，滚轮缩放`);
    if(next==='walk'){yaw=.35;pitch=0;lookOverride=0;eyeCamera();}
    else{stopTour();controls.minDistance=12;controls.maxDistance=125;controls.target.copy(initialTarget);transition={pos:initialCamera.clone(),target:initialTarget.clone()};controls.update();}
    dirty=true;
  };
  return {
    environment:(settings)=>{events.time(atmosphere.set(settings,reduced));dirty=true;},
    mode:setMode,
    go:(index)=>{const p=landmarks[index];if(!p)return;stopTour();if(mode==='walk'){
      const inPassage=(flower&&p.z<5&&p.z>-10)||(cave&&p.z<-7),px=inPassage?riverX(p.z)+10:Math.max(p.x,riverX(p.z)+7.4);
      player.position.set(px,height(px,p.z),p.z);
      const focusX=flower&&index>=2?22:maple&&index===2?-19:winter?riverX(p.z):index===0?20:index===2?19:riverX(p.z);yaw=(cave&&index>=1)||(flower&&index===1)?0:Math.atan2(player.position.x-focusX,4);pitch=0;eyeCamera();discoverAtPlayer();
    }else{transition={pos:new T.Vector3(p.x+18,16,p.z+22),target:new T.Vector3(p.x,2,p.z)};}},
    reset:()=>{stopTour();player.position.set(riverX(27)+10,height(riverX(27)+10,27),27);setMode(mode);},
    tour:(on)=>{autoTour=on;tourTarget=0;tourPause=0;if(on){setMode('walk');autoTour=true;}},
    quality:(low)=>{renderer.setPixelRatio(low?1:Math.min(window.devicePixelRatio,1.6));dirty=true;},
    motion:(reduce)=>{reduced=reduce;controls.enableDamping=!reduce;atmosphere.set({},reduce);dirty=true;},
    pause:(on)=>{paused=on;if(on)clear();dirty=true;},
    input:(x,y)=>{touch={x,y};if(x||y)stopTour();},
    dispose:()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('keydown',onKey);window.removeEventListener('keyup',onUp);window.removeEventListener('blur',clear);lookUp();renderer.domElement.removeEventListener('pointerdown',lookDown);renderer.domElement.removeEventListener('pointermove',lookMove);renderer.domElement.removeEventListener('pointerup',lookUp);renderer.domElement.removeEventListener('pointercancel',lookUp);renderer.domElement.removeEventListener('lostpointercapture',lookUp);controls.dispose();renderer.domElement.removeEventListener('webglcontextlost',onLost);const geos=new Set<T.BufferGeometry>(),mats=new Set<T.Material>();scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line||o instanceof T.Points){geos.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));}});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());foliageTexture.dispose();paints.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}
  };
}
