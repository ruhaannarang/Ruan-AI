import React from 'react';
import './Privacy.css';

export default function Privacy() {
  const securityPillars = [
    {
      title: 'Local Loopback Binding',
      tag: 'NETWORK ARCHITECTURE',
      desc: 'The Express gateway binds strictly to 127.0.0.1 by default. No open ports exposed to the local area network (LAN) without explicit user reconfiguration.'
    },
    {
      title: 'Zero Third-Party Cloud Egress',
      tag: 'INFERENCE INTEGRITY',
      desc: 'All conversational token generation is routed to your local LM Studio runtime. Prompts, contexts, and outputs are never broadcast to remote AI vendors.'
    },
    {
      title: 'Transient Audio Processing',
      tag: 'VOICE PRIVACY',
      desc: 'Microphone audio is captured strictly through user-initiated Push-to-Talk. Raw PCM audio is buffered in transient RAM and discarded immediately after transcription.'
    },
    {
      title: 'Supervised Path Whitelisting',
      tag: 'PLANNED OS ENVELOPE',
      desc: 'Tool execution is constrained to designated workspace folders. Access to sensitive directories (Windows system paths, credential stores, browser caches) is blocked.'
    },
    {
      title: 'Human-in-the-Loop Safeguards',
      tag: 'ACTION GOVERNANCE',
      desc: 'Potentially destructive operations (file mutations, shell execution) will require explicit, interactive user consent before any action is executed.'
    },
    {
      title: 'Transparent Inspection',
      tag: 'OPEN AUDITING',
      desc: 'All system logs, database entries, and gateway endpoints are inspectable in plain JSON and SQLite format directly from your machine.'
    }
  ];

  return (
    <section className="privacy-section" id="privacy" aria-labelledby="privacy-heading">
      <div className="privacy-container">
        {/* Header */}
        <div className="privacy-header">
          <div className="section-eyebrow font-mono">04 // PRIVACY &amp; SECURITY</div>
          <h2 className="privacy-heading" id="privacy-heading">
            Your machine. Your data.<br />
            <span className="privacy-heading-accent">Your control.</span>
          </h2>
          <p className="privacy-sub">
            We reject the premise that powerful artificial intelligence requires forfeiting privacy. Ruan AI is architected from the silicon up to maximize sovereignty without making naive, absolute promises.
          </p>
        </div>

        {/* 6 Security Pillars Grid */}
        <div className="security-pillars-grid">
          {securityPillars.map((pillar, idx) => (
            <div key={idx} className="security-pillar-card">
              <div className="pillar-top font-mono">
                <span className="pillar-idx">0{idx + 1}</span>
                <span className="pillar-tag">{pillar.tag}</span>
              </div>
              <h3 className="pillar-card-title">{pillar.title}</h3>
              <p className="pillar-card-desc">{pillar.desc}</p>
            </div>
          ))}
        </div>

        {/* Honest Security Manifesto Callout */}
        <div className="security-manifesto-box">
          <div className="manifesto-seal font-mono">HONEST SECURITY COMMITMENT</div>
          <div className="manifesto-text">
            <h4>No snake-oil claims. An architecturally honest posture.</h4>
            <p>
              Security is an active posture, not a marketing buzzword. Ruan AI does not claim impenetrable invulnerability. Instead, we minimize your attack surface by keeping inference offline, confining file access scopes, and subjecting any future agentic tool actions to human confirmation gates.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
