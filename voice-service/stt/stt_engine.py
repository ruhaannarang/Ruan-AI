"""
Ruan AI — STT Engine (Speech-to-Text)
Provider: faster-whisper (CTranslate2 + Whisper)
Designed for local, CPU-based multilingual transcription with Hinglish & Indian English support.
"""

import os
import time
import logging
from typing import Dict, Any, Optional
from faster_whisper import WhisperModel

logger = logging.getLogger("voice-service.stt")

DEFAULT_HINGLISH_PROMPT = (
    "Namaste! Ye ek Hinglish conversation hai with technical terms like React, "
    "API, database, Java, Python, server, NullPointerException, Express, component, "
    "endpoint, linked list. Mujhe code debug karna hai."
)

DEFAULT_HOTWORDS = (
    "React API database Java Python server NullPointerException Express "
    "component endpoint linked list state hook async await frontend backend"
)

class STTEngine:
    def __init__(
        self,
        model_size: str = "small",
        device: str = "cpu",
        compute_type: str = "int8",
        cpu_threads: int = 4
    ):
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self.cpu_threads = cpu_threads
        self.model: Optional[WhisperModel] = None
        self._load_model()

    def _load_model(self):
        logger.info(
            f"Loading faster-whisper model '{self.model_size}' "
            f"on {self.device} (compute: {self.compute_type}, threads: {self.cpu_threads})..."
        )
        t0 = time.time()
        try:
            self.model = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=self.compute_type,
                cpu_threads=self.cpu_threads
            )
            logger.info(f"faster-whisper '{self.model_size}' loaded successfully in {time.time()-t0:.2f}s")
        except Exception as e:
            logger.error(f"Failed to load faster-whisper model '{self.model_size}': {e}")
            self.model = None
            raise

    def transcribe(
        self,
        audio_path: str,
        language: Optional[str] = None,
        beam_size: int = 5,
        vad_filter: bool = True,
        initial_prompt: Optional[str] = DEFAULT_HINGLISH_PROMPT,
        hotwords: Optional[str] = DEFAULT_HOTWORDS,
        condition_on_previous_text: bool = False
    ) -> Dict[str, Any]:
        """
        Transcribes speech from audio file with multilingual detection.
        Preserves technical English terms and Roman/Devanagari scripts.
        """
        if not self.model:
            raise RuntimeError(f"STT model '{self.model_size}' is not loaded")

        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        t_start = time.time()

        # Clean language parameter: 'auto' or empty string -> None (triggers auto-detection)
        target_lang = None
        if language and language.strip().lower() not in ["auto", "none", "null"]:
            target_lang = language.strip().lower()

        vad_params = dict(
            min_silence_duration_ms=500,
            speech_pad_ms=200
        ) if vad_filter else None

        # Multilingual transcription with auto-language detection
        # Bilingual initial_prompt provides acoustic context for mixed Hinglish/code-switching
        segments, info = self.model.transcribe(
            audio_path,
            language=target_lang,
            beam_size=beam_size,
            vad_filter=vad_filter,
            vad_parameters=vad_params,
            initial_prompt=initial_prompt,
            hotwords=hotwords,
            condition_on_previous_text=condition_on_previous_text
        )

        segment_list = []
        collected_text = []

        for seg in segments:
            collected_text.append(seg.text)
            segment_list.append({
                "id": seg.id,
                "start": round(seg.start, 2),
                "end": round(seg.end, 2),
                "text": seg.text.strip(),
                "no_speech_prob": round(seg.no_speech_prob, 3)
            })

        full_text = " ".join(collected_text).strip()
        processing_time = round(time.time() - t_start, 3)

        return {
            "text": full_text,
            "language": info.language,
            "language_probability": round(info.language_probability, 3),
            "duration": round(info.duration, 2),
            "processing_time": processing_time,
            "rtf": round(processing_time / max(info.duration, 0.01), 2),
            "segments": segment_list
        }

    def get_info(self) -> Dict[str, Any]:
        return {
            "status": "ready" if self.model else "error",
            "provider": "faster-whisper",
            "model": self.model_size,
            "device": self.device,
            "compute_type": self.compute_type,
            "cpu_threads": self.cpu_threads
        }
