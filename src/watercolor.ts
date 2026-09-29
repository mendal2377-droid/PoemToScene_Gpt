import * as T from 'three';

// Curved fern fronds with paired leaflets; shared by all undergrowth instances.
export function fernGeometry() {
  const vertices:number[]=[],indices:number[]=[];
  for(let frond=0;frond<7;frond++) {
    const angle=frond*Math.PI*2/7;
    const point=(r:number,y:number,side:number)=>[Math.cos(angle)*r-Math.sin(angle)*side,y,Math.sin(angle)*r+Math.cos(angle)*side];
    for(let step=1;step<8;step++) {
      const t=step/8,r=t*.95,y=Math.sin(t*Math.PI*.78)*.62,width=Math.sin(t*Math.PI)*.23;
      for(const side of [-1,1]) {
        const n=vertices.length/3;
        // A narrow curved leaflet, with a rounded shoulder and a tapered tip.
        for(let edge=0;edge<6;edge++){
          const a=edge*Math.PI/3,lateral=(1-Math.cos(a))*.5;
          vertices.push(...point(r+lateral*.12+Math.sin(a)*.035,y+Math.sin(lateral*Math.PI)*.035-lateral*.045,side*width*lateral));
        }
        for(let edge=1;edge<5;edge++)indices.push(n,n+edge,n+edge+1);
      }
    }
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

// Instance origins give neighboring plants a coherent breeze. Roots remain fixed.
export function addWind(mat:T.Material,time:{value:number},strength:number,rooted=false) {
  const paint=mat.onBeforeCompile.bind(mat),key=mat.customProgramCacheKey();
  mat.onBeforeCompile=(shader,renderer)=>{
    paint(shader,renderer);shader.uniforms.uBreeze=time;
    shader.vertexShader='uniform float uBreeze;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`
      #include <begin_vertex>
      vec3 origin = vec3(0.0);
      #ifdef USE_INSTANCING
        origin = instanceMatrix[3].xyz;
      #endif
      float breeze = sin(uBreeze * 1.3 + origin.x * .23 + origin.z * .18)
        + .35 * sin(uBreeze * 2.2 + origin.z * .5);
      float anchor = ${rooted?'max(position.y, 0.0)':'1.0'};
      transformed.x += breeze * anchor * ${strength.toFixed(4)};
      transformed.z += cos(uBreeze + origin.x * .19) * anchor * ${(strength*.4).toFixed(4)};
    `);
  };
  mat.customProgramCacheKey=()=>key+`-wind-${strength}-${rooted}`;
}

// Shared paper/pigment noise is sampled in world space, so washes stay attached
// to the landscape instead of swimming over the screen when the camera moves.
export function createWatercolorMaterials() {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  const hash = (x: number, y: number) => {
    const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  const noise = (x: number, y: number) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    let fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    return T.MathUtils.lerp(
      T.MathUtils.lerp(hash(ix, iy), hash(ix + 1, iy), fx),
      T.MathUtils.lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), fx), fy,
    );
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const n = noise(x / 40, y / 40) * .42 + noise(x / 15, y / 15) * .29
      + noise(x / 5, y / 5) * .19 + hash(x, y) * .1;
    const i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = Math.round(n * 255);
    data[i + 3] = 255;
  }
  const wash = new T.DataTexture(data, size, size);
  wash.wrapS = wash.wrapT = T.RepeatWrapping;
  wash.magFilter = wash.minFilter = T.LinearFilter;
  wash.needsUpdate = true;

  const material = (color: string, strength = .8) => {
    const mat = new T.MeshStandardMaterial({color, roughness: 1, metalness: 0});
    mat.onBeforeCompile = shader => {
      shader.uniforms.uPaperWash = {value: wash};
      shader.uniforms.uPigment = {value: strength};
      shader.vertexShader = 'varying vec3 vPigmentPosition;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
        #include <project_vertex>
        vec4 pigmentPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          pigmentPosition = instanceMatrix * pigmentPosition;
        #endif
        vPigmentPosition = (modelMatrix * pigmentPosition).xyz;
      `);
      shader.fragmentShader = 'uniform sampler2D uPaperWash; uniform float uPigment; varying vec3 vPigmentPosition;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
        #include <color_fragment>
        vec2 paintUV = vPigmentPosition.xz * .041 + vec2(vPigmentPosition.y * .015, vPigmentPosition.y * .075);
        float wash = texture2D(uPaperWash, paintUV).r;
        float grain = texture2D(uPaperWash, paintUV * 8.1).r;
        float bloom = smoothstep(.39, .64, wash);
        diffuseColor.rgb *= 1.0 + uPigment * ((wash - .5) * .52 + (grain - .5) * .16);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.10, 1.075, 1.025), bloom * .35);
      `);
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
        outgoingLight = mix(outgoingLight, diffuseColor.rgb, .18);
        #include <opaque_fragment>
      `);
    };
    mat.customProgramCacheKey = () => 'watercolor-world-wash-v1';
    return mat;
  };
  return {material, dispose: () => wash.dispose()};
}

export function mountainRange(layer: number, random: () => number) {
  const width = 360, depth = 95;
  const geometry = new T.PlaneGeometry(width, depth, 180, 38);
  geometry.rotateX(-Math.PI / 2);
  const peaks = Array.from({length: 12}, (_, i) => ({
    x: (i - 5.5) * 30 + random() * 16,
    height: 13 + random() * 25 + layer * 3,
    width: 11 + random() * 15,
    drift: random() * 12 - 6,
  }));
  const positions = geometry.attributes.position;
  const colors: number[] = [];
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i);
    let ridge = 0;
    for (const peak of peaks) {
      const offset = (x - peak.x - Math.sin(z * .06) * peak.drift) / peak.width;
      ridge = Math.max(ridge, peak.height * Math.exp(-Math.pow(Math.abs(offset), 1.65)));
    }
    const profile = Math.exp(-Math.pow((z + Math.sin(x * .065) * 7) / 23, 2));
    const folds = Math.sin(x * .44 + z * .16) * 1.1 + Math.sin(x * .8 - z * .31) * .4;
    const h = Math.max(-1, ridge * profile + folds * profile - 1.3);
    positions.setY(i, h);
    const c = new T.Color('#ffffff');
    c.multiplyScalar(.84 + .16 * Math.sin(x * .07 + z * .09) + h * .002);
    colors.push(c.r, c.g, c.b);
  }
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

// Narrow, curved blades replace the solid cones in the original ground cover.
export function grassTuftGeometry() {
  const vertices: number[] = [], indices: number[] = [];
  for (let blade = 0; blade < 5; blade++) {
    const angle = blade * 2.399, h = .55 + Math.sin(blade * 3.7) * .2;
    const dx = Math.cos(angle), dz = Math.sin(angle), n = vertices.length / 3;
    for (let j = 0; j < 4; j++) {
      const t = j / 3, w = (1 - t) * .028, bend = t * t * .22;
      vertices.push(dx * bend - dz * w, t * h, dz * bend + dx * w);
      vertices.push(dx * bend + dz * w, t * h, dz * bend - dx * w);
    }
    for (let j = 0; j < 3; j++) { const k = n + j * 2; indices.push(k, k+1, k+2, k+1, k+3, k+2); }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices); geo.computeVertexNormals();
  return geo;
}
