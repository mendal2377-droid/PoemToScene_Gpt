import {test,expect} from '@playwright/test';
import {bridgeLayout,bridgeRoads,bridgeSurface,bridgeWalkable,bridgeClearance} from '../src/bridges';
import {landscapeHeight,routeCenter,waterEdges} from '../src/landscape';

test('crossings join both banks and their paths without a step or blocked approach',()=>{
 for(const id of ['autumn','maple'] as const){
  const b=bridgeLayout(id)!,paths=bridgeRoads(id),edges=waterEdges(id,b.z);
  expect(b.left).toBeLessThan(edges.left);expect(b.right).toBeGreaterThan(edges.right);
  expect(paths[0][0]).toEqual({x:b.right,z:b.z});expect(paths[0].at(-1)?.x).toBe(routeCenter(b.z));
  expect(paths[1][0]).toEqual({x:b.left,z:b.z});
  for(const x of [b.left,b.right])expect(b.deck(x)-landscapeHeight(id,x,b.z)).toBeCloseTo(.06);
  for(let x=b.left-.2;x<=b.right+.2;x+=.1){expect(bridgeWalkable(id,x,b.z)).toBeTruthy();expect(bridgeClearance(id,x,b.z)).toBeTruthy();}
  const mid=(b.left+b.right)/2;
  expect(bridgeSurface(id,mid,b.z)).toBeGreaterThan(2);
  expect(bridgeWalkable(id,mid,b.z+3)).toBeFalsy();
  expect(bridgeLayout('snow')).toBeNull();
 }
});

for(const id of ['autumn','maple'] as const)test(`${id}: walk across the rendered deck and return to the road`,async({page})=>{
 await page.route('**/bridge-test.html',route=>route.fulfill({contentType:'text/html',body:'<style>html,body{margin:0}#host{width:100vw;height:100vh}</style><div id="host"></div>'}));
 await page.goto('/bridge-test.html');
 await page.evaluate(async id=>{
  const [{createWorld},{scenes},{bridgeLayout}]=await Promise.all([import('/src/world.ts'),import('/src/scenes.ts'),import('/src/bridges.ts')]);
  const b=bridgeLayout(id),base=scenes.find(s=>s.id===id),definition={...base,landmarks:[{...base.landmarks[0],x:b.right+3,z:b.z}]};
  window.bridgeState={ready:false,position:null,errors:[]};
  const api=createWorld(document.querySelector('#host'),{ready:()=>{window.bridgeState.ready=true},time:()=>{},discover:()=>{},tourEnd:()=>{},failure:()=>window.bridgeState.errors.push('WebGL lost'),soundPosition:p=>window.bridgeState.position=p},definition);
  api.motion(true);window.bridgeAPI=api;window.bridgeLayout=b;
 },id);
 await page.waitForFunction(()=>window.bridgeState.ready);
 await page.evaluate(()=>{window.bridgeAPI.mode('walk');window.bridgeAPI.go(0)});
 await page.waitForFunction(()=>window.bridgeState.position?.walking&&Math.abs(window.bridgeState.position.z-7)<.01);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const aim=async(direction:number)=>page.evaluate(direction=>{const yaw=window.bridgeState.position.yaw;window.bridgeAPI.input(direction*Math.cos(yaw),direction*Math.sin(yaw))},direction);
 await aim(-1);
 await page.waitForFunction(()=>Math.abs(window.bridgeState.position.x-(window.bridgeLayout.left+window.bridgeLayout.right)/2)<.7,{},{timeout:60000});
 await page.evaluate(()=>window.bridgeAPI.input(0,0));
 const mid=await page.evaluate(()=>window.bridgeState.position);
 expect(bridgeSurface(id,mid.x,mid.z)).toBeGreaterThan(2);expect(mid.z).toBeCloseTo(7,1);
 await page.locator('canvas').screenshot({path:`reference-review/bridge-${id}-crossing.png`});
 await aim(-1);await page.waitForFunction(()=>window.bridgeState.position.x<window.bridgeLayout.left-.7,{},{timeout:60000});
 await page.evaluate(()=>window.bridgeAPI.input(0,0));
 await page.locator('canvas').screenshot({path:`reference-review/bridge-${id}-west.png`});
 await page.evaluate(()=>window.bridgeAPI.tour(true));
 await page.waitForFunction(()=>window.bridgeState.position.x>window.bridgeLayout.right+.7,{},{timeout:60000});
 await page.evaluate(()=>window.bridgeAPI.tour(false));
 await page.evaluate(()=>{const b=window.bridgeLayout,mid=(b.left+b.right)/2;window.bridgeAPI.cinema({time:20,position:[mid+2,9,29],target:[mid,1.6,7],fov:55,hour:16})});
 await page.locator('canvas').screenshot({path:`reference-review/bridge-${id}-connections.png`});
 await page.evaluate(()=>{window.bridgeAPI.input(0,0);window.bridgeAPI.dispose()});
 expect(errors).toEqual([]);
});
