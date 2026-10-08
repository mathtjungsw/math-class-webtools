import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),C=require('../collector.js');
const result=await C.collect({lat:37.666667,lon:32.828056},100,async(url,options)=>{
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(55000)});
  if(!response.ok)throw new Error('HTTP '+response.status);
  return response.json();
},message=>console.log(message));
console.log(JSON.stringify({events:result.events.length,places:result.places.length,warnings:result.warnings,sample:result.events.slice(0,2).map(e=>({title:e.title,date:e.startYear}))}));
