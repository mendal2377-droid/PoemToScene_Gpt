import {test,expect} from '@playwright/test';
import {sceneKey} from '../src/scenes';

test('first visit offers five scenes before loading 3D, then remembers the selection',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1494,height:765});
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'择一境，慢行'})).toBeVisible();
  await expect(page.locator('.library-card')).toHaveCount(5);
  await expect(page.locator('.library-current')).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveCount(0);
  const boxes=await page.locator('.library-card').evaluateAll(cards=>cards.map(card=>card.getBoundingClientRect().top));
  expect(new Set(boxes).size).toBe(1);
  await page.screenshot({path:'test-results/welcome-desktop.png'});
  await page.getByRole('button',{name:/第二境 · 柳宗元/}).click();
  await expect(page.locator('main')).toHaveAttribute('data-scene','snow');
  await expect(page.getByRole('button',{name:'入境漫游',exact:true})).toBeEnabled({timeout:60000});
  expect(await page.evaluate(key=>localStorage.getItem(key),sceneKey)).toBe('snow');
  await page.reload();
  await expect(page.locator('.welcome-screen')).toHaveCount(0);
  await expect(page.locator('main')).toHaveAttribute('data-scene','snow');
  await page.getByRole('button',{name:'诗境长卷',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'诗境长卷'})).toBeVisible();
  await page.getByRole('button',{name:/第一境 · 王维/}).click();
  await expect(page.locator('main')).toHaveAttribute('data-scene','autumn');
  expect(await page.evaluate(key=>localStorage.getItem(key),sceneKey)).toBe('autumn');
  expect(errors).toEqual([]);
});

test('invalid saved scene returns to a mobile chooser with a reachable last panel',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(key=>localStorage.setItem(key,'retired-scene'),sceneKey);
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'择一境，慢行'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({path:'test-results/welcome-mobile.png'});
  const last=page.getByRole('button',{name:/第五境 · 王安石/});
  await last.focus();await page.keyboard.press('Enter');
  await expect(page.locator('main')).toHaveAttribute('data-scene','cave');
  await expect(page.locator('.welcome-screen')).toHaveCount(0);
});

test('visitors can enter a scene when browser storage is unavailable',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    Object.defineProperty(window,'localStorage',{get:()=>{throw new DOMException('Storage blocked','SecurityError');}});
  });
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'择一境，慢行'})).toBeVisible();
  await page.getByRole('button',{name:/第一境 · 王维/}).click();
  await expect(page.getByRole('button',{name:'入境漫游',exact:true})).toBeEnabled({timeout:60000});
  await expect(page.locator('main')).toHaveAttribute('data-scene','autumn');
  expect(errors).toEqual([]);
});
