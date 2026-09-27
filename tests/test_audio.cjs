/* Valida o formato PCM e o esvaziamento final sem depender de microfone. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

test("PCM little-endian, limites de amplitude e último buffer", () => {
  const messages = [];
  let Processor;
  const context = {
    AudioWorkletProcessor: class { constructor() { this.port = { postMessage: (message) => messages.push(message) }; } },
    registerProcessor: (_, implementation) => { Processor = implementation; },
  };
  vm.runInNewContext(readFileSync(path.join(__dirname, "../static/pcm-processor.js"), "utf8"), context);
  const processor = new Processor();
  processor.process([[new Float32Array([-2, -1, 0, 1, 2])]]);
  assert.equal(messages.length, 0);
  processor.port.onmessage({ data: "stop" });
  const data = new DataView(messages[0].buffer);
  assert.deepEqual(Array.from({ length: 5 }, (_, index) => data.getInt16(index * 2, true)), [-32768, -32768, 0, 32767, 32767]);
  assert.equal(messages[1].type, "flushed");
  processor.process([[new Float32Array(4096)]]);
  assert.equal(messages.length, 2);
});
