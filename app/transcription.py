"""Seleciona revisões do provedor, sem tentar adivinhar o idioma das palavras."""


class TranscriptFilter:
    def __init__(self, mode="reviewed"):
        self.mode = mode
        self.has_review = False
        self.waiting_sent = False

    def select(self, data):
        final = data.get("is_final") is True
        source = data.get("source")
        source = source.strip().lower() if isinstance(source, str) else ""
        text = data.get("text")
        reviewed = source == "whisper"
        messages = []

        # Vosk pode reenviar hipóteses iniciais depois de uma revisão Whisper.
        # Nesse caso, não deixe o encerramento regredir o texto já revisado.
        if final and source == "vosk" and self.has_review:
            messages.append({"type": "warning", "message": "A última resposta não trouxe uma revisão. Foi mantido o último texto revisado; confira o final da conversa."})
        elif isinstance(text, str) and (final or (reviewed and self.mode == "reviewed")):
            messages.append({"type": "transcript", "text": text, "partial": ""})
            if reviewed:
                self.has_review = True
            if final and source == "vosk" and text.strip():
                messages.append({"type": "warning", "message": "O serviço encerrou sem revisão Whisper. Confira o texto recebido antes de salvar."})
        elif not final and not self.waiting_sent:
            messages.append({"type": "recognizing"})
            self.waiting_sent = True

        # partial nunca é exibido, anunciado, copiado ou salvo.
        if final:
            messages.append({"type": "done"})
        return messages
