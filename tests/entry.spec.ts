import {test,expect} from '@playwright/test';
import {sceneKey} from '../src/scenes';

test('entry stays clickable where the bottom toolbar used to intercept it',async({page})=>{
  test.setTimeout(240000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(key=>localStorage.setItem(key,'peach'),sceneKey);
  await page.goto('/');
  const enter=page.getByRole('button',{name:'入境漫游',exact:true});
  await expect(enter).toBeEnabled({timeout:60000});
  for(const [width,height] of [[1494,801],[1920,900],[1600,801],[1024,660],[390,844]]){
    await page.setViewportSize({width,height});
    // A normal click must reach the button, without forcing through an overlay.
    await expect.poll(()=>enter.evaluate(el=>{
      const r=el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
    })).toBe(true);
    await enter.click();
    await expect(page.locator('main')).toHaveClass(/is-walking/);
    await expect(page.locator('canvas')).toHaveAttribute('aria-label',/第一人称/);
    await expect(page.getByRole('group',{name:'漫游控制'})).toBeVisible();
    await page.getByRole('button',{name:'返回观景',exact:true}).click();
    await expect(enter).toBeVisible();
  }
  // The toolbar's actual controls still receive clicks.
  await page.setViewportSize({width:1494,height:801});
  await page.getByRole('button',{name:'漫游',exact:true}).click();
  await expect(page.locator('main')).toHaveClass(/is-walking/);
  await page.getByRole('button',{name:'沿途拾诗',exact:true}).click();
  await page.getByRole('button',{name:/^夹岸花，/}).click();
  await expect(page.locator('.discovery-card')).toBeVisible();
  expect(errors).toEqual([]);
});
