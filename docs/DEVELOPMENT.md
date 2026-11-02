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
* **Node.js:** Currently supported Active LTS version (v20.x or v22.x LTS recommended). Verify via:
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

## 3. Local Monorepo Setup & Execution

Both `client/` and `server/` are initialized with ES Modules and standalone `package.json` manifests.

### Step 1: Backend Setup (`server/`)
```powershell
# Navigate to server directory
cd c:\Ruan-AI\server

# Install dependencies
npm install

# Ensure local environment configuration exists
if (!(Test-Path .env)) { Copy-Item .env.example .env }

# Run Express server (runs on http://127.0.0.1:5000)
npm start

# Or run with Node --watch for active development
npm run dev
```

### Step 2: Voice Service Setup (`voice-service/`)
The voice service runs a dedicated local microservice on `127.0.0.1:8008` hosting `faster-whisper` (STT) and `Kokoro 82M` (TTS):

```powershell
# Navigate to voice-service directory
cd c:\Ruan-AI\voice-service

# Create virtual environment (Python 3.10–3.12 recommended)
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\activate

# Install dependencies (faster-whisper, kokoro-onnx, soundfile, fastapi, uvicorn)
pip install -r requirements.txt

# Download Kokoro ONNX model and voices into models/ directory (if not present)
python -c "
import os, urllib.request
os.makedirs('models', exist_ok=True)
files = {
    'kokoro-v1.0.onnx': 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx',
    'voices-v1.0.bin': 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin'
}
for name, url in files.items():
    dest = os.path.join('models', name)
    if not os.path.exists(dest):
        print(f'Downloading {name}...')
        urllib.request.urlretrieve(url, dest)
print('Voice models ready!')
"

# Run the voice service (listens on http://127.0.0.1:8008)
python app.py
```

### Step 3: Frontend Setup (`client/`)
```powershell
# Navigate to client directory
cd c:\Ruan-AI\client

# Install dependencies
npm install

# Run Vite development server (runs on http://127.0.0.1:5173)
npm run dev

# Or build production bundle
npm run build
```

### Step 4: Application Access
* **Product Overview & Landing Page:** `http://localhost:5173/`
* **Dedicated Conversation Interface:** `http://localhost:5173/app`
* **Express Gateway Health Endpoint:** `http://localhost:5000/api/health`
* **Voice Service Health Endpoint:** `http://localhost:8008/health`

---

## 4. Development Workflow & Standard Endpoints

During active development, services will run concurrently on localhost:

| Service | Working Directory | Default URL | Command |
|---|---|---|---|
| **LM Studio Local Server** | Standalone App | `http://localhost:1234` | Managed via LM Studio UI |
| **Python Voice Service** | `c:\Ruan-AI\voice-service` | `http://127.0.0.1:8008` | `python app.py` |
| **Express Backend** | `c:\Ruan-AI\server` | `http://localhost:5000` | `npm run dev` |
| **React Frontend** | `c:\Ruan-AI\client` | `http://localhost:5173` | `npm run dev` |
| **Electron Shell (Phase 5)** | `c:\Ruan-AI\desktop` | Native Window | `npm start` |

### Environment Variables (`server/.env`)
The backend reads configurations from a local `.env` file (copied from `.env.example`):
```env
PORT=5000
HOST=127.0.0.1
LM_STUDIO_BASE_URL=http://localhost:1234/v1
LM_STUDIO_MODEL=gemma-4-e2b-it-qat
STT_CANDIDATE=faster-whisper
TTS_CANDIDATE=piper
NODE_ENV=development

# Google OAuth 2.0 / Identity Services Configuration
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Session Security Configuration
SESSION_COOKIE_NAME=ruan_session
SESSION_SECRET=your_random_session_secret_for_production
SESSION_MAX_AGE_MS=604800000
```

> **Google Cloud Console OAuth Setup Instructions:**
> 1. Visit the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
> 2. Create or select your Google Cloud project.
> 3. Configure the **OAuth Consent Screen** (User Type: External, specify app name "Ruan AI" and developer email).
> 4. Go to **Credentials** → **Create Credentials** → **OAuth client ID** → select **Web application**.
> 5. Under **Authorized JavaScript Origins**, add:
>    - `http://localhost:5173`
>    - `http://127.0.0.1:5173`
> 6. Under **Authorized Redirect URIs**, add (if using redirect callbacks):
>    - `http://localhost:5000/api/auth/google/callback`
> 7. Copy the generated **Client ID** and **Client Secret** into `server/.env`:
>    `GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com`
>    `GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx`
> 8. Restart the Express server (`npm run dev` in `server/`).

> **LM Studio Model Requirement:**
> Ruan AI is configured by default to use **Gemma 4 E2B IT QAT** (`gemma-4-e2b-it-qat`). Ensure LM Studio has this model actively loaded into memory and that the local API server is started on `http://localhost:1234`. Model selection remains fully configurable via the `LM_STUDIO_MODEL` environment variable.

### Standardized API Endpoints
* `GET /api/health`: Decoupled server health check reporting server uptime and independent status of LM Studio, STT, and TTS.
* `POST /api/chat/stream`: Core chat stream handling SSE token delivery.
* `POST /api/chat/abort`: Cancels active generation and stops pending TTS synthesis.
* `GET /api/auth/config`: Returns public Google Identity Services configuration (`googleClientId`, `isConfigured`).
* `POST /api/auth/google`: Verifies incoming Google ID token with Google, upserts local SQLite user identity, and issues secure HttpOnly session cookie.
* `GET /api/auth/me`: Returns authenticated profile (`sub`, `name`, `email`, `picture`, `createdAt`) from valid session cookie.
* `POST /api/auth/logout`: Invalidates session in SQLite database and clears session cookie.
* `POST /api/voice/transcribe`: Accepts audio blob via Push-to-Talk, transcribes to text string, and flushes raw audio from memory.
* `POST /api/voice/synthesize`: Synthesizes text string into audio buffer.
* `GET /api/voice/voices`: Lists available Kokoro TTS voice profiles.
* `GET /api/voice/benchmark/prompts`: Returns standard 15 benchmark sentences across 4 categories (English, Hindi, Romanized Hinglish, Technical Hinglish).
* `POST /api/voice/benchmark/compare`: Runs comparative STT evaluation (`faster-whisper-small` vs `faster-whisper-base`), computing WER, latency, RTF, and technical term retention.
* `POST /api/voice/benchmark/save`: Persists sample and evaluation metadata locally in `voice-service/benchmark_data/` (strictly gitignored).
* `GET /api/voice/benchmark/history`: Returns local benchmark dataset history and summary statistics.
* `DELETE /api/voice/benchmark/history`: Clears local benchmark dataset.

---

## 5. Coding & Verification Guidelines

1. **Verify LM Studio First:** If streaming fails or hangs, check `http://localhost:5000/api/health` to see if LM Studio is reachable.
2. **Browser Microphone Access:** Browsers allow `getUserMedia` without HTTPS only on `localhost` / `127.0.0.1`. Ensure testing occurs on `http://localhost:5173` and microphone permissions are granted.
3. **Review Before Send:** By default, Push-to-Talk populates the composer input for review and editing before sending to avoid submitting mistranscribed words or acronyms.
4. **Decoupled Diagnostics:** Verify that `/api/health` returns `200 OK` even if LM Studio or voice candidates are uninitialized, accurately reflecting their individual states in the JSON payload.
5. **Playback Interruption:** Test that triggering Push-to-Talk, clicking Stop, or entering a new prompt immediately aborts audio playback and cancels backend processing via `/api/chat/abort`.
6. **Hinglish Benchmarking:** Test speech recognition across models using the in-app benchmark modal (`🎙️ Benchmark` in the top header) or the CLI runner (`python voice-service/benchmark_hinglish.py --summary`).
7. **Clean Commits:** Run code formatting checks and verify clean syntax before committing changes. All benchmark audio and personal recordings must remain strictly local and gitignored.
