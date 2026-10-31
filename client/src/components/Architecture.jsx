import React, { useState } from 'react';
import { playClickSound, playTransitionSound } from '../services/sound';
import './Architecture.css';

export default function Architecture() {
  const [viewMode, setViewMode] = useState('topology'); // 'topology' | 'voice'

  const handleToggle = (mode) => {
    playTransitionSound();
    setViewMode(mode);
  };

  return (
    <section className="arch-section" id="architecture" aria-labelledby="arch-heading">
      <div className="arch-container">
        {/* Header */}
        <div className="arch-header">
          <div className="section-eyebrow font-mono">03 // SYSTEM TOPOLOGY</div>
          <h2 className="arch-heading" id="arch-heading">
            A modular architecture.<br />
            <span className="arch-heading-accent">One intelligent experience.</span>
          </h2>
          <p className="arch-sub">
            Engineered as a clean monorepo separating presentation, gateway orchestration, and decoupled local intelligence engines. Toggle between system topology and the real-time voice pipeline.
          </p>

          {/* Architecture Mode Toggle */}
          <div className="arch-toggle-bar">
            <button 
              className={`arch-toggle-btn ${viewMode === 'topology' ? 'active' : ''}`}
              onClick={() => handleToggle('topology')}
              aria-pressed={viewMode === 'topology'}
            >
              <span>System Topology</span>
              <span className="pill-status font-mono">MONOREPO</span>
            </button>
            <button 
              className={`arch-toggle-btn ${viewMode === 'voice' ? 'active' : ''}`}
              onClick={() => handleToggle('voice')}
              aria-pressed={viewMode === 'voice'}
            >
              <span>Streaming Voice Pipeline</span>
              <span className="pill-status font-mono">PHASE 1 CORE</span>
            </button>
          </div>
        </div>

        {/* View Mode 1: System Topology */}
        {viewMode === 'topology' && (
          <div className="arch-canvas topology-view">
            {/* Layer 1: Client Presentation */}
            <div className="arch-layer-group">
              <div className="layer-label font-mono">LAYER 01 // PRESENTATION &amp; AUDIO I/O</div>
              <div className="nodes-row">
                <div className="arch-node active-node" id="node-client">
                  <div className="node-head">
                    <span className="node-dot green"></span>
                    <span className="node-kind font-mono">FRONTEND</span>
                  </div>
                  <h4 className="node-title">React 18 + Vite</h4>
                  <p className="node-desc">Pure Vanilla CSS. Web Audio API, Push-to-Talk capture &amp; audio buffer playback.</p>
                  <div className="node-status-tag font-mono live">● IMPLEMENTED</div>
                </div>

                <div className="arch-node planned-node" id="node-desktop">
                  <div className="node-head">
                    <span className="node-dot amber"></span>
                    <span className="node-kind font-mono">DESKTOP SHELL</span>
                  </div>
                  <h4 className="node-title">Electron Wrapper</h4>
                  <p className="node-desc">System tray, global hotkeys, isolated renderer &amp; background lifecycle.</p>
                  <div className="node-status-tag font-mono planned">○ PHASE 5 PLANNED</div>
                </div>
              </div>
            </div>

            {/* Connecting Bus */}
            <div className="arch-connector-channel" aria-hidden="true">
              <div className="flowing-packet packet-down"></div>
              <div className="channel-line"></div>
              <span className="channel-label font-mono">HTTP / SSE / LOCALHOST (PORT 5000)</span>
            </div>

            {/* Layer 2: Express Gateway */}
            <div className="arch-layer-group">
              <div className="layer-label font-mono">LAYER 02 // ORCHESTRATION &amp; API GATEWAY</div>
              <div className="nodes-row single">
                <div className="arch-node active-node node-gateway" id="node-server">
                  <div className="node-head">
                    <span className="node-dot green"></span>
                    <span className="node-kind font-mono">BACKEND GATEWAY</span>
                  </div>
                  <h4 className="node-title">Node.js + Express (ES Modules)</h4>
                  <p className="node-desc">
                    Decoupled health checks, SSE streaming coordinator, sentence chunker, AbortController cancellation &amp; security barriers.
                  </p>
                  <div className="node-status-tag font-mono live">● IMPLEMENTED &amp; VERIFIED</div>
                </div>
              </div>
            </div>

            {/* Connecting Bus to Intelligence Bus */}
            <div className="arch-connector-channel" aria-hidden="true">
              <div className="flowing-packet packet-down"></div>
              <div className="channel-line"></div>
              <span className="channel-label font-mono">DECOUPLED LOCAL SUBSYSTEMS</span>
            </div>

            {/* Layer 3: Decoupled Engines */}
            <div className="arch-layer-group">
              <div className="layer-label font-mono">LAYER 03 // INTELLIGENCE, MEMORY &amp; TOOLING</div>
              <div className="nodes-row quad">
                {/* LM Studio */}
                <div className="arch-node active-node">
                  <div className="node-head">
                    <span className="node-dot cyan"></span>
                    <span className="node-kind font-mono">LOCAL LLM RUNTIME</span>
                  </div>
                  <h4 className="node-title">LM Studio</h4>
                  <p className="node-desc">127.0.0.1:1234/v1 OpenAI-compatible streaming completion.</p>
                  <div className="node-status-tag font-mono ready">● INTEGRATION READY</div>
                </div>

                {/* SQLite */}
                <div className="arch-node planned-node">
                  <div className="node-head">
                    <span className="node-dot amber"></span>
                    <span className="node-kind font-mono">PERSISTENT MEMORY</span>
                  </div>
                  <h4 className="node-title">SQLite Store</h4>
                  <p className="node-desc">Parameterized queries, long-term semantic context &amp; preferences.</p>
                  <div className="node-status-tag font-mono planned">○ PHASE 2 PLANNED</div>
                </div>

                {/* LangGraph */}
                <div className="arch-node planned-node">
                  <div className="node-head">
                    <span className="node-dot amber"></span>
                    <span className="node-kind font-mono">AGENT ORCHESTRATOR</span>
                  </div>
                  <h4 className="node-title">LangGraph.js</h4>
                  <p className="node-desc">Deterministic state graphs with human-in-the-loop checkpoints.</p>
                  <div className="node-status-tag font-mono planned">○ PHASE 3 PLANNED</div>
                </div>

                {/* Local Tools */}
                <div className="arch-node planned-node">
                  <div className="node-head">
                    <span className="node-dot amber"></span>
                    <span className="node-kind font-mono">SUPERVISED TOOLS</span>
                  </div>
                  <h4 className="node-title">Local Tools</h4>
                  <p className="node-desc">Confined file access, app launching &amp; supervised shell.</p>
                  <div className="node-status-tag font-mono planned">○ PHASE 4 PLANNED</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Mode 2: Streaming Voice Pipeline */}
        {viewMode === 'voice' && (
          <div className="arch-canvas voice-pipeline-view">
            <div className="voice-pipeline-track">
              {/* Step 1 */}
              <div className="v-step">
                <div className="v-step-num font-mono">01</div>
                <div className="v-step-card">
                  <span className="v-icon">🎙️</span>
                  <h4>Microphone In</h4>
                  <p>Web Audio API / Push-to-Talk. Transient buffer in RAM.</p>
                  <span className="v-status font-mono live">● NO AMBIENT LISTENING</span>
                </div>
              </div>

              <div className="v-arrow" aria-hidden="true">➔</div>

              {/* Step 2 */}
              <div className="v-step">
                <div className="v-step-num font-mono">02</div>
                <div className="v-step-card">
                  <span className="v-icon">⚡</span>
                  <h4>STT Transcription</h4>
                  <p>faster-whisper / whisper.cpp transcribes speech to text.</p>
                  <span className="v-status font-mono candidate">● EVALUATING CPU/GPU</span>
                </div>
              </div>

              <div className="v-arrow" aria-hidden="true">➔</div>

              {/* Step 3 */}
              <div className="v-step">
                <div className="v-step-num font-mono">03</div>
                <div className="v-step-card">
                  <span className="v-icon">🧠</span>
                  <h4>Shared Chat Stream</h4>
                  <p>Canonical /api/chat/stream dispatches to LM Studio.</p>
                  <span className="v-status font-mono live">● UNIFIED TURN PIPELINE</span>
                </div>
              </div>

              <div className="v-arrow" aria-hidden="true">➔</div>

              {/* Step 4 */}
              <div className="v-step">
                <div className="v-step-num font-mono">04</div>
                <div className="v-step-card">
                  <span className="v-icon">✂️</span>
                  <h4>Sentence Chunker</h4>
                  <p>Buffers tokens until sentence boundaries (. ! ? \n).</p>
                  <span className="v-status font-mono live">● LOW-LATENCY CHUNKS</span>
                </div>
              </div>

              <div className="v-arrow" aria-hidden="true">➔</div>

              {/* Step 5 */}
              <div className="v-step">
                <div className="v-step-num font-mono">05</div>
                <div className="v-step-card">
                  <span className="v-icon">🔊</span>
                  <h4>TTS Synthesis</h4>
                  <p>Piper / Kokoro converts chunks into audio stream.</p>
                  <span className="v-status font-mono candidate">● EVALUATING CANDIDATES</span>
                </div>
              </div>

              <div className="v-arrow" aria-hidden="true">➔</div>

              {/* Step 6 */}
              <div className="v-step">
                <div className="v-step-num font-mono">06</div>
                <div className="v-step-card">
                  <span className="v-icon">🎧</span>
                  <h4>Audio Output</h4>
                  <p>Sequential buffer playback with instant Abort interrupt.</p>
                  <span className="v-status font-mono live">● INSTANT CANCEL</span>
                </div>
              </div>
            </div>

            {/* Abort Circuit Callout */}
            <div className="abort-circuit-banner">
              <div className="circuit-badge font-mono">INTERRUPTION CIRCUIT</div>
              <div className="circuit-text">
                When the user taps Push-to-Talk or Stop: the client terminates HTML5 AudioContext, clears the audio queue, and dispatches <code>/api/chat/abort</code>. An <code>AbortController</code> immediately cuts the active LM Studio stream and cancels pending TTS synthesis tasks.
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
