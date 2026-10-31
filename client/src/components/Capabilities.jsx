import React, { useState } from 'react';
import { playClickSound, playTransitionSound } from '../services/sound';
import './Capabilities.css';

export default function Capabilities() {
  const [activeTab, setActiveTab] = useState(0);
  const [voiceSimulating, setVoiceSimulating] = useState(false);
  const [approvalGranted, setApprovalGranted] = useState(false);

  const capabilities = [
    {
      id: '01',
      title: 'Local Intelligence',
      badge: 'FOUNDATION',
      status: 'active',
      desc: 'Conversational intelligence powered by locally hosted language models via LM Studio. OpenAI-compatible API schemas with zero external telemetry or subscription gates.'
    },
    {
      id: '02',
      title: 'Voice Interaction',
      badge: 'PHASE 1 CORE',
      status: 'active',
      desc: 'Natural, low-latency push-to-talk speech interaction with local transcription (STT) and streaming speech synthesis (TTS) with immediate cancellation support.'
    },
    {
      id: '03',
      title: 'Persistent Memory',
      badge: 'PHASE 2 ROADMAP',
      status: 'planned',
      desc: 'A unified SQLite semantic store retaining conversations, user preferences, and evolving personal context across sessions under strict user ownership.'
    },
    {
      id: '04',
      title: 'Agentic Workflows',
      badge: 'PHASE 3 ROADMAP',
      status: 'planned',
      desc: 'Deterministic multi-step task planning and execution powered by LangGraph.js, equipped with mandatory human-in-the-loop approval checkpoints.'
    },
    {
      id: '05',
      title: 'Computer Interaction',
      badge: 'PHASE 4 ROADMAP',
      status: 'planned',
      desc: 'Supervised interaction with local files, workspace directories, and desktop tooling strictly confined by explicit path permissions and approval barriers.'
    },
    {
      id: '06',
      title: 'Privacy & Control',
      badge: 'ARCHITECTURAL PRINCIPLE',
      status: 'active',
      desc: 'Strict local-first philosophy. All core inference runs on your own GPU/CPU silicon with zero unauthorized cloud egress and inspectable data logs.'
    }
  ];

  const handleSelectTab = (idx) => {
    playTransitionSound();
    setActiveTab(idx);
  };

  const toggleVoiceSim = () => {
    playClickSound();
    setVoiceSimulating(!voiceSimulating);
  };

  return (
    <section className="capabilities-section" id="capabilities" aria-labelledby="capabilities-heading">
      <div className="capabilities-container">
        {/* Section Header */}
        <div className="capabilities-header">
          <div className="section-eyebrow font-mono">02 // CORE CAPABILITIES</div>
          <h2 className="capabilities-heading" id="capabilities-heading">
            Engineered for sovereignty.<br />
            <span className="capabilities-heading-accent">Structured for utility.</span>
          </h2>
          <p className="capabilities-sub">
            Each capability is built to run privately on your personal hardware, clearly delineated between Phase 1 implementation and future developmental milestones.
          </p>
        </div>

        {/* Interactive Capability Selector Bar */}
        <div className="capabilities-nav-bar" role="tablist">
          {capabilities.map((cap, idx) => (
            <button
              key={cap.id}
              role="tab"
              aria-selected={activeTab === idx}
              className={`cap-nav-tab ${activeTab === idx ? 'active' : ''}`}
              onClick={() => handleSelectTab(idx)}
            >
              <span className="cap-nav-num font-mono">{cap.id}</span>
              <span className="cap-nav-title">{cap.title}</span>
              <span className={`cap-nav-badge font-mono ${cap.status}`}>
                {cap.status === 'active' ? '● READY' : '○ PLANNED'}
              </span>
            </button>
          ))}
        </div>

        {/* Distinct Capability Visual Displays */}
        <div className="capability-display-stage">
          {/* 01: Intelligence Terminal */}
          {activeTab === 0 && (
            <div className="cap-stage-item stage-intelligence">
              <div className="stage-info">
                <div className="stage-tag font-mono">CAPABILITY 01 // LOCAL INTELLIGENCE</div>
                <h3>Locally Hosted Language Models</h3>
                <p>{capabilities[0].desc}</p>
                <div className="feature-tags">
                  <span className="tag-pill">LM Studio Runtime</span>
                  <span className="tag-pill">Streaming SSE Tokens</span>
                  <span className="tag-pill">Zero Cloud Telemetry</span>
                  <span className="tag-pill">Dynamic Context Window</span>
                </div>
              </div>

              <div className="stage-visual terminal-visual">
                <div className="terminal-header">
                  <div className="terminal-dots">
                    <span></span><span></span><span></span>
                  </div>
                  <div className="terminal-title font-mono">lm-studio-stream.js (127.0.0.1:1234)</div>
                </div>
                <div className="terminal-body font-mono">
                  <div className="line comment">// Connecting to local LM Studio OpenAI-compatible endpoint</div>
                  <div className="line prompt">&gt; POST /v1/chat/completions (stream: true)</div>
                  <div className="line output">[Enclave] Model: Configurable local GGUF / SafeTensors</div>
                  <div className="line output">[Tokens] Streaming 48.2 tokens/sec via Server-Sent Events</div>
                  <div className="line output token-stream">
                    "I am Ruan AI running locally on your hardware. No packets leave this machine."
                  </div>
                  <div className="line telemetry">
                    <span className="telemetry-ok">✓ EGRESS: 0 KB</span>
                    <span className="telemetry-ok">✓ VRAM: GPU Enclave</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 02: Voice Interaction Waveform */}
          {activeTab === 1 && (
            <div className="cap-stage-item stage-voice">
              <div className="stage-info">
                <div className="stage-tag font-mono">CAPABILITY 02 // VOICE INTERACTION</div>
                <h3>Unified Voice Pipeline &amp; Playback Interruption</h3>
                <p>{capabilities[1].desc}</p>
                <div className="feature-tags">
                  <span className="tag-pill">Push-to-Talk (Web Audio)</span>
                  <span className="tag-pill">faster-whisper / whisper.cpp</span>
                  <span className="tag-pill">Sentence-Chunked TTS</span>
                  <span className="tag-pill">Instant Abort Controller</span>
                </div>
              </div>

              <div className="stage-visual voice-visual">
                <div className="voice-card">
                  <div className="voice-card-top font-mono">
                    <span className="status-label">
                      {voiceSimulating ? '🎙️ LISTENING (PUSH-TO-TALK ACTIVE)' : '⏸ VOICE STANDBY'}
                    </span>
                    <span className="codec-label">PCM 16kHz MONO</span>
                  </div>

                  <div className="waveform-container" aria-hidden="true">
                    {[35, 60, 95, 70, 45, 80, 100, 65, 40, 85, 90, 50, 75, 95, 60, 40, 70].map((h, i) => (
                      <span 
                        key={i} 
                        className={`wave-bar ${voiceSimulating ? 'active' : ''}`}
                        style={{ 
                          height: voiceSimulating ? `${h}%` : '15%',
                          animationDelay: `${i * 0.05}s`
                        }}
                      ></span>
                    ))}
                  </div>

                  <div className="voice-actions">
                    <button 
                      className={`btn-ptt ${voiceSimulating ? 'recording' : ''}`}
                      onClick={toggleVoiceSim}
                    >
                      {voiceSimulating ? 'Release to Transcribe' : 'Press & Hold to Simulate Voice Input'}
                    </button>
                    <div className="voice-subtext font-mono">
                      {voiceSimulating 
                        ? 'Audio captured into transient buffer → /api/voice/transcribe' 
                        : 'Audio is never stored permanently. Captured exclusively on user gesture.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 03: Persistent Memory Graph */}
          {activeTab === 2 && (
            <div className="cap-stage-item stage-memory">
              <div className="stage-info">
                <div className="stage-tag font-mono">CAPABILITY 03 // PERSISTENT MEMORY</div>
                <h3>User-Owned SQLite Semantic Knowledge Graph</h3>
                <p>{capabilities[2].desc}</p>
                <div className="planned-badge-banner">
                  <span className="font-mono">SCHEDULED: PHASE 2 DEVELOPMENT</span>
                </div>
                <div className="feature-tags">
                  <span className="tag-pill">SQLite Parameterized Store</span>
                  <span className="tag-pill">Vector Embeddings</span>
                  <span className="tag-pill">Inspectable Database</span>
                  <span className="tag-pill">User Deletion Authority</span>
                </div>
              </div>

              <div className="stage-visual memory-visual">
                <div className="memory-graph-box">
                  <div className="memory-node node-core">
                    <span className="font-mono">Ruan Memory Core</span>
                  </div>
                  <div className="memory-node node-pref">
                    <span>Preferences</span>
                    <small className="font-mono">Dark theme, concise code</small>
                  </div>
                  <div className="memory-node node-context">
                    <span>Active Workspace</span>
                    <small className="font-mono">Ruan-AI (Node/React)</small>
                  </div>
                  <div className="memory-node node-history">
                    <span>Past Decisions</span>
                    <small className="font-mono">Vanilla CSS chosen</small>
                  </div>
                  <div className="memory-lines" aria-hidden="true">
                    <div className="mem-line line-a"></div>
                    <div className="mem-line line-b"></div>
                    <div className="mem-line line-c"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 04: Agentic Workflows */}
          {activeTab === 3 && (
            <div className="cap-stage-item stage-agent">
              <div className="stage-info">
                <div className="stage-tag font-mono">CAPABILITY 04 // AGENTIC WORKFLOWS</div>
                <h3>LangGraph.js Orchestration &amp; Approval Checkpoints</h3>
                <p>{capabilities[3].desc}</p>
                <div className="planned-badge-banner">
                  <span className="font-mono">SCHEDULED: PHASE 3 DEVELOPMENT</span>
                </div>
                <div className="feature-tags">
                  <span className="tag-pill">Deterministic Graphs</span>
                  <span className="tag-pill">Stateful Memory</span>
                  <span className="tag-pill">Human-in-the-Loop</span>
                  <span className="tag-pill">Rollback Mechanism</span>
                </div>
              </div>

              <div className="stage-visual agent-visual">
                <div className="agent-pipeline-flow">
                  <div className="flow-step completed">
                    <div className="step-badge font-mono">01</div>
                    <div className="step-content">
                      <div className="step-title">Intent Analysis</div>
                      <div className="step-status font-mono">Decomposed 3 subtasks</div>
                    </div>
                  </div>

                  <div className="flow-connector active"></div>

                  <div className="flow-step waiting">
                    <div className="step-badge font-mono">02</div>
                    <div className="step-content">
                      <div className="step-title">Safety &amp; Approval Gate</div>
                      <div className="step-status font-mono">
                        {approvalGranted ? 'Approved by user' : 'Awaiting confirmation'}
                      </div>
                    </div>
                    <button 
                      className={`btn-approval ${approvalGranted ? 'granted' : ''}`}
                      onClick={() => {
                        playClickSound();
                        setApprovalGranted(!approvalGranted);
                      }}
                    >
                      {approvalGranted ? '✓ Action Confirmed' : 'Confirm Step'}
                    </button>
                  </div>

                  <div className="flow-connector"></div>

                  <div className="flow-step pending">
                    <div className="step-badge font-mono">03</div>
                    <div className="step-content">
                      <div className="step-title">Execution</div>
                      <div className="step-status font-mono">Supervised local tool invocation</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 05: Computer Interaction */}
          {activeTab === 4 && (
            <div className="cap-stage-item stage-computer">
              <div className="stage-info">
                <div className="stage-tag font-mono">CAPABILITY 05 // COMPUTER INTERACTION</div>
                <h3>Supervised Local Filesystem &amp; OS Operations</h3>
                <p>{capabilities[4].desc}</p>
                <div className="planned-badge-banner">
                  <span className="font-mono">SCHEDULED: PHASE 4 DEVELOPMENT</span>
                </div>
                <div className="feature-tags">
                  <span className="tag-pill">Sandboxed Workspaces</span>
                  <span className="tag-pill">System32 / Windows Blocklist</span>
                  <span className="tag-pill">Explicit Prompts</span>
                  <span className="tag-pill">Zero Unchecked Shell Execution</span>
                </div>
              </div>

              <div className="stage-visual computer-visual">
                <div className="sandbox-inspector">
                  <div className="sandbox-header font-mono">
                    <span>SECURITY ENVELOPE CONFIG</span>
                    <span className="sandbox-status">SANDBOX: ENFORCED</span>
                  </div>
                  <div className="sandbox-rules font-mono">
                    <div className="rule-row allowed">
                      <span className="icon">✓</span>
                      <span>ALLOW: c:\Ruan-AI\workspace\*</span>
                    </div>
                    <div className="rule-row allowed">
                      <span className="icon">✓</span>
                      <span>ALLOW: ~/Documents/Projects\*</span>
                    </div>
                    <div className="rule-row blocked">
                      <span className="icon">✕</span>
                      <span>BLOCK: C:\Windows\System32</span>
                    </div>
                    <div className="rule-row blocked">
                      <span className="icon">✕</span>
                      <span>BLOCK: ~/.ssh, app credentials, browser data</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 06: Privacy and Control */}
          {activeTab === 5 && (
            <div className="cap-stage-item stage-privacy">
              <div className="stage-info">
                <div className="stage-tag font-mono">CAPABILITY 06 // PRIVACY &amp; CONTROL</div>
                <h3>Zero Cloud Egress Architecture</h3>
                <p>{capabilities[5].desc}</p>
                <div className="feature-tags">
                  <span className="tag-pill">Local Loopback (127.0.0.1)</span>
                  <span className="tag-pill">GPU Hardware Acceleration</span>
                  <span className="tag-pill">Open Model Weights</span>
                  <span className="tag-pill">Complete Data Sovereignty</span>
                </div>
              </div>

              <div className="stage-visual privacy-visual">
                <div className="enclave-shield-card">
                  <div className="shield-icon" aria-hidden="true">🛡️</div>
                  <div className="shield-title">Private Hardware Enclave</div>
                  <p className="shield-desc">
                    All neural weights, context tokens, transcripts, and voice syntheses execute within local machine memory.
                  </p>
                  <div className="shield-stats font-mono">
                    <div className="stat">
                      <span className="stat-label">OUTBOUND TRAFFIC</span>
                      <strong className="stat-val zero">0.00 KB</strong>
                    </div>
                    <div className="stat">
                      <span className="stat-label">TELEMETRY TRACKERS</span>
                      <strong className="stat-val zero">0 DETECTED</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
