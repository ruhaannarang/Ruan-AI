# Changelog

All notable changes to the **Ruan AI** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned (Phase 1: LM Studio & Basic Voice Integration)
* Implement LM Studio client service supporting OpenAI-compatible streaming endpoints with configurable context lengths.
* Implement Server-Sent Events (SSE) streaming endpoint `/api/chat/stream`.
* Implement generation cancellation endpoint `/api/chat/abort`.
* Implement unified conversation orchestrator managing shared conversation history for both text and voice.
* Implement Push-to-Talk audio recording via Web Audio API / `MediaRecorder` with zero audio persistence.
* Implement transient Speech-to-Text (STT) adapter evaluating `faster-whisper` and `whisper.cpp` candidates.
* Implement streaming sentence-chunked Text-to-Speech (TTS) adapter evaluating `Piper` and `Kokoro` candidates.
* Implement frontend audio playback with immediate stop/interruption controls and buffer flushing.
* Implement UI toggle between Text-Only Mode and Voice Mode on the shared conversation thread.

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
