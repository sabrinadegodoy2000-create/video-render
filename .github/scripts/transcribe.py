#!/usr/bin/env python3
"""
Transcreve um áudio/vídeo com timestamps por palavra usando faster-whisper.
Roda no GitHub Actions (CPU) — não toca no PC do usuário.

Uso: python transcribe.py <arquivo-audio-ou-video> <saida.json>
Saída: {"language": "it", "words": [{"word","start","end"}, ...]}
"""
import sys
import os
import json

if len(sys.argv) < 3:
    print("Uso: python transcribe.py <audio> <saida.json>", file=sys.stderr)
    sys.exit(1)

src, out = sys.argv[1], sys.argv[2]
model_size = os.environ.get("WHISPER_MODEL", "small")
lang = os.environ.get("WHISPER_LANG", "it")  # canal é italiano

from faster_whisper import WhisperModel  # noqa: E402

print(f"[WHISPER] modelo={model_size} lang={lang} — {os.path.basename(src)}")
model = WhisperModel(model_size, device="cpu", compute_type="int8")
segments, info = model.transcribe(src, language=lang, word_timestamps=True, vad_filter=True)

words = []
for seg in segments:
    for w in (seg.words or []):
        t = (w.word or "").strip()
        if t:
            words.append({"word": t, "start": round(w.start, 3), "end": round(w.end, 3)})

with open(out, "w", encoding="utf-8") as f:
    json.dump({"language": info.language, "words": words}, f, ensure_ascii=False, indent=0)

print(f"[WHISPER] {len(words)} palavra(s) transcrita(s) → {out}")
