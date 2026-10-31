# Ruan AI — Desktop (`desktop/`)

This directory houses the Electron application shell providing native Windows desktop integration for **Ruan AI**.

---

## Intended Responsibilities

The desktop module wraps Ruan AI into a native desktop experience without taking on business or AI logic:
* **Window Lifecycle Management:** Spawning, minimizing, centering, and persisting main window state.
* **System Tray Companion:** Running unobtrusively in the Windows system tray when closed, allowing quick recall.
* **Global Hotkeys:** Registering global keyboard shortcuts (e.g., `Ctrl + Shift + Space`) to instantly invoke the assistant.
* **Desktop Notifications:** Triggering native OS notifications for long-running task completions or tool approval requests.
* **Service Supervision:** Optionally managing the lifecycle of background server processes or connecting to an already running instance.

---

## Architectural Boundaries

* **No Direct Business Logic:** The Electron main process does not execute AI prompts, run database queries, or contain agent loops. All operations are handled by the Express backend.
* **Secure IPC Only:** If IPC communication is needed between Electron and the window, use a secure `preload.js` script with `contextIsolation: true` and `nodeIntegration: false`.
* **Renderer Source:** In development, Electron loads the Vite development server URL (`http://localhost:5173`). In production, it serves prebuilt assets from `client/dist/`.

---

## Technology Stack

* **Framework:** Electron
* **Language:** JavaScript (ES Modules / CommonJS compatible runner)
* **Target OS:** Windows 11 (64-bit)

---

## Planned Directory Structure

```text
desktop/
├── src/
│   ├── main.js             # Electron main process entry point
│   ├── preload.js          # Secure context bridge script
│   ├── tray.js             # Windows system tray menu and event handlers
│   ├── shortcuts.js        # Global hotkey registration
│   └── notifications.js    # Native desktop notification wrappers
├── assets/                 # App icons (.ico, .png) for tray and window
└── package.json            # Desktop package dependencies and launch scripts
```

---

## Current Status

* **Status:** Initial Planning / Uninitialized.
* Scheduled for implementation in **Phase 5: Desktop Application**.
* Phase 1 through 4 will run directly in browser mode via `client/` and `server/`.
