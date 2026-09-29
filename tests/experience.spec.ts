import { test, expect } from '@playwright/test';

test('desktop: renders, walks, discovers all verses, and persists progress',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto('/');
  await expect(page.getByRole('button',{name:'入境漫游',exact:true})).toBeEnabled({timeout:30000});
  await expect(page.locator('canvas')).toBeVisible();
  await page.screenshot({path:'test-results/desktop.png'});
  await page.getByRole('button',{name:'设置',exact:true}).click();
  await page.getByRole('checkbox',{name:'减少动态效果'}).check();
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  await page.getByRole('button',{name:'入境漫游',exact:true}).click();
  await expect(page.locator('.walk-status')).toContainText('自在漫游');
  const before=await page.locator('canvas').screenshot();
  await page.keyboard.down('w');await page.waitForTimeout(1100);await page.keyboard.up('w');
  const after=await page.locator('canvas').screenshot();expect(before.equals(after)).toBeFalsy();
  for(const name of ['松间月','石上泉','竹林语','莲下舟']){
    await page.getByRole('button',{name:new RegExp(`^${name}，`)}).click();
    await expect(page.getByRole('button',{name:new RegExp(`^${name}，.*已发现`)})).toBeVisible();
  }
  await expect(page.locator('.walk-status')).toContainText('4 / 4');
  await page.screenshot({path:'test-results/walking.png'});
  await page.reload();await expect(page.getByRole('button',{name:'入境漫游',exact:true})).toBeEnabled();
  await expect(page.locator('.landmark.discovered')).toHaveCount(4);
  await page.getByRole('button',{name:'读一读这首诗'}).click();
  await expect(page.getByRole('dialog')).toContainText('随意春芳歇，王孙自可留。');
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'循诗而行',exact:true}).click();
  await expect(page.locator('.walk-status')).toContainText('自动漫游');
  await page.keyboard.press('ArrowUp');await expect(page.locator('.walk-status')).toContainText('自在漫游');
  await page.getByRole('button',{name:'诗境长卷'}).click();
  await expect(page.getByRole('dialog')).toContainText('尚在构思');
  await page.getByRole('button',{name:/第一境 · 王维/}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('mobile: fits viewport, exposes movement controls and usable poetry dialog',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');await expect(page.getByRole('button',{name:'入境漫游',exact:true})).toBeEnabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({path:'test-results/mobile.png'});
  await page.getByRole('button',{name:'入境漫游',exact:true}).click();
  const stick=page.getByRole('group',{name:'触控行走摇杆'});await expect(stick).toBeVisible();
  const bounds=await stick.boundingBox();if(!bounds)throw Error('Joystick missing');
  await page.mouse.move(bounds.x+48,bounds.y+48);await page.mouse.down();await page.mouse.move(bounds.x+48,bounds.y+15);await page.waitForTimeout(400);await page.mouse.up();
  await page.getByRole('button',{name:/^竹林语，/}).click();await expect(page.locator('.discovery-card')).toContainText('竹喧归浣女');
  await page.screenshot({path:'test-results/mobile-walking.png'});
  await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('checkbox',{name:'轻盈画质'}).check();
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  await page.getByRole('button',{name:'诗境长卷'}).click();await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
});

test('WebGL failure leaves a readable poem and recovery action',async({page})=>{
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:unknown[]){if(type.includes('webgl'))return null;return original.apply(this,[type,...args] as never);} as typeof original;});
  await page.goto('/');await expect(page.getByRole('heading',{name:'山色暂未展开'})).toBeVisible();
  await expect(page.locator('.fallback')).toContainText('明月松间照，清泉石上流。');
  await expect(page.getByRole('button',{name:'重新载入'})).toBeVisible();
});
