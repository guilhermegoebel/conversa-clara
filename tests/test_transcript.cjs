/* Reproduz respostas acumuladas da STT.ai sem áudio nem acesso à API. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function interfaceForTest(previous = []) {
  const elements = new Map();
  function element() {
    return {
      textContent: "", children: [], hidden: false, dataset: {},
      scrollHeight: 0, scrollTop: 0, clientHeight: 500,
      addEventListener() {},
      append(child) { this.children.push(child); child.parent = this; },
      remove() { this.parent.children = this.parent.children.filter((item) => item !== this); },
    };
  }
  const context = vm.createContext({
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, element());
        return elements.get(id);
      },
      createElement: element,
      addEventListener() {},
    },
    window: { addEventListener() {} },
  });
  const source = readFileSync(path.join(__dirname, "../static/app.js"), "utf8");
  vm.runInContext(source.replace("void initialize();", ""), context);
  context.previous = previous;
  vm.runInContext("paragraphs = [...previous]; globalThis.current = {previousParagraphs: [...paragraphs], line: null};", context);
  return {
    receive(data) { context.message = data; vm.runInContext("addTranscript(message, current)", context); },
    text() { return JSON.parse(vm.runInContext("JSON.stringify(paragraphs)", context)); },
    lines() { return elements.get("transcript").children; },
    partial() { return elements.get("partial"); },
  };
}

test("a mesma resposta recebida várias vezes aparece somente uma vez", () => {
  const ui = interfaceForTest();
  for (let index = 0; index < 8; index++) ui.receive({ text: "teste teste" });
  assert.deepEqual(ui.text(), ["teste teste"]);
  assert.equal(ui.lines().length, 1);
});

test("crescimento e correções substituem a versão anterior, inclusive quando encurtam", () => {
  const ui = interfaceForTest();
  for (const text of ["test", "teste", "teste teste", "teste teste the then", "teste teste"]) ui.receive({ text });
  assert.deepEqual(ui.text(), ["teste teste"]);
  assert.equal(ui.lines()[0].textContent, "teste teste");
});

test("repetições realmente presentes na fala são preservadas", () => {
  const ui = interfaceForTest();
  ui.receive({ text: "teste teste" });
  ui.receive({ text: "teste teste teste teste" });
  assert.deepEqual(ui.text(), ["teste teste teste teste"]);
});

test("uma nova sessão não substitui nem deduplica sessões anteriores", () => {
  const ui = interfaceForTest(["teste teste"]);
  ui.receive({ text: "teste" });
  ui.receive({ text: "teste teste" });
  assert.deepEqual(ui.text(), ["teste teste", "teste teste"]);
});

test("parciais não entram no arquivo salvo e podem ser limpos pelo provedor", () => {
  const ui = interfaceForTest();
  ui.receive({ text: "Bom dia.", partial: "Como" });
  assert.deepEqual(ui.text(), ["Bom dia."]);
  assert.equal(ui.partial().textContent, "Como");
  ui.receive({ partial: "" });
  assert.equal(ui.partial().hidden, true);
  assert.deepEqual(ui.text(), ["Bom dia."]);
});

test("uma revisão vazia retira somente o texto da sessão atual", () => {
  const ui = interfaceForTest(["Conversa anterior."]);
  ui.receive({ text: "ruído incorreto" });
  ui.receive({ text: "" });
  assert.deepEqual(ui.text(), ["Conversa anterior."]);
  assert.equal(ui.lines().length, 0);
  ui.receive({ text: "Boa tarde." });
  assert.deepEqual(ui.text(), ["Conversa anterior.", "Boa tarde."]);
  assert.equal(ui.lines().length, 1);
});
