"""Servidor local: entrega a interface e protege a chave da STT.ai."""

import asyncio
import json
import os
from contextlib import suppress
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware
from websockets.asyncio.client import connect
from websockets.exceptions import ConnectionClosed, InvalidStatus, WebSocketException

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")
STATIC = ROOT / "static"
STT_URL = "wss://api.stt.ai/v1/stream"
MAX_SECONDS = 30 * 60
FINAL_TIMEOUT = 20

app = FastAPI(title="Conversa Clara", docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1,[::1]").split(","),
)
app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.get("/")
async def index():
    return FileResponse(STATIC / "index.html")


@app.get("/api/status")
async def status():
    # A chave nunca é devolvida ao navegador.
    return {"configured": bool(os.getenv("STT_API_KEY", "").strip())}


async def forward_audio(browser, provider):
    """Aceita somente PCM limitado ou a instrução de encerrar."""
    while True:
        message = await browser.receive()
        if message["type"] == "websocket.disconnect":
            return False
        audio = message.get("bytes")
        if audio is not None:
            if not audio or len(audio) > 32768 or len(audio) % 2:
                raise ValueError("Quadro PCM inválido")
            await provider.send(audio)
        elif message.get("text") == '{"action":"stop"}':
            await provider.send(json.dumps({"action": "stop"}))
            return True
        else:
            raise ValueError("Comando inválido")


async def forward_text(browser, provider):
    """Filtra mensagens externas; somente texto e estados chegam à interface."""
    while True:
        raw = await asyncio.wait_for(provider.recv(), timeout=90)
        data = json.loads(raw)
        if not isinstance(data, dict) or data.get("error"):
            raise ValueError("Resposta inválida do serviço")
        message = {"type": "transcript"}
        for key in ("text", "partial"):
            if isinstance(data.get(key), str):
                message[key] = data[key][:20000]
        if len(message) > 1:
            await browser.send_json(message)
        if data.get("is_final") is True:
            await browser.send_json({"type": "done"})
            return


async def relay(browser, provider):
    # Os dois sentidos funcionam juntos; desconectar cancela o envio externo.
    sending = asyncio.create_task(forward_audio(browser, provider))
    receiving = asyncio.create_task(forward_text(browser, provider))
    try:
        finished, _ = await asyncio.wait(
            {sending, receiving}, return_when=asyncio.FIRST_COMPLETED
        )
        if sending in finished and sending.result():
            # Ao parar, esperamos a última legenda antes de fechar a conexão.
            await asyncio.wait_for(receiving, timeout=FINAL_TIMEOUT)
        elif receiving in finished:
            await receiving
    finally:
        for task in (sending, receiving):
            task.cancel()
        await asyncio.gather(sending, receiving, return_exceptions=True)


@app.websocket("/ws/transcribe")
async def transcribe(browser: WebSocket):
    # Impede que outra página use este servidor local e seus créditos.
    scheme = "https" if browser.url.scheme == "wss" else "http"
    if browser.headers.get("origin") != f"{scheme}://{browser.headers.get('host')}":
        await browser.close(code=1008)
        return
    await browser.accept()
    tasks_error = None
    key = os.getenv("STT_API_KEY", "").strip()
    if not key:
        await browser.send_json({"type": "error", "message": "Configure STT_API_KEY no arquivo .env e reinicie o servidor."})
        await browser.close()
        return
    try:
        async with asyncio.timeout(MAX_SECONDS):
            async with connect(
                STT_URL,
                additional_headers={"Authorization": f"Bearer {key}"},
                open_timeout=15,
                close_timeout=3,
                max_size=65536,
            ) as provider:
                await provider.send(json.dumps({"language": "pt", "model": "large-v3-turbo"}))
                ready = json.loads(await asyncio.wait_for(provider.recv(), timeout=20))
                if not isinstance(ready, dict) or ready.get("status") != "ready":
                    raise ValueError("O serviço não iniciou a sessão")
                await browser.send_json({"type": "ready"})
                await relay(browser, provider)
    except InvalidStatus as exc:
        code = exc.response.status_code
        tasks_error = {
            401: "A chave da STT.ai não foi aceita. Confira o arquivo .env.",
            403: "A STT.ai recusou o acesso. Confira a chave e a permissão de streaming.",
            402: "A conta STT.ai está sem créditos para transcrever.",
            429: "Limite da STT.ai atingido. Aguarde antes de tentar novamente.",
        }.get(code, "A STT.ai está indisponível. Tente novamente mais tarde.")
    except TimeoutError:
        tasks_error = "O tempo de conexão terminou. O texto confirmado foi preservado; você pode iniciar novamente."
    except (WebSocketDisconnect, ConnectionClosed):
        tasks_error = "A conexão foi interrompida. O texto confirmado foi preservado."
    except (OSError, ValueError, RuntimeError, WebSocketException):
        tasks_error = "Não foi possível transcrever. Confira a conexão e a configuração da STT.ai."
    finally:
        # Não exibimos respostas brutas do provedor nem registramos áudio/texto.
        with suppress(WebSocketDisconnect, RuntimeError, OSError):
            if tasks_error:
                await browser.send_json({"type": "error", "message": tasks_error})
            await browser.close()
