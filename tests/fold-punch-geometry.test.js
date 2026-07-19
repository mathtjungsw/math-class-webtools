const assert=require('assert');const G=require('../middle-school/fold-punch-lab/geometry.js');
function near(a,b,e=1e-6){assert(Math.abs(a-b)<e,`${a} != ${b}`)}
let p=G.reflectPoint({x:.2,y:.7},G.presets.vertical);near(p.x,.8);near(p.y,.7);
let poly=G.applyFold([{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}],G.presets.vertical,1);assert.equal(poly.length,4);near(G.centroid(poly).x,.75);
let pts=G.unfoldPoints([{x:.75,y:.75}],[{line:G.presets.vertical},{line:G.presets.horizontal}],2);assert.equal(pts.length,4);
pts=G.unfoldPoints([{x:.5,y:.5}],[{line:G.presets.vertical},{line:G.presets.horizontal}],2);assert.equal(pts.length,1,'축 위 중복 병합');
assert(G.circleInsidePolygon({x:.75,y:.5},.1,poly));assert(!G.circleInsidePolygon({x:.52,y:.5},.1,poly));
let seg=G.clipSegmentPolygon({x:-1,y:.5},{x:2,y:.5},[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}]);near(seg[0].x,0);near(seg[1].x,1);
let lines=G.unfoldSegments([{a:{x:.6,y:.2},b:{x:.9,y:.8}}],[{line:G.presets.vertical}],1);assert.equal(lines.length,2);near(lines[1].a.x,.4);
let config={version:1,maxFolds:4,allowedLines:['vertical']};assert.deepEqual(JSON.parse(JSON.stringify(config)),config);
console.log('fold-punch geometry: 8 fixed cases passed');
