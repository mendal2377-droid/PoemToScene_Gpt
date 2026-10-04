import {landscapeHeight,routeCenter,waterEdges} from './landscape';
import type {SceneId} from './scenes';

export type RoadPoint={x:number;z:number};
type Bridge={id:SceneId;z:number;left:number;right:number;width:number;deck:(x:number)=>number};
const layouts=new Map<SceneId,Bridge>(),roads=new Map<SceneId,RoadPoint[][]>();
export function bridgeLayout(id:SceneId):Bridge|null{
 if(id!=='autumn'&&id!=='maple')return null;
 if(layouts.has(id))return layouts.get(id)!;
 const z=7,edges=waterEdges(id,z),left=edges.left-2.5,right=edges.right+2.5;
 const width=id==='maple'?3:2.2,rise=id==='maple'?4.2:1.35;
 const deck=(x:number)=>{const t=Math.max(0,Math.min(1,(x-left)/(right-left)));
  return landscapeHeight(id,left,z)*(1-t)+landscapeHeight(id,right,z)*t+.06+rise*Math.sin(t*Math.PI)**1.25;};
 const layout={id,z,left,right,width,deck};layouts.set(id,layout);return layout;
}
export function bridgeRoads(id:SceneId):RoadPoint[][]{
 if(roads.has(id))return roads.get(id)!;
 const b=bridgeLayout(id);if(!b)return [];
 const west=(z:number)=>({x:waterEdges(id,z).left-4.2,z});
 const bank=Array.from({length:89},(_,i)=>west(31-i*.8));
 const paths=[
  [{x:b.right,z:b.z},{x:routeCenter(b.z),z:b.z}],
  [{x:b.left,z:b.z},west(b.z)],bank,
  id==='autumn'?[west(8),{x:-16,z:8}]:[west(-18),{x:-39,z:-18}],
 ];roads.set(id,paths);return paths;
}
function distanceToSegment(x:number,z:number,a:RoadPoint,b:RoadPoint){
 const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
 const t=length?Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/length)):0;
 return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);
}
/** Reserve the approaches as well as the full bridge footprint before planting. */
export function bridgeClearance(id:SceneId,x:number,z:number){
 const b=bridgeLayout(id);if(!b)return false;
 if(x>b.left-.6&&x<b.right+.6&&Math.abs(z-b.z)<b.width/2+.6)return true;
 return bridgeRoads(id).some(points=>points.some((p,i)=>i>0&&distanceToSegment(x,z,points[i-1],p)<1.5));
}
export function bridgeSurface(id:SceneId,x:number,z:number){
 const b=bridgeLayout(id);
 return b&&x>=b.left-.04&&x<=b.right+.04&&Math.abs(z-b.z)<=b.width/2-.18?b.deck(x):undefined;
}
/** River crossing is legal only on the deck; both banks remain explorable. */
export function bridgeWalkable(id:SceneId,x:number,z:number){
 const b=bridgeLayout(id);if(!b)return false;
 const edges=waterEdges(id,z);
 return bridgeSurface(id,x,z)!==undefined||(x>=edges.right+1&&x<=28)||(x>=-60&&x<=edges.left-.8);
}
/** Rejoin the east-bank poem tour by following the bank to the crossing first. */
export function bridgeTourTarget(id:SceneId,x:number,z:number):RoadPoint|null{
 const b=bridgeLayout(id);if(!b)return null;
 if(bridgeSurface(id,x,z)!==undefined)return {x:b.right+.8,z:b.z};
 if(x>=waterEdges(id,z).left-.2)return null;
 if(Math.abs(z-b.z)<.25)return {x:b.right+.8,z:b.z};
 const nextZ=z+Math.sign(b.z-z)*Math.min(1,Math.abs(b.z-z));
 return {x:waterEdges(id,nextZ).left-4.2,z:nextZ};
}
