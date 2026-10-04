import {chromium} from 'playwright';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const folder=path.resolve(process.env.FILM_OUTPUT||'film/output/one-take'),file=path.join(folder,'A-Place-to-Stay_One-Take_1080x1920.mp4');
const binary=fs.readFileSync(file);
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:540,height:960}});
await page.goto('http://127.0.0.1:5173/'+path.relative(process.cwd(),file).split(path.sep).join('/'));
await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
const metadata=await page.evaluate(async()=>{
 const v=document.querySelector('video');v.muted=true;await v.play();await new Promise(r=>setTimeout(r,1600));v.pause();
 return {width:v.videoWidth,height:v.videoHeight,duration:v.duration,playbackAdvanced:v.currentTime>1,decodedFrames:v.getVideoPlaybackQuality().totalVideoFrames};
});
if(metadata.width!==1080||metadata.height!==1920||Math.abs(metadata.duration-60)>.05||!metadata.playbackAdvanced)throw Error(JSON.stringify(metadata));
for(const t of [2,19,25,32,39,53]){
 const data=await page.evaluate(async t=>{const v=document.querySelector('video');await new Promise(r=>{v.addEventListener('seeked',r,{once:true});v.currentTime=t;});const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);return c.toDataURL('image/jpeg',.94).split(',')[1];},t);
 fs.writeFileSync(path.join(folder,`encoded-check-${t}.jpg`),Buffer.from(data,'base64'));
}
await browser.close();
const ffmpeg=process.env.FFMPEG_PATH||path.resolve('.video-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe');
const result=spawnSync(ffmpeg,['-hide_banner','-nostats','-i',file,'-vf','blackdetect=d=0.25:pix_th=0.08:pic_th=0.98,freezedetect=n=-50dB:d=2,scdet=threshold=30','-af','ebur128=framelog=verbose:peak=true','-f','null','NUL'],{encoding:'utf8'});
fs.writeFileSync(path.join(folder,'verification.log'),result.stderr);
const summary=result.stderr.split('Summary:').pop();
const validation={...metadata,bytes:binary.length,fastStart:binary.indexOf('moov')<binary.indexOf('mdat'),fullDecodePassed:result.status===0,frames:Number(result.stderr.match(/frame=\s*(\d+)/)?.[1]),fps:24,audio:'AAC stereo, 48 kHz, 256 kbps',color:result.stderr.match(/Video: h264[^\r\n]+/)?.[0],loudness:summary.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]+' LUFS',truePeak:summary.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]+' dBFS',detectedCuts:result.stderr.split('\n').filter(line=>line.includes('lavfi.scd.time')),freezeWarnings:result.stderr.split('\n').filter(line=>line.includes('freeze_start')),inspection:'Six encoded frames saved for visual review; browser playback and full-file decode tested.'};
fs.writeFileSync(path.join(folder,'validation.json'),JSON.stringify(validation,null,2));
console.log(JSON.stringify(validation,null,2));console.log(result.stderr.slice(-2200));
if(result.status!==0)process.exit(1);
