import * as T from 'three';
import {shelterAt,type SceneId} from './scenes';

export type Weather='clear'|'cloudy'|'mist'|'rain'|'snow';
export type EnvironmentSettings={hour:number;weather:Weather;cycling:boolean};
export const defaultEnvironment:EnvironmentSettings={hour:18,weather:'clear',cycling:false};
export const weatherOptions=[{id:'clear',label:'晴空'},{id:'cloudy',label:'阴天'},{id:'mist',label:'山雾'},{id:'rain',label:'细雨'},{id:'snow',label:'疏雪'}] as const;
export const timeOptions=[{hour:6,label:'清晨'},{hour:12,label:'白昼'},{hour:18,label:'薄暮'},{hour:22,label:'月夜'}] as const;
export const environmentKey='shijing-environment-v1';
export function normalizeEnvironment(value:unknown):EnvironmentSettings {
  const v=(value&&typeof value==='object'?value:{}) as Partial<EnvironmentSettings>;
  return {hour:typeof v.hour==='number'&&Number.isFinite(v.hour)?((v.hour%24)+24)%24:18,
    weather:weatherOptions.some(w=>w.id===v.weather)?v.weather!:'clear',cycling:v.cycling===true};
}
export function readEnvironment(key=environmentKey,fallback=defaultEnvironment){try{const value=localStorage.getItem(key);return value?normalizeEnvironment(JSON.parse(value)):{...fallback};}catch{return {...fallback};}}
export function advanceHour(hour:number,seconds:number,cycling:boolean,reduced:boolean){return ((hour+(cycling&&!reduced?seconds/20:0))%24+24)%24;}
export function clockLabel(hour:number){const minutes=Math.floor(hour*60)%1440;return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;}

const keys=[
  {hour:0,sky:'#152c3d',light:'#a3c8f1',leaf:'#46687a',water:'#285a65',ambient:.48,sun:.22,exposure:.70,night:1},
  {hour:5,sky:'#354956',light:'#b2c4d7',leaf:'#648582',water:'#477a81',ambient:.7,sun:.35,exposure:.78,night:.7},
  {hour:6,sky:'#d9c7ab',light:'#ffd5a0',leaf:'#aeb482',water:'#80aaa0',ambient:1.2,sun:.85,exposure:.88,night:0},
  {hour:9,sky:'#d2e4d3',light:'#fff4d6',leaf:'#a2c486',water:'#62afa5',ambient:1.8,sun:1.2,exposure:.95,night:0},
  {hour:15,sky:'#c6dfd5',light:'#fff0ce',leaf:'#9dbe7c',water:'#5aaba0',ambient:1.8,sun:1.25,exposure:.95,night:0},
  {hour:18,sky:'#d9d6b9',light:'#ffd6a5',leaf:'#aab97d',water:'#729f91',ambient:1.45,sun:1.0,exposure:.91,night:.15},
  {hour:20,sky:'#243f50',light:'#b5d2f0',leaf:'#557a82',water:'#336e78',ambient:.65,sun:.3,exposure:.78,night:.9},
  {hour:24,sky:'#152c3d',light:'#a3c8f1',leaf:'#46687a',water:'#285a65',ambient:.48,sun:.22,exposure:.70,night:1},
].map(k=>({...k,sky:new T.Color(k.sky),light:new T.Color(k.light),leaf:new T.Color(k.leaf),water:new T.Color(k.water)}));

export function environmentFrame(hour:number,weather:Weather){
  hour=((hour%24)+24)%24;
  const index=keys.findIndex((k,i)=>i<keys.length-1&&hour>=k.hour&&hour<keys[i+1].hour);
  const a=keys[Math.max(0,index)],b=keys[Math.max(0,index)+1],t=(hour-a.hour)/(b.hour-a.hour);
  const blend=(key:'ambient'|'sun'|'exposure'|'night')=>T.MathUtils.lerp(a[key],b[key],t);
  const cloud=weather==='clear'?0:weather==='cloudy'?.55:weather==='mist'?.35:.7;
  const night=blend('night');
  return {
    sky:a.sky.clone().lerp(b.sky,t).lerp(new T.Color('#a6b9b0').lerp(new T.Color('#294451'),night),cloud),
    light:a.light.clone().lerp(b.light,t).lerp(new T.Color('#bacbd0'),cloud),
    leaf:a.leaf.clone().lerp(b.leaf,t).multiplyScalar(1-cloud*.15),
    water:a.water.clone().lerp(b.water,t).multiplyScalar(1-cloud*.15),
    ambient:blend('ambient')*(1-cloud*.16),sun:blend('sun')*(1-cloud*.7),
    exposure:blend('exposure'),night,
    fog:weather==='mist'?.037:weather==='rain'?.022:weather==='cloudy'?.012:.008,
    mist:weather==='mist'?.38:weather==='rain'?.22:.10,
  };
}

type AtmosphereObjects={scene:T.Scene;camera:T.Camera;renderer:T.WebGLRenderer;hemisphere:T.HemisphereLight;sunlight:T.DirectionalLight;fill:T.DirectionalLight;moon:T.Mesh;foliage:T.MeshLambertMaterial;water:T.MeshStandardMaterial;ripples:T.LineBasicMaterial;mist:T.ShaderMaterial};
export function createAtmosphere(objects:AtmosphereObjects,id:SceneId='autumn'){
  const {scene,camera,renderer,hemisphere,sunlight,fill,moon,foliage,water,ripples,mist}=objects;
  let settings={...defaultEnvironment},hour=settings.hour,settling=0,clockSeconds=0,rainTime=0,shelter=0;
  const skyMaterial=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{uHorizon:{value:new T.Color()},uZenith:{value:new T.Color()},uCloud:{value:0},uShelter:{value:0}},
    vertexShader:'varying vec3 vSky;void main(){vSky=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`varying vec3 vSky;uniform vec3 uHorizon;uniform vec3 uZenith;uniform float uCloud;uniform float uShelter;
      void main(){vec3 d=normalize(vSky);float h=max(0.0,d.y);vec3 c=mix(uHorizon,uZenith,pow(h,.48));
      float cloud=sin(d.x*14.0+sin(d.z*11.0))*sin(d.z*19.0+d.y*8.0);c=mix(c,uHorizon,smoothstep(.2,.9,cloud)*uCloud*.18);c=mix(c,vec3(.018,.025,.028),uShelter);
      gl_FragColor=vec4(c,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
  scene.add(new T.Mesh(new T.SphereGeometry(360,32,20),skyMaterial));
  const glow=document.createElement('canvas');glow.width=glow.height=128;const gc=glow.getContext('2d')!,wash=gc.createRadialGradient(64,64,0,64,64,64);wash.addColorStop(0,'rgba(255,255,255,.5)');wash.addColorStop(.3,'rgba(255,255,255,.12)');wash.addColorStop(1,'rgba(255,255,255,0)');gc.fillStyle=wash;gc.fillRect(0,0,128,128);
  const haloMap=new T.CanvasTexture(glow),halo=new T.Sprite(new T.SpriteMaterial({map:haloMap,color:'#e2e4cb',transparent:true,opacity:.2,depthWrite:false,fog:false,blending:T.AdditiveBlending}));halo.scale.set(24,24,1);scene.add(halo);moon.scale.setScalar(.72);
  const sun=new T.Mesh(new T.SphereGeometry(5,20,16),new T.MeshBasicMaterial({color:'#ffe2a2',fog:false}));scene.add(sun);
  let seed=7821;const random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
  const starPositions:number[]=[];
  for(let i=0;i<150;i++){const az=random()*Math.PI*2,el=.15+random()*1.3;starPositions.push(Math.cos(az)*Math.cos(el)*290,Math.sin(el)*290,Math.sin(az)*Math.cos(el)*290);}
  const stars=new T.Points(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(starPositions,3)),new T.PointsMaterial({color:'#dae8eb',size:.7,transparent:true,opacity:0,fog:false,depthWrite:false}));scene.add(stars);
  const rainSeeds=Array.from({length:360},()=>({x:random()*48-24,z:random()*48-24,y:random()*28,speed:8+random()*5}));
  const rainPositions=new T.Float32BufferAttribute(new Float32Array(rainSeeds.length*6),3);
  const rain=new T.LineSegments(new T.BufferGeometry().setAttribute('position',rainPositions),new T.LineBasicMaterial({color:'#c7e0dd',transparent:true,opacity:.32,depthWrite:false}));rain.frustumCulled=false;rain.visible=false;scene.add(rain);
  const snowPositions=new T.Float32BufferAttribute(new Float32Array(rainSeeds.length*3),3);
  const snow=new T.Points(new T.BufferGeometry().setAttribute('position',snowPositions),new T.PointsMaterial({color:'#f3f3e8',size:.08,transparent:true,opacity:.8,depthWrite:false}));snow.visible=false;snow.frustumCulled=false;scene.add(snow);
  const drawRain=()=>{rain.position.copy(camera.position);snow.position.copy(camera.position);rainSeeds.forEach((p,i)=>{
    const covered=shelterAt(id,camera.position.x+p.x,camera.position.z+p.z)>.1;
    const y=((p.y-rainTime*p.speed)%28+28)%28-8;
    rainPositions.setXYZ(i*2,p.x,covered?-100:y,p.z);rainPositions.setXYZ(i*2+1,p.x-.1,covered?-100:y+.65,p.z+.08);
    const sy=((p.y-rainTime*.7)%28+28)%28-8;
    snowPositions.setXYZ(i,p.x+Math.sin(rainTime*.4+p.y)*.9,covered?-100:sy,p.z);
  });rainPositions.needsUpdate=true;snowPositions.needsUpdate=true;};
  const apply=(factor:number)=>{
    const f=environmentFrame(hour,settings.weather);
    if(id==='snow'){
      f.sky.lerp(new T.Color('#d6e0df').lerp(new T.Color('#263844'),f.night),.65);f.water.lerp(new T.Color('#617f8b'),.8);f.fog=Math.max(f.fog,.009);
    }
    if(id==='peach'||id==='maple')f.leaf.set(id==='peach'?'#e5d5c5':'#e0d6c2').lerp(new T.Color('#314354'),f.night*.85);
    if(id==='maple'){f.water.lerp(new T.Color('#223e52'),.7);f.fog*=.7;f.mist*=.5;}
    if(id==='peach'){f.sky.lerp(new T.Color('#eee2c8').lerp(new T.Color('#314556'),f.night),.26);f.water.lerp(new T.Color('#8cb6a4'),.3);f.fog*=.7;f.light.lerp(new T.Color('#ffe8c0'),(1-f.night)*.25);}
    if(id==='cave'){f.sky.lerp(new T.Color('#a9b9bc').lerp(new T.Color('#283844'),f.night),.45);f.water.lerp(new T.Color('#91aaa3'),.7);f.leaf.multiplyScalar(.83);f.fog*=.6;f.ambient*=.83;}
    if(id==='autumn'){f.water.lerp(new T.Color('#5e9b86'),.25);f.leaf.multiplyScalar(.9);}
    // Rock shelters retain their own darkness even when noon or rain is selected.
    const enclosed=shelter*(id==='cave'?1:.75);
    f.sky.lerp(new T.Color('#202b2d'),enclosed);f.ambient=T.MathUtils.lerp(f.ambient,.06,enclosed);
    f.sun*=1-enclosed;f.fog=T.MathUtils.lerp(f.fog,.038,enclosed);f.mist*=1-enclosed;

    (scene.background as T.Color).lerp(f.sky,factor);const fog=scene.fog as T.FogExp2;fog.color.copy(scene.background as T.Color);fog.density=T.MathUtils.lerp(fog.density,f.fog,factor);
    skyMaterial.uniforms.uHorizon.value.copy(scene.background);
    skyMaterial.uniforms.uZenith.value.copy(f.sky).multiplyScalar(.64).lerp(new T.Color('#254952'),f.night*.18);
    skyMaterial.uniforms.uCloud.value=settings.weather==='clear'?.25:.85;skyMaterial.uniforms.uShelter.value=enclosed;
    hemisphere.color.lerp(f.light,factor);hemisphere.intensity=T.MathUtils.lerp(hemisphere.intensity,f.ambient,factor);
    sunlight.color.lerp(f.light,factor);sunlight.intensity=T.MathUtils.lerp(sunlight.intensity,f.sun,factor);
    fill.intensity=T.MathUtils.lerp(fill.intensity,(.15+(1-f.night)*.45)*(1-shelter),factor);
    renderer.toneMappingExposure=T.MathUtils.lerp(renderer.toneMappingExposure,f.exposure,factor);
    foliage.color.lerp(f.leaf.clone().lerp(new T.Color('#b9c8b6'),.55),factor);
    foliage.emissive.copy(f.leaf);foliage.emissiveIntensity=.12+f.night*.16;foliage.emissiveMap=foliage.map;
    water.color.lerp(f.water,factor);ripples.opacity=T.MathUtils.lerp(ripples.opacity,.2+(1-f.night)*.28,factor);
    mist.uniforms.uMistOpacity.value=T.MathUtils.lerp(mist.uniforms.uMistOpacity.value,f.mist,factor);mist.uniforms.uMistTint.value.copy(f.sky);
    const angle=(hour-6)/24*Math.PI*2;
    sun.position.set(-Math.cos(angle)*120,Math.sin(angle)*130,-145);sun.visible=hour>5.8&&hour<18.5&&settings.weather!=='rain'&&settings.weather!=='mist'&&settings.weather!=='snow'&&shelter<.1;
    moon.position.set(Math.cos(angle)*90,35+Math.max(0,-Math.sin(angle))*95,-160);moon.visible=f.night>.08&&settings.weather!=='rain'&&settings.weather!=='mist'&&settings.weather!=='snow'&&shelter<.1;
    halo.position.copy(moon.position);halo.visible=moon.visible;halo.material.opacity=f.night*.25;
    sunlight.position.copy(f.night>.5?moon.position:sun.position);sunlight.position.y=Math.max(20,sunlight.position.y);
    renderer.shadowMap.needsUpdate=true;
    stars.material.opacity=f.night*(settings.weather==='clear'?.8:settings.weather==='cloudy'?.16:0);
    rain.material.opacity=.2+(1-f.night)*.14;
  };
  apply(1);
  return {
    set:(patch:Partial<EnvironmentSettings>,reduced:boolean)=>{
      settings=normalizeEnvironment({...settings,...patch});if(patch.hour!==undefined)hour=settings.hour;
      settling=reduced?0:3;if(reduced)apply(1);rain.visible=settings.weather==='rain'&&!reduced;snow.visible=settings.weather==='snow'&&!reduced;drawRain();return hour;
    },
    tick:(dt:number,reduced:boolean,onClock:(hour:number)=>void,nextShelter=0)=>{
      if(Math.abs(shelter-nextShelter)>.001){shelter=nextShelter;settling=3;}
      const cycling=settings.cycling&&!reduced;hour=advanceHour(hour,dt,cycling,reduced);
      let changed=false;
      if(cycling||settling>0){apply(reduced?1:1-Math.exp(-dt*3));settling=Math.max(0,settling-dt);changed=true;}
      const showRain=settings.weather==='rain'&&!reduced;if(rain.visible!==showRain){rain.visible=showRain;changed=true;}
      const showSnow=settings.weather==='snow'&&!reduced;if(snow.visible!==showSnow){snow.visible=showSnow;changed=true;}
      if(showRain||showSnow){rainTime+=dt;drawRain();changed=true;}
      clockSeconds+=dt;if(clockSeconds>=1){clockSeconds=0;onClock(hour);}
      return changed;
    },
    weather:()=>settings.weather,hour:()=>hour,dispose:()=>haloMap.dispose(),
  };
}
