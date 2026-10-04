import {useEffect,useMemo,useState} from 'react';
import {ChevronLeft,ChevronRight,Pause,Play,X} from 'lucide-react';

export function readingLines(paragraphs:string[]){
 const prose=paragraphs.join('').length>100;
 return paragraphs.flatMap(p=>{
  const clauses=(p.match(/[^，。！？；：]+[，。！？；：]?[”」]?/gu)||[p]).flatMap(line=>{
   const chars=Array.from(line),parts:string[]=[];while(chars.length)parts.push(chars.splice(0,24).join(''));return parts;
  });
  if(!prose)return clauses;
  const lines:string[]=[];let current='';
  for(const clause of clauses){
   if(Array.from(current+clause).length>24){lines.push(current);current='';}
   current+=clause;if(/[。！？；][”」]?$/.test(clause)){lines.push(current);current='';}
  }
  if(current)lines.push(current);return lines;
 });
}
export function readHudPreference(){try{return localStorage.getItem('shijing-reading-hud')!=='off';}catch{return true;}}

export function ReadingHud({text,paused,onHide}:{text:string[];paused:boolean;onHide:()=>void}){
 const lines=useMemo(()=>readingLines(text),[text]);
 const [index,setIndex]=useState(0),[playing,setPlaying]=useState(true),[visible,setVisible]=useState(!document.hidden);
 useEffect(()=>{const change=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',change);return()=>document.removeEventListener('visibilitychange',change);},[]);
 useEffect(()=>{
  if(!playing||paused||!visible||index===lines.length-1)return;
  const timer=setTimeout(()=>setIndex(i=>Math.min(i+1,lines.length-1)),Math.max(6500,lines[index].length*460));return()=>clearTimeout(timer);
 },[index,playing,paused,visible,lines]);
 return <section className="reading-hud" aria-label="随行诗文" hidden={paused}>
  <p key={index} className="reading-line">{lines[index]}</p>
  <div className="reading-controls">
   <button onClick={()=>setIndex(i=>Math.max(0,i-1))} disabled={index===0} aria-label="上一句"><ChevronLeft size={14}/></button>
   <button onClick={()=>{if(index===lines.length-1){setIndex(0);setPlaying(true);}else setPlaying(!playing);}} aria-label={index===lines.length-1?'重新展读':playing?'暂停诗文':'继续诗文'}>{playing&&index<lines.length-1?<Pause size={12}/>:<Play size={12}/>}</button>
   <span>{index+1} / {lines.length}</span>
   <button onClick={()=>setIndex(i=>Math.min(lines.length-1,i+1))} disabled={index===lines.length-1} aria-label="下一句"><ChevronRight size={14}/></button>
   <button onClick={onHide} aria-label="隐藏随行诗文"><X size={13}/></button>
  </div>
 </section>;
}
