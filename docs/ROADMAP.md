# Development Roadmap — Ruan AI

This document outlines the six planned phases for developing **Ruan AI**. Each phase builds incrementally on previous stable milestones.

> **Current Project Status (as of 2026-10-31):**
> Repository structure and architecture documentation initialized. Application code has **not yet been implemented**. All phases listed below represent future development milestones.

---

## Roadmap Overview

```text
Phase 1: Core Foundation + Basic Voice Assistant (Next Up)
  └── Chat UI, LM Studio Streaming, Push-to-Talk, Candidate STT & TTS, Audio Controls
      ▼
Phase 2: Persistent Memory
  └── SQLite persistence, Session history, Long-term memory retrieval
      ▼
Phase 3: Agentic Intelligence and LangGraph
  └── LangGraph.js, Structured tool calling, Multi-step reasoning loops
      ▼
Phase 4: Computer Interaction
  └── Safe file searching, Document reading, App launcher, Permission gates
      ▼
Phase 5: Desktop Application & Background Voice Access
  └── Electron shell, System tray, Global shortcuts, Background voice trigger
      ▼
Phase 6: Advanced Voice and Autonomous Capabilities
  └── Wake-word ("Hey Ruan"), Hands-free dialogue, Personas, Complex workflows
```

---

## Phase 1: Core Foundation + Basic Voice Assistant

**Objective:** Build a rock-solid, responsive local AI experience supporting unified text-based streaming chat and basic local voice interaction (speech-to-text input, spoken text-to-speech output, push-to-talk, playback interruption, and mode toggling) sharing a single conversation pipeline.

### Core Features to Deliver
1. **Text-Based Conversations:** Natural-language chat threads rendered in a clean React interface.
2. **Streaming Text Responses:** Low-latency token-by-token streaming from LM Studio via Express Server-Sent Events (SSE).
3. **Voice Input via Microphone:** Web Audio API / `MediaRecorder` capture strictly via Push-to-Talk. No ambient listening or stored raw audio.
4. **Push-to-Talk Functionality:** Hold-to-speak button and keyboard shortcut ensuring voice recording is strictly user-initiated.
5. **Local Speech-to-Text (STT):** Local speech recognition via candidate engine (`faster-whisper` or `whisper.cpp`) benchmarked on target hardware.
6. **Local LLM Generation:** Prompt routed to locally loaded model in LM Studio (`http://localhost:1234/v1`) with configurable context and parameters.
7. **Local Text-to-Speech (TTS):** Streaming sentence-chunked neural speech synthesis via candidate engine (`Piper` or `Kokoro`) benchmarked on target hardware.
8. **Spoken AI Responses:** Audio player automatically plays synthesized speech chunks in sequential order when in Voice Mode.
9. **Stop / Interrupt Playback:** Ability to immediately silence voice playback, flush the local queue, and abort backend generation via `/api/chat/abort`.
10. **Mode Switching:** Seamless toggle between **Voice Mode** (spoken audio + text) and **Text-Only Mode** (silent text streaming) within the same conversation thread.

### Checklist
* [ ] Initialize `client/` using Vite + React with modern Vanilla CSS design system (dark mode, glassmorphism tokens, audio indicators).
* [ ] Initialize `server/` using Node.js + Express with ES Modules.
* [ ] Build LM Studio connector service (`/v1/chat/completions` OpenAI-compatible client with dynamic context length support).
* [ ] Implement Server-Sent Events (SSE) streaming endpoint (`/api/chat/stream`).
* [ ] Implement generation cancellation endpoint (`/api/chat/abort`).
* [ ] Implement decoupled health check endpoint (`/api/health`) separating Express server uptime from the readiness of LM Studio, STT, and TTS dependencies.
* [ ] Build frontend Push-to-Talk recording service (`useAudioRecorder`).
* [ ] Implement transient STT transcription endpoint (`/api/voice/transcribe`) evaluating `faster-whisper` vs `whisper.cpp`.
* [ ] Implement streaming sentence-chunked TTS adapter (`ttsService.js`) evaluating `Piper` vs `Kokoro`.
* [ ] Build frontend audio playback manager with instant interrupt/stop controls (`useAudioPlayer`).
* [ ] Build UI toggle between Text-Only Mode and Voice Mode on the shared conversation thread.
* [ ] Provide graceful connection error handling and user-friendly diagnostic banners.

**Delivery Criteria:** A user can type or hold push-to-talk to speak a prompt, have it transcribed locally, generate a streamed text response via LM Studio, hear the response spoken aloud locally via TTS sentence chunks, interrupt playback at will, or toggle into silent text-only mode—all within a shared conversation history.

---

## Phase 2: Persistent Memory

**Objective:** Introduce persistent storage and a multi-tiered memory architecture so conversations, transcripts, and learned user facts survive application restarts.

* [ ] Integrate SQLite into the backend (`better-sqlite3` or official driver).
* [ ] Design database schema (`conversations`, `messages`, `memories`, `settings`).
* [ ] Implement conversation management API (`/api/conversations`).
* [ ] Build conversation sidebar in the React frontend with session switching.
* [ ] Implement working context window manager to truncate or summarize message history when approaching model token limits.
* [ ] Implement basic long-term memory extraction (identifying user facts and storing them for relevant retrieval).

**Delivery Criteria:** Conversations persist across server restarts, and past sessions can be browsed and resumed seamlessly from the sidebar.

---

## Phase 3: Agentic Intelligence and LangGraph

**Objective:** Elevate Ruan from a conversational assistant into an agentic system capable of reasoning, planning, and calling tools.

* [ ] Integrate LangGraph.js into the Express backend.
* [ ] Define the agent state graph (Reasoning Node, Decision Edge, Tool Node).
* [ ] Implement structured function/tool calling protocol compatible with local LLMs (e.g. Qwen 2.5 7B).
* [ ] Build human-in-the-loop interruption mechanism for tool execution.
* [ ] Add frontend UI for visualizing agent thinking steps and active tool execution status.

**Delivery Criteria:** Ruan can evaluate a user request, select an available tool, pause for user consent if needed, execute the tool, and incorporate the tool output into its response.

---

## Phase 4: Computer Interaction

**Objective:** Enable safe, controlled interactions between Ruan and the local computer environment.

> *Note: Full autonomous desktop control remains a future feature. Phase 4 introduces safe, bounded system tools protected by permission gates.*

* [ ] Build safe local file search tool (scoped strictly to approved user directories).
* [ ] Build document reading tool (extracting text from `.txt`, `.md`, `.pdf`, `.json`).
* [ ] Build application launcher tool (opening whitelisted local Windows applications).
* [ ] Implement strict permission confirmation middleware (prompting user in UI modal before running privileged operations).
* [ ] Implement audit logging for all tool executions.

**Delivery Criteria:** The user can ask Ruan to locate a file in their Documents folder or launch an application, and Ruan executes the action only after explicit confirmation.

---

## Phase 5: Desktop Application & Background Voice Access

**Objective:** Package Ruan into a native Windows desktop companion with system tray presence, quick-access hotkeys, and background voice access.

* [ ] Initialize Electron shell in `desktop/`.
* [ ] Configure secure IPC bridge (`contextIsolation: true`, `nodeIntegration: false`).
* [ ] Implement Windows system tray integration (minimize to tray, restore, quit).
* [ ] Register global keyboard shortcuts (e.g., `Ctrl + Shift + Space`) to summon Ruan from anywhere.
* [ ] Implement global push-to-talk hotkey to trigger voice interaction even when window is minimized.
* [ ] Integrate native Windows desktop notifications for background task updates.
* [ ] Set up development scripts to concurrently launch client, server, and Electron.

**Delivery Criteria:** Ruan runs as a native Windows desktop app residing in the system tray, summoned instantly via a global hotkey or voice trigger.

---

## Phase 6: Advanced Voice and Autonomous Capabilities

**Objective:** Expand Ruan's companion capabilities with wake-word detection, continuous dialogue, and complex autonomous workflows.

* [ ] Wake-word engine integration (e.g., openWakeWord running locally for "Hey Ruan").
* [ ] Hands-free continuous voice conversation (Voice Activity Detection / VAD).
* [ ] Customizable assistant personalities, tones, and system prompt configurations.
* [ ] Scheduled autonomous tasks and recurring background check-ins.
* [ ] Extensible plugin and tool marketplace architecture.

---

## Milestone Tracking

| Phase | Title | Target Scope | Status |
|---|---|---|---|
| **Phase 0** | Repository & Architecture Specs | Initial documentation, directory layout, ADR setup | **Completed** |
| **Phase 1** | Core Foundation + Basic Voice Assistant | Unified Chat, LM Studio Stream, Push-to-Talk, Candidate STT & TTS, Audio Interrupt | Planned / Next |
| **Phase 2** | Persistent Memory | SQLite DB, Conversation history, Memory tiers | Planned |
| **Phase 3** | Agentic Intelligence and LangGraph | LangGraph.js, Tool calling, Human-in-the-loop | Planned |
| **Phase 4** | Computer Interaction | Local file search, Doc reader, App launcher, Permission gates | Planned |
| **Phase 5** | Desktop App & Background Voice | Electron shell, System tray, Global hotkey, Background voice | Planned |
| **Phase 6** | Advanced Voice & Autonomy | Wake-word ("Hey Ruan"), Hands-free VAD, Personas, Complex workflows | Planned |
