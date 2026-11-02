# Changelog

All notable changes to the **Ruan AI** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned (Phase 2: Persistent Memory & SQLite Storage)
* Integrate SQLite schema (`conversations`, `messages`, `memories`, `settings`) into the Express backend.
* Implement session persistence and conversation management APIs.
* Implement conversation sidebar synchronization with SQLite storage.
* Implement working context window truncation and summarization.

---

## [0.1.0-alpha.6] - 2026-11-03

### Added (Phase 1.6.1: Voice Quality Stabilization & Hinglish Benchmarking)
* **Comparative STT Benchmarking Suite:**
  * Implemented `HinglishBenchmarkRunner` in `voice-service/benchmark_engine.py` comparing `faster-whisper-small` vs `faster-whisper-base` on CPU INT8 using 4 threads.
  * Standardized 15 test items across 4 critical categories: English, Hindi, Romanized Hinglish, and Technical Hinglish.
  * Measures Word Error Rate (WER) via normalized Levenshtein distance, latency, Real-Time Factor (RTF), detected language probability, and technical vocabulary retention.
  * Created CLI runner `voice-service/benchmark_hinglish.py` with `--summary`, `--run-synthetic`, and `--clear` commands.
  * Added REST API endpoints on both Python microservice and Express gateway (`/api/voice/benchmark/prompts`, `/compare`, `/save`, `/history`).
* **Interactive Browser-Based Benchmark UI:**
  * Added `HinglishBenchmarkModal.jsx` in the React frontend (`client/src/components/chat/`).
  * Allows users to record genuine human microphone audio through their browser across categories or custom reference sentences.
  * Displays side-by-side comparison cards for `small` vs `base` showing outputs, WER percentages, latency, RTF, and technical term retention.
  * Provides in-browser audio playback of the recorded microphone sample and local dataset persistence.
* **Transcription Review & Edit Workflow:**
  * Fixed auto-submission behavior: Push-to-Talk now places transcribed text directly into the message composer input by default so users can review and edit before sending.
  * Added transcription draft banner displaying detected language code and confidence percentage with "Send Message" and "Clear" actions.
  * Added mode toggle button in composer footer: "Review Before Send" vs "Auto-Send ON" for flexible user preference.
* **Acoustic & Language Handling Stabilization:**
  * Identified root causes of previous phonetic corruption: synthetic TTS audio loopback from Kokoro caused espeak-ng phonetic boundary clicks ("In Majha...", "In Mudgee...").
  * Upgraded Whisper conditioning with a natural bilingual initial prompt (`"Namaste! Ye ek Hinglish conversation hai with technical terms..."`), grounding token decodings in Roman Hinglish vocabulary.
  * Enabled `hotwords` parameter in faster-whisper to boost software terminology (`React`, `API`, `database`, `Java`, `Python`, `Express`, `NullPointerException`, `component`, `endpoint`, `linked list`).
  * Configured VAD parameters with `speech_pad_ms: 200` to prevent clipping initial or trailing syllables.
* **Kokoro TTS Hinglish Phonetic Routing:**
  * Resolved espeak-ng pronunciation distortion on Roman letters: Devanagari text routes to `lang="hi"` and native Hindi voices (`hf_alpha`), while Roman script routes through Latin phonemizer (`lang="en-us"`) ensuring smooth continuous speech without robotic letter-spelling artifacts.
* **Privacy & Local Storage:**
  * All benchmark audio recordings and dataset JSON files are saved strictly in `voice-service/benchmark_data/` and excluded in `.gitignore` to prevent any personal audio from being tracked or uploaded.

---

## [0.1.0-alpha.5] - 2026-11-03

### Added (Phase 1.6: Local Voice Assistant with Hinglish Support)
* **Local Python Voice Service (`voice-service/`):**
  * Created lightweight FastAPI service hosted on `127.0.0.1:8008` (loopback only) decoupling voice compute from Node.js Express.
  * Packaged `faster-whisper` (v1.2.1) with CTranslate2 and pinned PyAV (`av<18.0.0`) for CPU-optimized multilingual speech recognition.
  * Packaged `kokoro-onnx` (v0.6.1) with 54 voices and `espeakng-loader` for local neural speech synthesis on Windows.
  * Implemented non-blocking background model loading in FastAPI lifespan to keep health checks responsive in <200ms.
* **Multilingual Speech-to-Text (STT):**
  * Configurable model (`small` or `base`), INT8 compute type, and 4 CPU threads.
  * Voice Activity Detection (VAD) filter enabled to eliminate leading/trailing silence.
  * Multilingual auto-detection supporting Hindi, English, and mixed Roman/Devanagari Hinglish code-switching.
  * Preserved technical terms (React, Java, API, database, linked list, NullPointerException, debugging).
* **Language-Aware Text-to-Speech (TTS):**
  * Language-aware text preparation: identifies Hindi and English tokens, preserves English technical terms, and selects optimal language pipelines (`hi` vs `en-us`).
  * Default Hindi voice `hf_alpha` with graceful fallback to `af_heart`.
  * Clean markdown stripping and sentence chunking along punctuation boundaries (`.`, `!`, `?`, `\n`) to prevent mid-phrase audio cutoffs.
* **Express Voice API Gateway (`server/`):**
  * `POST /api/voice/transcribe`: accepts multipart audio uploads (`audio/wav`, `audio/webm`, `audio/ogg`), validates sizes (up to 25MB), transcribes via faster-whisper, and returns text and detected language metadata.
  * `POST /api/voice/synthesize`: accepts text payloads, synthesizes audio locally via Kokoro, and streams WAV buffers.
  * `GET /api/voice/health`: reports independent STT and TTS readiness.
  * `GET /api/voice/voices`: returns 54 available voice profiles.
  * Upgraded decoupled `GET /api/health` to dynamically report live health for LM Studio, faster-whisper STT, and Kokoro TTS without blocking server uptime.
* **React Voice Interface (`client/`):**
  * Push-to-Talk microphone button with animated recording waveform and glowing ring.
  * Real-time status banners for `listening`, `transcribing`, `speaking`, and dismissible error alerts (e.g. microphone permission denied).
  * Auto-speak **Voice Mode** toggle pill in header, persisting state across sessions.
  * Inline **Speak / Stop** buttons on assistant message bubbles with playing animation.
  * Immediate audio interruption: stops `Audio` playback, clears buffers, and aborts in-flight synthesis when user presses Stop, begins recording, or switches conversations.
  * Dynamic diagnostic modal surfacing live STT and TTS candidate engine metrics.
* **Privacy & Transient Audio Policy:**
  * Raw microphone audio is held strictly in temporary memory during transcription and immediately deleted after processing. No audio files are persisted to disk.

### Verified & Benchmarked
* Verified all 5 canonical Hinglish test sentences through Kokoro TTS and faster-whisper STT.
* Measured synthesis RTF: all sentences generated in 0.53x–0.82x Real-Time Factor on Intel i5 CPU.
* Verified English-only and pure Devanagari Hindi edge cases with >95% language detection confidence.
* Verified 100% CPU/VRAM decoupling: STT/TTS runs on CPU, preserving 100% of NVIDIA RTX 3050 Laptop GPU VRAM for Gemma 4 in LM Studio.
* Verified existing chat streaming, abort mechanics, Google OAuth, and localStorage persistence remain intact.

---

---

## [0.1.0-alpha.4] - 2026-11-01

### Added
* Implemented Google Authentication and User Profile Management using official Google Identity Services (GIS) and backend cryptographic token verification (`google-auth-library`).
* Created persistent SQLite user identity and session storage in `server/data/ruan_auth.db` using `better-sqlite3` with WAL mode and foreign key constraints.
* Designed and integrated account identity UI (`UserMenu.jsx` and `UserMenu.css`):
  * Unauthenticated state: subtle "Sign in with Google" pill with official Google G logo.
  * Informational modal when `GOOGLE_CLIENT_ID` is unconfigured, guiding developers through Google Cloud setup.
  * Authenticated state: user avatar image with graceful fallback initials on missing/failed picture load.
  * Account popover: displays profile picture, full name, email, Google `sub` ID, verification badge, and sign-out button.
* Created `AuthContext.jsx` and `authApi.js` managing session restoration via `GET /api/auth/me`, Google Identity Services script lifecycle, and zero-layout-shift loading.
* Implemented secure HttpOnly, SameSite=Lax, Secure session cookie (`ruan_session`) with 7-day expiration and automatic server-side cleanup.
* Preserved local-first architecture: authentication is completely decoupled from chat persistence (`localStorage`) and local LLM execution.

### Changed
* Switched the default local LLM runtime from Ling 3.0 Tiny to **Gemma 4 E2B IT QAT** (`gemma-4-e2b-it-qat`) through LM Studio integration.
* Updated backend configuration (`server/src/config/index.js`, `.env.example`, and `.env`) to set `LM_STUDIO_MODEL=gemma-4-e2b-it-qat` as the default configurable model.
* Updated the frontend UI (`ModelStatus`, `Sidebar`, `MessageComposer`, `MessageBubble`, and `DiagnosticsModal`) with dynamic model display formatting (`Gemma 4 E2B IT QAT`).
* Updated `useChat.js` hook to record and persist the model identifier on assistant messages in local storage.
* Synchronized project version to `0.1.0-alpha.4` across client and server package manifests, backend configuration, and documentation.

### Verified
* Verified live LM Studio `/v1/models` endpoint detecting `gemma-4-e2b-it-qat` as loaded and active.
* Verified decoupled `/api/health` diagnostic endpoint reporting LM Studio connected, active model `gemma-4-e2b-it-qat`, and model availability `true`.
* Verified real-time SSE token streaming via `POST /api/chat/stream` with Gemma 4 E2B IT QAT.
* Verified reasoning-token suppression: confirmed Gemma 4 `delta.reasoning_content` tokens are filtered into transient `Thinking...` status events and never exposed or persisted in message content.
* Verified multi-turn conversation context retention across turns.
* Verified client and server abort mechanics (`POST /api/chat/abort` and `res.on('close')`) with Gemma 4 generation.
* Verified decoupled health reporting when LM Studio is disconnected or when an unconfigured model is requested.

---

## [0.1.0-alpha.3] - 2026-10-31

### Added
* Implemented dedicated local LM Studio integration service `lmStudioService.js` connecting to OpenAI-compatible endpoint `http://localhost:1234/v1`.
* Configured and verified local **Ling 3.0 Tiny** (`ling-3.0-tiny`) model loaded in LM Studio.
* Created Server-Sent Events (SSE) streaming endpoint `POST /api/chat/stream` supporting real-time incremental token delivery across network chunk boundaries.
* Built server-side generation cancellation registry and `POST /api/chat/abort` endpoint using `AbortController` maps and client disconnect detection (`res.on('close')`), properly guarded with `res.writableEnded` and completion flags to prevent false aborts on normal stream termination.
* Implemented payload validation strictly enforcing message roles (`system`, `user`, `assistant`), non-empty content strings, and safety length boundaries.
* Suppressed internal model reasoning tokens (`delta.reasoning_content`) from user-facing streams; emitted clean `Thinking...` status event (`event: status`) while strictly streaming only final content tokens (`event: token`).
* Synchronized version identifiers across `server/src/config/index.js`, `GET /api/health`, and all client/server package manifests to `0.1.0-alpha.3`.
* Upgraded `GET /api/health` with dynamic LM Studio model detection, reporting connected status, active model, model availability, and available models list without blocking Express health checks.
* Extended frontend API client `client/src/services/api.js` with `streamChat()` (readable response stream + SSE decoder) and `abortChat()` functions.
* Built the dedicated Ruan AI conversation application (`/app`) separate from the public landing page, with lightweight pathname routing and back/forward browser navigation support.
* Designed and implemented premium dark UI inspired by desktop tools (Raycast/Linear) using 100% Vanilla CSS:
  * Collapsible, responsive `Sidebar` with wordmark, search conversations filtering, recent chats feed with active glowing indicator, delete with confirmation, and system diagnostics entry.
  * Welcome screen with animated Ruan AI orb centerpiece and 4 interactive prompt suggestion cards.
  * `MessageList` and `MessageBubble` supporting user cards, assistant avatar, Thinking indicators, streaming cursor, timestamps, and full response copy button.
  * Safe React-based `MarkdownRenderer` and `CodeBlock` with line numbers, syntax highlighting (keywords, strings, numbers, comments), language badge, and one-click code copy.
  * `MessageComposer` with auto-expanding textarea, Enter to send, Shift+Enter for newline, generation stop button with red pulse, and keyboard shortcuts.
  * `ModelStatus` compact pill and popover displaying real-time Express backend and LM Studio connection status with automatic 20-second polling.
  * `useChat` hook managing multi-turn conversation state, system instruction enforcement, stream isolation between chats, and generation abort cleanup.
* Hardened conversation lifecycle in `useChat.js`: enforced single-active-generation policy, guarded callbacks against stale or late SSE events, safely cleaned up `AbortController` instances, and gated `localStorage` writes to prevent main thread stutters.
* Hardened `localStorage` persistence: added schema validation for restored conversations, stripped transient streaming states, guarded against corrupted JSON, and added fallback handling for quota/storage restrictions.
* Secured Markdown link rendering in `MarkdownRenderer.jsx`: strictly validated link protocols to allow only HTTP, HTTPS, and mailto; rejected unsafe protocols (including `javascript:`) by rendering safe plain text.
* Enhanced SSE parser reliability in `api.js`: normalized CRLF/LF newlines, supported multi-line `data:` frames, handled chunk-split event boundaries, added EOF buffer flush, guaranteed single-fire completion callbacks, and ensured reader locks are released in `try...finally`.
* Refactored client routing in `App.jsx` from broad prefix matching to explicit canonical route resolution (`/` and `/app`), adding a styled 404 fallback screen for unrecognized paths while preserving browser navigation.
* Updated live diagnostics modal to reflect verified online status and model readiness.

---

## [0.1.0-alpha.2] - 2026-10-31

### Added
* Designed and built the premium public-facing website for Ruan AI using React + Vite + Vanilla CSS (zero Tailwind CSS or heavy component libraries).
* Created cinematic animated initialization screen (`LoadingScreen`) featuring a central expanding orb, rotating 3D orbital rings, dynamic phase messaging, and smooth exit transitions.
* Implemented synthesized Web Audio API sound identity engine (`sound.js`) with subtle harmonic chimes, click ticks, and transition effects (muted by default with global toggle).
* Engineered interactive 3D AI Orb hero centerpiece with rotating orbital layers, specular core highlights, interactive mouse parallax tilt, and telemetry enclave badge.
* Developed 10 comprehensive website sections:
  1. Sticky navigation with blur backdrop, audio toggle, and live gateway telemetry badge.
  2. Hero section with tagline *"Your AI. Your Machine. Your Rules."*, orb centerpiece, and CTAs.
  3. About section with vision manifesto and interactive *Cloud AI vs Ruan Local Companion* matrix.
  4. Core Capabilities showcase with 6 distinct visual layouts (Terminal stream, Push-to-Talk waveform, SQLite memory graph, LangGraph approval gate, Sandbox inspector, and Enclave shield).
  5. Interactive Modular Architecture visualizer with toggles between *System Topology* and *Streaming Voice Pipeline* with abort circuit banner.
  6. Privacy & Security section outlining 6 architectural pillars and honest security commitment.
  7. Interactive Documentation section with built-in modal reader and code copy tool for 9 topics.
  8. Development Roadmap featuring Phase 1 to Phase 6 evolution timeline with verified status badges.
  9. Final sovereign computing callout with direct link to GitHub repository.
  10. Minimalist dark-first footer with copyright and navigation.
* Integrated live Node diagnostics modal connecting to `GET /api/health` displaying Express gateway status, roundtrip latency, uptime, and decoupled service readiness.

---

## [0.1.0-alpha.1] - 2026-10-31

### Added
* Initialized `server/` with Node.js + Express (ES Modules) running on `http://127.0.0.1:5000`.
* Created decoupled health check endpoint `GET /api/health` returning server uptime and independent statuses for LM Studio, STT, and TTS.
* Configured centralized error handling middleware adhering to standard error JSON schema.
* Initialized `client/` with React + Vite running on `http://127.0.0.1:5173`.
* Implemented Vite proxy routing `/api` requests to backend on port 5000.
* Built health monitoring UI in `client/src/App.jsx` with dynamic connection status indicators, latency tracking, decoupled service cards, and payload inspector.
* Crafted custom Vanilla CSS design system (`variables.css`, `index.css`, `App.css`) with dark-mode aesthetic and glassmorphism.
* Added `.env` and `.env.example` configurations and `.gitignore` files for root, client, and server.

---

## [0.1.0-alpha.0] - 2026-10-31

### Added
* Initial project repository structure (`client/`, `server/`, `desktop/`, `docs/`, `docs/decisions/`, `.github/`).
* Root documentation:
  * `README.md` — Project vision, key features, technology stack, architecture overview, standardized APIs, and roadmap.
  * `AGENTS.md` — Operating rules, coding conventions, architecture boundaries, security constraints, streaming TTS cancellation, decoupled health checks, and candidate engine guidelines.
  * `CHANGELOG.md` — Chronological record of repository changes.
  * `CONTRIBUTING.md` — Developer contribution guidelines, branch strategy, and PR workflow.
* Architecture & Technical Documentation in `docs/`:
  * `ARCHITECTURE.md` — Component responsibilities, unified conversation flow, streaming TTS sentence chunking, playback interruption, decoupled health architecture, and candidate evaluations.
  * `ROADMAP.md` — Six-phase development roadmap incorporating Basic Voice Assistant into Phase 1 with shared conversation flow and abort endpoints.
  * `TECH_STACK.md` — Detailed breakdown of chosen technologies, candidate engine evaluations (`faster-whisper`/`whisper.cpp` and `Piper`/`Kokoro`), and estimated hardware VRAM/RAM budget to benchmark.
  * `DEVELOPMENT.md` — Local prerequisites, LM Studio configuration, standardized API signatures, and development execution workflows.
  * `SECURITY.md` — Local-first privacy guarantees, zero audio persistence policy in Phase 1, Push-to-Talk rules, tool permission tiers, and execution safeguards.
  * `PROJECT_STRUCTURE.md` — Monorepo directory map, module boundaries, and guidance for future feature additions including decoupled health controller and shared conversation orchestrator.
  * `docs/decisions/README.md` — Architecture Decision Record (ADR) system and standard ADR template.
* Package README files in `client/README.md`, `server/README.md`, and `desktop/README.md` outlining specific package roles and boundaries.
