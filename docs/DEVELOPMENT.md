# Development Guide — Ruan AI

This document provides setup instructions, prerequisite checks, local execution workflows, and guidelines for developing **Ruan AI**.

---

## 1. Prerequisites & Environment

Before developing Ruan AI, ensure your local workstation meets the following requirements:

### Hardware Profile
* **Operating System:** Windows 11 (64-bit)
* **Processor:** Intel Core i5 (13th Gen)
* **RAM:** 16 GB minimum
* **GPU:** Dedicated NVIDIA GPU (e.g. GeForce RTX 3050 Laptop GPU with 6 GB VRAM) with current NVIDIA drivers for CUDA acceleration.
* **Audio Devices:** Working microphone (for Push-to-Talk) and speakers/headphones (for audio playback).

### Software Requirements
* **Node.js:** v18.18.0+ or v20.x LTS installed. Verify via:
  ```powershell
  node --version
  npm --version
  ```
* **Git:** Installed and available in PATH.
* **LM Studio:** Installed and running on your machine.
  * Download from: [https://lmstudio.ai](https://lmstudio.ai)
  * Recommended starter candidate model: `Qwen2.5-7B-Instruct-GGUF` or `Llama-3.1-8B-Instruct-GGUF` (Q4_K_M quantization).
* **Local STT / TTS Candidates (Evaluated for Phase 1):**
  * Speech recognition: `faster-whisper` or standalone `whisper.cpp` binary.
  * Speech synthesis: `Piper` standalone binary or `Kokoro` ONNX runtime.

---

## 2. LM Studio Configuration

To enable Ruan AI to communicate with your local models:

1. Open **LM Studio**.
2. Navigate to the **Local Server** tab (the `<->` icon on the left bar).
3. Select your downloaded model from the dropdown at the top.
4. Set **GPU Acceleration & Context Settings:**
   * In the right settings panel, check **GPU Offload** and adjust GPU layers according to available VRAM.
   * **Context Length:** Configure appropriately for the active model (e.g. 2,048, 4,096, or 8,192 tokens) while monitoring VRAM headroom. Do not assume a fixed context size.
5. Click **Start Server**.
6. Verify the server is running by opening `http://localhost:1234/v1/models` in your browser.

---

## 3. Planned Monorepo Setup (When Initializing Phase 1)

> **Note:** The repository is currently in its documentation phase. When Phase 1 implementation begins, the setup process will proceed as follows:

### Step 1: Backend Setup (`server/`)
```powershell
# Navigate to server directory
cd c:\Ruan-AI\server

# Initialize package & install runtime dependencies (Phase 1)
npm init -y
npm install express cors dotenv multer

# Create local environment file
Copy-Item .env.example .env
```

### Step 2: Frontend Setup (`client/`)
```powershell
# Navigate to client directory
cd c:\Ruan-AI\client

# Initialize Vite React template
npm create vite@latest . -- --template react

# Verify structure and prepare Vanilla CSS system
```

---

## 4. Development Workflow & Standard Endpoints

During active development, services will run concurrently on localhost:

| Service | Working Directory | Default URL | Command |
|---|---|---|---|
| **LM Studio Local Server** | Standalone App | `http://localhost:1234` | Managed via LM Studio UI |
| **Express Backend** | `c:\Ruan-AI\server` | `http://localhost:5000` | `npm run dev` |
| **React Frontend** | `c:\Ruan-AI\client` | `http://localhost:5173` | `npm run dev` |
| **Electron Shell (Phase 5)** | `c:\Ruan-AI\desktop` | Native Window | `npm start` |

### Environment Variables (`server/.env`)
The backend will read configurations from a local `.env` file:
```env
PORT=5000
HOST=127.0.0.1
LM_STUDIO_BASE_URL=http://localhost:1234/v1
LM_STUDIO_MODEL=default
STT_CANDIDATE=faster-whisper
TTS_CANDIDATE=piper
NODE_ENV=development
```

### Standardized API Endpoints
* `GET /api/health`: Decoupled server health check reporting server uptime and independent status of LM Studio, STT, and TTS.
* `POST /api/chat/stream`: Core chat stream handling SSE token delivery.
* `POST /api/chat/abort`: Cancels active generation and stops pending TTS synthesis.
* `POST /api/voice/transcribe`: Accepts audio blob via Push-to-Talk, transcribes to text string, and flushes raw audio from memory.
* `POST /api/voice/synthesize`: Synthesizes text string into audio buffer.

---

## 5. Coding & Verification Guidelines

1. **Verify LM Studio First:** If streaming fails or hangs, check `http://localhost:5000/api/health` to see if LM Studio is reachable.
2. **Browser Microphone Access:** Browsers allow `getUserMedia` without HTTPS only on `localhost` / `127.0.0.1`. Ensure testing occurs on `http://localhost:5173` and microphone permissions are granted.
3. **Decoupled Diagnostics:** Verify that `/api/health` returns `200 OK` even if LM Studio or voice candidates are uninitialized, accurately reflecting their individual states in the JSON payload.
4. **Playback Interruption:** Test that triggering Push-to-Talk, clicking Stop, or entering a new prompt immediately aborts audio playback and cancels backend processing via `/api/chat/abort`.
5. **Clean Commits:** Run code formatting checks and verify clean syntax before committing changes.
