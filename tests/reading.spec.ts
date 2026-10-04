import {caveReturnPath,caveWalkable} from '../src/caveNavigation';
import {test,expect} from '@playwright/test';
import {readingLines} from '../src/ReadingHud';
import {scenes,sceneKey,shelterAt} from '../src/scenes';
import {caveSection,routeCenter} from '../src/landscape';

test('every article remains complete in short reading lines; the cavern stays sheltered',()=>{
 for(const scene of scenes){const lines=readingLines(scene.text);expect(lines.join('')).toBe(scene.text.join(''));expect(lines.every(l=>Array.from(l).length<=24)).toBeTruthy();}
 expect(caveSection(-53).width).toBeGreaterThan(caveSection(-10).width*3);
 expect(shelterAt('cave',routeCenter(-53)+7,-53)).toBe(1);
});

test('return paths avoid the pool and column from either side of the cavern',()=>{
 for(const start of [{x:-.5,z:-52},{x:14,z:-53},{x:8,z:-64},{x:8,z:-53}]){
  expect(caveWalkable(start.x,start.z)).toBeTruthy();const route=caveReturnPath(start);expect(route.length).toBeGreaterThan(1);expect(route.at(-1)!.z).toBe(-26);
  let previous=start;for(const point of route){for(let t=0;t<=1;t+=.1)expect(caveWalkable(previous.x+(point.x-previous.x)*t,previous.z+(point.z-previous.z)*t)).toBeTruthy();previous=point;}
 }
});

test('quiet reading appears automatically, advances, pauses and stays out of dialogs',async({page})=>{
 test.setTimeout(240000);
 await page.addInitScript(key=>localStorage.setItem(key,'snow'),sceneKey);
 await page.setViewportSize({width:1000,height:720});await page.goto('/');
 await expect(page.getByRole('button',{name:'入境漫游',exact:true})).toBeEnabled({timeout:60000});
 await page.getByRole('button',{name:'入境漫游',exact:true}).click();
 const hud=page.getByRole('region',{name:'随行诗文'}),line=page.locator('.reading-line');
 await expect(hud).toBeVisible();const first=await line.textContent();
 await expect(line).not.toHaveText(first!,{timeout:16000});
 await page.getByRole('button',{name:'暂停诗文',exact:true}).click();const paused=await line.textContent();
 await page.waitForTimeout(7500);await expect(line).toHaveText(paused!);
 await page.getByRole('button',{name:'下一句',exact:true}).click();await expect(line).not.toHaveText(paused!);
 await page.getByRole('button',{name:'上一句',exact:true}).click();await expect(line).toHaveText(paused!);
 await page.getByRole('button',{name:'阅读诗文',exact:true}).click();await expect(hud).toBeHidden();await page.keyboard.press('Escape');await expect(hud).toBeVisible();
});

test('mobile prose overlay fits and remembers being hidden',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.addInitScript(key=>localStorage.setItem(key,'peach'),sceneKey);await page.goto('/');await expect(page.getByRole('button',{name:'入境漫游',exact:true})).toBeEnabled({timeout:60000});await page.getByRole('button',{name:'入境漫游',exact:true}).click();
 const hud=page.getByRole('region',{name:'随行诗文'});const bounds=await hud.boundingBox(),dock=await page.getByRole('group',{name:'漫游控制'}).boundingBox();
 expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(390);expect(bounds!.y+bounds!.height).toBeLessThan(dock!.y);
 await page.screenshot({path:'test-results/reading-mobile.png'});
 await page.getByRole('button',{name:'隐藏随行诗文',exact:true}).click();await expect(hud).toHaveCount(0);
 await page.reload();await expect(page.getByRole('button',{name:'入境漫游',exact:true})).toBeEnabled({timeout:60000});await page.getByRole('button',{name:'入境漫游',exact:true}).click();await expect(hud).toHaveCount(0);
 await page.getByRole('button',{name:'随行诗文',exact:true}).click();await expect(hud).toBeVisible();
});

test('the deeper cave chamber can be explored and the guided return reaches the entrance',async({page})=>{
 test.setTimeout(240000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.setViewportSize({width:1100,height:760});await page.addInitScript(key=>localStorage.setItem(key,'cave'),sceneKey);await page.goto('/');
 await expect(page.getByRole('button',{name:'入境漫游',exact:true})).toBeEnabled({timeout:60000});await page.getByRole('button',{name:'入境漫游',exact:true}).click();
 await page.getByRole('button',{name:'沿途拾诗',exact:true}).click();await page.getByRole('button',{name:/^幽深处，/}).click();await page.getByRole('button',{name:'沿途拾诗',exact:true}).click();
 await expect(page.getByRole('button',{name:'循光出洞',exact:true})).toBeVisible();
 const before=await page.locator('canvas').screenshot({path:'test-results/cavern.png'});
 await page.locator('canvas').focus();await page.keyboard.down('w');await page.waitForTimeout(2000);await page.keyboard.up('w');
 expect(before.equals(await page.locator('canvas').screenshot())).toBeFalsy();
 await page.getByRole('button',{name:'循光出洞',exact:true}).click();await expect(page.locator('.walk-status')).toContainText('自动漫游');
 await expect(page.getByRole('button',{name:'循光出洞',exact:true})).toBeHidden({timeout:90000});
 await expect(page.locator('.walk-status')).toContainText('自在漫游',{timeout:90000});
 await page.screenshot({path:'test-results/cave-returned.png'});expect(errors).toEqual([]);
});
