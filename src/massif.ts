import * as T from 'three';

/** An unbroken mountain shell with a real open mouth, rather than boulders around a tube. */
export function mountainShell(start:number,end:number,halfWidth:number,summit:number,innerWidth:number,innerHeight:number,center:(z:number)=>number,ground:(x:number,z:number)=>number){
  const positions:number[]=[],colors:number[]=[],indices:number[]=[];
  const arcSegments=64,depthSegments=48;
  const inner=(z:number,a:number)=>new T.Vector3(center(z)+Math.cos(a)*innerWidth*(1+Math.sin(z*.7)*.1),ground(center(z),z)-.15+Math.sin(a)*(innerHeight+Math.sin(z*.8)*.35),z);
  const outer=(z:number,a:number)=>{
    const ridge=1+.08*Math.sin(a*13+z*.13)+.035*Math.sin(a*31-z*.24);
    const depth=(start-z)/(start-end),crown=.85+.15*Math.sin(depth*Math.PI);
    return new T.Vector3(center(z)+Math.cos(a)*halfWidth*ridge,ground(center(z),z)-.1+Math.pow(Math.sin(a),.7)*summit*ridge*crown,z);
  };
  const add=(v:T.Vector3,tone:number)=>{positions.push(v.x,v.y,v.z);colors.push(tone*.94,tone,tone*.99);};
  // Outer cliff folds run vertically; the path and inner ceiling remain unobstructed.
  for(let i=0;i<=depthSegments;i++)for(let j=0;j<=arcSegments;j++){
    const z=T.MathUtils.lerp(start,end,i/depthSegments),a=j/arcSegments*Math.PI;
    add(outer(z,a),.76+.18*Math.sin(a*17+z*.03)+.06*Math.sin(z*1.2));
    if(i<depthSegments&&j<arcSegments){const n=i*(arcSegments+1)+j;indices.push(n,n+1,n+arcSegments+1,n+1,n+arcSegments+2,n+arcSegments+1);}
  }
  // Front cliff fills the entire annulus, leaving the actual arched passage open.
  const offset=positions.length/3,radialSegments=24;
  for(let r=0;r<=radialSegments;r++)for(let j=0;j<=arcSegments;j++){
    const a=j/arcSegments*Math.PI,t=r/radialSegments,v=inner(start,a).lerp(outer(start,a),t);
    v.z+=Math.sin(t*Math.PI)*(.8*Math.sin(a*23)+1.2*Math.sin(t*19+a*9));
    add(v,.73+.16*Math.sin(v.x*1.9+Math.sin(v.y*.08))+.07*Math.sin(v.y*.6));
    if(r<radialSegments&&j<arcSegments){const n=offset+r*(arcSegments+1)+j;indices.push(n,n+arcSegments+1,n+1,n+1,n+arcSegments+1,n+arcSegments+2);}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
