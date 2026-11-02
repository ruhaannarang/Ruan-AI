"""
Ruan AI — Local Voice Service
FastAPI microservice hosting faster-whisper (STT) and Kokoro 82M (TTS),
with Phase 1.6.1 Hinglish benchmarking suite comparing 'small' vs 'base' models.
Strictly bound to 127.0.0.1 (local loopback).
"""

import os
import sys
import json
import tempfile
import logging
import asyncio
from typing import Optional, List
from contextlib import asynccontextmanager

# Force UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from stt import STTEngine
from tts import TTSEngine
from benchmark_engine import (
    BENCHMARK_PROMPTS,
    HinglishBenchmarkRunner
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s"
)
logger = logging.getLogger("voice-service")

import threading

# Global engine references
stt_engine: Optional[STTEngine] = None
tts_engine: Optional[TTSEngine] = None
benchmark_runner: Optional[HinglishBenchmarkRunner] = None
is_loading = False
init_lock = threading.Lock()

# Configuration from environment variables
STT_MODEL = os.getenv("STT_MODEL", "small")
STT_DEVICE = os.getenv("STT_DEVICE", "cpu")
STT_COMPUTE_TYPE = os.getenv("STT_COMPUTE_TYPE", "int8")
STT_CPU_THREADS = int(os.getenv("STT_CPU_THREADS", "4"))

TTS_DEFAULT_VOICE = os.getenv("TTS_VOICE", "hf_alpha")
TTS_MODEL_PATH = os.getenv("TTS_MODEL_PATH", None)
TTS_VOICES_PATH = os.getenv("TTS_VOICES_PATH", None)

MAX_AUDIO_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB max upload

def init_engines_sync():
    global stt_engine, tts_engine, benchmark_runner, is_loading
    with init_lock:
        if stt_engine is not None and tts_engine is not None:
            return
        is_loading = True
        logger.info("Pre-loading Ruan AI Voice Engines (STT + TTS)...")
        try:
            if stt_engine is None:
                stt_engine = STTEngine(
                    model_size=STT_MODEL,
                    device=STT_DEVICE,
                    compute_type=STT_COMPUTE_TYPE,
                    cpu_threads=STT_CPU_THREADS
                )
                logger.info("STT Engine initialized.")
        except Exception as e:
            logger.error(f"Failed to initialize STT Engine: {e}")

        try:
            if tts_engine is None:
                tts_engine = TTSEngine(
                    model_path=TTS_MODEL_PATH,
                    voices_path=TTS_VOICES_PATH,
                    default_voice=TTS_DEFAULT_VOICE
                )
                logger.info("TTS Engine initialized.")
        except Exception as e:
            logger.error(f"Failed to initialize TTS Engine: {e}")

        try:
            if benchmark_runner is None:
                # Wire primary stt_engine if it matches 'small'
                small_model = stt_engine if STT_MODEL == "small" else None
                base_model = stt_engine if STT_MODEL == "base" else None
                benchmark_runner = HinglishBenchmarkRunner(stt_small=small_model, stt_base=base_model)
                logger.info("Benchmark Runner initialized.")
        except Exception as e:
            logger.error(f"Failed to initialize Benchmark Runner: {e}")

        is_loading = False
        logger.info("Voice engines ready.")

def get_stt() -> STTEngine:
    global stt_engine
    if stt_engine is None:
        init_engines_sync()
    if stt_engine is None or not stt_engine.model:
        raise HTTPException(status_code=503, detail="Speech-to-text engine failed to load")
    return stt_engine

def get_tts() -> TTSEngine:
    global tts_engine
    if tts_engine is None:
        init_engines_sync()
    if tts_engine is None or not tts_engine.kokoro:
        raise HTTPException(status_code=503, detail="Text-to-speech engine failed to load")
    return tts_engine

def get_benchmark() -> HinglishBenchmarkRunner:
    global benchmark_runner
    if benchmark_runner is None:
        init_engines_sync()
    if benchmark_runner is None:
        raise HTTPException(status_code=503, detail="Benchmark runner failed to initialize")
    return benchmark_runner

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Voice Service startup: Dispatching background model loading...")
    loop = asyncio.get_running_loop()
    # Run model loading in separate thread pool so uvicorn binds and answers immediately
    loop.run_in_executor(None, init_engines_sync)
    yield
    logger.info("Shutting down Voice Service...")

app = FastAPI(
    title="Ruan AI Local Voice Service",
    description="Local STT and TTS services for Ruan AI with Hinglish Benchmarking",
    version="0.2.0",
    lifespan=lifespan
)

# CORS restricted strictly to localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

class SynthesizeRequest(BaseModel):
    text: str
    voice: Optional[str] = None
    speed: Optional[float] = 1.0
    lang: Optional[str] = "auto"

@app.get("/health")
def get_health():
    """
    Returns independent readiness status of STT and TTS engines.
    """
    global stt_engine, tts_engine, is_loading

    stt_info = stt_engine.get_info() if (stt_engine and stt_engine.model) else {
        "status": "initializing" if is_loading else "unavailable",
        "error": "STT engine not initialized" if not is_loading else None
    }
    tts_info = tts_engine.get_info() if (tts_engine and tts_engine.kokoro) else {
        "status": "initializing" if is_loading else "unavailable",
        "error": "TTS engine not initialized" if not is_loading else None
    }

    is_healthy = (stt_info.get("status") == "ready") and (tts_info.get("status") == "ready")

    return {
        "status": "ok" if is_healthy else ("initializing" if is_loading else "degraded"),
        "stt": stt_info,
        "tts": tts_info
    }

@app.get("/voices")
def get_voices():
    """
    Returns list of available Kokoro TTS voices.
    """
    tts = get_tts()
    return {
        "default_voice": tts.default_voice,
        "voices": tts.available_voices
    }

@app.post("/transcribe")
async def transcribe_audio(
    file: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    language: Optional[str] = Form(None)
):
    """
    Transcribes audio file. Cleans up temporary files immediately.
    """
    stt = get_stt()

    upload = file or audio
    if not upload:
        raise HTTPException(status_code=400, detail="No audio file provided in request")

    # Read uploaded bytes
    content = await upload.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty audio file provided")

    if len(content) > MAX_AUDIO_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Audio file exceeds maximum size limit of {MAX_AUDIO_UPLOAD_BYTES // (1024 * 1024)}MB"
        )

    # Determine file extension safely
    orig_ext = os.path.splitext(upload.filename or "")[1].lower()
    suffix = orig_ext if orig_ext in [".wav", ".webm", ".ogg", ".mp3", ".m4a", ".flac"] else ".wav"

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        result = stt.transcribe(tmp_path, language=language)
        return {
            "success": True,
            "text": result["text"],
            "language": result["language"],
            "language_probability": result["language_probability"],
            "duration": result["duration"],
            "processing_time": result["processing_time"],
            "rtf": result["rtf"],
            "segments": result["segments"]
        }
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription processing error: {str(e)}")
    finally:
        # Guarantee transient temporary audio file deletion
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception as clean_err:
                logger.warning(f"Failed to remove temp file {tmp_path}: {clean_err}")

@app.post("/synthesize")
def synthesize_speech(payload: SynthesizeRequest):
    """
    Synthesizes speech from text and returns WAV audio bytes.
    """
    tts = get_tts()

    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text field cannot be empty")

    if len(text) > 8000:
        raise HTTPException(status_code=400, detail="Text exceeds maximum limit of 8000 characters")

    try:
        wav_bytes = tts.synthesize_to_wav_bytes(
            text=text,
            voice=payload.voice,
            speed=payload.speed or 1.0,
            lang=payload.lang
        )
        return Response(
            content=wav_bytes,
            media_type="audio/wav",
            headers={
                "Content-Disposition": "inline; filename=speech.wav",
                "Cache-Control": "no-cache"
            }
        )
    except Exception as e:
        logger.error(f"Synthesis error: {e}")
        raise HTTPException(status_code=500, detail=f"Speech synthesis error: {str(e)}")

# ==========================================
# Phase 1.6.1 Hinglish Benchmark Endpoints
# ==========================================

@app.get("/benchmark/prompts")
def get_benchmark_prompts():
    """
    Returns the standard benchmark categories, reference transcripts,
    and expected technical terms.
    """
    return {
        "success": True,
        "prompts": BENCHMARK_PROMPTS
    }

@app.post("/benchmark/compare")
async def benchmark_compare_sample(
    file: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    reference: str = Form(...),
    category: str = Form("Unspecified"),
    technical_terms: Optional[str] = Form("[]")
):
    """
    Runs both 'faster-whisper-small' and 'faster-whisper-base' on the exact same audio.
    Computes WER, technical vocabulary preservation, processing latency, and RTF.
    """
    runner = get_benchmark()
    upload = file or audio
    if not upload:
        raise HTTPException(status_code=400, detail="Audio file required for benchmark comparison")

    content = await upload.read()
    if not content:
        raise HTTPException(status_code=400, detail="Audio file is empty")

    # Parse technical terms list
    parsed_terms = []
    if technical_terms:
        try:
            parsed_terms = json.loads(technical_terms)
        except Exception:
            parsed_terms = [t.strip() for t in technical_terms.split(",") if t.strip()]

    orig_ext = os.path.splitext(upload.filename or "")[1].lower()
    suffix = orig_ext if orig_ext in [".wav", ".webm", ".ogg", ".mp3"] else ".wav"

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        eval_result = runner.evaluate_audio_sample(
            audio_path=tmp_path,
            reference_text=reference.strip(),
            expected_terms=parsed_terms,
            category=category.strip()
        )

        return {
            "success": True,
            "comparison": eval_result
        }
    except Exception as e:
        logger.error(f"Benchmark comparison error: {e}")
        raise HTTPException(status_code=500, detail=f"Benchmark comparison error: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass

@app.post("/benchmark/save")
async def benchmark_save_sample(
    file: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    sample_id: str = Form(...),
    reference: str = Form(...),
    category: str = Form("Unspecified"),
    evaluation_json: str = Form(...)
):
    """
    Saves the benchmark audio sample and results to local storage (gitignored).
    """
    runner = get_benchmark()
    upload = file or audio
    if not upload:
        raise HTTPException(status_code=400, detail="Audio file required to save benchmark sample")

    content = await upload.read()
    if not content:
        raise HTTPException(status_code=400, detail="Audio file is empty")

    try:
        eval_dict = json.loads(evaluation_json)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid evaluation_json: {e}")

    try:
        saved_record = runner.save_sample_and_result(
            sample_id=sample_id,
            category=category,
            reference_text=reference,
            expected_terms=eval_dict.get("expected_terms", []),
            audio_bytes=content,
            evaluation_result=eval_dict
        )

        return {
            "success": True,
            "saved_record": saved_record
        }
    except Exception as e:
        logger.error(f"Failed to save benchmark sample: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save benchmark sample: {str(e)}")

@app.get("/benchmark/history")
def get_benchmark_history():
    """
    Returns all stored benchmark runs and aggregated comparative metrics.
    """
    runner = get_benchmark()
    history = runner.get_history()
    return {
        "success": True,
        "history": history
    }

@app.delete("/benchmark/history")
def clear_benchmark_history():
    """
    Deletes all saved benchmark samples and results.
    """
    runner = get_benchmark()
    runner.clear_history()
    return {
        "success": True,
        "message": "Benchmark history and samples cleared successfully"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("VOICE_SERVICE_PORT", "8008"))
    host = os.getenv("VOICE_SERVICE_HOST", "127.0.0.1")
    logger.info(f"Starting Voice Service on http://{host}:{port}")
    uvicorn.run(app, host=host, port=port, log_level="info")
