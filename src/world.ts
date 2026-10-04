import * as T from 'three';
import {caveObstacle,caveReturnPath,type CavePoint} from './caveNavigation';
import {woodenBoat,bambooSpray} from './models';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { type Mode } from './poem';
import {scenes,shelterAt,type SceneDefinition} from './scenes';
import {buildSceneDetails,paintedLeaves} from './sceneDetails';
import { createWatercolorMaterials, mountainRange, grassTuftGeometry, fernGeometry, addWind } from './watercolor';
import type { SoundPosition } from './audio';
import {createAtmosphere,type EnvironmentSettings} from './environment';
import {createPresence,keptGround} from './presence';
import {bridgeLayout,bridgeClearance,bridgeSurface,bridgeWalkable,bridgeTourTarget} from './bridges';
import {buildConnectedBridge} from './bridgeMesh';

export type CinemaFrame={time:number;position:[number,number,number];target:[number,number,number];fov:number;hour:number;moon?:[number,number,number];boatZ?:number};
export type WorldAPI = { cinema:(frame:CinemaFrame)=>HTMLCanvasElement; returnToEntrance:()=>void; environment: (settings:Partial<EnvironmentSettings>) => void; mode: (mode: Mode) => void; go: (index: number) => void; reset: () => void; tour: (on: boolean) => void; quality: (low: boolean) => void; motion: (reduce: boolean) => void; pause: (on: boolean) => void; input: (x: number, y: number) => void; dispose: () => void };
type Events = { time: (hour:number) => void; ready: () => void; discover: (index: number) => void; tourEnd: () => void; failure: () => void; soundPosition: (position:SoundPosition) => void };
import {caveSection,riverCenter,landscapeHeight,waterEdges,waterHeight,landscapeViews} from './landscape';
export const riverX=riverCenter;

export function createWorld(host: HTMLDivElement, events: Events, definition:SceneDefinition=scenes[0]): WorldAPI {
  const id=definition.id,landmarks=definition.landmarks;
  const height=(x:number,z:number)=>landscapeHeight(id,x,z),view=landscapeViews[id];
  const crossing=bridgeLayout(id),walkingHeight=(x:number,z:number)=>bridgeSurface(id,x,z)??height(x,z);
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
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
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
  sunlight.castShadow=true;sunlight.shadow.mapSize.set(1024,1024);sunlight.shadow.bias=-.00025;sunlight.shadow.normalBias=.08;
  sunlight.shadow.camera.left=-68;sunlight.shadow.camera.right=68;sunlight.shadow.camera.top=68;sunlight.shadow.camera.bottom=-68;sunlight.shadow.camera.near=1;sunlight.shadow.camera.far=350;
  sunlight.target.position.set(0,cave?10:0,-15);scene.add(sunlight.target);
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
    const edges=waterEdges(id,z),inWater=x>edges.left&&x<edges.right&&(!cave||z>-3);
    pos.setY(i,inWater?waterHeight(id,z)-.7:height(x,z));
    const c = new T.Color(winter?'#d7e0df':maple?'#686458':cave?'#73776c':flower?'#849651':'#466e42').lerp(new T.Color(winter?'#f0eee5':maple?'#969080':cave?'#a0a08c':flower?'#b4bc77':'#92a771'),1-T.MathUtils.smoothstep(dist,5,10));
    if(cave&&z<-7&&Math.abs(x-(riverX(z)+10))<3.2)c.set('#66695a');
    c.multiplyScalar(.94 + Math.sin(x*.23+Math.sin(z*.13))*Math.sin(z*.17)*.13); colors.push(c.r,c.g,c.b);
  }
  terrain.setAttribute('color', new T.Float32BufferAttribute(colors,3)); terrain.computeVertexNormals();
  earth.vertexColors = true; earth.color.set('#ffffff'); mesh(terrain, earth).receiveShadow=true;

  // Connected ridgelines have asymmetric summits and eroded folds, not cones.
  for (let layer=0;layer<4;layer++) {
    const mat = material((winter?['#9aafb6','#b2c3c5','#d0dada','#e3e7de']:maple?['#435b62','#637881','#8c9d9e','#b2beba']:cave?['#626f70','#85928e','#a5b5ac','#c7d0c0']:['#577e6c','#77988a','#9bb5a2','#bdd0b9'])[layer],1.2);
    mat.vertexColors=true;
    const m=mesh(mountainRange(layer,random),mat);
    m.scale.set(...view.ridgeScale);m.position.set(layer%2?15:-12,0,view.ridgeZ-layer*35);
  }
  const moon = mesh(new T.SphereGeometry(5.1,32,24),new T.MeshBasicMaterial({color:'#ffffe7',fog:false}));
  moon.position.set(-31,53,-160);

  const waterPositions:number[] = [], waterIndices:number[]=[];
  for(let i=0;i<=210;i++) {
    const z=cave?-3+i*.48:-145+i*1.3,edges=waterEdges(id,z),y=waterHeight(id,z);
    waterPositions.push(edges.left,y,z,edges.right,y,z);
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
      float stream = vPigmentPosition.z * 5.2 - uTime * 2.0;
      float eddy = sin(vPigmentPosition.x * 3.1 + sin(vPigmentPosition.z * .8 - uTime * .35));
      float current = smoothstep(.9, 1.0, sin(stream + eddy * 2.3));
      float broken = smoothstep(.05, .8, sin(vPigmentPosition.x * 5.0 + vPigmentPosition.z * .6));
      outgoingLight += vec3(.08, .13, .11) * current * broken * ${(winter?.12:maple?.22:1).toFixed(2)};
      #include <opaque_fragment>
    `);
  };
  waterMat.customProgramCacheKey=()=> `watercolor-flowing-river-v3-${id}`;
  mesh(waterGeo,waterMat);
  // Broken horizontal strokes on the water catch the evening light.
  const rippleMat = new T.LineBasicMaterial({color:'#e4f0c8',transparent:true,opacity:.24});
  const rippleVertices:number[]=[];
  const currents=Array.from({length:winter?60:maple?95:220},()=>({z:cave?-2+random()*95:random()*130-85,offset:random(),width:.12+random()*(winter?.9:.4),speed:.5+random()*.45}));
  for(const c of currents){const edges=waterEdges(id,c.z),x=T.MathUtils.lerp(edges.left+.2,edges.right-.8,c.offset),y=waterHeight(id,c.z)+.06;rippleVertices.push(x,y,c.z,x+c.width,y,c.z+.05);}
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
  for(let i=0;i<(cave?0:5);i++){const mist=mesh(new T.PlaneGeometry(35,4),mistMat);mist.position.set(riverX(-20-i*17),1.5+i*.3,-20-i*17);}

  type Bucket = { geo:T.BufferGeometry;mat:T.Material;transforms:T.Matrix4[] };
  const artComplete=()=>{artReady=true;dirty=true;if(sceneReady&&!disposed)events.ready();};
  const foliageTexture=maple?paintedLeaves(id,random):new T.TextureLoader().load(flower?'/art/peach-blossom-watercolor.png':'/art/pine-poetic-watercolor.png',artComplete,undefined,()=>{
    // Keep a usable scene if a texture fails; the leaf geometry still has volume.
    foliageMat.map=null;foliageMat.alphaTest=0;foliageMat.color.set('#688d70');foliageMat.needsUpdate=true;artComplete();
  });
  if(maple)queueMicrotask(artComplete);
  foliageTexture.colorSpace=T.SRGBColorSpace;
  foliageTexture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const foliageMat=new T.MeshLambertMaterial({map:foliageTexture,color:flower||maple?'#ffffff':'#9dbe7c',alphaTest:.16,side:T.DoubleSide,alphaToCoverage:true});
  const grassMat=material(flower?'#7d975b':maple?'#817a58':'#587b4a');grassMat.side=T.DoubleSide;
  const fernMat=material('#688650');fernMat.side=T.DoubleSide;
  const reedMat=material('#839266');reedMat.side=T.DoubleSide;
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
    trunk:{geo:new T.CylinderGeometry(.76,1,1,12),mat:bark,transforms:[]},
    rocks:{geo:roundedRock,mat:rock,transforms:[]},
    cliffRocks:{geo:roundedRock,mat:material('#747e72'),transforms:[]},
    bamboo:{geo:new T.CylinderGeometry(.07,.11,1,8),mat:pine,transforms:[]},
    bambooNode:{geo:new T.CylinderGeometry(.116,.116,.06,10),mat:material('#738362'),transforms:[]},
    bambooLeaf:{geo:bambooSpray(),mat:fernMat,transforms:[]},
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
    dummy.scale.set(radius,direction.length()+radius*.7,radius);dummy.updateMatrix();buckets.trunk.transforms.push(dummy.matrix.clone());
  };
  const trunkVertices:number[]=[],trunkIndices:number[]=[];
  const tree=(x:number,z:number,size:number,ground=height(x,z))=>{
    const bend=(random()-.5)*1.1,phase=random()*6.28;
    const spine=(t:number)=>new T.Vector3(x+Math.sin(t*2.8)*bend*size,ground+t*6.8*size,z+Math.sin(t*3+phase)*size*.22);
    const trunkStart=trunkVertices.length/3;
    for(let j=0;j<=12;j++){
      const t=j/12,c=spine(t),r=size*(.22-.17*t+.1*Math.exp(-t*18));
      for(let k=0;k<12;k++){const a=k*Math.PI/6,ridge=1+.055*Math.sin(a*7+t*4);trunkVertices.push(c.x+Math.cos(a)*r*ridge,c.y,c.z+Math.sin(a)*r*ridge);if(j<12){const n=trunkStart+j*12+k,next=trunkStart+j*12+(k+1)%12;trunkIndices.push(n,next,n+12,next,next+12,n+12);}}
    }
    for(let root=0;root<4;root++){const a=root*1.57+phase;branch(spine(.04),new T.Vector3(x+Math.cos(a)*size*.6,ground+.02,z+Math.sin(a)*size*.6),size*.11);}
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
  for(let i=0;i<(winter?5:cave?28:maple?42:90);i++) {
    const x=(random()-.5)*145,z=random()*105-70,dist=Math.abs(x-riverX(z));
    const edge=waterEdges(id,z);if((x>edge.left-2&&x<edge.right+2) || (x>0&&x<26&&z>-41&&z<31)||bridgeClearance(id,x,z)) continue;
    if((flower&&z<5)||(cave&&z<8))continue;
    tree(x,z,(flower?.45:.55)+random()*(flower?.55:1.1));blockers.push({x,z,r:.9});
  }
  [[16,17,1.55],[20,12,1.1],[24,22,1.55],[17,24,.9],[-19,20,1.65],[-24,11,1.1],[-22,-12,1.1],[22,-34,1.05],
    [19,29,1.35],[24,4,1.6],[21,-6,1.3],[17,-30,1.2],[23,-42,1.4],[-15,-28,1.2],[-20,-44,1.5],[-13,30,1.4]
  ].forEach(([x,z,s])=>{if(winter||(maple&&x<0)||(flower&&z<5)||(cave&&(z<14||x<20))||bridgeClearance(id,x,z))return;tree(x,z,flower?s*.65:maple?s*.68:s);blockers.push({x,z,r:.9});});
  if(flower){for(let i=0;i<55;i++){const z=8+random()*35,x=riverX(z)+(i%2?-1:1)*(5+random()*3);tree(x,z,.85+random()*.45);}}
  if(id==='autumn'){for(let i=0;i<8;i++){const z=-20+random()*24,x=riverX(z)-12-random()*3;tree(x,z,1.25+random()*.4);}}
  if(cave){
    for(const [x,y,z,s] of [[23,34,-5,.75],[-13,29,-5.5,.8],[29,48,-5.5,.65],[-22,39,-6,.55],[13,60,-5.5,.6],[31,24,-5,.7]]){
      instance('cliffRocks',x,y-1.4,z-1.8,4,2.1,4.5,0,.2);tree(x,z,s,y);
    }
  }
  for(let i=0;i<(winter?35:cave?80:200);i++) {
    const z=random()*120-70,side=random()>.5?1:-1,x=riverX(z)+side*(id==='peach'?3.5+random()*2:5.5+random()*3),s=.25+random()*1.2;
    if(bridgeClearance(id,x,z))continue;
    instance('rocks',x,height(x,z)-.05,z,s,s*.65,s*.8,random()*.6,random()*6);
  }
  for(let i=0;i<(id==='autumn'?55:flower?24:0);i++) {
    const x=flower?23+random()*6:16+random()*7,z=flower?-42+random()*4:-23+random()*12,h=4+random()*4,g=height(x,z);
    if(keptGround(id,x,z))continue;
    instance('bamboo',x,g+h/2,z,1,h,1);
    for(let node=.6;node<h;node+=.55)instance('bambooNode',x,g+node,z,1,1,1);
    for(let j=0;j<15;j++) {
      const a=random()*6.28,y=g+h*.4+j*.22;
      for(let fan=0;fan<3;fan++)instance('bambooLeaf',x+Math.cos(a)*.2,y,z+Math.sin(a)*.2,1.1,.9,1.1,(fan-1)*.3,a+fan*.5);
    }
  }
  const plantedPlot=(x:number,z:number)=>flower&&([14,26].some(cx=>[-20,-34].some(cz=>Math.abs(x-cx)<5.5&&Math.abs(z-cz)<5.5))||[31,38,45].some(cx=>[-20,-31,-42].some(cz=>Math.abs(x-cx)<3.6&&Math.abs(z-cz)<3)));
  for(let i=0;i<(winter?0:cave?8500:maple?14500:22000);i++) {
    const z=random()*110-60,x=(random()-.5)*90,dist=Math.abs(x-riverX(z));
    const edge=waterEdges(id,z);if((cave&&z<8)||(flower&&z<6&&z>-12&&Math.abs(x-(riverX(z)+10))<20)||(x>edge.left-1&&x<edge.right+1)||Math.abs(x-(riverX(z)+10))<1.6)continue;
    if(plantedPlot(x,z)||keptGround(id,x,z)||bridgeClearance(id,x,z))continue;
    const h=.35+random()*.65;instance('grass',x,height(x,z),z,1.5,h,1.5,(random()-.5)*.25,random()*6);
  }
  // Close grass carpets are concentrated where a walker sees them, with the path kept clear.
  for(let i=0;i<(winter?0:10000);i++){
    const z=random()*82-49,side=i%2?1:-1,x=riverX(z)+10+side*(1.6+Math.pow(random(),1.6)*12),edge=waterEdges(id,z);
    if((cave&&z<-6)||(flower&&z<6&&z>-12)||(x>edge.left-.5&&x<edge.right+.5)||plantedPlot(x,z)||keptGround(id,x,z)||bridgeClearance(id,x,z))continue;
    instance('grass',x,height(x,z),z,.8+random()*.7,.3+random()*.7,1.1,0,random()*6.28);
  }
  // Layered fern colonies hug the path; tall reeds soften the wet banks.
  for(let i=0;i<(winter?0:cave?120:maple?80:600);i++){
    const z=random()*91-49,side=random()>.5?1:-1,x=riverX(z)+10+side*(1.7+Math.pow(random(),2)*8);
    const edge=waterEdges(id,z);if((cave&&z<8)||(flower&&z<6)||(x>edge.left-1&&x<edge.right+1)||keptGround(id,x,z)||bridgeClearance(id,x,z))continue;
    const s=.45+random()*.55;instance('fern',x,height(x,z),z,s,s,s,0,random()*6.28);
  }
  for(let i=0;i<(winter||cave?0:maple?160:flower?340:1050);i++){
    const z=random()*110-65,edge=waterEdges(id,z),x=random()>.5?edge.right+random()*1.3:edge.left-random()*1.3;
    if(keptGround(id,x,z)||bridgeClearance(id,x,z))continue;
    instance('reeds',x,height(x,z)-.15,z,.9,1.3+random()*1.1,.9,0,random()*6.28);
  }
  let lightQuality=false;
  const vegetation:T.InstancedMesh[]=[];
  const applyVegetation=()=>vegetation.forEach(m=>{m.count=Math.floor(m.instanceMatrix.count*(lightQuality?.4:host.clientWidth<800?.65:1));});
  for(const [name,b] of Object.entries(buckets)) {
    const instanced=new T.InstancedMesh(b.geo,b.mat,b.transforms.length);
    instanced.castShadow=name==='leaves'||name==='trunk'||name==='bamboo';instanced.receiveShadow=true;
    if(name==='grass'||name==='fern'||name==='reeds'){
      for(let i=b.transforms.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[b.transforms[i],b.transforms[j]]=[b.transforms[j],b.transforms[i]];}vegetation.push(instanced);
    }
    b.transforms.forEach((m,i)=>instanced.setMatrixAt(i,m));instanced.computeBoundingSphere();scene.add(instanced);
  }
  const trunkGeometry=new T.BufferGeometry();trunkGeometry.setAttribute('position',new T.Float32BufferAttribute(trunkVertices,3));trunkGeometry.setIndex(trunkIndices);trunkGeometry.computeVertexNormals();mesh(trunkGeometry,bark).castShadow=true;
  // A continuous ribbon path follows the east bank.
  const pathVertices:number[]=[],pathIndices:number[]=[];
  for(let i=0;i<=100;i++) { const z=36-i*.8,c=riverX(z)+10;for(const dx of [-1.1,1.1])pathVertices.push(c+dx,height(c+dx,z)+.035,z);if(i<100){const n=i*2;pathIndices.push(n,n+1,n+2,n+1,n+3,n+2);} }
  const pathGeo=new T.BufferGeometry();pathGeo.setAttribute('position',new T.Float32BufferAttribute(pathVertices,3));pathGeo.setIndex(pathIndices);pathGeo.computeVertexNormals();sand.side=T.DoubleSide;mesh(pathGeo,sand);

  // An open waterside pavilion: columns, railings, and swept roof rings.
  const scenic=new T.Group();scene.add(scenic);scenic.visible=id==='autumn';
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
  buildConnectedBridge(scene,id,material,sand);
  const boat=woodenBoat(material,true);boat.position.set(riverX(-35),.22,-35);boat.rotation.y=-.15;scene.add(boat);boat.visible=id==='autumn'||maple;
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
    const marker=mesh(new T.IcosahedronGeometry(.25,2),rock,g);marker.position.set(-1.3,.17,0);marker.scale.set(1,.8,.7);
  });
  const driftingLeaves=new T.InstancedMesh(new T.SphereGeometry(1,6,4),new T.MeshBasicMaterial({color:flower?'#f1b5c6':maple?'#be723c':'#a5bd64'}),36);scene.add(driftingLeaves);driftingLeaves.visible=!winter&&!cave;
  const leafSeeds=Array.from({length:36},()=>({x:random()*42-16,z:random()*80-45,y:random()*8,phase:random()*6.28}));
  const updateLeaves=(time:number)=>{leafSeeds.forEach((p,i)=>{const y=1+(p.y-time*.18%8+8)%8;dummy.position.set(p.x+Math.sin(time*.25+p.phase)*1.5,height(p.x,p.z)+y,p.z+Math.sin(time*.19+p.phase)*2);dummy.scale.set(flower?.09:.11,.018,flower?.08:.045);dummy.rotation.set(time*.7+p.phase,0,time*.4+p.phase);dummy.updateMatrix();driftingLeaves.setMatrixAt(i,dummy.matrix);});driftingLeaves.instanceMatrix.needsUpdate=true;};
  updateLeaves(0);driftingLeaves.frustumCulled=false;
  const birds=new T.Group();scene.add(birds);birds.visible=!winter&&!cave&&!maple;birds.position.set(0,30,-50);
  for(let i=0;i<7;i++) {const geo=new T.BufferGeometry().setFromPoints([new T.Vector3(-.5,0,0),new T.Vector3(0,-.16,.05),new T.Vector3(.5,0,0)]);const b=new T.Line(geo,new T.LineBasicMaterial({color:'#536e63'}));b.position.set(i*2,Math.sin(i)*.7,i*.8);birds.add(b);}

  const atmosphere=createAtmosphere({scene,camera,renderer,hemisphere,sunlight,fill,moon,foliage:foliageMat,water:waterMat,ripples:rippleMat,mist:mistMat},id);
  const details=buildSceneDetails({scene,id,random,height,riverX,material,camera,time:environmentTime});
  const presence=createPresence({scene,id,height,riverX,material,camera,time:environmentTime,boat});

  let mode:Mode='view',returning=false,autoTour=false,tourTarget=0,tourPause=0,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let returnRoute:CavePoint[]=[];
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
  const initialCamera=new T.Vector3(...view.camera),initialTarget=new T.Vector3(...view.target);
  camera.position.copy(initialCamera);controls.target.copy(initialTarget);controls.update();
  const stopTour=()=>{returning=false;if(autoTour){autoTour=false;events.tourEnd();}};
  const onKey=(e:KeyboardEvent)=>{
    if((e.target as HTMLElement).closest('button,input,select,textarea,[role="dialog"]'))return;
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();keys.add(e.code);stopTour();}
  };
  const onUp=(e:KeyboardEvent)=>keys.delete(e.code);
  const clear=()=>{keys.clear();touch={x:0,y:0};previous=0;lookUp();};
  window.addEventListener('keydown',onKey);window.addEventListener('keyup',onUp);window.addEventListener('blur',clear);
  const resize=()=>{const {width,height:h}=host.getBoundingClientRect();camera.aspect=width/h;camera.updateProjectionMatrix();renderer.setSize(width,h);applyVegetation();dirty=true;};
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  const startControl=()=>{transition=null;};controls.addEventListener('start',startControl);
  const moveStep=(dx:number,dz:number,dt:number)=>{
    const x=player.position.x+dx*dt*4,z=T.MathUtils.clamp(player.position.z+dz*dt*4,cave?-68:-42,31);
    const inPassage=(flower&&z<5&&z>-10)||(cave&&z<-7);
    const center=riverX(z)+10;
    const halfWidth=cave?caveSection(z).width-.65:1.05;
    const safeX=T.MathUtils.clamp(x,inPassage?center-halfWidth:riverX(z)+7,inPassage?center+halfWidth:28);
    const nextX=crossing?x:safeX;
    if(crossing&&!bridgeWalkable(id,nextX,z))return;
    if(cave&&caveObstacle(nextX,z))return;
    if(!blockers.some(b=>Math.hypot(nextX-b.x,z-b.z)<b.r+.35))player.position.set(nextX,walkingHeight(nextX,z),z);
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
    presence.tick(environmentTime.value,reduced,atmosphere.hour(),moon.visible);
    if(!reduced){
      environmentTime.value+=dt;
      const time=environmentTime.value;
      const streamTime=time*(winter?.25:maple?.35:1);
      boat.position.y=.22+Math.sin(time*.7)*.055;boat.rotation.z=Math.sin(time*.55)*.018;
      birds.position.set(Math.sin(time*.018)*60,30,-60+Math.cos(time*.018)*15);
      currents.forEach((c,i)=>{const z=cave?((c.z+2+streamTime*c.speed)%95)-2:((c.z+85+streamTime*c.speed)%130)-85,edge=waterEdges(id,z),x=T.MathUtils.lerp(edge.left+.2,edge.right-.8,c.offset),y=waterHeight(id,z)+.07;currentPositions.setXYZ(i*2,x,y,z);currentPositions.setXYZ(i*2+1,x+c.width,y,z+.05);});
      currentPositions.needsUpdate=true;updateLeaves(time);
    }
    if(mode==='walk') {
      const old=player.position.clone(),oldYaw=yaw;lookOverride=Math.max(0,lookOverride-dt);
      if(autoTour&&returning){
        if(player.position.z>26){stopTour();}
        else {while(returnRoute.length&&Math.hypot(returnRoute[0].x-player.position.x,returnRoute[0].z-player.position.z)<.16)returnRoute.shift();const z=Math.min(27,player.position.z+3),target=returnRoute[0]||{x:riverX(z)+10,z},delta=new T.Vector2(target.x-player.position.x,target.z-player.position.z),distance=delta.length();delta.normalize();movePlayer(delta.x,delta.y,Math.min(dt*.8,distance/4));if(!lookOverride){const targetYaw=Math.atan2(-delta.x,-delta.y);yaw+=Math.atan2(Math.sin(targetYaw-yaw),Math.cos(targetYaw-yaw))*(1-Math.exp(-dt*2));}}
      } else if(autoTour) {
        const target=landmarks[tourTarget],inPassage=(flower&&target.z<5&&target.z>-10)||(cave&&target.z<-7),tx=inPassage?riverX(target.z)+10:Math.max(target.x,riverX(target.z)+7.4),crossingTarget=bridgeTourTarget(id,player.position.x,player.position.z),delta=new T.Vector2((crossingTarget?.x??tx)-player.position.x,(crossingTarget?.z??target.z)-player.position.z);
        if(!crossingTarget&&delta.length()<1.4){tourPause+=dt;if(tourPause>4){tourPause=0;tourTarget++;if(tourTarget>=landmarks.length)stopTour();}}
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
      events.soundPosition({x:position.x,z:position.z,yaw:Math.atan2(-direction.x,-direction.z),riverX:cave?riverX(position.z)+3.7:riverX(position.z),rain:atmosphere.weather()==='rain'?1:0,scene:id,shelter,hour:atmosphere.hour(),walking:mode==='walk'});
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
  let filmDecor:T.Group|null=null;
  let cinemaShadowHour:number|undefined;
  let filmHalo:T.Sprite;
  const prepareFilm=()=>{
    filmDecor=new T.Group();scene.add(filmDecor);
    const sky=new T.Mesh(new T.SphereGeometry(350,32,20),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{top:{value:new T.Color('#264c5c')},bottom:{value:new T.Color('#a0b5a6')}},vertexShader:'varying vec3 vPosition;void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform vec3 top;uniform vec3 bottom;varying vec3 vPosition;void main(){float h=clamp(normalize(vPosition).y,0.0,1.0);vec3 c=mix(bottom,top,pow(h,.55));gl_FragColor=vec4(c,1.0);#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));
    // GLSL preprocessor directives start on a fresh line.
    (sky.material as T.ShaderMaterial).fragmentShader=(sky.material as T.ShaderMaterial).fragmentShader.replace(';#include',';\n#include');filmDecor.add(sky);
    const halo=document.createElement('canvas');halo.width=halo.height=128;const hc=halo.getContext('2d')!,gradient=hc.createRadialGradient(64,64,4,64,64,64);gradient.addColorStop(0,'rgba(247,236,200,.22)');gradient.addColorStop(.35,'rgba(236,228,201,.09)');gradient.addColorStop(1,'rgba(236,228,201,0)');hc.fillStyle=gradient;hc.fillRect(0,0,128,128);
    filmHalo=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(halo),transparent:true,depthWrite:false,blending:T.AdditiveBlending}));filmHalo.scale.set(28,28,1);filmDecor.add(filmHalo);moon.scale.setScalar(.65);

  };
  return {
    // Offline film export: explicit time and camera make every frame reproducible.
    // The normal interactive scene never calls this path.
    cinema:(shot)=>{
      if(!filmDecor)prepareFilm();
      paused=true;controls.enabled=false;player.visible=false;environmentTime.value=shot.time;
      camera.position.set(...shot.position);camera.fov=shot.fov;camera.lookAt(new T.Vector3(...shot.target));camera.updateProjectionMatrix();
      atmosphere.set({hour:shot.hour,weather:'clear',cycling:false},true);
      hemisphere.color.set('#c6dcd5');hemisphere.intensity=1.4;sunlight.color.set('#e7e7c8');sunlight.intensity=1.05;sunlight.position.set(-24,39,-30);fill.intensity=.38;renderer.toneMappingExposure=1.02;
      (scene.fog as T.FogExp2).color.set('#90a9a2');(scene.fog as T.FogExp2).density=.012;waterMat.color.set('#457e78');foliageMat.color.set('#8ca18b');
      if(shot.moon){moon.position.set(...shot.moon);moon.visible=true;}
      filmHalo.position.copy(moon.position);

      boat.position.z=shot.boatZ??-35;boat.position.x=riverX(boat.position.z);boat.position.y=.22+Math.sin(shot.time*.7)*.055;boat.rotation.z=Math.sin(shot.time*.55)*.018;
      birds.position.set(Math.sin(shot.time*.018)*60,30,-60+Math.cos(shot.time*.018)*15);
      currents.forEach((c,i)=>{const z=((c.z+85+shot.time*c.speed)%130)-85,edge=waterEdges(id,z),x=T.MathUtils.lerp(edge.left+.2,edge.right-.8,c.offset),y=waterHeight(id,z)+.07;currentPositions.setXYZ(i*2,x,y,z);currentPositions.setXYZ(i*2+1,x+c.width,y,z+.05);});
      currentPositions.needsUpdate=true;updateLeaves(shot.time);details.tick(shot.time,0,false);presence.tick(shot.time,false,shot.hour);
      // The film's fixed moonlight does not need another foliage depth pass for
      // every camera frame. People keep their separate soft contact shadows.
      renderer.shadowMap.needsUpdate=cinemaShadowHour!==shot.hour;cinemaShadowHour=shot.hour;
      renderer.render(scene,camera);return renderer.domElement;
    },
    returnToEntrance:()=>{if(cave&&mode==='walk'){returnRoute=caveReturnPath(player.position);returning=true;autoTour=true;lookOverride=0;}},
    environment:(settings)=>{events.time(atmosphere.set(settings,reduced));dirty=true;},
    mode:setMode,
    go:(index)=>{const p=landmarks[index];if(!p)return;stopTour();if(mode==='walk'){
      const inPassage=(flower&&p.z<5&&p.z>-10)||(cave&&p.z<-7),px=inPassage?riverX(p.z)+10:Math.max(p.x,riverX(p.z)+7.4);
      player.position.set(px,walkingHeight(px,p.z),p.z);
      const focal:Record<string,[number,number]>={
        'autumn-0':[riverX(14)+7.8,14],'autumn-1':[riverX(-3),-3],'autumn-2':[18,-20],'autumn-3':[riverX(-35),-35],
        'snow-2':[riverX(-18)+1,-18],
        'maple-1':[riverX(2)+3.3,2],'maple-2':[-39,-22],
        'peach-2':[20,-24],'peach-3':[24,-27],
        'cave-2':[riverX(-23)+11.65,-23],'cave-3':[riverX(-48)+12.8,-48],
      };
      const focus=focal[`${id}-${index}`];
      const focusX=focus?.[0]??(winter?riverX(p.z):index===0?20:index===2?19:riverX(p.z)),focusZ=focus?.[1]??p.z-4;
      yaw=(cave&&index===1)||(flower&&index===1)?0:Math.atan2(player.position.x-focusX,player.position.z-focusZ);pitch=focus&&index===0&&id==='autumn'?-.14:0;eyeCamera();discoverAtPlayer();
    }else{const lift=height(p.x,p.z);transition={pos:new T.Vector3(p.x+(cave?45:18),lift+(cave?32:16),p.z+(cave?50:22)),target:new T.Vector3(p.x,lift+2,p.z)};}},
    reset:()=>{stopTour();player.position.set(riverX(27)+10,height(riverX(27)+10,27),27);setMode(mode);},
    tour:(on)=>{returning=false;autoTour=on;tourTarget=0;tourPause=0;if(on){setMode('walk');autoTour=true;}},
    quality:(low)=>{lightQuality=low;applyVegetation();renderer.shadowMap.enabled=!low;renderer.shadowMap.needsUpdate=true;renderer.setPixelRatio(low?1:Math.min(window.devicePixelRatio,1.6));dirty=true;},
    motion:(reduce)=>{reduced=reduce;controls.enableDamping=!reduce;atmosphere.set({},reduce);dirty=true;},
    pause:(on)=>{paused=on;if(on)clear();dirty=true;},
    input:(x,y)=>{touch={x,y};if(x||y)stopTour();},
    dispose:()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('keydown',onKey);window.removeEventListener('keyup',onUp);window.removeEventListener('blur',clear);lookUp();renderer.domElement.removeEventListener('pointerdown',lookDown);renderer.domElement.removeEventListener('pointermove',lookMove);renderer.domElement.removeEventListener('pointerup',lookUp);renderer.domElement.removeEventListener('pointercancel',lookUp);renderer.domElement.removeEventListener('lostpointercapture',lookUp);controls.dispose();renderer.domElement.removeEventListener('webglcontextlost',onLost);const geos=new Set<T.BufferGeometry>(),mats=new Set<T.Material>();scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line||o instanceof T.Points){geos.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));}});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());foliageTexture.dispose();paints.dispose();presence.dispose();atmosphere.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}
  };
}
