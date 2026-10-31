# Security & Safety Policy — Ruan AI

Ruan AI is designed as a locally executing personal AI operating companion. Because it interacts with local audio hardware, user files, and the host operating system, security, isolation, and user consent must be engineered into every layer.

---

## 1. Local-First Privacy Principles

1. **Zero External Data Leakage:**
   * Prompts, conversation histories, microphone audio recordings, synthesized audio, system telemetry, and local file contents must never be transmitted to third-party cloud servers.
   * All LLM inference runs locally through LM Studio (`http://localhost:1234`).
   * All voice transcription (STT) and neural speech synthesis (TTS) execute locally on host resources.
   * All persistence occurs in a local SQLite database file on the host machine.
2. **Localhost Network Binding:**
   * The Express backend server binds strictly to the loopback interface (`127.0.0.1` / `localhost`).
   * It must never bind to `0.0.0.0`, preventing exposure to external devices on the local area network (LAN).
3. **CORS Restrictions:**
   * Cross-Origin Resource Sharing (CORS) is restricted exclusively to the local frontend origins (e.g., `http://localhost:5173`).

---

## 2. Microphone & Audio Privacy Policy (Phase 1)

1. **User-Initiated Audio Only (Push-to-Talk):**
   * In Phase 1, audio capture is strictly controlled by **Push-to-Talk**.
   * The microphone stream is opened only while the user actively holds down the voice button or designated keyboard shortcut, and is closed immediately upon release.
   * **No Ambient Background Listening:** Continuous listening, ambient recording, and background wake words are strictly prohibited in the foundational build.
2. **Zero Audio Persistence in Phase 1:**
   * **Raw audio recordings are NEVER written to disk or database.**
   * Audio buffers received by `/api/voice/transcribe` are held strictly in transient memory (RAM) for the duration of transcription and are immediately flushed and discarded once transcription finishes.
   * Audio logs, telemetry, and speech snippets are never retained.
3. **Hardware Privacy Indicator:**
   * The frontend UI must provide clear visual feedback (e.g., glowing recording state / audio waveform) whenever the microphone is actively capturing sound.

---

## 3. Tool Execution Permission Model

Ruan's agentic capabilities operate under a **Permission Tier System**:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        TOOL PERMISSION TIERS                           │
├────────┬─────────────────────────────┬─────────────────────────────────┤
│ Tier   │ Category                    │ Execution Policy                │
├────────┼─────────────────────────────┼─────────────────────────────────┤
│ Tier 0 │ Read-Only Informational     │ Automatic execution allowed     │
│        │ (e.g. Current Time, Math)   │ (No user prompt required)       │
├────────┼─────────────────────────────┼─────────────────────────────────┤
│ Tier 1 │ Safe Local Inspection       │ Transparent execution with      │
│        │ (e.g. Scoped File Search)   │ real-time status UI indicator   │
├────────┼─────────────────────────────┼─────────────────────────────────┤
│ Tier 2 │ Local Mutation & App Launch │ REQUIRED USER APPROVAL          │
│        │ (e.g. Open App, Write File) │ UI modal popup must confirm     │
├────────┼─────────────────────────────┼─────────────────────────────────┤
│ Tier 3 │ Potentially Destructive     │ STRICT CONFIRMATION + EXPLICIT  │
│        │ (e.g. Delete File, OS Ops)  │ TARGET CONFIRMATION             │
└────────┴─────────────────────────────┴─────────────────────────────────┘
```

### Human-in-the-Loop Interruption
* In Phase 3 and Phase 4, whenever an agent state graph selects a Tier 2 or Tier 3 tool, the backend pauses execution and emits an `approval_request` event over the stream.
* The frontend presents the user with the exact target path, operation type, and arguments.
* The tool will not execute unless an explicit `APPROVED` signal is received from the user.

---

## 4. File System Access Restrictions

To protect personal files and critical operating system integrity:

* **Scoped Directory Whitelist:**
  * File search and reading tools are confined to explicitly configured user folders (e.g., `Documents`, `Desktop`, or specific project directories).
* **Strict Blacklist (Prohibited Paths):**
  * System directories: `C:\Windows`, `C:\Program Files`, `C:\ProgramData`.
  * Security and identity files: `.ssh`, `.aws`, `.gnupg`, private keys, certificates.
  * Browser data: Cookies, session stores, local storage databases.
  * Environment configuration: `.env` files containing system credentials.
* **Path Traversal Prevention:**
  * All user-provided or model-generated paths are resolved and normalized using `path.resolve()`.
  * Paths containing malicious relative traversal patterns (`../../`) escaping approved root directories are rejected immediately.

---

## 5. Shell Command Execution Safeguards

* **No Arbitrary Raw Shell Strings:**
  * The system will **never** expose an unconstrained `exec(rawUserOrModelString)` endpoint.
* **Predefined Command Whitelist:**
  * Any system interaction (such as launching an approved desktop application) must be handled through strictly mapped utility functions using `child_process.execFile` or `spawn` with an explicit arguments array, never an unescaped shell string.
* **No Elevated / Administrator Execution:**
  * Ruan AI processes run exclusively with standard user permissions. It must never request or inherit elevated administrator privileges (UAC elevation) for standard operations.

---

## 6. Desktop Shell Security (Electron — Phase 5)

When desktop integration is introduced in **Phase 5**:

* **Context Isolation:** `contextIsolation: true` is strictly enforced for all `BrowserWindow` instances.
* **Node Integration Disabled:** `nodeIntegration: false` prevents web pages from invoking arbitrary Node.js APIs.
* **Secure Context Bridge:** Only a strictly defined, minimal set of IPC event triggers is exposed to the renderer via `preload.js`.
* **Navigation Lock:** External URL navigation from the Electron renderer is intercepted and redirected to the system default browser via `shell.openExternal`.

---

## 7. Sensitive Data Handling & Logs

* **No Plaintext Credential Storage:** If any external service is ever configured by the user, API keys must be stored in secure local storage or system keychain, never committed to git.
* **Sanitized Logs:** Console logs and debug output must truncate or redact sensitive paths and message content to prevent accidental leakage in bug reports.
