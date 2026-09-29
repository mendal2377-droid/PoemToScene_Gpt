import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Compass, Footprints, Headphones, Leaf, Maximize, Minimize, Moon, Mountain, Navigation, Pause, Play, RotateCcw, Settings2, Volume2, VolumeX, Waves, X } from 'lucide-react';
import { fullPoem, landmarks, type Mode } from './poem';
import type { WorldAPI } from './world';
import { createAmbience, type SoundPosition } from './audio';

const storeKey='shijing-discoveries-v1';
function readProgress():number[] { try { const v=JSON.parse(localStorage.getItem(storeKey)||'[]');return Array.isArray(v)?v.filter((i:unknown)=>typeof i==='number'&&i>=0&&i<4):[]; } catch { return []; } }

function Modal({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}) {
  const ref=useRef<HTMLDivElement>(null),close=useRef(onClose);close.current=onClose;
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement;
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape')close.current();
      if(e.key==='Tab'){
        const elements=ref.current?.querySelectorAll<HTMLElement>('button,input,select,a[href],[tabindex="0"]');
        if(!elements?.length)return;const first=elements[0],last=elements[elements.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    };
    document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);previous?.focus();};
  },[]);
  return <div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div ref={ref} className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-top"><span className="eyebrow">SHIJING · 诗境</span><button className="icon-button" onClick={onClose} aria-label="关闭"><X size={20}/></button></div><h2>{title}</h2>{children}</div></div>;
}

export default function App() {
  const host=useRef<HTMLDivElement>(null),world=useRef<WorldAPI|null>(null),ambience=useRef<ReturnType<typeof createAmbience>|null>(null);
  const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
  const [mode,setMode]=useState<Mode>('view'),[active,setActive]=useState<number|null>(null),[found,setFound]=useState<number[]>(readProgress);
  const [routeOpen,setRouteOpen]=useState(false);
  const [modal,setModal]=useState<'poem'|'library'|'settings'|null>(null),[sound,setSound]=useState(false),[tour,setTour]=useState(false),[fullscreen,setFullscreen]=useState(false);
  const [quality,setQuality]=useState(false),[reduce,setReduce]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [toast,setToast]=useState(''),[speaking,setSpeaking]=useState(false),[joystick,setJoystick]=useState({x:0,y:0});
  const joystickRef=useRef<HTMLDivElement>(null);
  const soundPosition=useRef<SoundPosition>({x:13,z:27,yaw:.35,riverX:3});
  useEffect(()=>{
    let cancelled=false;setReady(false);setFailed(false);
    import('./world').then(({createWorld})=>{
      if(cancelled||!host.current)return;
      try {world.current=createWorld(host.current,{
        ready:()=>setReady(true),failure:()=>{setFailed(true);setReady(false);},tourEnd:()=>setTour(false),
        discover:(i)=>{setFound(previous=>previous.includes(i)?previous:[...previous,i]);},
        soundPosition:(position)=>{soundPosition.current=position;ambience.current?.update(position);}
      });}catch(error){console.error('Scene initialization failed',error);setFailed(true);}
    }).catch(()=>setFailed(true));
    return()=>{cancelled=true;world.current?.dispose();world.current=null;};
  },[retry]);
  useEffect(()=>{try{localStorage.setItem(storeKey,JSON.stringify(found));}catch{/* Private browsing may disallow persistence. */}},[found]);
  useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(id);},[toast]);
  useEffect(()=>()=>{ambience.current?.dispose();window.speechSynthesis?.cancel();},[]);
  useEffect(()=>{const change=()=>setFullscreen(Boolean(document.fullscreenElement));document.addEventListener('fullscreenchange',change);return()=>document.removeEventListener('fullscreenchange',change);},[]);
  useEffect(()=>{world.current?.quality(quality);},[quality,ready]);
  useEffect(()=>{world.current?.motion(reduce);},[reduce,ready]);
  useEffect(()=>{world.current?.pause(Boolean(modal));},[modal,ready]);
  const focusScene=()=>host.current?.querySelector('canvas')?.focus({preventScroll:true});
  const changeMode=(next:Mode)=>{setMode(next);world.current?.mode(next);setTour(false);setActive(null);setRouteOpen(false);focusScene();};
  const startTour=()=>{const on=!tour;setMode('walk');setTour(on);setActive(null);setRouteOpen(false);world.current?.tour(on);focusScene();};
  const openModal=(next:typeof modal)=>{world.current?.tour(false);world.current?.input(0,0);setTour(false);setModal(next);};
  const visit=(index:number)=>{setActive(index);setTour(false);world.current?.go(index);focusScene();};
  const toggleSound=async()=>{try{if(!ambience.current)ambience.current=createAmbience();ambience.current.update(soundPosition.current);if(sound)await ambience.current.stop();else await ambience.current.start();setSound(!sound);}catch{setToast('当前浏览器暂不支持环境音。');}};
  const narrate=()=>{
    if(!('speechSynthesis' in window)){setToast('当前浏览器不支持朗读，你仍可阅读完整诗文。');return;}
    if(speaking){speechSynthesis.cancel();setSpeaking(false);return;}
    const u=new SpeechSynthesisUtterance(`山居秋暝。王维。${fullPoem.join('')}`);u.lang='zh-CN';u.rate=.72;u.pitch=.9;
    u.onend=()=>setSpeaking(false);u.onerror=()=>{setSpeaking(false);setToast('朗读未能播放，请检查设备的中文语音。');};speechSynthesis.speak(u);setSpeaking(true);
  };
  const toggleFullscreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else setToast('此浏览器不支持全屏模式。');}catch{setToast('此浏览器暂时无法进入全屏。');}};
  const moveJoystick=(e:React.PointerEvent<HTMLDivElement>)=>{
    if(!e.currentTarget.hasPointerCapture(e.pointerId))return;
    const r=e.currentTarget.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/32,dy=(e.clientY-r.top-r.height/2)/32,len=Math.max(1,Math.hypot(dx,dy)),x=dx/len,y=dy/len;
    setJoystick({x:x*24,y:y*24});world.current?.input(x,y);
  };
  const stopJoystick=()=>{setJoystick({x:0,y:0});world.current?.input(0,0);};

  return <main className={`app ${mode==='walk'?'is-walking':''} ${routeOpen?'route-open':''} ${reduce?'reduce-motion':''}`}>
    <div className="world" ref={host}/>
    <div className="scene-wash" aria-hidden="true"/><div className="paper-grain" aria-hidden="true"/>
    <header className="topbar">
      <button className="brand" onClick={()=>{changeMode('view');world.current?.reset();}} aria-label="诗境，返回全景"><span className="seal">诗<br/>境</span><span className="brand-name">诗境<span>SHIJING</span></span><span className="brand-divider"/><span className="brand-tagline">一诗一境，自在其间</span></button>
      <nav aria-label="主导航"><button className="nav-button" aria-label="诗境长卷" onClick={()=>openModal('library')}><BookOpen size={16}/><span>诗境长卷</span></button><span className="nav-line"/><button className="icon-button" onClick={toggleSound} aria-label={sound?'关闭环境音':'开启环境音'} aria-pressed={sound}>{sound?<Volume2 size={18}/>:<VolumeX size={18}/>}</button><button className="icon-button" onClick={()=>openModal('settings')} aria-label="设置"><Settings2 size={18}/></button></nav>
    </header>

      <section className="intro" aria-label="山居秋暝" inert={mode==='walk'} aria-hidden={mode==='walk'}>
      <div className="chapter"><span/>第一境 <i> / </i> 山水清音</div>
      <h1>山居<span>秋暝</span></h1>
      <div className="poet"><span>唐</span><i/>王 维</div>
      <div className="intro-poem"><p>空山新雨后，</p><p>天气晚来秋。</p></div>
      <p className="intro-description">雨歇，山静，月初升。<br/>走入一首诗，暂忘尘世的喧嚣。</p>
      <button className="enter-button" disabled={!ready} onClick={()=>changeMode(mode==='view'?'walk':'view')}>{mode==='view'?<Footprints size={17}/>:<Mountain size={17}/>}<span>{mode==='view'?'入境漫游':'返回观景'}</span><ArrowRight size={17}/></button>
      <button className="read-link" onClick={()=>openModal('poem')}>读一读这首诗 <ChevronRight size={14}/></button>
      <div className="intro-index"><span>01</span><span className="index-line"/><span>山居秋暝</span></div>
    </section>

    <div className="scene-caption" aria-hidden="true"><span>明月松间照</span><span>清泉石上流</span><i>王维 · 山居秋暝</i></div>
    <aside className="right-tools" aria-label="场景控制">
      <div className="weather"><Moon size={16}/><span>新雨 · 初秋</span><small>薄暮时分</small></div>
      <div className="view-controls"><button className="icon-button" onClick={()=>{world.current?.reset();setTour(false);setActive(null);focusScene();}} disabled={!ready} aria-label="重置视角"><RotateCcw size={18}/></button><button className="icon-button" onClick={toggleFullscreen} aria-label={fullscreen?'退出全屏':'进入全屏'}>{fullscreen?<Minimize size={18}/>:<Maximize size={18}/>}</button></div>
    </aside>

    {mode==='walk'&&<div className="walk-status sr-only" role="status">{tour?'循诗而行 · 自动漫游':'自在漫游'} · {found.length} / 4 处诗意</div>}

    {active!==null&&<section className="discovery-card" aria-label={landmarks[active].name}><button className="close-card icon-button" onClick={()=>setActive(null)} aria-label="收起诗意"><X size={15}/></button><div className="eyebrow">{found.includes(active)?'已寻得的诗意':'诗中一景'} · 0{active+1}</div><h2>{landmarks[active].line}<span>。</span></h2><p>{landmarks[active].description}</p>{!found.includes(active)&&mode==='view'&&<button className="text-button" onClick={()=>{changeMode('walk');world.current?.go(active);}}>走近此景 <ArrowRight size={14}/></button>}</section>}

    {mode==='walk'&&<div className="wander-dock" role="group" aria-label="漫游控制">
      <button className="icon-button" onClick={()=>changeMode('view')} aria-label="返回观景" title="返回观景"><ArrowLeft size={18}/></button>
      <span className="dock-divider"/>
      <button className="icon-button" onClick={startTour} aria-label={tour?'暂停漫游':'循诗而行'} title={tour?'暂停漫游':'循诗而行'} aria-pressed={tour}>{tour?<Pause size={18}/>:<Play size={18}/>}</button>
      <button className="icon-button" onClick={()=>{setRouteOpen(!routeOpen);setActive(null);}} aria-label="沿途拾诗" title="沿途拾诗" aria-expanded={routeOpen} aria-controls="poetry-route"><Compass size={19}/>{found.length>0&&<span className="discovery-dot"/>}</button>
      <button className="icon-button" onClick={()=>openModal('poem')} aria-label="阅读诗文" title="阅读诗文"><BookOpen size={18}/></button>
    </div>}

    <div className="bottom-ui" hidden={mode==='walk'&&!routeOpen} id="poetry-route">
      <div className="scene-toolbar"><div className="mode-switch" role="group" aria-label="探索方式"><button className={mode==='view'?'selected':''} disabled={!ready} onClick={()=>changeMode('view')} aria-pressed={mode==='view'}><Mountain size={16}/>观景</button><button className={mode==='walk'?'selected':''} disabled={!ready} onClick={()=>changeMode('walk')} aria-pressed={mode==='walk'}><Footprints size={16}/>漫游</button></div><span className="control-hint">{mode==='view'?'拖动环顾 · 滚轮缩放':'W A S D / 方向键行走 · 拖动环顾'}</span><button className={`tour-button ${tour?'tour-active':''}`} onClick={startTour} disabled={!ready} aria-pressed={tour}>{tour?<Pause size={14}/>:<Play size={14}/>}<span>{tour?'暂停漫游':'循诗而行'}</span></button></div>
      <div className="journey"><div className="journey-label"><Compass size={18}/><span>沿途拾诗<small>循一径，入四景</small></span></div><div className="landmarks">{landmarks.map((p,i)=><button key={p.id} className={`landmark ${active===i?'active':''} ${found.includes(i)?'discovered':''}`} disabled={!ready} onClick={()=>visit(i)} aria-label={`${p.name}，${p.line}${found.includes(i)?'，已发现':''}`}><span className="landmark-number">{found.includes(i)?<Check size={12}/>:String(i+1).padStart(2,'0')}</span><span className={`landmark-art art-${p.icon}`}>{i===0?<Moon/>:i===1?<Waves/>:i===2?<Leaf/>:<Navigation/>}</span><span className="landmark-text"><strong>{p.name}</strong><small>{p.line}</small></span><ArrowRight size={14} className="landmark-arrow"/></button>)}</div><div className="journey-end"><span>山水有清音</span><small>静听，慢行。</small></div></div>
      <footer><span><span className="live-dot"/> 可游可居的中国诗境</span><span>以诗为径 · 以心观景</span><span>第一卷 / 山水之间</span></footer>
    </div>

    {mode==='walk'&&<div ref={joystickRef} className="joystick" role="group" aria-label="触控行走摇杆" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);moveJoystick(e);}} onPointerMove={moveJoystick} onPointerUp={stopJoystick} onPointerCancel={stopJoystick} onLostPointerCapture={stopJoystick}><ArrowDown size={14}/><span style={{transform:`translate(${joystick.x}px,${joystick.y}px)`}}/></div>}
    {!ready&&!failed&&<div className="loading" role="status"><Mountain size={34}/><span>山色渐入，静候片刻</span><div className="loading-line"/></div>}
    {failed&&<div className="fallback"><Mountain size={38}/><h2>山色暂未展开</h2><p>此设备的三维画面未能载入。<br/>你仍可以在这里，读完这一首诗。</p><div className="fallback-poem">{fullPoem.map(p=><p key={p}>{p}</p>)}</div><button className="enter-button" onClick={()=>{setMode('view');setTour(false);setRetry(v=>v+1);}}>重新载入 <RotateCcw size={16}/></button></div>}
    <div className="toast" role="status" aria-live="polite">{toast&&<span><Leaf size={15}/>{toast}</span>}</div>

    {modal==='poem'&&<Modal title="山居秋暝" onClose={()=>setModal(null)}><div className="modal-author">唐 · 王维</div><div className="full-poem">{fullPoem.map(p=><p key={p}>{p}</p>)}</div><div className="poem-note"><span>诗中有画，画中有诗。</span><p>秋雨初歇，山中迎来清凉的暮色。明月、清泉、竹林与渔舟，构成了一幅宁静而富有生机的山居图景。此境依诗意创作，邀你在行走中体会那份悠然。</p></div><button className="outlined-button" onClick={narrate}>{speaking?<Pause size={16}/>:<Headphones size={16}/>} {speaking?'停止朗读':'听一遍诗文'}</button><small className="voice-note">使用设备中文语音朗读</small></Modal>}
    {modal==='library'&&<Modal title="诗境长卷" onClose={()=>setModal(null)}><p className="modal-lead">在字句之间，寻一处可以停留的山水。</p><div className="library-cards"><button className="library-card current" onClick={()=>{setModal(null);changeMode('view');world.current?.reset();}}><span className="library-landscape"><Mountain size={68}/><Moon size={24}/></span><small>第一境 · 王维</small><strong>山居秋暝</strong><span>新雨空山，明月清泉 <ArrowRight size={15}/></span><em>进入诗境</em></button><div className="library-card snow"><span className="library-landscape"><Mountain size={68}/></span><small>拟作 · 柳宗元</small><strong>江雪</strong><span>千山寂寥，一舟独钓</span><em>尚在构思</em></div><div className="library-card night"><span className="library-landscape"><Moon size={42}/></span><small>拟作 · 张继</small><strong>枫桥夜泊</strong><span>江枫渔火，夜半钟声</span><em>尚在构思</em></div></div></Modal>}
    {modal==='settings'&&<Modal title="随心入境" onClose={()=>setModal(null)}><div className="setting-row"><span><strong>轻盈画质</strong><small>降低渲染分辨率，适合手机与节能使用</small></span><input type="checkbox" checked={quality} onChange={e=>setQuality(e.target.checked)} aria-label="轻盈画质"/></div><div className="setting-row"><span><strong>减少动态效果</strong><small>静止流水、草木、薄雾与飞鸟，关闭镜头过渡</small></span><input type="checkbox" checked={reduce} onChange={e=>setReduce(e.target.checked)} aria-label="减少动态效果"/></div><div className="settings-help"><h3>如何漫游</h3><p>漫游以诗人眼睛的高度看世界。电脑：W A S D 或方向键行走，拖动画面转头。</p><p>手机：左下摇杆行走，拖动画面转头。观景模式仍可缩放。</p><p>播放按钮开启「循诗而行」。手动行走即可中止引导。罗盘按钮展开沿途诗景，点选后前往并阅读。走近诗景会静静记录，不打断漫游。</p><h3>环境声音</h3><p>水流、山风与竹叶声由程序合成，并非实地自然录音。水声随距离与朝向变化，走近竹林时叶声渐浓；戴耳机可听见方向。</p><p>已寻得的诗意保存在本设备。当前进度：{found.length} / 4。</p></div></Modal>}
    <a className="skip-link" href="#poem-accessible" onClick={()=>openModal('poem')}>阅读诗文</a><div id="poem-accessible" className="sr-only">山居秋暝，唐代王维。{fullPoem.join('')}</div>
  </main>;
}
