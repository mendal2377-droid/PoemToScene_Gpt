import {caveSection,routeCenter} from './landscape';
export type CavePoint={x:number;z:number};
export function caveObstacle(x:number,z:number){
 return (Math.pow((x-(routeCenter(-52)-4.7))/2.7,2)+Math.pow((z+52)/3.9,2)<1)||Math.hypot(x-(routeCenter(-52)+4),z+53)<1.35;
}
export function caveWalkable(x:number,z:number){return z>=-68&&z<=-7&&Math.abs(x-routeCenter(z))<=caveSection(z).width-.65+1e-5&&!caveObstacle(x,z);}
const clearSegment=(a:CavePoint,b:CavePoint)=>{
 const steps=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.12);
 for(let i=0;i<=steps;i++){const t=i/Math.max(1,steps);if(!caveWalkable(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))return false;}return true;
};

/** Small deterministic walkability grid, used only when the return button is pressed. */
export function caveReturnPath(start:CavePoint):CavePoint[]{
 if(start.z>=-28)return [];
 const step=.65,goal={x:routeCenter(-26),z:-26};
 type Node=CavePoint&{key:string;cost:number;score:number;parent?:Node};
 const point=(ix:number,iz:number)=>({x:ix*step,z:iz*step}),key=(ix:number,iz:number)=>`${ix},${iz}`;
 let seed:{ix:number;iz:number;distance:number}|undefined;
 for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++){
  const ix=Math.round(start.x/step)+dx,iz=Math.round(start.z/step)+dz,p=point(ix,iz),distance=Math.hypot(p.x-start.x,p.z-start.z);
  if((!seed||distance<seed.distance)&&clearSegment(start,p))seed={ix,iz,distance};
 }
 if(!seed)return [];
 const first={...point(seed.ix,seed.iz),key:key(seed.ix,seed.iz),cost:0,score:0},open:Node[]=[first],best=new Map<string,number>([[first.key,0]]);
 while(open.length){
  let index=0;for(let i=1;i<open.length;i++)if(open[i].score<open[index].score)index=i;
  const node=open.splice(index,1)[0];if(node.cost>best.get(node.key)!)continue;
  if(Math.hypot(node.x-goal.x,node.z-goal.z)<1&&clearSegment(node,goal)){
   const result:CavePoint[]=[goal];let current:Node|undefined=node;while(current){result.unshift({x:current.x,z:current.z});current=current.parent;}return result;
  }
  for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]){
   const ix=Math.round(node.x/step)+dx,iz=Math.round(node.z/step)+dz,p=point(ix,iz),id=key(ix,iz);
   if(p.z>-24||!clearSegment(node,p))continue;
   const cost=node.cost+Math.hypot(dx,dz)*step;if(cost>=(best.get(id)??Infinity))continue;
   best.set(id,cost);open.push({...p,key:id,cost,score:cost+Math.hypot(p.x-goal.x,p.z-goal.z),parent:node});
  }
 }
 return [];
}
