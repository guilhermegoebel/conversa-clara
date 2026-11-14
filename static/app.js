"use strict";

const byId = (id) => document.getElementById(id);
const ui = Object.fromEntries([
  "toggle", "toggle-label", "toggle-icon", "status", "status-text", "hint",
  "error", "captions", "transcript", "partial", "empty", "save", "clear",
  "text-size", "clear-dialog", "theme", "spacing", "auto-scroll", "announce",
  "reset-settings", "focus-mode", "latest", "copy", "edit", "edit-dialog", "edit-text",
  "demo", "demo-notice", "session-time", "caption-announcement", "feedback",
].map((id) => [id, byId(id)]));
let session = null;
let state = "idle";
let configured = false;
const transcriptState = new Transcript();
let lastSavedText = "";
let announcementTimer = null;
let lastAnnounced = "";
let pendingAnnouncement = "";
const defaults = { theme: "light", size: "large", spacing: "normal", autoScroll: true, announce: true };
let preferences = { ...defaults };

function setState(next, message) {
  state = next;
  ui["status-text"].textContent = message;
  ui.status.dataset.active = String(next === "listening");
  ui["toggle-label"].textContent = {
    idle: "Iniciar conversa", connecting: "Cancelar início",
    listening: "Parar conversa", stopping: "Finalizando…",
  }[next];
  ui["toggle-icon"].textContent = next === "listening" ? "■" : "●";
  ui.toggle.disabled = !configured && !session;
  ui.toggle.setAttribute("aria-disabled", String(next === "stopping"));
  ui.demo.disabled = Boolean(session);
  ui.edit.disabled = !transcriptState.paragraphs.length || next !== "idle";
  ui.copy.disabled = !transcriptState.paragraphs.length;
  ui.clear.disabled = !transcriptState.paragraphs.length || next !== "idle";
  ui.save.disabled = !transcriptState.paragraphs.length;
  ui.hint.textContent = {
    idle: "Você decide quando começar e parar.",
    connecting: "Permita o microfone quando o navegador solicitar.",
    listening: "Ouvindo. Aguardando texto revisado; ele pode aparecer apenas ao parar.",
    stopping: "Microfone desligado. Aguardando as últimas palavras.",
  }[next];
}

function showError(message) {
  ui.error.textContent = message;
  ui.error.hidden = false;
}

function addTranscript(data, current) {
  const nearBottom = ui.captions.scrollHeight - ui.captions.scrollTop - ui.captions.clientHeight < 100;
  if (typeof data.text === "string") {
    transcriptState.update(data.text);
    const text = transcriptState.current;
    if (text && !current.line) {
      current.line = document.createElement("p");
      ui.transcript.append(current.line);
    }
    if (current.line && current.line.textContent !== text) current.line.textContent = text;
    if (!text && current.line) { current.line.remove(); current.line = null; }
    ui.partial.textContent = "";
    queueAnnouncement(text);
  }
  if (typeof data.partial === "string") ui.partial.textContent = data.partial.trim();
  ui.partial.hidden = !ui.partial.textContent;
  ui.empty.hidden = Boolean(transcriptState.paragraphs.length || ui.partial.textContent);
  ui.save.disabled = ui.copy.disabled = !transcriptState.paragraphs.length;
  if (preferences.autoScroll && nearBottom) ui.captions.scrollTop = ui.captions.scrollHeight;
}

function releaseMicrophone(current) {
  current.stream?.getTracks().forEach((track) => track.stop());
  current.source?.disconnect();
  current.processor?.disconnect();
  if (current.context && current.context.state !== "closed") {
    void current.context.close().catch(() => {});
  }
}

function finish(current, error = "") {
  if (session !== current) return;
  session = null;
  clearTimeout(current.timer);
  clearTimeout(current.demoTimer);
  clearInterval(current.clock);
  flushAnnouncement();
  releaseMicrophone(current);
  current.socket?.close();
  // Só os trechos confirmados são salvos; um parcial interrompido é sinalizado.
  const hadPartial = Boolean(ui.partial.textContent);
  ui.partial.textContent = "";
  ui.partial.hidden = true;
  ui.empty.hidden = Boolean(transcriptState.paragraphs.length);
  setState("idle", transcriptState.paragraphs.length ? "Conversa encerrada" : "Pronto para começar");
  if (current.demo) { if (document.activeElement === ui.toggle || document.activeElement === document.body) ui.demo.focus(); ui.hint.textContent = "Demonstração encerrada. O texto é apenas um exemplo."; }
  if (error) showError(error);
  else if (current.warning) showError(current.warning);
  else if (hadPartial) showError("O último trecho não foi confirmado. Repita-o ao iniciar novamente.");
}

async function startConversation() {
  if (session || !configured) return;
  if (!ui["demo-notice"].hidden && transcriptState.text()) {
    ui.feedback.textContent = "Limpe o texto da demonstração antes de iniciar uma conversa real.";
    return;
  }
  ui.error.hidden = true;
  transcriptState.begin();
  resetAnnouncements();
  ui["demo-notice"].hidden = true;
  const current = { line: null };
  session = current;
  setState("connecting", "Preparando microfone");
  try {
    // A taxa nativa evita incompatibilidade com microfones em Firefox e outros navegadores.
    current.context = new AudioContext();
    const resumed = current.context.resume();
    // Observe a rejeição imediatamente, mesmo enquanto a permissão está pendente.
    resumed.catch(() => {});
    current.timer = setTimeout(() => finish(current, "O início demorou demais. Confira a permissão do microfone e tente novamente."), 45000);
    current.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }, video: false,
    });
    if (session !== current) { releaseMicrophone(current); return; }
    await resumed;
    await current.context.audioWorklet.addModule("/static/pcm-processor.js");
    if (session !== current) return;

    current.stream.getTracks().forEach((track) => track.addEventListener("ended", () => {
      finish(current, "O microfone foi desconectado. Conecte-o e inicie novamente.");
    }));
    current.source = current.context.createMediaStreamSource(current.stream);
    current.processor = new AudioWorkletNode(current.context, "pcm-processor", {
      channelCount: 1, channelCountMode: "explicit", numberOfInputs: 1, numberOfOutputs: 1,
    });
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    current.socket = new WebSocket(`${protocol}//${location.host}/ws/transcribe`);
    current.processor.onprocessorerror = () => finish(current, "A captura de áudio falhou. Inicie novamente.");
    current.processor.port.onmessage = ({ data }) => {
      if (session !== current || current.socket.readyState !== WebSocket.OPEN) return;
      if (data.type === "audio") {
        // Uma conexão lenta não pode acumular áudio indefinidamente na memória.
        if (current.socket.bufferedAmount > 256000) {
          finish(current, "A conexão ficou lenta demais. A transcrição foi parada; tente novamente.");
          return;
        }
        current.socket.send(data.buffer);
      } else if (data.type === "flushed") {
        releaseMicrophone(current);
        current.socket.send(JSON.stringify({ action: "stop" }));
      }
    };
    current.socket.onmessage = ({ data }) => {
      if (session !== current) return;
      let event;
      try { event = JSON.parse(data); } catch { finish(current, "O servidor enviou uma resposta inválida."); return; }
      if (event.type === "ready" && state === "connecting") {
        clearTimeout(current.timer);
        current.source.connect(current.processor);
        current.processor.connect(current.context.destination);
        setState("listening", "Ouvindo agora");
        startClock(current);
      } else if (event.type === "recognizing") {
        ui.hint.textContent = "O áudio está sendo processado. Tentativas provisórias ficam ocultas; aguarde a revisão ou pare para finalizar.";
      } else if (event.type === "warning") {
        current.warning = event.message;
      } else if (event.type === "transcript") {
        addTranscript(event, current);
        if (state === "listening") ui.hint.textContent = "Exibindo o texto selecionado pelo serviço. Novas revisões podem levar alguns segundos.";
      } else if (event.type === "done") {
        finish(current);
      } else if (event.type === "error") {
        finish(current, event.message);
      }
    };
    current.socket.onerror = () => finish(current, "Não foi possível conectar. Confira se o servidor está rodando.");
    current.socket.onclose = () => finish(current, "A conexão foi encerrada antes de concluir. O texto confirmado foi preservado.");
  } catch (error) {
    const messages = {
      NotAllowedError: "O acesso ao microfone foi negado. Permita o microfone nas configurações deste site e tente novamente.",
      NotFoundError: "Nenhum microfone foi encontrado. Conecte um microfone e tente novamente.",
      NotReadableError: "Não foi possível usar o microfone. Confira se outro aplicativo está utilizando o dispositivo.",
      NotSupportedError: "Este navegador não oferece o recurso de áudio necessário. Atualize o navegador ou teste outro dispositivo.",
    };
    finish(current, messages[error.name] || "Não foi possível preparar o áudio. Atualize o navegador e confira o microfone.");
  }
}

function stopConversation() {
  const current = session;
  if (!current) return;
  if (current.demo || state === "connecting") { finish(current); return; }
  if (state !== "listening") return;
  setState("stopping", "Finalizando legendas");
  // Desliga a captura imediatamente; o processador esvazia apenas o buffer restante.
  current.stream.getTracks().forEach((track) => track.stop());
  current.timer = setTimeout(() => finish(current, "Não foi possível confirmar o último trecho. O texto já recebido está disponível para salvar."), 25000);
  current.processor.port.postMessage("stop");
}

ui.toggle.addEventListener("click", () => session ? stopConversation() : startConversation());
ui.save.addEventListener("click", () => {
  if (!transcriptState.paragraphs.length) return;
  const savedText = transcriptState.text();
  const file = new Blob(["\uFEFF", savedText, "\n"], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `transcricao-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  lastSavedText = savedText;
  ui.feedback.textContent = "Download solicitado. Confira o arquivo na pasta de downloads.";
});
ui.clear.addEventListener("click", () => {
  // Escape deve cancelar mesmo se uma abertura anterior confirmou a limpeza.
  ui["clear-dialog"].returnValue = "";
  ui["clear-dialog"].showModal();
});
ui["clear-dialog"].addEventListener("close", () => {
  if (ui["clear-dialog"].returnValue !== "confirm") return;
  transcriptState.clear();
  lastSavedText = "";
  resetAnnouncements();
  ui["demo-notice"].hidden = true;
  ui.transcript.replaceChildren();
  ui.partial.textContent = "";
  ui.partial.hidden = true;
  ui.empty.hidden = false;
  ui.error.hidden = true;
  setState("idle", "Conversa limpa");
  (ui.toggle.disabled ? ui.demo : ui.toggle).focus();
});

// Sair da página ou ir para outro aplicativo encerra a captura e a conexão.
window.addEventListener("pagehide", () => { if (session) finish(session); });
document.addEventListener("visibilitychange", () => {
  if (document.hidden && session) finish(session, "A conversa foi parada porque esta página ficou em segundo plano.");
});

async function initialize() {
  ui.toggle.disabled = true;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    showError("Para usar o microfone, abra em localhost no computador ou em HTTPS no celular. Consulte o README.");
    return;
  }
  if (!window.AudioContext || !window.AudioWorkletNode) {
    showError("Este navegador não suporta a captura de áudio necessária. Use uma versão atual do Chrome, Edge, Firefox ou Safari.");
    return;
  }
  try {
    const response = await fetch("/api/status");
    if (!response.ok) throw new Error("status");
    const data = await response.json();
    configured = data.configured === true;
    setState("idle", configured ? "Pronto para começar" : "Configuração necessária");
    if (!configured) showError("Configure a chave STT_API_KEY no arquivo .env e reinicie o servidor. Veja o passo a passo no README.");
  } catch {
    showError("Não foi possível acessar o servidor. Confira se ele está rodando e recarregue a página.");
  }
}




function applyPreferences() {
  const root = document.documentElement;
  root.dataset.theme = preferences.theme;
  root.dataset.size = preferences.size;
  root.dataset.spacing = preferences.spacing;
  ui.theme.value = preferences.theme;
  ui["text-size"].value = preferences.size;
  ui.spacing.value = preferences.spacing;
  ui["auto-scroll"].checked = preferences.autoScroll;
  ui.announce.checked = preferences.announce;
  ui["caption-announcement"].setAttribute("aria-live", preferences.announce ? "polite" : "off");
}

function loadPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem("conversa-clara.preferences") || "null");
    if (saved && typeof saved === "object") {
      if (["light", "dark", "contrast"].includes(saved.theme)) preferences.theme = saved.theme;
      if (["medium", "large", "extra", "maximum"].includes(saved.size)) preferences.size = saved.size;
      if (["normal", "wide"].includes(saved.spacing)) preferences.spacing = saved.spacing;
      for (const key of ["autoScroll", "announce"]) if (typeof saved[key] === "boolean") preferences[key] = saved[key];
    }
  } catch { /* Armazenamento bloqueado não impede o uso da aplicação. */ }
  applyPreferences();
}

function savePreferences() {
  applyPreferences();
  try { localStorage.setItem("conversa-clara.preferences", JSON.stringify(preferences)); }
  catch { ui.feedback.textContent = "Preferências aplicadas nesta página; o navegador não permitiu salvá-las."; }
}
for (const [id, property] of [["theme", "theme"], ["text-size", "size"], ["spacing", "spacing"], ["auto-scroll", "autoScroll"], ["announce", "announce"]]) {
  ui[id].addEventListener("change", () => {
    preferences[property] = ui[id].type === "checkbox" ? ui[id].checked : ui[id].value;
    if (property === "announce") resetAnnouncements();
    savePreferences();
  });
}
ui["reset-settings"].addEventListener("click", () => {
  preferences = { ...defaults }; resetAnnouncements(); savePreferences();
  ui.feedback.textContent = "Preferências restauradas.";
});

function resetAnnouncements() {
  clearTimeout(announcementTimer); announcementTimer = null;
  lastAnnounced = ""; pendingAnnouncement = "";
  ui["caption-announcement"].textContent = "";
}
function queueAnnouncement(text) {
  if (!preferences.announce || text === pendingAnnouncement) return;
  pendingAnnouncement = text;
  // No máximo uma atualização a cada 1,5 s; parciais nunca são anunciados.
  if (!announcementTimer) announcementTimer = setTimeout(flushAnnouncement, 1500);
}
function flushAnnouncement() {
  clearTimeout(announcementTimer); announcementTimer = null;
  if (!preferences.announce || !pendingAnnouncement || pendingAnnouncement === lastAnnounced) return;
  const growing = pendingAnnouncement.startsWith(lastAnnounced);
  const update = growing ? pendingAnnouncement.slice(lastAnnounced.length).trim() : `Legenda revisada: ${pendingAnnouncement.slice(-500)}`;
  if (update) ui["caption-announcement"].textContent = update;
  lastAnnounced = pendingAnnouncement;
}

ui.latest.addEventListener("click", () => { ui.captions.scrollTop = ui.captions.scrollHeight; ui.captions.focus(); });
function setReadingMode(enabled) {
  document.body.classList.toggle("reading-mode", enabled);
  ui["focus-mode"].setAttribute("aria-pressed", String(enabled));
  ui["focus-mode"].textContent = enabled ? "Sair da leitura ampliada" : "Ampliar área de leitura";
}
ui["focus-mode"].addEventListener("click", () => setReadingMode(!document.body.classList.contains("reading-mode")));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !document.querySelector("dialog[open]") && document.body.classList.contains("reading-mode")) {
    setReadingMode(false); ui["focus-mode"].focus();
  }
});

ui.copy.addEventListener("click", async () => {
  const text = transcriptState.text();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    ui.feedback.textContent = "Texto copiado.";
  } catch {
    ui.feedback.textContent = "Não foi possível copiar. Use Salvar texto ou selecione o texto na área de leitura.";
  }
});
ui.edit.addEventListener("click", () => {
  if (session) return;
  ui["edit-text"].value = transcriptState.text();
  ui["edit-dialog"].returnValue = "";
  ui["edit-dialog"].showModal();
});
ui["edit-dialog"].addEventListener("close", () => {
  if (ui["edit-dialog"].returnValue !== "confirm") return;
  transcriptState.replace(ui["edit-text"].value);
  ui.transcript.replaceChildren();
  for (const text of transcriptState.paragraphs) {
    const line = document.createElement("p"); line.textContent = text; ui.transcript.append(line);
  }
  ui.empty.hidden = Boolean(transcriptState.paragraphs.length);
  setState("idle", "Texto revisado");
  ui.feedback.textContent = "Revisão aplicada. Salve novamente para guardar as alterações.";
  (ui.edit.disabled ? ui.demo : ui.edit).focus();
});

function startClock(current) {
  const started = Date.now();
  ui["session-time"].textContent = "Tempo da sessão: 00:00";
  current.clock = setInterval(() => {
    const elapsed = Math.floor((Date.now() - started) / 1000);
    ui["session-time"].textContent = `Tempo da sessão: ${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
    if (!current.demo && elapsed === 29 * 60) ui.feedback.textContent = "Esta sessão termina em um minuto. Você poderá iniciar outra mantendo o texto.";
  }, 1000);
}

ui.demo.addEventListener("click", () => {
  if (session) return;
  if (transcriptState.text() && !ui["demo-notice"].hidden) {
    ui.feedback.textContent = "Limpe a demonstração anterior para experimentar novamente."; return;
  }
  if (transcriptState.text()) {
    ui.feedback.textContent = "Salve e limpe a conversa antes de abrir a demonstração. Assim o exemplo não se mistura à sua fala."; return;
  }
  ui.error.hidden = true;
  ui["demo-notice"].hidden = false;
  transcriptState.begin(); resetAnnouncements();
  const current = { demo: true, line: null }; session = current;
  setState("listening", "Demonstração · sem microfone");
  ui["toggle-label"].textContent = "Parar demonstração";
  ui.hint.textContent = "Texto de exemplo. Experimente os ajustes de leitura e contraste.";
  startClock(current);
  const examples = ["[Demonstração] Olá!", "[Demonstração] Olá! Vamos nos encontrar amanhã?", "[Demonstração] Olá! Vamos nos encontrar amanhã? Pode ser às dez horas."];
  let index = 0;
  function advance() {
    if (session !== current) return;
    addTranscript({ text: examples[index++] }, current);
    if (index < examples.length) current.demoTimer = setTimeout(advance, 1800);
    else finish(current);
  }
  advance();
});

window.addEventListener("beforeunload", (event) => {
  if (session || (transcriptState.text() && transcriptState.text() !== lastSavedText)) {
    event.preventDefault(); event.returnValue = "";
  }
});
// Mantém o ciclo de Tab dentro do diálogo, inclusive ao voltar com Shift+Tab.
for (const dialog of [ui["clear-dialog"], ui["edit-dialog"]]) {
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const controls = [...dialog.querySelectorAll("button:not(:disabled), textarea, select, input")];
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
}
loadPreferences();
void initialize();
