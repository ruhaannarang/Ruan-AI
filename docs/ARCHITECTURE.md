# System Architecture — Ruan AI

This document details the architectural design, component responsibilities, integration boundaries, voice subsystem, memory hierarchy, and data flows of **Ruan AI**.

---

## 1. Architectural Philosophy

Ruan AI is designed as a **locally executing, modular, privacy-preserving personal AI operating companion**. The architecture balances responsiveness, extensibility, audio performance, and safety:

1. **Modularity:** Presentation (React), audio I/O (Web Audio API), orchestration/logic (Express), voice processing (STT/TTS adapters), persistence (SQLite), agent reasoning (LangGraph.js), and desktop integration (Electron) are decoupled into isolated layers.
2. **Local-First Privacy:** All data remains strictly on the user's workstation. LM Studio provides local LLM inference; local STT/TTS candidate engines process voice audio; SQLite provides local persistent storage. Raw voice audio is processed in volatile memory only and is never stored on disk in Phase 1.
3. **Multimodal Core (Shared Conversation Pipeline):** Voice is an input/output modality rather than a separate system. Both text prompts and voice inputs (after transcription) pass through the exact same conversation orchestrator and share the same conversation history.
4. **Hardware Conscious (Estimated Budget to Benchmark):** Designed for consumer workstation hardware (Intel Core i5 13th Gen, 16 GB RAM, NVIDIA GeForce RTX 3050 Laptop GPU with 6 GB VRAM). Because LM Studio utilizes the majority of VRAM for 7B/8B parameter models, voice processing (STT and TTS) is evaluated on CPU threads or lightweight modes to eliminate GPU Out-of-Memory (OOM) risks. All performance and memory figures are working estimates that must be empirically benchmarked.
5. **Safety & Guardrails:** The system executes actions through explicit tool interfaces with confirmation gates rather than unconstrained background execution.

---

## 2. High-Level Component Topology

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   ELECTRON DESKTOP LAYER (Phase 5)                     │
│                                                                        │
│   ┌────────────────────────┐         ┌─────────────────────────────┐   │
│   │     System Tray &      │         │     Renderer Window         │   │
│   │     Global Hotkeys     │         │     (React + Vite)          │   │
│   └───────────┬────────────┘         └──────────────┬──────────────┘   │
└───────────────┼─────────────────────────────────────┼──────────────────┘
                │ Native Events                       │ HTTP / SSE / Audio
                ▼                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       FRONTEND CLIENT (`client/`)                      │
│                                                                        │
│   ┌────────────────────────┐         ┌─────────────────────────────┐   │
│   │      Chat Surface      │         │     Audio I/O Subsystem     │   │
│   │  (Stream Text Render,  │◄───────►│  • Push-to-Talk Mic Capture │   │
│   │   Mode Toggle Switch)  │         │  • Audio Player & Interrupt │   │
│   └───────────┬────────────┘         └──────────────┬──────────────┘   │
└───────────────┼─────────────────────────────────────┼──────────────────┘
                │                                     │
                │ HTTP POST / SSE                     │ Audio Blobs / Chunks
                ▼                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       BACKEND SERVICE (`server/`)                      │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                      HTTP / API Gateway                        │   │
│   │ (/api/health, /api/chat/stream, /api/chat/abort, /api/voice/*) │   │
│   └───────┬──────────────────────┬──────────────────────┬──────────┘   │
│           │                      │                      │              │
│   ┌───────▼──────────────┐ ┌─────▼────────────────────┐ │              │
│   │   Stream Controller  │ │ Conversation Orchestrator│ │              │
│   │  (SSE Token Proxy)   │ │ (Unified Chat & History) │ │              │
│   └───────┬──────────────┘ └─────┬────────────────────┘ │              │
│           │                      │                      │              │
│   ┌───────▼──────────────┐ ┌─────▼────────────────────┐ │              │
│   │   LM Studio Client   │ │ Voice Processing Gateway │ │              │
│   │  (OpenAI Compatible) │ │ • STT Candidate Adapter  │ │              │
│   └───────┬──────────────┘ │ • TTS Candidate Adapter  │ │              │
│           │                └─────┬──────────────┬─────┘ │              │
│   ┌───────▼──────────────┐       │              │       │              │
│   │ SQLite Memory Engine │       │              │   ┌───▼────────────┐ │
│   │ (Chats & Memory P2)  │       │              │   │LangGraph Engine│ │
│   └──────────────────────┘       │              │   │ (Phase 3+)     │ │
└───────────────────┬──────────────┼──────────────┼───┴───┬────────────┘ │
                    │              │              │       │              │
                    │ REST / SSE   │ Audio In     │ Audio │ FS / OS APIs │
                    ▼              ▼              ▼       ▼              │
┌───────────────────────┐ ┌────────────────┐ ┌───────────────┐ ┌────────┴┐
│   LM STUDIO RUNTIME   │ │ LOCAL STT CORE │ │ LOCAL TTS CORE│ │ LOCAL OS │
│  • Qwen 2.5 / Llama 3 │ │(Candidate:     │ │(Candidate:    │ │• Files   │
│  • GPU 6 GB VRAM      │ │ faster-whisper/│ │ Piper/Kokoro) │ │• Apps    │
│  • Configurable Ctx   │ │ whisper.cpp)   │ │• Sentence Chk │ │• Shell   │
│  • Port: 1234         │ │• CPU / Quant   │ │• Instant Abort│ │(Phase 4) │
└───────────────────────┘ └────────────────┘ └───────────────┘ └──────────┘
```

---

## 3. Component Responsibilities

### 3.1. Frontend (`client/`)
* **Presentation Layer:** Built with React (Vite) and styled exclusively with modular Vanilla CSS.
* **Chat Rendering:** Renders real-time streamed text tokens with markdown support and auto-scrolling.
* **Audio Input (Push-to-Talk):** Captures microphone audio using the standard browser `MediaRecorder` / Web Audio API strictly when the user activates push-to-talk. No ambient listening.
* **Audio Output & Instant Interruption:** Receives synthesized audio chunks and enqueues them for sequential playback. Clicking the stop button, hitting push-to-talk, or typing immediately silences playback, flushes the audio queue, and calls `/api/chat/abort`.
* **Interaction Mode Switching:** Toggle switch between **Voice Mode** (spoken audio playback + text stream) and **Text-Only Mode** (silent text streaming).
* **Permission Modals (Phase 4):** Displays explicit confirmation dialogs for privileged tool operations.

### 3.2. Backend (`server/`)
* **API Gateway:** Exposes standard endpoints (`/api/health`, `/api/chat/stream`, `/api/chat/abort`, `/api/voice/transcribe`, `/api/voice/synthesize`).
* **Decoupled Health Architecture:** Reports Express server uptime independently from the operational status of LM Studio, STT, and TTS dependencies.
* **LM Studio Client:** Formats prompts into OpenAI-compatible chat messages (`/v1/chat/completions`) and streams chunks back using configurable context and model settings.
* **Unified Conversation Orchestrator:** Manages the canonical conversation state. Whether input originates as text or voice, it is appended to the same conversation history and processed through the same model stream.
* **Voice Processing Gateway:**
  * **STT Service Adapter:** Decoupled service interfacing with candidate speech-to-text engines (`faster-whisper` or `whisper.cpp`).
  * **TTS Service Adapter:** Decoupled service interfacing with candidate text-to-speech engines (`Piper` or `Kokoro`), supporting streaming sentence-level chunking and cancellation.
* **Memory & Persistence Layer (Phase 2):** SQLite interface managing session history, message transcripts, and long-term memory retrieval.
* **Agent Graph Runtime (Phase 3):** LangGraph.js coordinating multi-step reasoning, tool execution loops, and human-in-the-loop pause states.
* **System Tools Subsystem (Phase 4):** Modular file searching, reading, and app launching protected by authorization middleware.

### 3.3. Local AI Runtimes
* **LM Studio:** Runs locally on `http://localhost:1234`, hosting quantized LLMs (e.g. Qwen 2.5 7B, Llama 3.1 8B) offloaded to the RTX 3050 GPU. Context window and offload layers are dynamically verified based on the active model.
* **Local STT Candidate Engine:** Candidate high-efficiency local speech recognition model running on CPU threads.
* **Local TTS Candidate Engine:** Candidate low-latency neural speech synthesizer running on CPU threads.

---

## 4. Voice Processing Subsystem (Phase 1)

Voice interaction is architecturally isolated from the LLM client to preserve modularity, but feeds into the shared conversation flow:

```text
               ┌────────────────────────────────────────────────────────┐
               │              VOICE PROCESSING SUBSYSTEM                │
               └────────────────────────────────────────────────────────┘

 [Microphone] ──► [Audio Recorder (Client)]
                         │
                         │ Audio Blob (WAV/WebM) via Push-to-Talk
                         ▼
                  [STT Adapter (Server)] ──► [/api/voice/transcribe]
                         │
                         │ Transcribed Text String
                         ▼
             [Unified Conversation Orchestrator] ──► [Appends to Shared History]
                         │
                         │ Canonical Prompt
                         ▼
              [LM Studio Client (Server)] ──► [Token-by-Token Stream]
                         │
                         ├──────────────────────────────────────────┐
                         ▼                                          ▼
                [SSE Text Stream]                         [Sentence Delimiter Buffer]
                         │                                          │ (Complete Sentence)
                         │ (Real-Time Tokens)                       ▼
                         ▼                                   [TTS Candidate Engine]
                [Chat UI (Client)]                                  │
                                                                    │ Synthesized Audio Chunk
                                                                    ▼
                                                            [Audio Player (Client)]
                                                                    │
                                                              [Speaker Output]
                                                                    ▲
                                                                    │
                                                    [Interrupt / Abort Signal]
                                                    (Silences Audio & Halts Generation)
```

### 4.1. Speech-to-Text (STT) Candidates Under Evaluation
* **Candidate 1: `faster-whisper` (Python/CTranslate2 wrapper or local sidecar)**
  * *Characteristics:* Highly optimized INT8 quantization; fast CPU inference; robust punctuation.
  * *Target Footprint:* Estimated ~150–350 MB RAM on CPU. Leaves GPU VRAM 100% available for LM Studio.
* **Candidate 2: `whisper.cpp` (C++ standalone binary / Node native binding)**
  * *Characteristics:* Standalone executable; zero Python runtime requirement; direct AVX2 CPU execution.
  * *Target Footprint:* Estimated ~180 MB RAM on CPU.
* *Decision Policy:* Both engines remain candidates until side-by-side accuracy, latency, and CPU load benchmarks are conducted on the target Acer ALG laptop in Phase 1.

### 4.2. Text-to-Speech (TTS) Candidates Under Evaluation
* **Candidate 1: `Piper` (Local neural TTS)**
  * *Characteristics:* Extremely low latency (estimated Real-Time Factor < 0.1); runs on CPU; standalone binary.
  * *Target Footprint:* Estimated <50 MB RAM on CPU.
* **Candidate 2: `Kokoro` (82M parameter neural TTS)**
  * *Characteristics:* Highly expressive prosody; runs via ONNX runtime on CPU or lightweight GPU offload.
  * *Target Footprint:* Estimated ~150–250 MB RAM on CPU.
* *Decision Policy:* Both engines remain candidates until evaluated for synthesis speed, sentence-chunking smoothness, and audio clarity on the target machine.

### 4.3. Streaming TTS & Sentence Chunking Pipeline
Generating TTS audio for an entire response at once creates unacceptable latency (the user waits until the LLM finishes generating before hearing anything). To achieve near-instant voice feedback:
1. As LM Studio streams tokens to Express, the backend buffers text.
2. A lightweight regex detects sentence boundaries (punctuation marks `.`, `!`, `?` or double newlines).
3. The completed sentence is immediately passed to the TTS candidate engine to synthesize an audio chunk.
4. The synthesized audio chunk is forwarded to the client audio queue.
5. While the client plays the first sentence, the LLM continues generating subsequent tokens, and the TTS engine synthesizes subsequent sentences in parallel.

### 4.4. Playback Interruption & Audio Cancellation
To prevent the assistant from talking over the user or continuing unwanted speech:
1. **Trigger:** The user clicks the Stop button, activates Push-to-Talk, or submits a new message while audio is playing.
2. **Client Cancellation:**
   * The client immediately stops the active `AudioBufferSourceNode` or HTML5 `Audio` element.
   * Clears the pending local audio chunk queue.
   * Sends an abort signal by issuing a POST request to `/api/chat/abort` (or closing the active SSE connection).
3. **Backend Cancellation:**
   * The backend's `AbortController` terminates the HTTP connection to LM Studio, stopping token generation immediately.
   * Cancels any queued or in-progress TTS synthesis tasks.
   * Discards intermediate buffers from memory.

---

## 5. Memory Architecture (Phase 2 Design)

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        RUAN AI MEMORY HIERARCHY                        │
├───────────────────┬────────────────────────────┬───────────────────────┤
│ Tier              │ Scope                      │ Persistence / Storage │
├───────────────────┼────────────────────────────┼───────────────────────┤
│ 1. Working Memory │ Active conversation buffer │ In-Memory / SQLite    │
│    (Short-term)   │ (Last N messages)          │ Fast sliding window   │
├───────────────────┼────────────────────────────┼───────────────────────┤
│ 2. Session Memory │ Full conversation history  │ SQLite Relational     │
│    (Episodic)     │ & auto-generated summaries │ `conversations` table │
├───────────────────┼────────────────────────────┼───────────────────────┤
│ 3. Semantic Memory│ User preferences, facts,   │ SQLite + Vector/FTS5  │
│    (Long-term)    │ & cross-session learnings  │ `memories` table      │
└───────────────────┴────────────────────────────┴───────────────────────┘
```

---

## 6. End-to-End Data Flows

### Flow A: Text-Based Chat Stream (Phase 1)
1. User enters text in the React UI and clicks Send.
2. Client sends HTTP POST to `/api/chat/stream` with `{ message, conversationId, mode: "text" }`.
3. Express records user message in conversation history and calls LM Studio (`/v1/chat/completions`, `stream: true`).
4. LM Studio streams chunks to Express; Express flushes SSE events to the React client.
5. React client renders tokens in real time.

### Flow B: Voice Interaction Turn (Phase 1)
1. **Audio Capture:** User holds the Push-to-Talk button. The React client records audio via `MediaRecorder`.
2. **Transcription:** On button release, client POSTs the audio blob to `/api/voice/transcribe`. STT adapter transcribes speech to text in transient memory and immediately discards the raw audio.
3. **Shared Chat Stream:** Client receives the transcribed text and dispatches it to `/api/chat/stream` with `{ message: transcribedText, conversationId, mode: "voice" }`.
4. **Concurrent Streaming & Chunking:**
   * Text tokens are streamed to the React UI via SSE for visual display.
   * Sentences are delimited and dispatched to the TTS candidate engine.
5. **Sequential Audio Playback:** Client receives audio chunks and plays them in order.
6. **Interruption:** If the user triggers an interrupt, client audio stops instantly, `/api/chat/abort` halts backend generation and TTS synthesis, and memory is cleared.

### Flow C: Interaction Mode Toggle (Phase 1)
* User toggles between **Voice Mode** and **Text-Only Mode**:
  * In **Voice Mode**, responses are rendered as text and spoken aloud via TTS.
  * In **Text-Only Mode**, TTS synthesis is bypassed, delivering high-speed silent text.

### Flow D: Tool Execution with Human Confirmation (Phase 4)
1. LangGraph node detects the need to execute a privileged tool (e.g., `open_app`).
2. Backend pauses execution and sends an `approval_request` event over the stream.
3. Client displays a modal prompting the user for approval.
4. Upon approval, the backend executes the tool and returns output to the model context.
