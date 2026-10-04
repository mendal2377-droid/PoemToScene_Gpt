import type {SceneId} from './scenes';

export const riverCenter=(z:number)=>Math.sin(z*.065)*7-4;
export const routeCenter=(z:number)=>riverCenter(z)+10;
const smooth=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export const caveSection=(z:number)=>{const chamber=Math.exp(-Math.pow((z+51)/17,4));return {width:2.6+6.5*chamber,ceiling:5.4+4.2*chamber};};
export const mountainAscent=(z:number)=>14*smooth((27-z)/36)+Math.max(0,-9-z)*.045;

/** The route stays continuous while shore width and surrounding relief change. */
export function landscapeHeight(id:SceneId,x:number,z:number){
  const bank=Math.max(0,Math.abs(x-riverCenter(z))-4.6);
  const base=.25+Math.min(1,bank/4)*(.65+Math.sin(x*.14+z*.07)*.3)+Math.max(0,bank-13)*.13;
  if(id==='cave')return base+mountainAscent(z)*Math.exp(-Math.pow((x-routeCenter(z))/65,4));
  if(id==='snow')return .35+Math.max(0,bank-24)*.045+Math.sin(x*.04+z*.035)*.18;
  if(id==='maple')return .65+Math.max(0,bank-28)*.025+Math.sin(x*.07+z*.03)*.12;
  if(id==='peach'){
    const basin=Math.sqrt(Math.pow((x-15)/65,2)+Math.pow((z+25)/85,2));
    return base+12*smooth((basin-.67)/.6);
  }
  return base;
}
export function waterEdges(id:SceneId,z:number){
  const c=riverCenter(z),ripple=Math.sin(z*.035)*.4;
  if(id==='snow')return {left:c-30-ripple,right:c+5.5};
  if(id==='maple')return {left:c-19-ripple,right:c+5.5};
  if(id==='peach')return {left:c-3.2-ripple,right:c+3.2};
  if(id==='cave')return {left:c+2.8,right:c+4.6};
  return {left:c-5.8-ripple,right:c+5.8+ripple};
}
export const waterHeight=(id:SceneId,z:number)=>id==='cave'?mountainAscent(z)+.1:.07;

export const landscapeViews:Record<SceneId,{camera:[number,number,number];target:[number,number,number];ridgeScale:[number,number,number];ridgeZ:number}>={
  autumn:{camera:[44,30,66],target:[-2,5,-13],ridgeScale:[1,.85,1],ridgeZ:-105},
  snow:{camera:[28,11,46],target:[-12,2,-22],ridgeScale:[1.2,.43,.8],ridgeZ:-118},
  maple:{camera:[29,13,45],target:[-21,4,-14],ridgeScale:[1.2,.23,.8],ridgeZ:-185},
  peach:{camera:[41,23,52],target:[12,3,-19],ridgeScale:[1,.48,1.4],ridgeZ:-100},
  cave:{camera:[45,28,64],target:[3,30,-16],ridgeScale:[1,1.25,1],ridgeZ:-155},
};
