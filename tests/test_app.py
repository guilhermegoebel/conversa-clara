"""Testes locais com provedor simulado: não usam chave real nem créditos."""

import asyncio
import json

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app import main


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("STT_API_KEY", "chave-ficticia-de-teste")
    with TestClient(main.app, base_url="http://localhost") as browser:
        yield browser


class Provider:
    def __init__(self):
        self.events = asyncio.Queue()
        self.events.put_nowait(json.dumps({"status": "ready"}))
        self.audio = []
        self.closed = False

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        self.closed = True

    async def send(self, message):
        if isinstance(message, bytes):
            self.audio.append(message)
            await self.events.put(json.dumps({"partial": "Olá"}))
        elif json.loads(message).get("action") == "stop":
            await self.events.put(json.dumps({"text": "Olá, tudo bem?", "is_final": True}))

    async def recv(self):
        return await self.events.get()


def install_provider(monkeypatch):
    provider = Provider()
    calls = []

    def connection(url, **kwargs):
        calls.append((url, kwargs))
        return provider

    monkeypatch.setattr(main, "connect", connection)
    return provider, calls


def test_page_status_and_secret_isolation(client):
    page = client.get("/")
    assert page.status_code == 200
    assert 'lang="pt-BR"' in page.text
    assert client.get("/api/status").json() == {"configured": True}
    for path in ("/", "/api/status", "/static/app.js"):
        assert "chave-ficticia-de-teste" not in client.get(path).text
    assert client.get("/.env").status_code == 404
    assert client.get("/static/../.env").status_code == 404


def test_missing_key(client, monkeypatch):
    monkeypatch.delenv("STT_API_KEY")
    assert client.get("/api/status").json() == {"configured": False}
    with client.websocket_connect("ws://localhost/ws/transcribe", headers={"origin": "http://localhost"}) as ws:
        assert ws.receive_json()["type"] == "error"


def test_foreign_origin_is_denied(client):
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("ws://localhost/ws/transcribe", headers={"origin": "https://outro-site.example"}):
            pass


def test_unknown_host_is_denied(client):
    assert client.get("/", headers={"host": "outro-site.example"}).status_code == 400


def test_pcm_and_final_caption_before_close(client, monkeypatch):
    provider, calls = install_provider(monkeypatch)
    with client.websocket_connect("ws://localhost/ws/transcribe", headers={"origin": "http://localhost"}) as ws:
        assert ws.receive_json() == {"type": "ready"}
        ws.send_bytes(b"\x01\x00" * 128)
        assert ws.receive_json() == {"type": "transcript", "partial": "Olá"}
        ws.send_text('{"action":"stop"}')
        assert ws.receive_json() == {"type": "transcript", "text": "Olá, tudo bem?"}
        assert ws.receive_json() == {"type": "done"}
    assert provider.audio == [b"\x01\x00" * 128]
    assert provider.closed
    assert calls[0][1]["additional_headers"]["Authorization"] == "Bearer chave-ficticia-de-teste"


@pytest.mark.parametrize("audio", [b"", b"1", b"0" * 32770], ids=["empty", "odd", "oversized"])
def test_bad_audio_is_rejected(client, monkeypatch, audio):
    provider, _ = install_provider(monkeypatch)
    with client.websocket_connect("ws://localhost/ws/transcribe", headers={"origin": "http://localhost"}) as ws:
        assert ws.receive_json()["type"] == "ready"
        ws.send_bytes(audio)
        assert ws.receive_json()["type"] == "error"
    assert provider.audio == []
    assert provider.closed


def test_disconnect_closes_provider(client, monkeypatch):
    provider, _ = install_provider(monkeypatch)
    with client.websocket_connect("ws://localhost/ws/transcribe", headers={"origin": "http://localhost"}) as ws:
        assert ws.receive_json()["type"] == "ready"
    assert provider.closed


def test_stop_timeout_preserves_explicit_error(client, monkeypatch):
    provider, _ = install_provider(monkeypatch)
    monkeypatch.setattr(main, "FINAL_TIMEOUT", 0.01)

    async def never_finalize(_):
        return None

    provider.send = never_finalize
    with client.websocket_connect("ws://localhost/ws/transcribe", headers={"origin": "http://localhost"}) as ws:
        assert ws.receive_json()["type"] == "ready"
        ws.send_text('{"action":"stop"}')
        assert ws.receive_json()["type"] == "error"
    assert provider.closed
