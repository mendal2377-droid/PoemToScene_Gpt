import {test,expect} from '@playwright/test';
import * as T from 'three';
import {landscapeHeight,waterEdges,routeCenter,landscapeViews} from '../src/landscape';
import {mountainShell} from '../src/massif';
import {environmentMix} from '../src/audio';
import {scenes} from '../src/scenes';

test('mountain trail climbs continuously while snow and peach shores remain distinct',()=>{
  const ground=(z:number)=>landscapeHeight('cave',routeCenter(z),z);
  expect(ground(-9)-ground(27)).toBeGreaterThan(12);
  for(let z=27;z>-42;z-=.2){
    expect(Math.abs(ground(z-.2)-ground(z))).toBeLessThan(.2);
    for(const scene of scenes){
      const edge=waterEdges(scene.id,z);
      expect(edge.right).toBeLessThan(routeCenter(z)-1.1);
      expect(Number.isFinite(landscapeHeight(scene.id,routeCenter(z),z))).toBe(true);
    }
  }
  const width=(id:'snow'|'peach'|'cave')=>{const e=waterEdges(id,0);return e.right-e.left;};
  expect(width('snow')).toBeGreaterThan(width('peach')*4);
  expect(width('peach')).toBeGreaterThan(width('cave')*3);
  expect(new Set(scenes.map(s=>landscapeViews[s.id].camera.join(','))).size).toBe(5);
});

test('cliff front leaves an eye-height cave entrance open and encloses the rock above it',()=>{
  const height=(x:number,z:number)=>landscapeHeight('cave',x,z),z=-7,cx=routeCenter(z),y=height(cx,z);
  const geo=mountainShell(z,-44,37,65,2.6,5.4,routeCenter,height);
  const mat=new T.MeshBasicMaterial({side:T.DoubleSide}),mesh=new T.Mesh(geo,mat);mesh.updateMatrixWorld();
  const ray=new T.Raycaster(new T.Vector3(cx,y+1.65,z+4),new T.Vector3(0,0,-1),0,8);
  expect(ray.intersectObject(mesh)).toHaveLength(0);
  ray.set(new T.Vector3(cx,y+20,z+4),new T.Vector3(0,0,-1));
  expect(ray.intersectObject(mesh).length).toBeGreaterThan(0);
  geo.dispose();mat.dispose();
});

test('sound changes from sheltered village to exposed ascent and then cave',()=>{
  const p={x:8,z:2,yaw:0,riverX:0,hour:9};
  expect(environmentMix({...p,scene:'peach'}).village).toBe(0);
  expect(environmentMix({...p,z:-32,scene:'peach'}).village).toBeGreaterThan(0);
  expect(environmentMix({...p,scene:'cave'}).wind).toBeGreaterThan(environmentMix({...p,scene:'peach'}).wind*2);
  const cave=environmentMix({...p,scene:'cave',shelter:1});
  expect(cave.wind+cave.birds+cave.village).toBe(0);
  expect(cave.drip+cave.torch).toBeGreaterThan(0);
});
