import {test,expect} from '@playwright/test';
import {advanceHour,environmentFrame,normalizeEnvironment,clockLabel} from '../src/environment';
import {environmentMix} from '../src/audio';

test('time wraps continuously and pauses for reduced motion',()=>{
  expect(advanceHour(23.9,4,true,false)).toBeCloseTo(.1);
  expect(advanceHour(18,480,true,false)).toBeCloseTo(18);
  expect(advanceHour(18,60,true,true)).toBe(18);
  expect(advanceHour(18,60,false,false)).toBe(18);
  expect(clockLabel(6.5)).toBe('06:30');
  expect(normalizeEnvironment({hour:NaN,weather:'hail',cycling:'yes'})).toEqual({hour:18,weather:'clear',cycling:false});
  const end=environmentFrame(23.999,'clear'),start=environmentFrame(0,'clear');
  expect(end.sky.r).toBeCloseTo(start.sky.r,3);
});

test('weather and light profiles remain distinct and usable',()=>{
  const day=environmentFrame(12,'clear'),night=environmentFrame(22,'clear');
  expect(day.ambient).toBeGreaterThan(night.ambient*2);
  expect(night.ambient).toBeGreaterThan(.3);
  expect(environmentFrame(12,'mist').fog).toBeGreaterThan(day.fog*3);
  const position={x:7,z:0,yaw:0,riverX:0};
  expect(environmentMix({...position,rain:1}).rain).toBeGreaterThan(0);
  expect(environmentMix(position).rain).toBe(0);
  for(let hour=0;hour<24;hour+=.25)for(const weather of ['clear','cloudy','mist','rain','snow'] as const){
    const frame=environmentFrame(hour,weather);
    for(const value of [frame.sun,frame.ambient,frame.exposure,frame.fog,frame.sky.r,frame.sky.g,frame.sky.b])expect(Number.isFinite(value)&&value>=0).toBeTruthy();
  }
});

test('weather panel changes the rendered scene, persists choices, and fits mobile',async({page})=>{
  test.setTimeout(240000);
  await page.setViewportSize({width:1000,height:720});
  await page.emulateMedia({reducedMotion:'no-preference'});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('/');await expect(page.getByRole('button',{name:'入境漫游',exact:true})).toBeEnabled({timeout:60000});
  await page.getByRole('button',{name:'入境漫游',exact:true}).click();
  await page.getByRole('button',{name:'天色与天气',exact:true}).click();
  const panel=page.getByRole('dialog',{name:'天色与天气'});
  await panel.getByRole('button',{name:'白昼',exact:true}).click();
  await panel.getByRole('checkbox',{name:'光阴流转'}).check();
  await expect(panel.locator('output')).not.toHaveText('12:00',{timeout:60000});
  await page.getByRole('button',{name:'收起天色'}).click();
  await page.getByRole('button',{name:'设置',exact:true}).click();
  await page.getByRole('checkbox',{name:'减少动态效果'}).check();
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  await page.getByRole('button',{name:'天色与天气',exact:true}).click();
  await panel.getByRole('button',{name:'白昼',exact:true}).click();
  await page.getByRole('button',{name:'收起天色'}).click();
  const day=await page.locator('canvas').screenshot({path:'test-results/weather-day.png'});
  await page.getByRole('button',{name:'天色与天气',exact:true}).click();
  await panel.getByRole('button',{name:'月夜',exact:true}).click();
  await panel.getByRole('button',{name:'细雨',exact:true}).click();
  await panel.getByRole('checkbox',{name:'光阴流转'}).check();
  await expect(panel).toContainText('流转暂歇');
  await expect(panel.locator('output')).toHaveText('22:00');
  await page.getByRole('button',{name:'收起天色'}).click();
  const night=await page.locator('canvas').screenshot({path:'test-results/weather-night-rain.png'});
  expect(day.equals(night)).toBeFalsy();
  await page.waitForTimeout(1100);
  expect(night.equals(await page.locator('canvas').screenshot())).toBeTruthy();
  await page.getByRole('button',{name:'天色与天气',exact:true}).click();
  await panel.getByRole('checkbox',{name:'光阴流转'}).uncheck();
  await page.reload();await expect(page.getByRole('button',{name:'天色与天气',exact:true})).toBeEnabled({timeout:60000});
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'天色与天气',exact:true}).click();
  await expect(panel.getByRole('button',{name:'细雨',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(panel.locator('output')).toHaveText('22:00');
  await panel.getByRole('button',{name:'山雾',exact:true}).click();
  await panel.getByRole('button',{name:'清晨',exact:true}).click();
  await expect(panel.getByRole('checkbox',{name:'光阴流转'})).not.toBeChecked();
  const box=await panel.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(390);
  await page.screenshot({path:'test-results/weather-mobile.png'});
  await page.keyboard.press('Escape');await expect(panel).toBeHidden();
  expect(errors).toEqual([]);
});
