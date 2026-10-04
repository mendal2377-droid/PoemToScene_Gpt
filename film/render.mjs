import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const out=path.resolve(process.env.FILM_OUTPUT||'film/output/one-take');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--ignore-gpu-blocklist','--enable-webgl','--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
page.on('pageerror',e=>console.error(e));
page.on('console',m=>{if(m.type()==='error')console.error(m.text());});
await page.goto('http://127.0.0.1:5173/film/');await page.waitForFunction(()=>window.film?.ready,{},{timeout:120000});
await page.evaluate(()=>document.fonts.ready);
const plan=await page.evaluate(()=>({duration:window.film.duration,keys:window.film.keys,verses:window.film.verses}));fs.writeFileSync(path.join(out,'film-plan.json'),JSON.stringify(plan,null,2));
console.log(await page.evaluate(()=>{const gl=document.querySelector('#world canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);}));
const times=process.argv.includes('--full')?Array.from({length:1440},(_,i)=>i/24):[2,6,13,19,25,32,39,46,53,58];
const start=Date.now();
if(process.argv.includes('--audio')){const data=await page.evaluate(()=>window.film.audio());fs.writeFileSync(path.join(out,'soundtrack.wav'),Buffer.from(data,'base64'));console.log('Stereo score rendered');await browser.close();process.exit(0);}
for(let i=0;i<times.length;i++){
 const data=await page.evaluate(t=>window.film.render(t),times[i]);
 fs.writeFileSync(path.join(out,process.argv.includes('--full')?`frame-${String(i).padStart(5,'0')}.jpg`:`preview-${times[i]}.jpg`),Buffer.from(data,'base64'));
 if(i%24===0||!process.argv.includes('--full'))console.log(`${i+1}/${times.length}, t=${times[i].toFixed(2)}, elapsed ${((Date.now()-start)/1000).toFixed(1)}s`);
}
await browser.close();
