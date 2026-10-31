import React, { useState } from 'react';
import { playClickSound, playTransitionSound } from '../services/sound';
import './Documentation.css';

export default function Documentation() {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const docTopics = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      category: 'ONBOARDING',
      desc: 'Quickstart walkthrough covering prerequisites, cloning, repository tour, and launching the development cluster.',
      details: {
        summary: 'Ruan AI runs as an independent monorepo with an Express server and React client.',
        steps: [
          'Verify Node.js v20+ LTS is installed on your system.',
          'Start LM Studio with local server enabled on port 1234.',
          'Launch both server and client using npm scripts.'
        ],
        codeTitle: 'Quickstart Commands',
        code: `# 1. Clone repository
git clone https://github.com/ruhaannarang/Ruan-AI.git
cd Ruan-AI

# 2. Start Express Gateway (Port 5000)
cd server
npm install
npm run dev

# 3. In a second terminal, launch React UI (Port 5173)
cd ../client
npm install
npm run dev`
      }
    },
    {
      id: 'installation',
      title: 'Installation',
      category: 'SETUP',
      desc: 'Step-by-step setup instructions for dependencies, platform-specific tooling, and environment files.',
      details: {
        summary: 'Configure environment variables and install verified Node.js dependencies.',
        steps: [
          'Duplicate .env.example to .env in both client/ and server/.',
          'Configure PORT (default 5000) and LM Studio endpoint in server/.env.',
          'Configure VITE_API_BASE_URL (default /api) in client/.env.'
        ],
        codeTitle: 'Environment Setup (.env)',
        code: `# server/.env
PORT=5000
HOST=127.0.0.1
LM_STUDIO_URL=http://localhost:1234/v1
NODE_ENV=development

# client/.env
VITE_API_BASE_URL=/api`
      }
    },
    {
      id: 'configuration',
      title: 'Configuration',
      category: 'RUNTIME',
      desc: 'Detailed reference for server port binding, LM Studio endpoints, timeout policies, and CORS headers.',
      details: {
        summary: 'All configuration is driven through typed config objects in server/src/config/index.js.',
        steps: [
          'Strict 127.0.0.1 binding ensures local-only network boundary.',
          'LM Studio timeout policies guard against hanging GPU inference.',
          'Vite proxy seamlessly forwards /api requests to port 5000 in dev.'
        ],
        codeTitle: 'server/src/config/index.js snippet',
        code: `export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  host: process.env.HOST || '127.0.0.1',
  lmStudio: {
    endpoint: process.env.LM_STUDIO_URL || 'http://localhost:1234/v1',
    timeoutMs: 30000
  }
};`
      }
    },
    {
      id: 'local-models',
      title: 'Local Model Setup',
      category: 'INTELLIGENCE',
      desc: 'Hardware recommendations, GGUF quantization guidance, and running models in LM Studio without cloud reliance.',
      details: {
        summary: 'Ruan AI does not hardcode model names, allowing complete freedom to test any GGUF or SafeTensors model.',
        steps: [
          'Recommended baseline: Qwen 2.5 7B Instruct (Q4_K_M or Q5_K_M) or Llama 3.1 8B Instruct.',
          'In LM Studio: Load model and check "Enable Local Server" (Port 1234).',
          'Ensure Context Length is tuned for your laptop GPU (6GB VRAM target).'
        ],
        codeTitle: 'Verification via cURL',
        code: `curl http://localhost:1234/v1/models

# Example Response:
{
  "data": [
    { "id": "qwen2.5-7b-instruct", "object": "model" }
  ]
}`
      }
    },
    {
      id: 'voice-setup',
      title: 'Voice Setup',
      category: 'SPEECH',
      desc: 'Push-to-Talk configuration, STT engine candidates (faster-whisper vs whisper.cpp), and streaming TTS.',
      details: {
        summary: 'Decoupled voice pipeline processes audio via transient buffers and streams spoken chunks with abort support.',
        steps: [
          'Microphone input captured via Web Audio API Push-to-Talk in client.',
          'Sent as multipart/form-data to POST /api/voice/transcribe.',
          'Response streamed via SSE; TTS sentences synthesized via Piper / Kokoro.'
        ],
        codeTitle: 'Unified Turn Pipeline Signature',
        code: `POST /api/voice/transcribe -> Returns { text: string }
POST /api/chat/stream     -> Streams SSE tokens & triggers sentence TTS
POST /api/chat/abort      -> Aborts generation & purges audio queue`
      }
    },
    {
      id: 'architecture',
      title: 'Architecture & ADRs',
      category: 'ENGINEERING',
      desc: 'Monorepo boundaries, decoupled health checks, ES Module standards, and architectural decision records.',
      details: {
        summary: 'Explore docs/ARCHITECTURE.md and docs/decisions/ for in-depth system guidelines.',
        steps: [
          'Frontend must never communicate directly with LM Studio or SQLite.',
          'Backend wraps all business logic, LLM streaming, and tool execution.',
          'Decoupled health checks ensure Express is distinct from external AI.'
        ],
        codeTitle: 'Core ADR References',
        code: `# Architectural Decision Records in docs/decisions/
- ADR-001: Local-First LM Studio Foundation
- ADR-002: Modular Voice Pipeline & Sentence Chunking
- ADR-003: Decoupled Health Diagnostics Standard`
      }
    },
    {
      id: 'api-reference',
      title: 'API Reference',
      category: 'SPECIFICATION',
      desc: 'Canonical signatures and schemas for /api/health, /api/chat/stream, /api/voice/transcribe, and abort endpoints.',
      details: {
        summary: 'Consistent JSON envelopes and HTTP status codes across the entire gateway.',
        steps: [
          'GET /api/health returns Express server status and subsystem readiness.',
          'POST /api/chat/stream accepts { message, conversationId, mode }.',
          'POST /api/chat/abort cancels in-flight LLM and TTS tasks.'
        ],
        codeTitle: 'Standard Health Endpoint Schema',
        code: `GET /api/health -> 200 OK
{
  "status": "ok",
  "uptime": 142.5,
  "timestamp": "2026-10-31T12:00:00.000Z",
  "services": {
    "lmStudio": { "status": "uninitialized" },
    "stt": { "status": "uninitialized" },
    "tts": { "status": "uninitialized" }
  }
}`
      }
    },
    {
      id: 'development-guide',
      title: 'Development Guide',
      category: 'CONTRIBUTING',
      desc: 'Workflow rules for developers and AI coding agents, commit guidelines, and automated verification checks.',
      details: {
        summary: 'Mandatory guidelines for agents and human contributors defined in AGENTS.md.',
        steps: [
          'Always inspect existing code before editing.',
          'Vanilla CSS only — no Tailwind CSS or heavy component libraries.',
          'Run npm run build to verify 0 syntax or module bundling errors.'
        ],
        codeTitle: 'Verification Scripts',
        code: `# Frontend lint & build check
cd client
npm run build

# Backend startup check
cd ../server
node src/app.js`
      }
    },
    {
      id: 'security',
      title: 'Security',
      category: 'GOVERNANCE',
      desc: 'Local-first privacy constraints, permission boundaries, input sanitization, and blocklisted system paths.',
      details: {
        summary: 'Strict guardrails to protect user host environment during local execution.',
        steps: [
          'Confine file tool scopes to designated workspace directories.',
          'Explicit human approval required for file mutations and shell executions.',
          'Zero telemetry or cloud API keys required for core operation.'
        ],
        codeTitle: 'Security Scope Enforcement',
        code: `// Blocklisted System Paths:
const BLOCKED_PATHS = [
  'C:\\\\Windows',
  'C:\\\\Windows\\\\System32',
  process.env.USERPROFILE + '\\\\.ssh',
  process.env.APPDATA + '\\\\Local\\\\Google\\\\Chrome\\\\User Data'
];`
      }
    }
  ];

  const handleOpenDoc = (topic) => {
    playClickSound();
    setSelectedDoc(topic);
    setCopiedCode(false);
  };

  const handleCloseDoc = () => {
    playClickSound();
    setSelectedDoc(null);
  };

  const handleCopyCode = (code) => {
    playClickSound();
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }).catch(() => {});
  };

  return (
    <section className="docs-section" id="docs" aria-labelledby="docs-heading">
      <div className="docs-container">
        {/* Header */}
        <div className="docs-header">
          <div className="section-eyebrow font-mono">05 // KNOWLEDGE &amp; INTEGRATION</div>
          <h2 className="docs-heading" id="docs-heading">
            Everything you need to<br />
            <span className="docs-heading-accent">understand Ruan AI.</span>
          </h2>
          <p className="docs-sub">
            Clear, developer-focused documentation covering installation, configuration, local intelligence setup, and architectural decision records. Click any topic to inspect full details.
          </p>
        </div>

        {/* Documentation Topic Grid */}
        <div className="docs-grid">
          {docTopics.map((topic) => (
            <div 
              key={topic.id} 
              className="doc-topic-card"
              onClick={() => handleOpenDoc(topic)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleOpenDoc(topic)}
              aria-label={`Open documentation for ${topic.title}`}
            >
              <div className="doc-card-top font-mono">
                <span className="doc-category">{topic.category}</span>
                <span className="doc-arrow" aria-hidden="true">↗</span>
              </div>
              <h3 className="doc-title">{topic.title}</h3>
              <p className="doc-desc">{topic.desc}</p>
              <div className="doc-footer font-mono">
                <span>INSPECT SPECIFICATION</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Documentation Detail Modal */}
      {selectedDoc && (
        <div 
          className="doc-modal-overlay" 
          onClick={handleCloseDoc}
          role="dialog"
          aria-modal="true"
          aria-labelledby="doc-modal-title"
        >
          <div 
            className="doc-modal-content" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="doc-modal-header">
              <div>
                <span className="doc-modal-badge font-mono">{selectedDoc.category} // SPECIFICATION</span>
                <h3 id="doc-modal-title" className="doc-modal-title">{selectedDoc.title}</h3>
              </div>
              <button 
                className="doc-modal-close-btn"
                onClick={handleCloseDoc}
                aria-label="Close documentation modal"
              >
                ✕
              </button>
            </div>

            <div className="doc-modal-body">
              <p className="doc-modal-summary">{selectedDoc.details.summary}</p>

              <div className="doc-modal-steps">
                <h4 className="steps-heading font-mono">KEY IMPLEMENTATION REQUIREMENTS</h4>
                <ul>
                  {selectedDoc.details.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              </div>

              {selectedDoc.details.code && (
                <div className="doc-code-wrapper">
                  <div className="doc-code-header">
                    <span className="code-title font-mono">{selectedDoc.details.codeTitle}</span>
                    <button 
                      className="btn-copy-code font-mono"
                      onClick={() => handleCopyCode(selectedDoc.details.code)}
                    >
                      {copiedCode ? '✓ COPIED' : 'COPY'}
                    </button>
                  </div>
                  <pre className="doc-code-block font-mono">
                    <code>{selectedDoc.details.code}</code>
                  </pre>
                </div>
              )}
            </div>

            <div className="doc-modal-footer font-mono">
              <span>SOURCE: /docs/ARCHITECTURE.md &amp; AGENTS.md</span>
              <button className="btn-modal-done" onClick={handleCloseDoc}>
                Close Reader
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
