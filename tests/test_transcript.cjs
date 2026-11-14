const { test } = require("node:test");
const assert = require("node:assert/strict");
const Transcript = require("../static/transcript.js");

test("respostas acumuladas repetidas aparecem uma só vez", () => {
  const state = new Transcript(); state.begin();
  for (let i=0;i<8;i++) state.update("teste teste");
  assert.deepEqual(state.paragraphs,["teste teste"]);
});
test("revisões podem crescer, encurtar ou retirar texto", () => {
  const state = new Transcript(); state.begin();
  for (const text of ["test", "teste", "teste teste", "teste teste the then", "teste teste"]) state.update(text);
  assert.equal(state.text(),"teste teste");
  state.update(""); assert.equal(state.text(),"");
});
test("repetição pronunciada é preservada", () => {
  const state = new Transcript(); state.begin();
  state.update("teste teste"); state.update("teste teste teste teste");
  assert.equal(state.text(),"teste teste teste teste");
});
test("sessão nova preserva sessões anteriores, mesmo com fala igual", () => {
  const state = new Transcript(); state.begin(); state.update("teste teste");
  state.begin(); state.update("teste teste");
  assert.equal(state.text(),"teste teste\n\nteste teste");
  state.update(""); assert.equal(state.text(),"teste teste");
});
test("revisão manual permanece ao iniciar outra sessão", () => {
  const state = new Transcript(); state.replace("Bom dia.\n\nAté amanhã.");
  state.begin(); state.update("Obrigado!");
  assert.deepEqual(state.paragraphs,["Bom dia.","Até amanhã.","Obrigado!"]);
  state.clear(); assert.equal(state.text(),"");
});
