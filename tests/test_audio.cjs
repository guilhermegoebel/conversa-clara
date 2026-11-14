const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
function processor(rate) {
  const messages=[]; let Processor;
  vm.runInNewContext(readFileSync(path.join(__dirname,"../static/pcm-processor.js"),"utf8"), {
    sampleRate:rate,
    AudioWorkletProcessor:class { constructor(){this.port={postMessage:message=>messages.push(message)};} },
    registerProcessor:(_,implementation)=>{Processor=implementation;},
  });
  return {p:new Processor(),messages};
}
test("PCM little-endian, limites e liberação do último buffer",()=>{
  const {p,messages}=processor(16000);
  p.process([[new Float32Array([-2,-1,0,1,2])]]);
  p.port.onmessage({data:"stop"});
  const v=new DataView(messages[0].buffer);
  assert.deepEqual(Array.from({length:5},(_,i)=>v.getInt16(i*2,true)),[-32768,-32768,0,32767,32767]);
  assert.equal(messages.at(-1).type,"flushed");
  const count=messages.length; p.process([[new Float32Array(4096)]]);
  assert.equal(messages.length,count);
});
for(const rate of [16000,44100,48000]) test(`um segundo em ${rate} Hz gera 16000 amostras`,()=>{
  const {p,messages}=processor(rate);
  for(let offset=0;offset<rate;offset+=128) p.process([[new Float32Array(Math.min(128,rate-offset)).fill(.5)]]);
  p.port.onmessage({data:"stop"});
  const buffers=messages.filter(m=>m.type==="audio").map(m=>m.buffer);
  assert.equal(buffers.reduce((sum,b)=>sum+b.byteLength/2,0),16000);
  for(const b of buffers){const v=new DataView(b);for(let i=0;i<b.byteLength;i+=2)assert.ok(Math.abs(v.getInt16(i,true)-16384)<=1);}
});
