"use strict";

const byId = (id) => document.getElementById(id);
const ui = Object.fromEntries([
  "toggle", "toggle-label", "toggle-icon", "status", "status-text", "hint",
  "error", "captions", "transcript", "partial", "empty", "save", "clear",
  "text-size", "clear-dialog",
].map((id) => [id, byId(id)]));
let session = null;
let state = "idle";
let configured = false;
let paragraphs = [];

function setState(next, message) {
  state = next;
  ui["status-text"].textContent = message;
  ui.status.dataset.active = String(next === "listening");
  ui["toggle-label"].textContent = {
    idle: "Iniciar conversa", connecting: "Cancelar início",
    listening: "Parar conversa", stopping: "Finalizando…",
  }[next];
  ui["toggle-icon"].textContent = next === "listening" ? "■" : "●";
  ui.toggle.disabled = !configured || next === "stopping";
  ui.clear.disabled = !paragraphs.length || next !== "idle";
  ui.save.disabled = !paragraphs.length || next !== "idle";
  ui.hint.textContent = {
    idle: "Você decide quando começar e parar.",
    connecting: "Permita o microfone quando o navegador solicitar.",
    listening: "Ouvindo. Fale perto do microfone, uma pessoa por vez.",
    stopping: "Microfone desligado. Aguardando as últimas palavras.",
  }[next];
}

function showError(message) {
  ui.error.textContent = message;
  ui.error.hidden = false;
}

function addTranscript(data) {
  // textContent evita interpretar a fala como HTML ou código.
  const nearBottom = ui.captions.scrollHeight - ui.captions.scrollTop - ui.captions.clientHeight < 100;
  if (data.text?.trim()) {
    const text = data.text.trim();
    paragraphs.push(text);
    const line = document.createElement("p");
    line.textContent = text;
    ui.transcript.append(line);
    ui.partial.textContent = "";
  }
  if (typeof data.partial === "string") ui.partial.textContent = data.partial.trim();
  ui.partial.hidden = !ui.partial.textContent;
  ui.empty.hidden = Boolean(paragraphs.length || ui.partial.textContent);
  // A leitura de trechos anteriores não é interrompida por rolagem forçada.
  if (nearBottom) ui.captions.scrollTop = ui.captions.scrollHeight;
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
  releaseMicrophone(current);
  current.socket?.close();
  // Só os trechos confirmados são salvos; um parcial interrompido é sinalizado.
  const hadPartial = Boolean(ui.partial.textContent);
  ui.partial.textContent = "";
  ui.partial.hidden = true;
  ui.empty.hidden = Boolean(paragraphs.length);
  setState("idle", paragraphs.length ? "Conversa encerrada" : "Pronto para começar");
  if (error) showError(error);
  else if (hadPartial) showError("O último trecho não foi confirmado. Repita-o ao iniciar novamente.");
}

async function startConversation() {
  if (session || !configured) return;
  ui.error.hidden = true;
  const current = {};
  session = current;
  setState("connecting", "Preparando microfone");
  try {
    // Criar e ativar o contexto no clique também atende às restrições do Safari.
    current.context = new AudioContext({ sampleRate: 16000 });
    const resumed = current.context.resume();
    current.timer = setTimeout(() => finish(current, "O início demorou demais. Confira a permissão do microfone e tente novamente."), 45000);
    current.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }, video: false,
    });
    if (session !== current) { releaseMicrophone(current); return; }
    await resumed;
    await current.context.audioWorklet.addModule("/static/pcm-processor.js");
    if (session !== current) return;
    if (current.context.sampleRate !== 16000) throw new Error("sample-rate");
    current.stream.getTracks().forEach((track) => track.addEventListener("ended", () => {
      finish(current, "O microfone foi desconectado. Conecte-o e inicie novamente.");
    }));
    current.source = current.context.createMediaStreamSource(current.stream);
    current.processor = new AudioWorkletNode(current.context, "pcm-processor", {
      channelCount: 1, channelCountMode: "explicit", numberOfInputs: 1, numberOfOutputs: 1,
    });
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    current.socket = new WebSocket(`${protocol}//${location.host}/ws/transcribe`);
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
      } else if (event.type === "transcript") {
        addTranscript(event);
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
  if (state === "connecting") { finish(current); return; }
  if (state !== "listening") return;
  setState("stopping", "Finalizando legendas");
  // Desliga a captura imediatamente; o processador esvazia apenas o buffer restante.
  current.stream.getTracks().forEach((track) => track.stop());
  current.processor.port.postMessage("stop");
  current.timer = setTimeout(() => finish(current, "Não foi possível confirmar o último trecho. O texto já recebido está disponível para salvar."), 25000);
}

ui.toggle.addEventListener("click", () => session ? stopConversation() : startConversation());
ui["text-size"].addEventListener("change", () => {
  const sizes = { medium: "1.5rem", large: "2rem", extra: "2.75rem" };
  document.documentElement.style.setProperty("--caption-size", sizes[ui["text-size"].value]);
});
ui.save.addEventListener("click", () => {
  if (!paragraphs.length || state !== "idle") return;
  const file = new Blob(["\uFEFF", paragraphs.join("\n\n"), "\n"], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `transcricao-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  ui["status-text"].textContent = "Download solicitado";
});
ui.clear.addEventListener("click", () => {
  // Escape deve cancelar mesmo se uma abertura anterior confirmou a limpeza.
  ui["clear-dialog"].returnValue = "";
  ui["clear-dialog"].showModal();
});
ui["clear-dialog"].addEventListener("close", () => {
  if (ui["clear-dialog"].returnValue !== "confirm") return;
  paragraphs = [];
  ui.transcript.replaceChildren();
  ui.partial.textContent = "";
  ui.partial.hidden = true;
  ui.empty.hidden = false;
  ui.error.hidden = true;
  setState("idle", "Conversa limpa");
  ui.toggle.focus();
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

void initialize();
