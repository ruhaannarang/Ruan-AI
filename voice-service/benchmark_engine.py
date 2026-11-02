"""
Ruan AI — Voice Benchmark Engine (Phase 1.6.1)
Repeatable Hinglish & Multilingual STT Benchmarking Suite
Compares faster-whisper 'small' vs 'base' on identical audio.
Measures WER, latency, RTF, RAM usage, language detection, and technical vocabulary retention.
"""

import os
import re
import time
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("voice-service.benchmark")

BASE_DIR = Path(__file__).resolve().parent
BENCHMARK_DATA_DIR = BASE_DIR / "benchmark_data"
SAMPLES_DIR = BENCHMARK_DATA_DIR / "samples"
RESULTS_FILE = BENCHMARK_DATA_DIR / "benchmark_results.json"

# Ensure benchmark directories exist locally
BENCHMARK_DATA_DIR.mkdir(exist_ok=True)
SAMPLES_DIR.mkdir(exist_ok=True)

# Standard Phase 1.6.1 Benchmark Categories & Prompts
BENCHMARK_PROMPTS = [
    # Category A: English
    {
        "id": "eng_1",
        "category": "English",
        "reference": "Please explain how a linked list works in Java.",
        "technical_terms": ["linked list", "Java"]
    },
    {
        "id": "eng_2",
        "category": "English",
        "reference": "My backend server is not starting.",
        "technical_terms": ["backend", "server"]
    },
    {
        "id": "eng_3",
        "category": "English",
        "reference": "Can you help me debug this error?",
        "technical_terms": ["debug", "error"]
    },
    # Category B: Hindi
    {
        "id": "hin_1",
        "category": "Hindi",
        "reference": "Mujhe aaj college jaana hai.",
        "reference_devanagari": "मुझे आज कॉलेज जाना है।",
        "technical_terms": []
    },
    {
        "id": "hin_2",
        "category": "Hindi",
        "reference": "Aap mujhe ye concept samjha sakte hain?",
        "reference_devanagari": "आप मुझे ये कांसेप्ट समझा सकते हैं?",
        "technical_terms": ["concept"]
    },
    {
        "id": "hin_3",
        "category": "Hindi",
        "reference": "Mera computer properly kaam nahi kar raha.",
        "reference_devanagari": "मेरा कंप्यूटर प्रॉपर्ली काम नहीं कर रहा।",
        "technical_terms": ["computer"]
    },
    # Category C: Romanized Hinglish
    {
        "id": "hing_1",
        "category": "Romanized Hinglish",
        "reference": "Mujhe Java mein linked list samjhao.",
        "technical_terms": ["Java", "linked list"]
    },
    {
        "id": "hing_2",
        "category": "Romanized Hinglish",
        "reference": "Kal subah mujhe college jaana hai.",
        "technical_terms": []
    },
    {
        "id": "hing_3",
        "category": "Romanized Hinglish",
        "reference": "Mera backend server start nahi ho raha.",
        "technical_terms": ["backend", "server"]
    },
    {
        "id": "hing_4",
        "category": "Romanized Hinglish",
        "reference": "Is code mein NullPointerException aa raha hai.",
        "technical_terms": ["code", "NullPointerException"]
    },
    {
        "id": "hing_5",
        "category": "Romanized Hinglish",
        "reference": "Aaj mujhe React ka component banana hai.",
        "technical_terms": ["React", "component"]
    },
    # Category D: Technical Hinglish
    {
        "id": "tech_1",
        "category": "Technical Hinglish",
        "reference": "Mujhe API endpoint create karna hai Express mein.",
        "technical_terms": ["API", "endpoint", "Express"]
    },
    {
        "id": "tech_2",
        "category": "Technical Hinglish",
        "reference": "Database connection fail ho raha hai.",
        "technical_terms": ["Database", "connection"]
    },
    {
        "id": "tech_3",
        "category": "Technical Hinglish",
        "reference": "Linked list reverse karne ka logic explain karo.",
        "technical_terms": ["Linked list", "reverse", "logic"]
    },
    {
        "id": "tech_4",
        "category": "Technical Hinglish",
        "reference": "Mere React component mein state update nahi ho rahi.",
        "technical_terms": ["React", "component", "state", "update"]
    }
]

def compute_wer(reference: str, hypothesis: str) -> float:
    """
    Computes Levenshtein Word Error Rate (WER) normalized for case and punctuation.
    Returns value between 0.0 (exact match) and >= 1.0 (complete mismatch).
    """
    # Normalize punctuation and casing
    clean_ref = re.sub(r'[^\w\s]', '', reference.lower()).strip()
    clean_hyp = re.sub(r'[^\w\s]', '', hypothesis.lower()).strip()

    ref_words = clean_ref.split()
    hyp_words = clean_hyp.split()

    if not ref_words:
        return 0.0 if not hyp_words else 1.0

    d = [[0] * (len(hyp_words) + 1) for _ in range(len(ref_words) + 1)]
    for i in range(len(ref_words) + 1):
        d[i][0] = i
    for j in range(len(hyp_words) + 1):
        d[0][j] = j

    for i in range(1, len(ref_words) + 1):
        for j in range(1, len(hyp_words) + 1):
            if ref_words[i - 1] == hyp_words[j - 1]:
                d[i][j] = d[i - 1][j - 1]
            else:
                d[i][j] = min(
                    d[i - 1][j] + 1,      # deletion
                    d[i][j - 1] + 1,      # insertion
                    d[i - 1][j - 1] + 1   # substitution
                )

    wer = d[len(ref_words)][len(hyp_words)] / len(ref_words)
    return round(wer, 3)

def evaluate_technical_terms(expected_terms: List[str], hypothesis: str) -> Dict[str, Any]:
    """
    Evaluates preservation of English technical vocabulary in hypothesis text.
    Handles case-insensitive matches and word boundaries.
    """
    if not expected_terms:
        return {
            "total": 0,
            "matched": 0,
            "missing": [],
            "preservation_rate": 1.0
        }

    hyp_lower = hypothesis.lower()
    matched = []
    missing = []

    for term in expected_terms:
        term_lower = term.lower()
        # Word boundary search or substring for acronyms
        pattern = r'\b' + re.escape(term_lower) + r'\b'
        if re.search(pattern, hyp_lower) or term_lower in hyp_lower:
            matched.append(term)
        else:
            missing.append(term)

    preservation_rate = round(len(matched) / len(expected_terms), 3)

    return {
        "total": len(expected_terms),
        "matched": len(matched),
        "matched_terms": matched,
        "missing_terms": missing,
        "preservation_rate": preservation_rate
    }

def get_current_process_memory_mb() -> float:
    """Returns the current process resident set memory in MB via Windows ctypes."""
    try:
        import ctypes
        from ctypes import wintypes
        class PROCESS_MEMORY_COUNTERS(ctypes.Structure):
            _fields_ = [
                ('cb', wintypes.DWORD),
                ('PageFaultCount', wintypes.DWORD),
                ('PeakWorkingSetSize', ctypes.c_size_t),
                ('WorkingSetSize', ctypes.c_size_t),
                ('QuotaPeakPagedPoolUsage', ctypes.c_size_t),
                ('QuotaPagedPoolUsage', ctypes.c_size_t),
                ('QuotaPeakNonPagedPoolUsage', ctypes.c_size_t),
                ('QuotaNonPagedPoolUsage', ctypes.c_size_t),
                ('PagefileUsage', ctypes.c_size_t),
                ('PeakPagefileUsage', ctypes.c_size_t),
            ]
        counters = PROCESS_MEMORY_COUNTERS()
        counters.cb = ctypes.sizeof(PROCESS_MEMORY_COUNTERS)
        handle = ctypes.windll.kernel32.GetCurrentProcess()
        if ctypes.windll.psapi.GetProcessMemoryInfo(handle, ctypes.byref(counters), counters.cb):
            return round(counters.WorkingSetSize / (1024 * 1024), 2)
    except Exception:
        pass
    return 0.0

class HinglishBenchmarkRunner:
    def __init__(self, stt_small=None, stt_base=None):
        self.stt_small = stt_small
        self.stt_base = stt_base

    def ensure_models(self):
        from stt import STTEngine
        if self.stt_small is None:
            logger.info("Initializing faster-whisper 'small' for benchmark...")
            self.stt_small = STTEngine(model_size="small", device="cpu", compute_type="int8", cpu_threads=4)
        if self.stt_base is None:
            logger.info("Initializing faster-whisper 'base' for benchmark...")
            self.stt_base = STTEngine(model_size="base", device="cpu", compute_type="int8", cpu_threads=4)

    def evaluate_audio_sample(
        self,
        audio_path: str,
        reference_text: str,
        expected_terms: Optional[List[str]] = None,
        category: str = "Unspecified"
    ) -> Dict[str, Any]:
        """
        Runs both 'small' and 'base' on the exact same audio file.
        Returns comprehensive side-by-side comparison metrics.
        """
        self.ensure_models()

        if expected_terms is None:
            expected_terms = []

        # 1. Run faster-whisper-small
        ram_before = get_current_process_memory_mb()
        t0 = time.time()
        res_small = self.stt_small.transcribe(audio_path)
        lat_small = round(time.time() - t0, 3)
        ram_after_small = get_current_process_memory_mb()

        wer_small = compute_wer(reference_text, res_small["text"])
        tech_small = evaluate_technical_terms(expected_terms, res_small["text"])

        # 2. Run faster-whisper-base
        t0 = time.time()
        res_base = self.stt_base.transcribe(audio_path)
        lat_base = round(time.time() - t0, 3)
        ram_after_base = get_current_process_memory_mb()

        wer_base = compute_wer(reference_text, res_base["text"])
        tech_base = evaluate_technical_terms(expected_terms, res_base["text"])

        return {
            "category": category,
            "reference": reference_text,
            "expected_terms": expected_terms,
            "audio_duration": res_small.get("duration", 0),
            "small": {
                "model": "faster-whisper-small",
                "text": res_small["text"],
                "language": res_small["language"],
                "language_probability": res_small["language_probability"],
                "latency_sec": res_small["processing_time"],
                "rtf": res_small["rtf"],
                "wer": wer_small,
                "wer_percent": round(wer_small * 100, 1),
                "technical_terms": tech_small,
                "ram_mb": ram_after_small
            },
            "base": {
                "model": "faster-whisper-base",
                "text": res_base["text"],
                "language": res_base["language"],
                "language_probability": res_base["language_probability"],
                "latency_sec": res_base["processing_time"],
                "rtf": res_base["rtf"],
                "wer": wer_base,
                "wer_percent": round(wer_base * 100, 1),
                "technical_terms": tech_base,
                "ram_mb": ram_after_base
            },
            "speedup": round(res_small["processing_time"] / max(res_base["processing_time"], 0.001), 2),
            "wer_diff": round(wer_base - wer_small, 3)  # Positive means small is better
        }

    def save_sample_and_result(
        self,
        sample_id: str,
        category: str,
        reference_text: str,
        expected_terms: List[str],
        audio_bytes: bytes,
        evaluation_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Saves benchmark audio sample to disk (gitignored) and appends to local benchmark history.
        """
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename = f"{sample_id}_{timestamp}.wav"
        file_path = SAMPLES_DIR / filename

        with open(file_path, "wb") as f:
            f.write(audio_bytes)

        record = {
            "id": f"{sample_id}_{timestamp}",
            "sample_id": sample_id,
            "category": category,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "audio_file": str(file_path.relative_to(BASE_DIR)),
            "reference": reference_text,
            "expected_terms": expected_terms,
            "evaluation": evaluation_result
        }

        # Load existing history
        history = self.get_history()
        history["runs"].append(record)
        self._update_aggregated_stats(history)

        with open(RESULTS_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2, ensure_ascii=False)

        return record

    def get_history(self) -> Dict[str, Any]:
        """Loads benchmark history from JSON file."""
        if not RESULTS_FILE.exists():
            return {
                "version": "1.0",
                "runs": [],
                "summary": {
                    "total_samples": 0,
                    "avg_wer_small": 0.0,
                    "avg_wer_base": 0.0,
                    "avg_latency_small": 0.0,
                    "avg_latency_base": 0.0,
                    "avg_tech_preservation_small": 0.0,
                    "avg_tech_preservation_base": 0.0
                }
            }

        try:
            with open(RESULTS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load benchmark results file: {e}")
            return {"runs": [], "summary": {}}

    def clear_history(self):
        """Clears benchmark history and audio samples."""
        if RESULTS_FILE.exists():
            os.remove(RESULTS_FILE)
        for f in SAMPLES_DIR.glob("*.wav"):
            try:
                os.remove(f)
            except Exception:
                pass

    def _update_aggregated_stats(self, history: Dict[str, Any]):
        runs = history.get("runs", [])
        if not runs:
            return

        wers_small = [r["evaluation"]["small"]["wer"] for r in runs if "evaluation" in r]
        wers_base = [r["evaluation"]["base"]["wer"] for r in runs if "evaluation" in r]
        lats_small = [r["evaluation"]["small"]["latency_sec"] for r in runs if "evaluation" in r]
        lats_base = [r["evaluation"]["base"]["latency_sec"] for r in runs if "evaluation" in r]
        tech_small = [
            r["evaluation"]["small"]["technical_terms"]["preservation_rate"]
            for r in runs
            if "evaluation" in r and r["evaluation"]["small"]["technical_terms"]["total"] > 0
        ]
        tech_base = [
            r["evaluation"]["base"]["technical_terms"]["preservation_rate"]
            for r in runs
            if "evaluation" in r and r["evaluation"]["base"]["technical_terms"]["total"] > 0
        ]

        history["summary"] = {
            "total_samples": len(runs),
            "avg_wer_small": round(sum(wers_small) / max(len(wers_small), 1), 3),
            "avg_wer_base": round(sum(wers_base) / max(len(wers_base), 1), 3),
            "avg_latency_small": round(sum(lats_small) / max(len(lats_small), 1), 3),
            "avg_latency_base": round(sum(lats_base) / max(len(lats_base), 1), 3),
            "avg_tech_preservation_small": round(sum(tech_small) / max(len(tech_small), 1), 3) if tech_small else 1.0,
            "avg_tech_preservation_base": round(sum(tech_base) / max(len(tech_base), 1), 3) if tech_base else 1.0
        }
