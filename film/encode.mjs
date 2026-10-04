import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const folder=path.resolve(process.env.FILM_OUTPUT||'film/output/one-take');
const ffmpeg=process.env.FFMPEG_PATH||path.resolve('.video-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe');
const output=path.join(folder,'A-Place-to-Stay_One-Take_1080x1920.mp4');
const analysis=spawnSync(ffmpeg,['-hide_banner','-nostats','-i',path.join(folder,'soundtrack.wav'),'-af','loudnorm=I=-18:TP=-1.5:LRA=9:print_format=json','-f','null','NUL'],{encoding:'utf8'});
if(analysis.status!==0)throw Error(analysis.stderr);
const levels=JSON.parse(analysis.stderr.match(/\{[\s\S]*\}/)[0]);fs.writeFileSync(path.join(folder,'loudness-analysis.json'),JSON.stringify(levels,null,2));
const normalize=`loudnorm=I=-18:TP=-1.5:LRA=9:measured_I=${levels.input_i}:measured_TP=${levels.input_tp}:measured_LRA=${levels.input_lra}:measured_thresh=${levels.input_thresh}:offset=${levels.target_offset}:linear=true`;
const args=['-hide_banner','-y','-framerate','24','-i',path.join(folder,'frame-%05d.jpg'),'-i',path.join(folder,'soundtrack.wav'),
 '-vf','sidedata=mode=delete:type=ICC_PROFILE,scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p,setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709',
 '-c:v','libx264','-preset','slow','-crf','18','-profile:v','high','-level:v','4.1','-refs','4','-g','48','-pix_fmt','yuv420p','-r','24','-color_range','tv','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709',
 '-c:a','aac','-b:a','256k','-ar','48000','-af',normalize,
 '-movflags','+faststart','-t','60','-metadata','title=A place to stay | 山居秋暝','-metadata','artist=SHIJING / Poem by Wang Wei',output];
const result=spawnSync(ffmpeg,args,{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);
fs.copyFileSync(path.join(folder,'frame-00048.jpg'),path.join(folder,'A-Place-to-Stay_Cover.jpg'));
console.log(output);
