"""
Ruan AI — TTS Engine (Text-to-Speech)
Primary Provider: Kokoro 82M (ONNX Runtime + espeakng-loader)
Features language-aware text preparation, Hinglish code-switching handling,
technical term preservation, and graceful pipeline fallback.
"""

import os
import re
import io
import time
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

logger = logging.getLogger("voice-service.tts")

# Resolve base models directory dynamically
BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_MODEL_PATH = str(BASE_DIR / "models" / "kokoro-v1.0.onnx")
DEFAULT_VOICES_PATH = str(BASE_DIR / "models" / "voices-v1.0.bin")

# Common English technical terms to protect from garbled transliteration
TECHNICAL_TERMS = {
    "react", "javascript", "typescript", "python", "java", "c++", "c#",
    "api", "rest", "graphql", "database", "sql", "sqlite", "mongodb",
    "frontend", "backend", "fullstack", "server", "client", "node", "express",
    "component", "props", "state", "hook", "hooks", "usestate", "useeffect",
    "nullpointerexception", "exception", "debug", "debugging", "debugger",
    "linked list", "array", "stack", "queue", "binary tree", "algorithm",
    "docker", "kubernetes", "git", "github", "terminal", "powershell",
    "localhost", "endpoint", "controller", "middleware", "route", "stream",
    "tokens", "model", "lm studio", "whisper", "kokoro", "ruan", "ai"
}

# Devanagari Unicode range: \u0900 - \u097F
DEVANAGARI_REGEX = re.compile(r'[\u0900-\u097F]')

# Common Roman Hinglish marker words
HINGLISH_MARKERS = {
    "hai", "hain", "ho", "hoon", "tha", "the", "thi", "mera", "meri", "mere",
    "aap", "aapko", "aapka", "aapki", "tum", "tumhe", "tumhara", "karo", "karna",
    "karne", "kar", "raha", "rahe", "rahi", "nahi", "nahin", "kyun", "kaise",
    "kya", "kab", "kahan", "subah", "shaam", "aaj", "kal", "baje", "batao",
    "samjhao", "samjhata", "chahiye", "sakte", "sakti", "jaana", "aana",
    "bilkul", "isme", "usme", "ek", "do", "teen", "char", "paanch"
}

class TTSEngine:
    def __init__(
        self,
        model_path: Optional[str] = None,
        voices_path: Optional[str] = None,
        default_voice: str = "hf_alpha",
        fallback_voice: str = "af_heart"
    ):
        self.model_path = model_path or DEFAULT_MODEL_PATH
        self.voices_path = voices_path or DEFAULT_VOICES_PATH
        self.default_voice = default_voice
        self.fallback_voice = fallback_voice
        self.kokoro: Optional[Kokoro] = None
        self.available_voices: List[str] = []
        self._load_model()

    def _load_model(self):
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Kokoro ONNX model file not found at: {self.model_path}")
        if not os.path.exists(self.voices_path):
            raise FileNotFoundError(f"Kokoro voices file not found at: {self.voices_path}")

        logger.info(f"Loading Kokoro-82M ONNX model from {self.model_path}...")
        t0 = time.time()
        try:
            self.kokoro = Kokoro(self.model_path, self.voices_path)
            self.available_voices = sorted(self.kokoro.get_voices())
            logger.info(
                f"Kokoro TTS loaded in {time.time()-t0:.2f}s with {len(self.available_voices)} voices. "
                f"Default voice: '{self.default_voice}'"
            )
        except Exception as e:
            logger.error(f"Failed to load Kokoro ONNX model: {e}")
            self.kokoro = None
            raise

    def detect_text_language(self, text: str) -> str:
        """
        Determines appropriate language code ('hi' or 'en-us') for Kokoro text processing.
        Devanagari script triggers the Hindi ('hi') pipeline and voices.
        Roman-script text (including Romanized Hinglish and technical English)
        is routed to the Latin/English ('en-us') pipeline because Kokoro's Hindi espeak-ng
        phonemizer does not natively map ASCII Roman Hinglish without phonetic distortion.
        """
        if not text or not text.strip():
            return "en-us"

        # 1. Contains Devanagari script -> clearly Hindi pipeline
        if DEVANAGARI_REGEX.search(text):
            return "hi"

        # 2. Roman script / English / Roman Hinglish -> Latin pipeline ('en-us')
        # This prevents espeak-ng Hindi phonetic spelling artifacts on Roman words
        return "en-us"

    def select_appropriate_voice(self, requested_voice: Optional[str], lang_code: str) -> str:
        """
        Selects a voice matching the language context, respecting user preference if valid.
        """
        voice = requested_voice or (self.default_voice if lang_code == "hi" else self.fallback_voice)

        # If voice exists in available voices, check compatibility
        if voice in self.available_voices:
            # If voice starts with 'hf_' or 'hm_' and lang is 'hi', great match
            if lang_code == "hi" and (voice.startswith("hf_") or voice.startswith("hm_")):
                return voice
            # If voice starts with 'af_', 'am_', 'bf_', 'bm_' and lang is 'en-us', great match
            if lang_code == "en-us" and not (voice.startswith("hf_") or voice.startswith("hm_")):
                return voice
            # If mismatched, fallback to natural voice for the target pipeline
            if lang_code == "hi":
                return "hf_alpha" if "hf_alpha" in self.available_voices else voice
            return "af_heart" if "af_heart" in self.available_voices else voice

        # Fallback if voice not found
        if lang_code == "hi":
            return "hf_alpha" if "hf_alpha" in self.available_voices else (self.available_voices[0] if self.available_voices else "hf_alpha")
        return self.fallback_voice if self.fallback_voice in self.available_voices else "af_heart"

    def prepare_text_chunks(self, text: str) -> List[str]:
        """
        Splits long responses along natural sentence boundaries (. ! ? \n)
        to prevent awkward mid-phrase cuts and ensure smooth sequential audio.
        """
        # Clean markdown characters (bold, asterisks, headers, code block ticks) for cleaner speech
        clean = re.sub(r'```[\s\S]*?```', '', text) # Remove multi-line code blocks
        clean = re.sub(r'`([^`]+)`', r'\1', clean)   # Remove inline code ticks
        clean = re.sub(r'[*_#~\[\]]', '', clean)     # Remove markdown formatting symbols
        clean = re.sub(r'https?://\S+', 'link', clean) # Replace URLs with "link"
        clean = re.sub(r'\s+', ' ', clean).strip()

        if not clean:
            return []

        # Split on sentence boundaries: periods, exclamations, question marks, newlines
        sentences = re.split(r'(?<=[.!?\n])\s+', clean)
        chunks = []
        for s in sentences:
            s_clean = s.strip()
            if not s_clean:
                continue
            # If a sentence is very long (> 250 chars), break along comma or semicolon
            if len(s_clean) > 250:
                sub_parts = re.split(r'(?<=[,;:])\s+', s_clean)
                current = ""
                for part in sub_parts:
                    if len(current) + len(part) < 250:
                        current = f"{current} {part}".strip()
                    else:
                        if current:
                            chunks.append(current)
                        current = part
                if current:
                    chunks.append(current)
            else:
                chunks.append(s_clean)

        return chunks if chunks else [clean]

    def synthesize(
        self,
        text: str,
        voice: Optional[str] = None,
        speed: float = 1.0,
        lang: Optional[str] = None
    ) -> Tuple[np.ndarray, int]:
        """
        Synthesizes text to audio array using Kokoro ONNX.
        Handles language-aware routing and fallback.
        Returns (samples, sample_rate).
        """
        if not self.kokoro:
            raise RuntimeError("TTS model is not loaded")

        chunks = self.prepare_text_chunks(text)
        if not chunks:
            # Return 0.1s silence
            return np.zeros(2400, dtype=np.float32), 24000

        audio_pieces: List[np.ndarray] = []
        sample_rate = 24000

        for chunk in chunks:
            chunk_lang = lang if (lang and lang != "auto") else self.detect_text_language(chunk)
            chosen_voice = self.select_appropriate_voice(voice, chunk_lang)

            try:
                # Primary synthesis attempt
                samples, sr = self.kokoro.create(
                    chunk,
                    voice=chosen_voice,
                    speed=speed,
                    lang=chunk_lang
                )
                sample_rate = sr
                audio_pieces.append(samples)
                # Add 0.15s short natural pause between sentences
                audio_pieces.append(np.zeros(int(sr * 0.15), dtype=np.float32))
            except Exception as primary_err:
                logger.warning(
                    f"Synthesis failed with lang='{chunk_lang}', voice='{chosen_voice}': {primary_err}. "
                    "Attempting fallback pipeline..."
                )
                # Graceful fallback: try opposite language pipeline and fallback voice
                fallback_lang = "en-us" if chunk_lang == "hi" else "hi"
                fallback_v = self.fallback_voice if fallback_lang == "en-us" else "hf_alpha"
                try:
                    samples, sr = self.kokoro.create(
                        chunk,
                        voice=fallback_v,
                        speed=speed,
                        lang=fallback_lang
                    )
                    sample_rate = sr
                    audio_pieces.append(samples)
                    audio_pieces.append(np.zeros(int(sr * 0.15), dtype=np.float32))
                except Exception as fallback_err:
                    logger.error(f"TTS synthesis completely failed for chunk: '{chunk}': {fallback_err}")
                    # Skip failing chunk to preserve remaining response

        if not audio_pieces:
            return np.zeros(2400, dtype=np.float32), 24000

        concatenated = np.concatenate(audio_pieces)
        return concatenated, sample_rate

    def synthesize_to_wav_bytes(
        self,
        text: str,
        voice: Optional[str] = None,
        speed: float = 1.0,
        lang: Optional[str] = None
    ) -> bytes:
        """
        Synthesizes text and encodes into WAV in-memory bytes buffer.
        """
        samples, sr = self.synthesize(text, voice=voice, speed=speed, lang=lang)
        buffer = io.BytesIO()
        sf.write(buffer, samples, sr, format="WAV")
        buffer.seek(0)
        return buffer.getvalue()

    def get_info(self) -> Dict[str, Any]:
        return {
            "status": "ready" if self.kokoro else "error",
            "provider": "kokoro-82m",
            "default_voice": self.default_voice,
            "fallback_voice": self.fallback_voice,
            "available_voices": self.available_voices
        }
