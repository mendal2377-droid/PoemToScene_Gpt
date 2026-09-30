import { test,expect } from '@playwright/test';
import { environmentMix } from '../src/audio';

test('river and bamboo balance follows distance and listener direction',()=>{
  const near=environmentMix({x:7,z:0,riverX:0,yaw:0});
  const far=environmentMix({x:28,z:0,riverX:0,yaw:0});
  const turned=environmentMix({x:7,z:0,riverX:0,yaw:Math.PI});
  const grove=environmentMix({x:18,z:-17,riverX:-10,yaw:0});
  expect(near.river).toBeGreaterThan(far.river*2);
  expect(near.riverPan).toBeLessThan(0);expect(turned.riverPan).toBeGreaterThan(0);
  expect(grove.bamboo).toBeGreaterThan(near.bamboo*2);
  for(const mix of [near,far,turned,grove])for(const value of Object.values(mix))expect(Number.isFinite(value)).toBeTruthy();
});

test('sound starts only when enabled, produces a signal, and can be muted',async({page})=>{
  await page.addInitScript(()=>{
    const state=window as typeof window & {soundTest?:{context:AudioContext;analyser:AnalyserNode}};
    const Native=window.AudioContext;
    window.AudioContext=class extends Native {
      constructor(options?:AudioContextOptions){
        super(options);state.soundTest={context:this,analyser:this.createAnalyser()};
      }
    };
  });
  await page.setViewportSize({width:900,height:700});
  await page.goto('/');await page.getByRole('button',{name:/第一境 · 王维/}).click();
  await expect(page.getByRole('button',{name:'入境漫游',exact:true})).toBeEnabled({timeout:60000});
  expect(await page.evaluate(()=>Boolean((window as typeof window & {soundTest?:unknown}).soundTest))).toBeFalsy();
  await page.getByRole('button',{name:'开启环境音',exact:true}).click();
  await expect(page.getByRole('button',{name:'关闭环境音',exact:true})).toHaveAttribute('aria-pressed','true');
  // Headless Windows may report a running context with a frozen device clock.
  // Render the actual sound graph offline to verify a non-silent signal.
  const energy=await page.evaluate(async()=>{
    const modulePath='/src/audio.ts';
    const {createSoundscape}=await import(modulePath);
    const context=new OfflineAudioContext(2,44100,44100);
    const sound=createSoundscape(context);
    sound.update({x:7,z:0,yaw:0,riverX:0});
    const buffer=await context.startRendering();
    const samples=buffer.getChannelData(0);
    sound.dispose();
    return Math.sqrt(samples.reduce((sum:number,value:number)=>sum+value*value,0)/samples.length);
  });
  expect(energy).toBeGreaterThan(.00001);
  await page.getByRole('button',{name:'关闭环境音',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as typeof window & {soundTest:{context:AudioContext}}).soundTest.context.state)).toBe('suspended');
  await page.getByRole('button',{name:'设置',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('并非实地自然录音');
});
