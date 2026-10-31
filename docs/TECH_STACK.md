# Technology Stack — Ruan AI

This document provides a technical justification, comparative candidate evaluation, and architectural breakdown of the chosen technology stack for **Ruan AI**, taking into consideration the local hardware profile, memory estimates, and audio latency considerations.

---

## Hardware Profile Context

Ruan AI is developed and optimized for the following local workstation environment:

* **Operating System:** Windows 11 (64-bit)
* **Processor:** Intel Core i5 (13th Generation)
* **System Memory (RAM):** 16 GB DDR4/DDR5
* **Dedicated GPU:** NVIDIA GeForce RTX 3050 Laptop GPU (6 GB VRAM)
* **Target Inference Profile:** Quantized 7B–8B parameter models (e.g., Qwen 2.5 7B, Llama 3.1 8B at Q4_K_M or Q5_K_M quantization) offloaded to GPU memory within available VRAM limits.
* **Verification Note:** All RAM/VRAM numbers, model throughput, and latency values in this document represent **theoretical estimates** that must be empirically benchmarked on the target laptop during Phase 1.

---

## Detailed Technology Breakdown

### 1. Frontend: React.js + Vite
* **Role:** Powers the single-page user interface, interactive chat streams, audio recorder controls (Push-to-Talk), audio playback management, and settings views.
* **Why Vite:** Lightning-fast hot module replacement (HMR), minimal build overhead, native ES Module support, and near-instant dev server startup.
* **Why React:** Declarative UI state modeling, robust ecosystem for handling streaming asynchronous state, and high developer ergonomics for complex audio-visual interfaces.

### 2. Styling: Vanilla CSS
* **Role:** Provides all layout, styling, themes, animations, audio visualizers, and responsive UI components.
* **Why Vanilla CSS:**
  * Avoids CSS-in-JS runtime overhead and heavy framework dependencies (e.g. Tailwind, Bootstrap, MUI).
  * Direct control over design tokens via standard CSS Custom Properties (`--bg-primary`, `--accent-color`, etc.).
  * Enables sleek dark-mode aesthetics, custom glassmorphism, and hardware-accelerated CSS animations with zero build-step overhead.
* **Policy:** No utility CSS libraries (Tailwind) or component libraries are permitted unless explicitly requested.

### 3. Backend: Node.js + Express.js
* **Role:** Core application server, API gateway, stream proxy, audio processing dispatcher, memory interface, and process manager.
* **Why Node.js & Express:**
  * Shared language (JavaScript) across frontend, backend, and desktop.
  * Exceptional native support for streaming IO (ReadableStreams, Server-Sent Events, piping binary audio).
  * Lightweight runtime footprint that leaves maximum RAM available for local AI inference.
  * Rich ecosystem for filesystem interaction, child process control, and native database drivers.

### 4. Local AI Runtime: LM Studio
* **Role:** Dedicated local LLM inference engine running locally as a service on `http://localhost:1234`.
* **Configurable Model Parameters:**
  * **Context Window:** Not hardcoded. Must be dynamically verified and configured based on the specific model loaded (e.g., 2,048, 4,096, or 8,192 tokens) and VRAM constraints.
  * **GPU Offload Layers:** Tuned to utilize available GPU VRAM without spilling into slow system RAM paging.
  * **Interface:** Standard OpenAI-compatible endpoints (`/v1/chat/completions`, `/v1/models`).

---

## Voice Processing Engines (Phase 1 Candidate Evaluations)

Voice interaction requires two dedicated local engines: **Speech-to-Text (STT)** and **Text-to-Speech (TTS)**. To maintain high performance without GPU contention, candidate engines will be tested and benchmarked on the target machine:

### 5. Speech-to-Text (STT) Candidates Under Evaluation

| Engine Candidate | Execution Runtime | Model Size | Accuracy Potential | Estimated Latency Target | Estimated RAM Footprint | Trade-off Analysis |
|---|---|---|---|---|---|---|
| **`faster-whisper`** | CTranslate2 (Python wrapper / sidecar) | `base.en` / `small.en` (75M–244M) | High | ~250–400 ms (CPU INT8) | ~150–350 MB RAM, 0 MB VRAM | **Pros:** Proven INT8 quantization; excellent punctuation formatting.<br>**Cons:** Requires Python environment or precompiled binary bundle. |
| **`whisper.cpp`** | Pure C/C++ executable / Node native binding | `base.en` / `small.en` (GGUF/bin) | High | ~300–500 ms (AVX2 CPU) | ~180 MB RAM, 0 MB VRAM | **Pros:** Standalone binary; zero Python dependency; clean child process integration.<br>**Cons:** Requires precompiled Windows binaries and model file management. |

* **Selection Policy:** Both remain candidates. Final selection will be determined by benchmarking CPU utilization, transcription speed, and installation simplicity on the Acer ALG laptop.

### 6. Text-to-Speech (TTS) Candidates Under Evaluation

| Engine Candidate | Execution Runtime | Voice Quality | Estimated Latency (RTF) | Estimated RAM Footprint | Trade-off Analysis |
|---|---|---|---|---|---|
| **`Piper`** | Standalone C++ binary / ONNX | High (Natural, clear English) | Estimated RTF < 0.1 | < 50 MB RAM, 0 MB VRAM | **Pros:** Ultra-lightweight; instant synthesis; native Windows binary; zero GPU needed.<br>**Cons:** Less dynamic emotional inflection. |
| **`Kokoro`** | ONNX / Python | Very High (Expressive, natural) | Estimated RTF ~ 0.3–0.5 on CPU | ~150–250 MB RAM | **Pros:** State-of-the-art 82M parameter audio prosody.<br>**Cons:** Higher CPU inference overhead compared to Piper. |

* **Selection Policy:** Both remain candidates. Must support chunked sentence-by-sentence synthesis and immediate cancellation when interrupted. Final selection will depend on empirical audio latency and prosody benchmarks.

---

## Estimated Hardware & VRAM Allocation Budget

The following table outlines the **theoretical working budget** for the 6 GB VRAM and 16 GB RAM environment:

```text
┌────────────────────────────────────────────────────────────────────────┐
│             ESTIMATED RESOURCE ALLOCATION (TO BE BENCHMARKED)          │
├───────────────────────────────┬────────────────────────────────────────┤
│ GPU VRAM Budget (6,144 MB)    │ Estimated Allocation                   │
├───────────────────────────────┼────────────────────────────────────────┤
│ Windows OS & Display DWM      │ ~500–800 MB VRAM                       │
│ LM Studio LLM (7B Q4 Quant)   │ ~4,500–5,200 MB VRAM (Layers offloaded)│
│ GPU Headroom / Safety Margin  │ ~500–1,000 MB VRAM                     │
├───────────────────────────────┼────────────────────────────────────────┤
│ System RAM Budget (16,384 MB) │ Estimated Allocation                   │
├───────────────────────────────┼────────────────────────────────────────┤
│ Windows OS & System Apps      │ ~4,500–5,500 MB RAM                    │
│ Node.js Server & React Client │ ~200–350 MB RAM                        │
│ Local STT Candidate (CPU)     │ ~150–350 MB RAM (Transient)            │
│ Local TTS Candidate (CPU)     │ ~50–200 MB RAM                         │
│ Free RAM for System Caching   │ ~9,500–11,000 MB RAM (Headroom)        │
└───────────────────────────────┴────────────────────────────────────────┘
```

> **Architectural Strategy:** To prevent GPU Out-of-Memory crashes, **the local LLM is assigned priority on the GPU**, while **STT and TTS candidates are evaluated on the CPU**. The Intel Core i5 processor handles INT8 quantized STT and Piper/Kokoro TTS synthesis without competing for graphics memory.

---

## 7. Database: SQLite (Phase 2)
* **Role:** Local relational database for storing conversation histories, message transcripts, user preferences, and long-term memory records.
* **Why SQLite:** Zero-configuration serverless database embedded directly within the Node.js process (`better-sqlite3`). Stores data in a single local file (`ruan.db`).

## 8. Agent Orchestration: LangGraph.js (Phase 3)
* **Role:** Stateful multi-actor agent orchestration, cyclic reasoning loops, tool selection, and human-in-the-loop interruption checkpoints.

## 9. Desktop Integration: Electron (Phase 5)
* **Role:** Native desktop wrapper providing Windows integration, background persistence, global hotkeys, and system tray presence.

---

## Technology Matrix & Version Targets

| Layer | Technology | Primary Target Version | Configuration / Notes |
|---|---|---|---|
| **Language** | JavaScript (ESM) | ES2022+ | `"type": "module"` in all `package.json` files |
| **Node.js** | Node.js Runtime | v18.x or v20.x LTS | Active LTS recommended |
| **Frontend** | React / Vite | React 18+ / Vite 5+ | Clean Vanilla CSS architecture |
| **Backend** | Express | Express 4.x / 5.x | Standardized REST, SSE & audio endpoints |
| **Speech-to-Text** | `faster-whisper` / `whisper.cpp` | Candidate Engines | Evaluated on CPU; benchmarked in Phase 1 |
| **Text-to-Speech** | `Piper` / `Kokoro` | Candidate Engines | Evaluated for streaming sentence chunks & cancel |
| **AI Runtime** | LM Studio | v0.3.x+ | Local server on port `1234`; configurable ctx |
| **Database** | SQLite | SQLite 3 | Embedded file-based persistence (Phase 2) |
| **Agent Core** | LangGraph.js | Latest stable | Cyclical state graphs (Phase 3) |
| **Desktop Shell** | Electron | Latest stable | Desktop wrapper (Phase 5) |
