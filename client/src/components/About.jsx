import React, { useState } from 'react';
import { playClickSound } from '../services/sound';
import './About.css';

export default function About() {
  const [activeTab, setActiveTab] = useState('philosophy');

  const comparisons = [
    {
      label: 'Data Residency',
      cloud: 'Transmitted to remote multi-tenant cloud clusters',
      ruan: '100% strictly confined to your local hardware',
      highlight: true
    },
    {
      label: 'Intelligence Runtime',
      cloud: 'Closed-source proprietary APIs with telemetry & rate limits',
      ruan: 'Open models running natively via local LM Studio runtime',
      highlight: false
    },
    {
      label: 'Memory & State',
      cloud: 'Siloed on corporate servers, mined for model training',
      ruan: 'Personal SQLite knowledge graph fully inspectable & user-owned',
      highlight: true
    },
    {
      label: 'System Integration',
      cloud: 'Isolated in a browser tab with zero local OS access',
      ruan: 'Explicitly supervised file, shell, and desktop automation',
      highlight: false
    },
    {
      label: 'Network Dependency',
      cloud: 'Useless without constant high-speed internet connection',
      ruan: 'Fully autonomous offline execution on your own machine',
      highlight: true
    }
  ];

  return (
    <section className="about-section" id="about" aria-labelledby="about-heading">
      <div className="about-container">
        {/* Section Header */}
        <div className="about-header">
          <div className="section-eyebrow font-mono">01 // THE PHILOSOPHY</div>
          <h2 className="about-heading" id="about-heading">
            More than a chatbot.<br />
            <span className="about-heading-accent">A companion that works with you.</span>
          </h2>
          <p className="about-lead">
            Modern AI is predominantly locked behind cloud subscriptions, harvesting your conversations and treating you as a tenant. Ruan AI flips the paradigm: sovereign intelligence that lives on your computer, respects your boundaries, and evolves alongside you.
          </p>
        </div>

        {/* Editorial Narrative Split */}
        <div className="about-narrative-grid">
          {/* Manifesto Card */}
          <div className="narrative-card manifesto-card">
            <div className="card-badge font-mono">VISION MANIFESTO</div>
            <h3 className="manifesto-title">Designed to become an intelligent operating companion.</h3>
            <p className="manifesto-body">
              Instead of switching between isolated browser tabs, fragmented tools, and disconnected chats, Ruan AI unites natural dialogue, real-time voice, long-term memory, and local OS automation into a single coherent interface.
            </p>
            <div className="manifesto-pillars">
              <div className="pillar-item">
                <span className="pillar-num font-mono">01</span>
                <div>
                  <h4>Local-First Intelligence</h4>
                  <p>Inference executes directly on your GPU/CPU via LM Studio with zero mandatory network egress.</p>
                </div>
              </div>
              <div className="pillar-item">
                <span className="pillar-num font-mono">02</span>
                <div>
                  <h4>Deterministic Sovereignty</h4>
                  <p>Your files, credentials, and prompts remain under your explicit control and supervision.</p>
                </div>
              </div>
              <div className="pillar-item">
                <span className="pillar-num font-mono">03</span>
                <div>
                  <h4>Action Over Conversation</h4>
                  <p>Progress beyond passive chat towards autonomous multi-step workflows and desktop tooling.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Comparison Matrix */}
          <div className="narrative-card comparison-card">
            <div className="comparison-header">
              <div className="card-badge font-mono">PARADIGM SHIFT</div>
              <h3 className="comparison-title">Cloud AI vs Ruan Local Companion</h3>
            </div>

            <div className="comparison-table-wrapper">
              <div className="comparison-table-header font-mono">
                <span>ARCHITECTURAL VECTOR</span>
                <span>CLOUD AI CHATBOTS</span>
                <span className="ruan-col-header">RUAN AI COMPANION</span>
              </div>

              <div className="comparison-rows">
                {comparisons.map((item, idx) => (
                  <div key={idx} className={`comparison-row ${item.highlight ? 'row-highlight' : ''}`}>
                    <div className="row-vector font-mono">{item.label}</div>
                    <div className="row-cloud">{item.cloud}</div>
                    <div className="row-ruan">
                      <span className="ruan-check">✦</span> {item.ruan}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="comparison-footnote font-mono">
              * Note: Phase 1 provides the local React + Express + LM Studio foundation; SQLite memory & LangGraph agents are scheduled across upcoming phases.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
