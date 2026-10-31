# AGENTS.md — AI Coding Assistant Guidelines for Ruan AI

This document establishes operational rules, architectural boundaries, coding conventions, and workflow standards for all AI coding assistants (including Antigravity, Claude, Copilot, Cursor, etc.) working on the **Ruan AI** repository.

Every AI agent working in this repository **must read, respect, and strictly enforce** these guidelines.

---

## 1. Prime Directives

1. **Do Not Overwrite or Break Existing Functionality:** Always read existing files before editing. Do not wipe out working code, replace existing patterns with arbitrary personal preferences, or introduce breaking structural changes without explicit user instruction.
2. **Never Invent Completed Work:** Do not document or report features as implemented if they are only partially created, stubbed, or planned. Keep the status true to code.
3. **No Unnecessary Refactoring:** Keep code changes surgical and tightly scoped to the immediate user request. Do not reorganize entire folders, rename files, or rewrite working modules unless explicitly instructed to do so.
4. **Preserve Documentation & Comments:** Retain all architectural comments, security docstrings, and existing markdown documentation. Update documentation when behavior changes.
5. **Local-First & Privacy Non-Negotiable:** Under no circumstance should user data, local file contents, voice audio, or conversation transcripts be sent to external cloud APIs unless an external provider is explicitly configured and approved by the user.

---

## 2. Architecture & Monorepo Boundaries

Ruan AI is structured as a modular monorepo:

```text
RuanAI/
├── client/     # React + Vite frontend (UI, audio I/O, presentation ONLY)
├── server/     # Node.js + Express backend (APIs, LM Studio proxy, STT/TTS services, memory, tools)
├── desktop/    # Electron wrapper (native OS integration ONLY — Phase 5)
└── docs/       # Architecture, ADRs, roadmap, guides
```

### Boundary Rules
* **Frontend (`client/`)** must **never** communicate directly with LM Studio, SQLite, STT/TTS engine binaries, or system shell commands. It must exclusively communicate with the Express server (`server/`) via HTTP, Server-Sent Events (SSE), or WebSockets.
* **Audio Capture & Playback:** The client handles microphone capture (Web Audio API / `MediaRecorder`) via Push-to-Talk and audio playback. Audio buffers are sent to the backend for transcription. Raw audio is never stored permanently in Phase 1.
* **Shared Conversation Pipeline:** Voice and text interactions **must share the exact same conversation history and orchestration pipeline**. Voice input is simply transcribed to text and fed into the canonical chat stream; AI response tokens are simultaneously streamed to the UI and (in Voice Mode) chunked for TTS synthesis.
* **Backend (`server/`)** contains all business logic, LLM streaming wrappers, voice processing coordinators (STT / TTS service adapters), agent graphs (LangGraph.js), SQLite database queries, and system tool executions.
* **Desktop Shell (`desktop/`)** is responsible only for window management, tray icons, global hotkeys, and spawning/monitoring backend and frontend processes. Business logic must live in `server/`, not `desktop/`.
* **Cross-Layer Imports:** Do not write relative imports that cross root package boundaries (e.g. `client/` importing directly from `server/src/`). Each package maintains its own dependencies and execution context.

---

## 3. Technology Stack Rules & Constraints

| Component | Standard | Strict Constraints |
|---|---|---|
| **Language** | JavaScript (ES Modules: `import` / `export`) | Standardize on ES Modules across `client/`, `server/`, and `desktop/`. Use `"type": "module"` in `package.json`. |
| **Frontend Framework** | React (Vite) | Use functional components and modern React hooks (`useState`, `useEffect`, `useRef`, custom hooks). Avoid class components. |
| **Styling** | Vanilla CSS | **DO NOT install or use Tailwind CSS, styled-components, or heavy UI component libraries** unless explicitly instructed by the user. Use CSS custom properties (variables), flexbox, grid, and scoped modular CSS. |
| **Backend Framework** | Node.js + Express.js | Use asynchronous controllers with `async/await`. Always handle errors with Express error-handling middleware. |
| **Local LLM Runtime** | LM Studio (`http://localhost:1234/v1`) | Use standard OpenAI-compatible API schemas for completions/streaming. Keep endpoint URLs and model parameters configurable via environment variables (`.env`). Do not assume fixed context window sizes. |
| **Speech-to-Text (STT)**| `faster-whisper` / `whisper.cpp` | **Candidate engines under evaluation.** Must remain decoupled from LLM prompt logic and benchmarked on the target hardware before finalization. |
| **Text-to-Speech (TTS)**| `Piper` / `Kokoro` | **Candidate engines under evaluation.** Must support streaming sentence chunking and immediate playback cancellation. To be benchmarked on target hardware. |
| **Database** | SQLite (`better-sqlite3` or official sqlite driver) | Use parameterized queries exclusively. Never concatenate raw SQL strings (Phase 2). |
| **Agent Orchestration** | LangGraph.js | Used in Phase 3+. Graphs must be deterministic, stateful, and equipped with interruption checkpoints for user approval. |
| **Desktop Wrapper** | Electron | Isolate main and renderer processes. Always enable `contextIsolation: true` and `nodeIntegration: false` in BrowserWindow webPreferences (Phase 5). |

---

## 4. Voice Architecture, Streaming TTS & Interruption Rules

Voice interaction is a **Phase 1 core capability**. To ensure clean code, avoid hardware contention, and maintain responsive audio:

1. **Decouple Voice from LLM:** Speech recognition (STT) and text-to-speech (TTS) must live in isolated service modules, completely independent of the LM Studio client.
2. **Unified Turn Pipeline:**
   * **Audio In:** Push-to-Talk audio blob recorded in React client.
   * **STT Transcription:** Backend STT adapter transcribes speech to text string via `/api/voice/transcribe`.
   * **Shared Chat Stream:** Transcribed text enters the canonical `/api/chat/stream` pipeline, appending to existing conversation history.
   * **Streaming TTS Chunking:** As tokens stream from LM Studio, the backend buffers text until sentence boundaries (`.`, `!`, `?`, `\n`) are reached, then dispatches the sentence to the TTS candidate engine.
   * **Audio Playback & Queue:** The client receives synthesized audio chunks and enqueues them for sequential playback.
3. **Cancellation & Playback Interruption:**
   * When the user presses Push-to-Talk, clicks the Stop/Interrupt button, or sends a new prompt while audio is playing:
     1. **Client Action:** Immediately stop the HTML5 `AudioContext` / audio source, clear the local audio buffer queue, and issue an abort signal to the backend (via `/api/chat/abort` or closing the active request).
     2. **Backend Action:** An `AbortController` terminates the in-flight LM Studio generation request, halts any pending TTS synthesis tasks, and discards queued audio buffers.
4. **Hardware & VRAM Safeguards (Estimates to Benchmark):**
   * Hardware: Intel Core i5 (13th Gen), 16 GB RAM, NVIDIA RTX 3050 Laptop GPU (6 GB VRAM).
   * All RAM/VRAM allocations and latency figures in documentation are **estimates** that must be benchmarked on the target machine.
   * Guardrail: The LLM will consume the majority of GPU VRAM. STT and TTS candidates should be evaluated on CPU threads first to eliminate Out-of-Memory (OOM) risks.
5. **No Ambient Listening / Stored Audio:**
   * In Phase 1, audio capture is strictly Push-to-Talk. No ambient background listening or wake words.
   * Raw audio blobs are processed in transient memory and discarded immediately after transcription.

---

## 5. API Design & Health Check Standards

### Standardized Endpoints
All documentation and code must adhere to these standard endpoint signatures:

| Endpoint | Method | Responsibility |
|---|---|---|
| `/api/health` | `GET` | Reports Express server status plus independent readiness of LM Studio, STT, and TTS dependencies. |
| `/api/chat/stream` | `POST` | Primary conversation endpoint. Accepts message text, conversation ID, and mode (`text` or `voice`). Streams tokens via SSE. |
| `/api/chat/abort` | `POST` | Aborts active generation, cancels LM Studio stream, and cancels in-progress TTS synthesis. |
| `/api/voice/transcribe`| `POST` | STT endpoint: accepts multipart audio blob, returns transcribed text string. |
| `/api/voice/synthesize`| `POST` | Standalone TTS endpoint: accepts text string, returns synthesized audio buffer. |

### Decoupled Health Checks
The `/api/health` endpoint must **never return a 500 error solely because an AI dependency is offline**. The Express server health is distinct from external services:
```json
{
  "status": "ok",
  "uptime": 142.5,
  "timestamp": "2026-10-31T12:00:00.000Z",
  "services": {
    "lmStudio": {
      "status": "connected",
      "endpoint": "http://localhost:1234/v1",
      "activeModel": "qwen2.5-7b-instruct",
      "error": null
    },
    "stt": {
      "status": "ready",
      "candidate": "faster-whisper",
      "error": null
    },
    "tts": {
      "status": "ready",
      "candidate": "piper",
      "error": null
    }
  }
}
```
If LM Studio is stopped, the server returns `200 OK` with `services.lmStudio.status: "disconnected"` so the frontend can display an informative banner rather than failing completely.

---

## 6. Coding Conventions

### JavaScript Standards
* Use modern, clean JavaScript (ES2022+).
* Use explicit, descriptive variable and function names (e.g., `streamCompletionToResponse`, `transcribeAudioBlob`, not `handleData` or `doStream`).
* Avoid massive "god files". Break logic down into single-responsibility services, controllers, and utility helpers.
* Use early returns to reduce indentation depth.

### Error Handling & Logging
* Never swallow errors with empty `catch` blocks.
* Return consistent HTTP error structures from the backend:
  ```json
  {
    "error": {
      "message": "Human-readable description of error",
      "code": "SPECIFIC_ERROR_CODE",
      "details": null
    }
  }
  ```
* Use structured logging with clear module prefixes (e.g., `[LM-Studio-Client]`, `[STT-Service]`, `[TTS-Service]`).

### Frontend Design & UI Standards
* Premium aesthetic: Dark-mode first, curated color palettes, subtle glassmorphism, readable typography, smooth transitions, and distinct status indicators.
* Audio status indicators: Distinct visual states for `idle`, `listening` (Push-to-Talk active), `transcribing`, `thinking`, `speaking` (TTS playing), and `interrupted`.
* All interactive elements must have semantic HTML tags and unique IDs or accessible aria labels for clear testability.

---

## 7. Security & Execution Safeguards

1. **User Approval Before Execution:** Potentially destructive file actions (delete, overwrite, move) and any system command execution **must require explicit user confirmation** via a confirmation mechanism. Never execute unapproved arbitrary shell strings.
2. **Microphone Permissions & Push-to-Talk:** Audio recording must be strictly user-initiated (Push-to-Talk in Phase 1). No unauthorized ambient listening.
3. **Restricted File System Access:** Confine file tool scopes to designated user directories (e.g., `Documents`, workspace paths). Block access to sensitive system paths (`C:\Windows`, `System32`, app credentials, SSH keys, browser cookies).
4. **Input Sanitization:** Sanitize and validate all inputs received by backend endpoints to prevent path traversal (`../../`) and command injection.
5. **Local Network Binding:** Ensure Express server binds to `127.0.0.1` (localhost) by default to prevent unauthorized access across the local area network.

---

## 8. AI Agent Workflow Checklist

When accepting a task in Ruan AI, follow this exact sequence:
1. **Consult Docs First:** Review `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, and relevant ADRs in `docs/decisions/`.
2. **Inspect Existing Code:** Check files in `client/` or `server/` before creating or editing anything.
3. **Keep Edits Minimal & Surgical:** Edit only what is necessary to fulfill the request.
4. **Keep Documentation In Sync:** If a new route, tool, or config option is added, update the corresponding documentation file in `docs/`.
5. **Report Truthfully:** In your summary to the user, state exactly what was built, what was tested, and what remains pending.
