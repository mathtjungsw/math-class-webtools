(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.CurriculumModel=api})(typeof globalThis!=="undefined"?globalThis:this,function(){
  function finite(value,name="값"){const n=Number(value);if(!Number.isFinite(n))throw new Error(`${name}은 유한한 수여야 합니다.`);return n}
  function factorial(n){n=Math.trunc(finite(n,"n"));if(n<0||n>170)throw new Error("n은 0~170이어야 합니다.");let value=1;for(let i=2;i<=n;i++)value*=i;return value}
  function permutation(n,r){n=Math.trunc(finite(n));r=Math.trunc(finite(r));if(n<0||r<0||r>n)return 0;let value=1;for(let i=0;i<r;i++)value*=n-i;return value}
  function combination(n,r){n=Math.trunc(finite(n));r=Math.trunc(finite(r));if(n<0||r<0||r>n)return 0;r=Math.min(r,n-r);let value=1;for(let i=1;i<=r;i++)value=value*(n-r+i)/i;return Math.round(value)}
  function multiplyLinear(a,b,c,d){return[finite(a)*finite(c),finite(a)*finite(d)+finite(b)*finite(c),finite(b)*finite(d)]}
  function solveInequality(a,b,c,relation="<"){a=finite(a);b=finite(b);c=finite(c);if(a===0)return{all:relation==="<"?b<c:b<=c,none:!(relation==="<"?b<c:b<=c)};const bound=(c-b)/a;const flip=a<0;const op=relation==="<"?(flip?">":"<"):(flip?">=":"<=");return{bound,op,all:false,none:false}}
  function matrixAdd(A,B){return A.map((row,i)=>row.map((value,j)=>finite(value)+finite(B[i][j])))}
  function matrixMultiply(A,B){return[[A[0][0]*B[0][0]+A[0][1]*B[1][0],A[0][0]*B[0][1]+A[0][1]*B[1][1]],[A[1][0]*B[0][0]+A[1][1]*B[1][0],A[1][0]*B[0][1]+A[1][1]*B[1][1]]]}
  function determinant2(A){return finite(A[0][0])*finite(A[1][1])-finite(A[0][1])*finite(A[1][0])}
  function sequenceTerms(type,first,step,count){first=finite(first);step=finite(step);count=Math.max(1,Math.min(100,Math.trunc(finite(count))));return Array.from({length:count},(_,i)=>type==="geometric"?first*step**i:first+step*i)}
  function quadratic(a,b,c,x){return finite(a)*x*x+finite(b)*x+finite(c)}
  function averageRateQuadratic(a,b,c,x,h){h=finite(h);if(h===0)throw new Error("h는 0이 아니어야 합니다.");return(quadratic(a,b,c,x+h)-quadratic(a,b,c,x))/h}
  function derivativeQuadratic(a,b,x){return 2*finite(a)*finite(x)+finite(b)}
  function riemannQuadratic(a,b,c,start,end,n){n=Math.max(1,Math.trunc(finite(n)));const dx=(end-start)/n;let sum=0;for(let i=0;i<n;i++)sum+=quadratic(a,b,c,start+(i+.5)*dx)*dx;return sum}
  function confidenceInterval(phat,n,z=1.96){phat=finite(phat);n=finite(n);if(phat<0||phat>1||n<=0)throw new Error("비율은 0~1, 표본 크기는 양수여야 합니다.");const margin=z*Math.sqrt(phat*(1-phat)/n);return{lower:Math.max(0,phat-margin),upper:Math.min(1,phat+margin),margin}}
  function erf(x){const sign=x<0?-1:1;x=Math.abs(x);const t=1/(1+.3275911*x);const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-x*x);return sign*y}
  function normalCdf(x){return(1+erf(x/Math.sqrt(2)))/2}
  function oneProportionZTest(phat,n,p0){phat=finite(phat);n=finite(n);p0=finite(p0);if(n<=0||p0<=0||p0>=1)throw new Error("검정 조건을 확인하세요.");const z=(phat-p0)/Math.sqrt(p0*(1-p0)/n);return{z,pValue:Math.max(0,Math.min(1,2*(1-normalCdf(Math.abs(z)))))}}
  function correlation(xs,ys){if(xs.length!==ys.length||xs.length<2)return null;const mx=xs.reduce((a,b)=>a+b,0)/xs.length,my=ys.reduce((a,b)=>a+b,0)/ys.length;let num=0,dx=0,dy=0;for(let i=0;i<xs.length;i++){const x=xs[i]-mx,y=ys[i]-my;num+=x*y;dx+=x*x;dy+=y*y}return dx&&dy?num/Math.sqrt(dx*dy):null}
  function solveLinear(a,b,c){a=finite(a);if(a===0)return b===c?{kind:"all"}:{kind:"none"};return{kind:"one",x:(c-b)/a}}
  function solveSystem2(a1,b1,c1,a2,b2,c2){const det=a1*b2-a2*b1;if(Math.abs(det)<1e-12){return Math.abs(c1*b2-c2*b1)<1e-12?{kind:"infinite"}:{kind:"none"}}return{kind:"one",x:(c1*b2-c2*b1)/det,y:(a1*c2-a2*c1)/det}}
  function arrangements(items,r){const output=[];function walk(prefix,remaining){if(prefix.length===r){output.push(prefix);return}remaining.forEach((item,index)=>walk([...prefix,item],[...remaining.slice(0,index),...remaining.slice(index+1)]))}walk([],items);return output}
  return{factorial,permutation,combination,multiplyLinear,solveInequality,matrixAdd,matrixMultiply,determinant2,sequenceTerms,quadratic,averageRateQuadratic,derivativeQuadratic,riemannQuadratic,confidenceInterval,oneProportionZTest,correlation,solveLinear,solveSystem2,arrangements};
});
