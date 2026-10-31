import React from 'react';
import './Roadmap.css';

export default function Roadmap() {
  const roadmapPhases = [
    {
      phase: 'Phase 1',
      title: 'Core Foundation & Voice',
      status: 'in-progress',
      statusLabel: 'IN PROGRESS // FOUNDATION ONLINE',
      timeline: 'Active Milestone',
      desc: 'Monorepo architecture with decoupled services, streaming text chat via LM Studio, push-to-talk voice capture, and local STT/TTS candidate evaluation.',
      items: [
        { name: 'React + Vite + Vanilla CSS frontend setup', state: 'done' },
        { name: 'Node.js Express backend with decoupled health checks', state: 'done' },
        { name: 'LM Studio streaming chat via Server-Sent Events', state: 'in-progress' },
        { name: 'Push-to-talk microphone capture with transient buffer', state: 'in-progress' },
        { name: 'Local STT benchmarking (faster-whisper vs whisper.cpp)', state: 'in-progress' },
        { name: 'Sentence-chunked local TTS (Piper vs Kokoro) with Abort interruption', state: 'in-progress' }
      ]
    },
    {
      phase: 'Phase 2',
      title: 'Persistent Memory',
      status: 'planned',
      statusLabel: 'PLANNED',
      timeline: 'Upcoming Phase',
      desc: 'Local SQLite database architecture for persisting conversation turns, semantic indexing, and user-owned long-term memory retrieval.',
      items: [
        { name: 'SQLite integration with parameterized queries', state: 'planned' },
        { name: 'Conversation history persistence and session restore', state: 'planned' },
        { name: 'Semantic vector memory embeddings', state: 'planned' },
        { name: 'User-governed memory inspection and selective pruning', state: 'planned' }
      ]
    },
    {
      phase: 'Phase 3',
      title: 'Agentic Intelligence',
      status: 'planned',
      statusLabel: 'PLANNED',
      timeline: 'Upcoming Phase',
      desc: 'Deterministic multi-step planning and tool invocation engine using LangGraph.js, with interruptible state machines and approval checkpoints.',
      items: [
        { name: 'LangGraph.js state graph orchestrator integration', state: 'planned' },
        { name: 'Multi-step task decomposition and planning', state: 'planned' },
        { name: 'Human-in-the-loop interruption and approval gates', state: 'planned' },
        { name: 'Tool execution telemetry and rollback handlers', state: 'planned' }
      ]
    },
    {
      phase: 'Phase 4',
      title: 'Computer Interaction',
      status: 'planned',
      statusLabel: 'PLANNED',
      timeline: 'Upcoming Phase',
      desc: 'Supervised interaction with host computer files, directory workspaces, and desktop applications under rigid security scopes.',
      items: [
        { name: 'Confined workspace filesystem operations (read/write/search)', state: 'planned' },
        { name: 'Whitelisted desktop application launching', state: 'planned' },
        { name: 'Supervised shell commands with confirmation prompts', state: 'planned' },
        { name: 'System32 and sensitive path blocklist enforcement', state: 'planned' }
      ]
    },
    {
      phase: 'Phase 5',
      title: 'Desktop Experience',
      status: 'planned',
      statusLabel: 'PLANNED',
      timeline: 'Upcoming Phase',
      desc: 'Native desktop shell via Electron packaging backend and client into an integrated local OS app with global hotkeys.',
      items: [
        { name: 'Electron wrapper with isolated contextBridge', state: 'planned' },
        { name: 'System tray resident icon and background service', state: 'planned' },
        { name: 'Global push-to-talk hotkeys (OS-wide invocation)', state: 'planned' },
        { name: 'Automated local runtime lifecycle management', state: 'planned' }
      ]
    },
    {
      phase: 'Phase 6',
      title: 'Advanced Voice',
      status: 'planned',
      statusLabel: 'PLANNED',
      timeline: 'Upcoming Phase',
      desc: 'Hands-free ambient voice activation, acoustic echo cancellation, and fluid real-time full-duplex conversational voice.',
      items: [
        { name: 'Local low-power wake-word detection engine', state: 'planned' },
        { name: 'Hardware acoustic echo cancellation (AEC)', state: 'planned' },
        { name: 'Full-duplex conversational voice with natural barge-in', state: 'planned' },
        { name: 'Adaptive speech rate and prosody modulation', state: 'planned' }
      ]
    }
  ];

  return (
    <section className="roadmap-section" id="roadmap" aria-labelledby="roadmap-heading">
      <div className="roadmap-container">
        {/* Header */}
        <div className="roadmap-header">
          <div className="section-eyebrow font-mono">06 // EVOLUTION TIMELINE</div>
          <h2 className="roadmap-heading" id="roadmap-heading">
            Building towards<br />
            <span className="roadmap-heading-accent">something bigger.</span>
          </h2>
          <p className="roadmap-sub">
            Our multi-phase roadmap moves deliberately from a reliable local voice and chat foundation towards an autonomous, privacy-preserving desktop operating companion.
          </p>
        </div>

        {/* Timeline Sequence */}
        <div className="roadmap-timeline">
          {roadmapPhases.map((phase, idx) => (
            <div key={idx} className={`timeline-entry ${phase.status}`}>
              {/* Timeline Marker Dot */}
              <div className="timeline-marker">
                <span className={`marker-dot ${phase.status}`}></span>
                {idx < roadmapPhases.length - 1 && <div className="timeline-stem"></div>}
              </div>

              {/* Timeline Content Card */}
              <div className="timeline-card">
                <div className="timeline-card-header font-mono">
                  <span className="phase-pill-number">{phase.phase}</span>
                  <span className={`phase-status-badge ${phase.status}`}>
                    {phase.statusLabel}
                  </span>
                  <span className="phase-timeline-text">{phase.timeline}</span>
                </div>

                <h3 className="phase-title">{phase.title}</h3>
                <p className="phase-desc">{phase.desc}</p>

                {/* Checklist of deliverables */}
                <ul className="phase-items-list">
                  {phase.items.map((item, i) => (
                    <li key={i} className={`item-check ${item.state}`}>
                      <span className="check-icon font-mono">
                        {item.state === 'done' ? '✓' : item.state === 'in-progress' ? '◐' : '○'}
                      </span>
                      <span className="item-text">{item.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
