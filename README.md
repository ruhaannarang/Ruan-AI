# Ruan AI

> **A private, locally hosted personal AI operating companion.**

Ruan AI is an intelligent assistant designed to run entirely on local hardware. Beyond serving as a conversational chatbot, Ruan is architected to evolve into an autonomous operating companion capable of voice and text interaction, maintaining persistent memory, executing multi-step tasks, calling local system tools, and assisting with daily computer workflows—without sending private data to cloud AI services.

---

## Vision & Objectives

* **Local-First & Private:** Run inference locally via LM Studio, with local speech-to-text (STT) and text-to-speech (TTS), persisting data in a local SQLite database. Raw voice recordings are held only in transient memory during transcription and are never stored on disk.
* **Unified Multimodal Core:** Text and voice share the exact same conversation engine and session history. A voice prompt is transcribed and fed into the canonical chat stream, while responses can be read or spoken aloud simultaneously.
* **Intelligent Operating Companion:** Progress from foundational conversation to active computer assistance (file searching, system interaction, approved operations).
* **Agentic Workflows:** Leverage LangGraph.js for deterministic and semi-autonomous multi-step reasoning, planning, and tool execution.
* **Controlled & Safe:** Every privileged or potentially destructive file or OS action requires explicit user permission.
* **Hardware Conscious:** Optimized for consumer hardware (Intel Core i5 13th Gen, 16 GB RAM, RTX 3050 Laptop GPU with 6 GB VRAM). All memory allocations and throughput estimates are subject to empirical benchmarking on the target machine.

---

## Key Features (Roadmap Overview)

* **Natural Language Chat & Streaming:** Real-time token streaming from local LLMs to a responsive React UI.
* **Integrated Voice Interaction (Phase 1):** Push-to-talk microphone input, candidate local STT transcription, candidate local TTS audio synthesis, instant playback interruption, and seamless switching between text-only and voice modes.
* **Persistent Memory (Phase 2):** Multi-tiered memory architecture (active session context, conversation history, and long-term vector/keyword retrieval) stored in SQLite.
* **Agentic Orchestration (Phase 3):** State-graph task execution, tool calling, and structured reasoning with LangGraph.js.
* **Local System & File Operations (Phase 4):** Safe local file querying, file inspection, and program launching under explicit user consent policies.
* **Desktop Companion Experience (Phase 5):** Electron shell providing system tray access, global hotkeys, background persistence, and native notifications.
* **Advanced Voice & Autonomy (Phase 6):** Wake-word detection ("Hey Ruan"), hands-free continuous dialogue, and autonomous workflows.

---

## Technology Stack

| Layer | Technology | Primary Role |
|---|---|---|
| **Frontend** | React (Vite) | Interactive user interface, audio capture/playback, and chat surface |
| **Styling** | Vanilla CSS | Custom design system, responsive layouts, CSS variables |
| **Backend** | Node.js (Express) | API server, stream proxy, audio processing gateway, and tool runner |
| **AI Runtime** | LM Studio | Local LLM inference server exposing OpenAI-compatible endpoints with configurable context |
| **Speech-to-Text (STT)** | `faster-whisper` / `whisper.cpp` | **Candidate engines under evaluation** (CPU-optimized local transcription) |
| **Text-to-Speech (TTS)** | `Piper` / `Kokoro` | **Candidate engines under evaluation** (Low-latency streaming neural synthesis) |
| **Database** | SQLite | Local relational storage for chats, settings, and memory (Phase 2) |
| **Agent Framework** | LangGraph.js | Stateful multi-step agent orchestration and tool execution (Phase 3) |
| **Desktop Shell** | Electron | Native Windows window management, system tray, global hotkeys (Phase 5) |
| **Language** | JavaScript (ES Modules) | Consistent language across client, server, and desktop |

---

## High-Level Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   Desktop Shell (Electron — Phase 5)                   │
│  ┌───────────────────────┐   ┌───────────────────────────────────────┐ │
│  │   Frontend (React)    │   │         Audio I/O Subsystem           │ │
│  │   Vanilla CSS UI      │   │ (Push-to-Talk Mic / Audio Player)     │ │
│  └───────────┬───────────┘   └───────────────────┬───────────────────┘ │
└──────────────┼───────────────────────────────────┼─────────────────────┘
               │ HTTP / SSE (Localhost)            │ Audio Blobs / Chunks
┌──────────────▼───────────────────────────────────▼─────────────────────┐
│                   Backend Service (Node.js / Express)                  │
│  ┌─────────────────────────┐   ┌─────────────────────────────────────┐ │
│  │  Controllers & API      │   │  Unified Conversation Orchestrator  │ │
│  │ (/api/health, chat/abort│   │  (Shared Text & Voice Pipeline)     │ │
│  └───────────┬─────────────┘   └──────────────────┬──────────────────┘ │
│              │                                    │                    │
│  ┌───────────▼─────────────┐   ┌──────────────────▼──────────────────┐ │
│  │   LangGraph.js Engine   │   │  Voice Processing Gateway           │ │
│  │   (State Graph & Tools) │   │  (Candidate STT / Candidate TTS)    │ │
│  └───────────┬─────────────┘   └─────────────────────────────────────┘ │
│              │                                                         │
│  ┌───────────▼─────────────┐                                           │
│  │   SQLite Database       │                                           │
│  │   (Memory & Chats P2)   │                                           │
│  └─────────────────────────┘                                           │
└───────────────────────┬────────────────────────────────────────────────┘
                        │ OpenAI-compatible API
┌───────────────────────▼────────────────────────────────────────────────┐
│                   Local AI Runtime (LM Studio)                         │
│       Local Quantized Models (Configurable Context & Offload)          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Standardized API Endpoints

| Endpoint | Method | Responsibility |
|---|---|---|
| `/api/health` | `GET` | Decoupled health check: server status + independent readiness of LM Studio, STT, and TTS |
| `/api/chat/stream` | `POST` | Primary conversation endpoint; streams response tokens via SSE (and coordinates voice synthesis) |
| `/api/chat/abort` | `POST` | Immediately aborts active LLM generation and cancels in-flight TTS synthesis |
| `/api/voice/transcribe` | `POST` | STT endpoint: receives audio blob, returns transcribed text string, discards raw audio |
| `/api/voice/synthesize` | `POST` | TTS endpoint: receives text string, returns synthesized audio buffer |

---

## Development Phases

* **Phase 1: Core Foundation + Basic Voice Assistant** — Monorepo setup, Express backend, LM Studio connection, React frontend, streaming chat, microphone input with push-to-talk, candidate local STT transcription, candidate local TTS speech synthesis, audio playback controls (instant interrupt), text/voice mode switching, and decoupled health reporting.
* **Phase 2: Persistent Memory** — SQLite schema, conversation persistence, short-term session buffer, and long-term memory retrieval.
* **Phase 3: Agentic Intelligence and LangGraph** — LangGraph.js integration, structured tool calling, reasoning loops, and multi-step execution.
* **Phase 4: Computer Interaction** — Safe local file search, document reading, application launcher, and permission confirmation middleware.
* **Phase 5: Desktop Application & Background Voice Access** — Electron packaging, system tray minimizing, global shortcut activation, background voice access, and desktop notifications.
* **Phase 6: Advanced Voice and Autonomous Capabilities** — Wake-word detection ("Hey Ruan"), continuous voice conversation, custom assistant personas, and autonomous workflows.

---

## Current Project Status

* **Status:** Phase 1 Foundation & Phase 1.5 Conversation Interface Implemented (`v0.1.0-alpha.3`).
* **Active Functionality:**
  * **Frontend (`client/`):** React + Vite SPA with zero-framework Vanilla CSS styling, public landing page (`/`), dedicated desktop-style conversation interface (`/app`), explicit route resolution with 404 fallback, multi-turn chat history, safe markdown rendering, syntax-highlighted code blocks with copy buttons, in-memory conversation search, and robust `localStorage` persistence.
  * **Backend (`server/`):** Node.js + Express backend with decoupled `/api/health` diagnostics, LM Studio streaming gateway (`POST /api/chat/stream`), model reasoning token suppression, and generation cancellation (`POST /api/chat/abort`).
  * **Local AI Runtime:** LM Studio connected via OpenAI-compatible endpoints with locally loaded **Ling 3.0 Tiny** model.
* **Next Development Milestone:** Basic Voice Assistant integration (Push-to-Talk audio recording via Web Audio API / `MediaRecorder`, local STT evaluation of `faster-whisper` vs `whisper.cpp`, and local streaming TTS evaluation of `Piper` vs `Kokoro`). SQLite persistence, LangGraph agent workflows, and computer interaction remain scheduled for subsequent phases.

---

## Documentation Quick Links

* [Architecture Guide](docs/ARCHITECTURE.md) — Detailed component responsibilities, voice pipeline, and data flows.
* [Roadmap](docs/ROADMAP.md) — Phased breakdown and delivery criteria including Basic Voice in Phase 1.
* [Technology Stack](docs/TECH_STACK.md) — Rationale for chosen technologies, STT/TTS engine evaluations, and VRAM management.
* [Project Structure](docs/PROJECT_STRUCTURE.md) — Directory organization and module placement guide.
* [Development Guide](docs/DEVELOPMENT.md) — Setup prerequisites and local workflows.
* [Security & Safety](docs/SECURITY.md) — Local privacy, audio permissions, and execution guardrails.
* [AI Coding Guidelines](AGENTS.md) — Conventions and constraints for AI coding assistants.
* [Contributing Guide](CONTRIBUTING.md) — Contribution process and code quality rules.
* [Architectural Decisions](docs/decisions/README.md) — ADR index and template.
* [Changelog](CHANGELOG.md) — Version history and project milestones.
