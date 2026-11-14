import pytest

from app.transcription import TranscriptFilter


@pytest.mark.parametrize("source", ["vosk", "", None, "unknown"])
def test_initial_hypotheses_are_not_displayed(source):
    selector = TranscriptFilter()
    assert selector.select({"source": source, "text": "Bom dia the to debate", "partial": "over so"}) == [{"type": "recognizing"}]
    assert selector.select({"source": source, "text": "the to debate"}) == []


def test_reviewed_text_never_includes_partial():
    selector = TranscriptFilter()
    assert selector.select({"source": "whisper", "text": "Bom dia, tudo bem?", "partial": "the to debate over so"}) == [
        {"type": "transcript", "text": "Bom dia, tudo bem?", "partial": ""}
    ]


def test_late_vosk_cannot_replace_a_review_even_on_stop():
    selector = TranscriptFilter()
    selector.select({"source": "whisper", "text": "Bom dia."})
    messages = selector.select({"source": "vosk", "text": "Bom dia the to debate", "is_final": True})
    assert [message["type"] for message in messages] == ["warning", "done"]


def test_missing_source_uses_only_final_result():
    selector = TranscriptFilter()
    selector.select({"text": "the to debate"})
    assert selector.select({"text": "Bom dia.", "is_final": True}) == [
        {"type": "transcript", "text": "Bom dia.", "partial": ""}, {"type": "done"}
    ]


def test_final_only_mode_hides_even_intermediate_whisper():
    selector = TranscriptFilter("final")
    assert selector.select({"source": "whisper", "text": "Bom dia."}) == [{"type": "recognizing"}]
    assert selector.select({"source": "whisper", "text": "Bom dia, tudo bem?", "is_final": True}) == [
        {"type": "transcript", "text": "Bom dia, tudo bem?", "partial": ""}, {"type": "done"}
    ]


def test_empty_final_review_clears_incorrect_recognition():
    selector = TranscriptFilter()
    selector.select({"source": "whisper", "text": "Reconhecimento incorreto"})
    assert selector.select({"source": "whisper", "text": "", "is_final": True})[0]["text"] == ""


def test_vosk_only_final_result_warns_about_missing_review():
    selector = TranscriptFilter()
    messages = selector.select({"source": "vosk", "text": "Bom dia.", "is_final": True})
    assert [message["type"] for message in messages] == ["transcript", "warning", "done"]


def test_silence_does_not_produce_a_false_warning():
    messages = TranscriptFilter().select({"source": "vosk", "text": "", "is_final": True})
    assert [message["type"] for message in messages] == ["transcript", "done"]


def test_pure_partial_does_not_become_a_caption():
    assert TranscriptFilter().select({"partial": "the to debate", "is_final": True}) == [{"type": "done"}]
