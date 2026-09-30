import {test,expect} from '@playwright/test';
import {scenes,progressKey,shelterAt} from '../src/scenes';
import {environmentMix} from '../src/audio';

test('five literary routes have isolated progress and appropriate sound habitats',()=>{
 expect(new Set(scenes.map(s=>progressKey(s.id))).size).toBe(5);
 for(const scene of scenes){expect(scene.landmarks).toHaveLength(4);expect(scene.text.length).toBeGreaterThan(1);}
 const position={x:7,z:0,yaw:0,riverX:0,hour:9};
 const snow=environmentMix({...position,scene:'snow'}),peach=environmentMix({...position,scene:'peach'}),night=environmentMix({...position,scene:'maple'});
 expect(snow.birds+snow.crow+snow.bell+snow.village+snow.bamboo).toBe(0);
 expect(peach.birds).toBeGreaterThan(0);expect(night.bell).toBeGreaterThan(0);expect(night.crow).toBeGreaterThan(0);
 const inside=environmentMix({...position,scene:'cave',shelter:1,rain:1});
 expect(inside.wind+inside.rain+inside.birds).toBe(0);expect(inside.drip).toBeGreaterThan(0);expect(inside.torch).toBeGreaterThan(0);
 expect(environmentMix({...position,scene:'peach',hour:23}).birds).toBe(0);
 expect(shelterAt('peach',6,0)).toBe(1);expect(shelterAt('peach',0,-20)).toBe(0);
 expect(shelterAt('cave',0,-20)).toBe(1);expect(shelterAt('cave',24,-20)).toBe(0);
});

test('switch all new scenes, walk their routes, read prose, and preserve separate discoveries',async({page})=>{
 test.setTimeout(360000);
 await page.setViewportSize({width:1100,height:760});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/');await page.getByRole('button',{name:/第一境 · 王维/}).click();await expect(page.getByRole('button',{name:'入境漫游',exact:true})).toBeEnabled({timeout:60000});
 await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('checkbox',{name:'减少动态效果'}).check();await page.getByRole('button',{name:'关闭',exact:true}).click();
 for(const scene of scenes.slice(1)){
  await page.getByRole('button',{name:'诗境长卷',exact:true}).click();
  await page.getByRole('button',{name:`${scene.chapter} · ${scene.author} · ${scene.title}`,exact:true}).click();
  await expect(page.getByRole('button',{name:'入境漫游',exact:true})).toBeEnabled({timeout:60000});
  await expect(page.locator('main')).toHaveAttribute('data-scene',scene.id);
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.locator('.landmark.discovered')).toHaveCount(0);
  await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('checkbox',{name:'减少动态效果'}).check();await page.getByRole('button',{name:'关闭',exact:true}).click();
  await page.getByRole('button',{name:'天色与天气',exact:true}).click();
  await expect(page.getByRole('button',{name:scene.id==='snow'?'疏雪':scene.id==='cave'?'阴天':'晴空',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'收起天色'}).click();
  await page.getByRole('button',{name:'入境漫游',exact:true}).click();
  await page.screenshot({path:`test-results/${scene.id}-entry.png`});
  await page.getByRole('button',{name:'沿途拾诗',exact:true}).click();
  if(scene.id==='peach'||scene.id==='cave'){
   await page.getByRole('button',{name:new RegExp(`^${scene.landmarks[1].name}，`)}).click();
   await page.getByRole('button',{name:'沿途拾诗',exact:true}).click();
   await page.locator('canvas').focus();await page.keyboard.down('w');
   try{await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'[]').includes(2),progressKey(scene.id)),{timeout:45000}).toBeTruthy();}finally{await page.keyboard.up('w');}
   await page.screenshot({path:`test-results/${scene.id}-passage.png`});
   await page.getByRole('button',{name:'沿途拾诗',exact:true}).click();
  }
  for(const landmark of scene.landmarks){
   await page.getByRole('button',{name:new RegExp(`^${landmark.name}，`)}).click();
   await expect(page.getByRole('button',{name:new RegExp(`^${landmark.name}，.*已发现`)})).toBeVisible();
  }
  await expect(page.locator('.walk-status')).toContainText('4 / 4');
  await page.getByRole('button',{name:'沿途拾诗',exact:true}).click();
  await page.screenshot({path:`test-results/${scene.id}-destination.png`});
  await page.getByRole('button',{name:'阅读诗文',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText(scene.text[scene.text.length-1]);
  await expect(page.getByRole('link',{name:'原文出处 · 维基文库 ↗'})).toHaveAttribute('href',scene.source);
  await page.keyboard.press('Escape');
 }
 await page.reload();await expect(page.getByRole('button',{name:'入境漫游',exact:true})).toBeEnabled({timeout:60000});
 await expect(page.locator('main')).toHaveAttribute('data-scene','cave');await expect(page.locator('.landmark.discovered')).toHaveCount(4);
 await page.getByRole('button',{name:'诗境长卷',exact:true}).click();await page.getByRole('button',{name:/第一境 · 王维/}).click();
 await expect(page.getByRole('button',{name:'入境漫游',exact:true})).toBeEnabled({timeout:60000});await expect(page.locator('.landmark.discovered')).toHaveCount(0);
 expect(errors).toEqual([]);
});

test('mobile collection and long prose fit; each soundscape renders audible unclipped audio',async({page})=>{
 test.setTimeout(180000);await page.setViewportSize({width:390,height:844});
 await page.goto('/');await page.getByRole('button',{name:/第一境 · 王维/}).click();await expect(page.getByRole('button',{name:'入境漫游',exact:true})).toBeEnabled({timeout:60000});
 await page.getByRole('button',{name:'开启环境音',exact:true}).click();
 await page.getByRole('button',{name:'诗境长卷',exact:true}).click();
 await expect(page.locator('.library-card')).toHaveCount(5);await page.screenshot({path:'test-results/collection-mobile.png'});
 await page.getByRole('button',{name:/第四境 · 陶渊明/}).click();await expect(page.getByRole('button',{name:'入境漫游',exact:true})).toBeEnabled({timeout:60000});
 await expect(page.getByRole('button',{name:'关闭环境音',exact:true})).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'关闭环境音',exact:true}).click();
 await page.getByRole('button',{name:'读一读这篇记'}).click();await expect(page.locator('.prose')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);await page.screenshot({path:'test-results/prose-mobile.png'});
 const levels=await page.evaluate(async()=>{
  const path='/src/audio.ts';const {createSoundscape}=await import(path);const results=[];
  for(const scene of ['snow','maple','peach','cave']){
   const context=new OfflineAudioContext(2,44100*2,44100),scape=createSoundscape(context);
   scape.update({x:7,z:-22,yaw:0,riverX:0,scene,shelter:scene==='cave'?1:0,hour:9});
   const buffer=await context.startRendering(),samples=buffer.getChannelData(0);let sum=0,peak=0;
   for(const value of samples){sum+=value*value;peak=Math.max(peak,Math.abs(value));}scape.dispose();results.push({scene,rms:Math.sqrt(sum/samples.length),peak});
  }return results;
 });
 for(const level of levels){expect(level.rms,level.scene).toBeGreaterThan(.00001);expect(level.peak,level.scene).toBeLessThan(.95);}
});
