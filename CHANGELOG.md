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
