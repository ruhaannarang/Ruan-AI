import sys
import time
from pathlib import Path

# Add voice-service to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from tts.tts_engine import TTSEngine

print("Initializing Kokoro TTS Engine...")
t_init = time.time()
engine = TTSEngine()
print(f"Kokoro initialized in {(time.time() - t_init)*1000:.1f}ms")

sentences = [
    ("English Chunk 0", "Hello, this is a test of streaming text to speech in Ruan AI."),
    ("English Chunk 1", "The audio starts playing while the language model is still generating tokens."),
    ("Hinglish Chunk 0", "Mujhe kal subah college jaana hai aur React project complete karna hai."),
    ("Hindi Chunk 0", "नमस्ते, आप कैसे हैं? आज हम नया प्रोजेक्ट शुरू कर रहे हैं।")
]

print("\n--- Benchmarking Sentence-Level Synthesis Latency ---")
for label, text in sentences:
    t0 = time.time()
    wav_bytes = engine.synthesize_to_wav_bytes(text)
    latency_ms = (time.time() - t0) * 1000
    print(f"[{label}] Length: {len(text)} chars | Synthesized in: {latency_ms:.1f}ms | WAV: {len(wav_bytes)} bytes")

print("\n--- Benchmark Completed Successfully ---")

