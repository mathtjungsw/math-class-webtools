import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(await fs.readFile(path.join(root, 'data/land-source.geojson'), 'utf8'));
// Preserve every island and hole, simplifying only each ring's coastline.
// Never drop small polygons; the minimum valid ring is retained.
function simplify(ring,tolerance=.003){
  if(ring.length<8)return ring;
  const marked=new Uint8Array(ring.length);marked[0]=marked[ring.length-1]=1;
  const stack=[[0,ring.length-1]],threshold=tolerance*tolerance;
  while(stack.length){
    const [a,b]=stack.pop();const [x,y]=ring[a],[ex,ey]=ring[b],dx=ex-x,dy=ey-y,len=dx*dx+dy*dy;
    let max=threshold,best=-1;
    for(let i=a+1;i<b;i++){
      const [px,py]=ring[i],t=len?Math.max(0,Math.min(1,((px-x)*dx+(py-y)*dy)/len)):0;
      const d=(px-x-t*dx)**2+(py-y-t*dy)**2;
      if(d>max){max=d;best=i;}
    }
    if(best>=0){marked[best]=1;stack.push([a,best],[best,b]);}
  }
  const result=ring.filter((_,i)=>marked[i]);return result.length>=4?result:ring;
}
const polygons = [];
for (const feature of source.features) {
  // Natural Earth includes a fictitious GIS diagnostic island at (0,0).
  if(feature.properties?.featurecla === 'Null island')continue;
  const shapes = feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates : [feature.geometry.coordinates];
  for (const rings of shapes) {
    const points = rings.map(r => simplify(r).map(([x,y]) => [Number(x.toFixed(4)), Number(y.toFixed(4))]));
    const outer = points[0];
    let west=180,east=-180,south=90,north=-90;
    for(const [x,y] of outer){west=Math.min(west,x);east=Math.max(east,x);south=Math.min(south,y);north=Math.max(north,y);}
    polygons.push({bbox:[west,south,east,north],rings:points});
  }
}
await fs.writeFile(path.join(root, 'data/land.json'), JSON.stringify({source:'Natural Earth 1:10 million land, public domain',sourceUrl:'https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/',polygons}));
console.log(JSON.stringify({polygons:polygons.length,bytes:(await fs.stat(path.join(root,'data/land.json'))).size}));
