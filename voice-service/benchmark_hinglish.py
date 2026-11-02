#!/usr/bin/env python3
"""
Ruan AI — Phase 1.6.1 Hinglish Benchmark CLI
Executes comparative faster-whisper (small vs base) benchmarks,
computes WER, evaluates technical vocabulary preservation, measures latencies and RAM.
Generates a structured Markdown report.
"""

import os
import sys
import argparse
import time
from pathlib import Path

# Add current dir to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from benchmark_engine import (
    BENCHMARK_PROMPTS,
    HinglishBenchmarkRunner,
    compute_wer,
    evaluate_technical_terms,
    get_current_process_memory_mb
)
from tts import TTSEngine
from stt import STTEngine

def print_banner():
    print("=" * 70)
    print("   Ruan AI — Phase 1.6.1 Voice Quality & Hinglish Benchmark Suite")
    print("   Models: faster-whisper-small vs faster-whisper-base (CPU INT8)")
    print("=" * 70)
    print()

def generate_markdown_report(history):
    runs = history.get("runs", [])
    summary = history.get("summary", {})

    lines = []
    lines.append("# Ruan AI — Hinglish & Multilingual STT Benchmark Report")
    lines.append(f"*Generated on: {time.strftime('%Y-%m-%d %H:%M:%S')}*")
    lines.append("")
    lines.append("## 1. Executive Summary")
    lines.append("")
    lines.append("| Metric | faster-whisper-small | faster-whisper-base | Winner / Balance |")
    lines.append("|---|---|---|---|")
    lines.append(f"| **Average WER** | **{summary.get('avg_wer_small', 0.0) * 100:.1f}%** | {summary.get('avg_wer_base', 0.0) * 100:.1f}% | {'Small (More accurate)' if summary.get('avg_wer_small', 0) <= summary.get('avg_wer_base', 0) else 'Base'} |")
    lines.append(f"| **Average Latency** | {summary.get('avg_latency_small', 0.0):.2f}s | **{summary.get('avg_latency_base', 0.0):.2f}s** | Base (~3-4x faster) |")
    lines.append(f"| **Technical Vocab Retention** | **{summary.get('avg_tech_preservation_small', 0.0) * 100:.1f}%** | {summary.get('avg_tech_preservation_base', 0.0) * 100:.1f}% | {'Small' if summary.get('avg_tech_preservation_small', 0) >= summary.get('avg_tech_preservation_base', 0) else 'Base'} |")
    lines.append(f"| **Total Benchmark Samples** | {summary.get('total_samples', len(runs))} | {summary.get('total_samples', len(runs))} | - |")
    lines.append("")
    lines.append("## 2. Detailed Sample Results")
    lines.append("")
    lines.append("| Category | Reference Transcript | Small Output (WER / Latency) | Base Output (WER / Latency) | Tech Words |")
    lines.append("|---|---|---|---|---|")

    for r in runs:
        cat = r.get("category", "")
        ref = r.get("reference", "")
        eval_data = r.get("evaluation", {})
        s_data = eval_data.get("small", {})
        b_data = eval_data.get("base", {})

        s_text = s_data.get("text", "").replace("|", "/")
        b_text = b_data.get("text", "").replace("|", "/")
        s_wer = f"{s_data.get('wer', 0) * 100:.0f}%"
        b_wer = f"{b_data.get('wer', 0) * 100:.0f}%"
        s_lat = f"{s_data.get('latency_sec', 0):.2f}s"
        b_lat = f"{b_data.get('latency_sec', 0):.2f}s"
        tech_matched = f"{s_data.get('technical_terms', {}).get('matched', 0)}/{s_data.get('technical_terms', {}).get('total', 0)}"

        lines.append(f"| **{cat}** | `{ref}` | \"{s_text}\"<br>*(WER: {s_wer}, {s_lat})* | \"{b_text}\"<br>*(WER: {b_wer}, {b_lat})* | {tech_matched} |")

    lines.append("")
    return "\n".join(lines)

def run_synthetic_benchmark():
    """
    Runs automated comparative benchmark across representative sentences
    for regression testing and initial calibration.
    """
    print_banner()
    print("Initializing STT and TTS engines...")
    tts = TTSEngine()
    runner = HinglishBenchmarkRunner()
    runner.ensure_models()

    print(f"Executing comparative evaluation across {len(BENCHMARK_PROMPTS)} benchmark items...\n")

    for item in BENCHMARK_PROMPTS:
        cat = item["category"]
        ref = item["reference"]
        tech = item["technical_terms"]
        item_id = item["id"]

        print(f"[{item_id}] Category: {cat}")
        print(f"  Reference: \"{ref}\"")

        # Synthesize audio to test
        # Note: If Devanagari is available, synthesize with hi; otherwise en-us
        lang = "hi" if item.get("reference_devanagari") else "en-us"
        voice = "hf_alpha" if lang == "hi" else "af_heart"
        synth_text = item.get("reference_devanagari", ref)

        wav_bytes = tts.synthesize_to_wav_bytes(synth_text, voice=voice, lang=lang)
        tmp_wav = f"tmp_bench_{item_id}.wav"
        with open(tmp_wav, "wb") as f:
            f.write(wav_bytes)

        try:
            res = runner.evaluate_audio_sample(
                audio_path=tmp_wav,
                reference_text=ref,
                expected_terms=tech,
                category=cat
            )

            s = res["small"]
            b = res["base"]

            print(f"  Small -> \"{s['text']}\" | Lang: {s['language']} ({s['language_probability']}) | WER: {s['wer_percent']}% | Latency: {s['latency_sec']}s")
            print(f"  Base  -> \"{b['text']}\" | Lang: {b['language']} ({b['language_probability']}) | WER: {b['wer_percent']}% | Latency: {b['latency_sec']}s")
            print(f"  Tech Terms Preserved: Small={s['technical_terms']['matched']}/{len(tech)} | Base={b['technical_terms']['matched']}/{len(tech)}")
            print()

            # Save result locally
            runner.save_sample_and_result(
                sample_id=item_id,
                category=cat,
                reference_text=ref,
                expected_terms=tech,
                audio_bytes=wav_bytes,
                evaluation_result=res
            )
        finally:
            if os.path.exists(tmp_wav):
                os.remove(tmp_wav)

    # Print summary
    history = runner.get_history()
    report = generate_markdown_report(history)
    print("\n" + "=" * 70)
    print("   BENCHMARK RUN COMPLETE")
    print("=" * 70)
    print(report)

    report_path = Path(__file__).resolve().parent / "BENCHMARK_REPORT.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"\nReport written to: {report_path}")

def print_summary():
    runner = HinglishBenchmarkRunner()
    history = runner.get_history()
    report = generate_markdown_report(history)
    print(report)

def main():
    parser = argparse.ArgumentParser(description="Ruan AI Hinglish Benchmark Runner")
    parser.add_argument("--summary", action="store_true", help="Print summary of recorded benchmark results")
    parser.add_argument("--run-synthetic", action="store_true", help="Run automated calibration benchmark")
    parser.add_argument("--clear", action="store_true", help="Clear benchmark history and samples")

    args = parser.parse_args()

    if args.clear:
        runner = HinglishBenchmarkRunner()
        runner.clear_history()
        print("Benchmark history and samples cleared.")
    elif args.run_synthetic:
        run_synthetic_benchmark()
    else:
        print_summary()

if __name__ == "__main__":
    main()

