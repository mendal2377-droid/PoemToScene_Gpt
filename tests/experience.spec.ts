import { test, expect } from '@playwright/test';

test('desktop: renders, walks, discovers all verses, and persists progress',async({page})=>{
  test.setTimeout(240000); // Several software-rendered camera captures and a full reload.
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto('/');await page.getByRole('button',{name:/第一境 · 王维/}).click();
  await expect(page.getByRole('button',{name:'入境漫游',exact:true})).toBeEnabled({timeout:60000});
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('button',{name:'设置',exact:true}).click();
  await page.getByRole('checkbox',{name:'减少动态效果'}).check();
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  await page.getByRole('button',{name:'入境漫游',exact:true}).click();
  await expect(page.locator('.walk-status')).toContainText('自在漫游');
  await expect(page.locator('.bottom-ui')).toBeHidden();
  await expect(page.locator('.discovery-card')).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveAttribute('aria-label',/第一人称/);
  const before=await page.locator('canvas').screenshot({path:'test-results/quiet-walking.png'});
  await page.mouse.move(720,450);await page.mouse.wheel(0,-1000);await page.waitForTimeout(200);
  expect(before.equals(await page.locator('canvas').screenshot())).toBeTruthy();
  await page.mouse.down();await page.mouse.move(850,490,{steps:5});await page.mouse.up();
  const turned=await page.locator('canvas').screenshot();expect(before.equals(turned)).toBeFalsy();
  await page.keyboard.down('w');await page.waitForTimeout(1100);await page.keyboard.up('w');
  const after=await page.locator('canvas').screenshot();expect(turned.equals(after)).toBeFalsy();
  await page.getByRole('button',{name:'沿途拾诗',exact:true}).click();
  for(const name of ['松间月','石上泉','竹林语','莲下舟']){
    await page.getByRole('button',{name:new RegExp(`^${name}，`)}).click();
    await expect(page.getByRole('button',{name:new RegExp(`^${name}，.*已发现`)})).toBeVisible();
  }
  await expect(page.locator('.walk-status')).toContainText('4 / 4');
  await page.getByRole('button',{name:'沿途拾诗',exact:true}).click();
  await expect(page.locator('.bottom-ui')).toBeHidden();
  await expect(page.locator('.discovery-card')).toHaveCount(0);
  await page.reload();await expect(page.getByRole('button',{name:'入境漫游',exact:true})).toBeEnabled({timeout:60000});
  await expect(page.locator('.landmark.discovered')).toHaveCount(4);
  await page.getByRole('button',{name:'读一读这首诗'}).click();
  await expect(page.getByRole('dialog')).toContainText('随意春芳歇，王孙自可留。');
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'循诗而行',exact:true}).click();
  await expect(page.locator('.walk-status')).toContainText('自动漫游');
  await page.keyboard.press('ArrowUp');await expect(page.locator('.walk-status')).toContainText('自在漫游');
  await page.getByRole('button',{name:'诗境长卷'}).click();
  await expect(page.getByRole('dialog')).toContainText('游褒禅山记');
  await page.getByRole('button',{name:/第一境 · 王维/}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('mobile: fits viewport, exposes movement controls and usable poetry dialog',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');await page.getByRole('button',{name:/第一境 · 王维/}).click();await expect(page.getByRole('button',{name:'入境漫游',exact:true})).toBeEnabled({timeout:60000});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({path:'test-results/mobile.png'});
  await page.getByRole('button',{name:'入境漫游',exact:true}).click();
  const stick=page.getByRole('group',{name:'触控行走摇杆'});await expect(stick).toBeVisible();
  const bounds=await stick.boundingBox();if(!bounds)throw Error('Joystick missing');
  await page.mouse.move(bounds.x+48,bounds.y+48);await page.mouse.down();await page.mouse.move(bounds.x+48,bounds.y+15);await page.waitForTimeout(400);await page.mouse.up();
  await expect(page.locator('.bottom-ui')).toBeHidden();
  await page.screenshot({path:'test-results/mobile-quiet.png'});
  await page.getByRole('button',{name:'沿途拾诗',exact:true}).click();
  await page.getByRole('button',{name:/^竹林语，/}).click();await expect(page.locator('.discovery-card')).toContainText('竹喧归浣女');
  await page.screenshot({path:'test-results/mobile-walking.png'});
  await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('checkbox',{name:'轻盈画质'}).check();
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  await page.getByRole('button',{name:'诗境长卷'}).click();await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
});

test('WebGL failure leaves a readable poem and recovery action',async({page})=>{
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:unknown[]){if(type.includes('webgl'))return null;return original.apply(this,[type,...args] as never);} as typeof original;});
  await page.goto('/');await page.getByRole('button',{name:/第一境 · 王维/}).click();await expect(page.getByRole('heading',{name:'山色暂未展开'})).toBeVisible();
  await expect(page.locator('.fallback')).toContainText('明月松间照，清泉石上流。');
  await expect(page.getByRole('button',{name:'重新载入'})).toBeVisible();
});

test('the environment moves at rest and reduced motion freezes it',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/');await page.getByRole('button',{name:/第一境 · 王维/}).click();
  await expect(page.getByRole('button',{name:'入境漫游',exact:true})).toBeEnabled({timeout:60000});
  await page.getByRole('button',{name:'入境漫游',exact:true}).click();
  const moving=await page.locator('canvas').screenshot();
  await page.waitForTimeout(900);
  expect(moving.equals(await page.locator('canvas').screenshot())).toBeFalsy();
  await page.getByRole('button',{name:'设置',exact:true}).click();
  await page.getByRole('checkbox',{name:'减少动态效果'}).check();
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  await page.waitForTimeout(500);
  const still=await page.locator('canvas').screenshot();
  await page.waitForTimeout(700);
  expect(still.equals(await page.locator('canvas').screenshot())).toBeTruthy();
  expect(errors).toEqual([]);
});
