# Project Structure — Ruan AI

This document details the intended repository layout for **Ruan AI**, explains the architectural responsibility of every directory, and guides where future modules should be placed as the project evolves through its roadmap phases.

---

## 1. Full Monorepo Layout

```text
RuanAI/
├── .github/                      # GitHub workflows, issue templates, CI automation
├── client/                       # React + Vite frontend application
│   ├── public/                   # Static assets (favicons, manifest)
│   ├── src/
│   │   ├── assets/               # Local icons, logos, sound cues
│   │   ├── components/           # UI components (ChatBox, AudioControls, ModeToggle, Modal)
│   │   ├── hooks/                # React custom hooks (useChatStream, useAudioRecorder, useAudioPlayer)
│   │   ├── pages/                # Top-level page views (ChatView, SettingsView)
│   │   ├── services/             # Client-side API consumers (chatService.js, voiceService.js)
│   │   ├── styles/               # Vanilla CSS design system, audio indicators, variables
│   │   ├── App.jsx               # Application shell and view routing
│   │   └── main.jsx              # Application entry point
│   ├── index.html                # Vite HTML template
│   ├── package.json              # Frontend dependencies and scripts
│   └── README.md                 # Client documentation and role
│
├── server/                       # Node.js + Express backend service
│   ├── src/
│   │   ├── config/               # App configuration, environment, constants
│   │   ├── controllers/          # HTTP controllers (chatController, voiceController, healthController)
│   │   ├── routes/               # Express route definitions (chat, voice, health)
│   │   ├── services/             # Core services (lmStudioService, sttService, ttsService, conversationOrchestrator)
│   │   ├── agents/               # LangGraph.js state graphs, nodes, and workflows (Phase 3)
│   │   ├── tools/                # Modular system tools (file search, app launch) (Phase 4)
│   │   ├── middleware/           # Validation, error handling, permission gates
│   │   └── app.js                # Express app entry and listener
│   ├── data/                     # SQLite database storage (gitignored)
│   ├── package.json              # Backend dependencies and scripts
│   ├── .env.example              # Template environment variables
│   └── README.md                 # Server documentation and role
│
├── desktop/                      # Electron desktop shell wrapper (Phase 5)
│   ├── src/
│   │   ├── main.js               # Electron main process
│   │   ├── preload.js            # Secure IPC context bridge
│   │   ├── tray.js               # System tray lifecycle and menu
│   │   ├── shortcuts.js          # Global hotkey listeners (window toggle, push-to-talk)
│   │   └── notifications.js      # Native desktop notification wrappers
│   ├── assets/                   # Desktop icons (.ico, .png)
│   ├── package.json              # Electron dependencies and launch scripts
│   └── README.md                 # Desktop documentation and role
│
├── docs/                         # Project architecture, guidelines, and ADRs
│   ├── decisions/                # Architecture Decision Records (ADRs)
│   │   └── README.md             # ADR guidelines and blank template
│   ├── ARCHITECTURE.md           # System architecture, voice subsystem, and data flow
│   ├── DEVELOPMENT.md            # Setup instructions and dev workflow
│   ├── PROJECT_STRUCTURE.md      # This file
│   ├── ROADMAP.md                # 6-phase development milestones
│   ├── SECURITY.md               # Safety, permissions, audio privacy, and guardrails
│   └── TECH_STACK.md             # In-depth technology justification and candidate evaluations
│
├── AGENTS.md                     # Instructions and rules for AI coding assistants
├── CHANGELOG.md                  # Historical record of changes and releases
├── CONTRIBUTING.md               # Contribution rules and git guidelines
└── README.md                     # Root project overview and quickstart
```

---

## 2. Directory Responsibilities

### Root Directory
* Contains repository-level documentation (`README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `CHANGELOG.md`).
* Orchestrates subprojects without polluting code boundaries.

### `client/` (Frontend)
* **Goal:** Deliver a fast, responsive, and visually appealing multimodal user interface.
* **Responsibilities:** Chat thread rendering, markdown visualization, Server-Sent Events stream consumption, push-to-talk microphone audio recording (`MediaRecorder`), audio player playback with immediate interruption/stop controls, and text/voice mode toggling.
* **Constraints:** Vanilla CSS only; no direct database queries or direct calls to LM Studio or STT/TTS binaries. Raw audio is processed in memory and never persisted.

### `server/` (Backend Service)
* **Goal:** Act as the central nervous system of Ruan AI.
* **Responsibilities:** Interfacing with LM Studio, streaming token responses, managing local STT/TTS candidate adapters (`sttService`, `ttsService`), coordinating unified voice and text conversations (`conversationOrchestrator`), reporting decoupled health checks (`healthController`), storing conversation records in SQLite (Phase 2), running LangGraph agent graphs (Phase 3), and safely executing authorized system tools (Phase 4).
* **Constraints:** Must bind exclusively to `127.0.0.1`; all file/OS operations must pass through security middleware.

### `desktop/` (Electron Shell — Phase 5)
* **Goal:** Provide native Windows desktop integration.
* **Responsibilities:** Window lifecycle management, system tray persistence, global keyboard shortcuts (`Ctrl + Shift + Space` to summon, global push-to-talk trigger), and desktop notifications.
* **Constraints:** No core business, voice processing, or AI logic belongs in the Electron main process; it wraps the client and communicates with the backend.

### `docs/` (Documentation & ADRs)
* **Goal:** Maintain persistent, high-fidelity technical documentation and architectural decisions.
* **Subdirectory `docs/decisions/`:** Contains formal Architecture Decision Records (ADRs) to document major technological or structural shifts.

---

## 3. Where to Add Future Modules

As development progresses through the roadmap phases, new capabilities should be placed in designated directories:

| Feature / Capability | Roadmap Phase | Intended Location |
|---|---|---|
| **LM Studio Client Service** | Phase 1 | `server/src/services/lmStudioService.js` |
| **SSE Streaming Controller** | Phase 1 | `server/src/controllers/chatController.js` (`/api/chat/stream`, `/api/chat/abort`) |
| **Decoupled Health Check**   | Phase 1 | `server/src/controllers/healthController.js` (`/api/health`) |
| **STT Candidate Adapter**    | Phase 1 | `server/src/services/sttService.js` (`/api/voice/transcribe`) |
| **TTS Candidate Adapter**    | Phase 1 | `server/src/services/ttsService.js` (`/api/voice/synthesize`) |
| **Unified Conversation Orch**| Phase 1 | `server/src/services/conversationOrchestrator.js` |
| **Push-to-Talk Recorder Hook**| Phase 1 | `client/src/hooks/useAudioRecorder.js` |
| **Audio Player / Stop Hook** | Phase 1 | `client/src/hooks/useAudioPlayer.js` |
| **Audio Visualizer / Button**| Phase 1 | `client/src/components/AudioControls.jsx` |
| **Text / Voice Mode Toggle** | Phase 1 | `client/src/components/ModeToggle.jsx` |
| **SQLite Database Manager**  | Phase 2 | `server/src/services/dbService.js` |
| **SQLite Migration Scripts**  | Phase 2 | `server/src/database/migrations/` |
| **Conversation Memory Store** | Phase 2 | `server/src/services/memoryService.js` |
| **LangGraph Agent Graphs**    | Phase 3 | `server/src/agents/ruanAgent.js` |
| **Agent State Definitions**   | Phase 3 | `server/src/agents/state.js` |
| **File Search Tool**          | Phase 4 | `server/src/tools/fileSearchTool.js` |
| **Document Reader Tool**      | Phase 4 | `server/src/tools/documentReaderTool.js` |
| **App Launcher Tool**         | Phase 4 | `server/src/tools/appLauncherTool.js` |
| **Tool Permission Gate**      | Phase 4 | `server/src/middleware/permissionGate.js` |
| **Electron Main & Preload**   | Phase 5 | `desktop/src/main.js`, `desktop/src/preload.js` |
| **Background Voice Shortcut** | Phase 5 | `desktop/src/shortcuts.js` |
| **Wake-Word Engine (Hey Ruan)**| Phase 6 | `server/src/services/wakeWordService.js` |
