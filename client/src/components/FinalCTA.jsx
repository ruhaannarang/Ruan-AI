import React from 'react';
import { playClickSound } from '../services/sound';
import './FinalCTA.css';

export default function FinalCTA({ onExploreDocs, onOpenDiagnostics, onLaunchApp }) {
  const handleScrollTop = () => {
    playClickSound();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="final-cta-section" id="final-cta" aria-labelledby="final-cta-heading">
      <div className="final-cta-atmosphere" aria-hidden="true">
        <div className="cta-glow-violet"></div>
        <div className="cta-glow-cyan"></div>
      </div>

      <div className="final-cta-container">
        <div className="final-cta-box">
          <div className="cta-eyebrow font-mono">SOVEREIGN PERSONAL COMPUTING</div>
          <h2 className="final-cta-heading" id="final-cta-heading">
            The future of personal AI<br />
            <span className="cta-heading-gradient">should be yours.</span>
          </h2>
          <p className="final-cta-sub">
            An intelligent companion. Running on your machine. Built around you.
          </p>

          <div className="final-cta-actions">
            <button
              className="btn-cta-primary"
              onClick={() => {
                playClickSound();
                if (onLaunchApp) onLaunchApp();
              }}
            >
              <span>Launch Ruan AI App</span>
              <span className="btn-arrow" aria-hidden="true">→</span>
            </button>

            <button 
              className="btn-cta-secondary"
              onClick={() => {
                playClickSound();
                onExploreDocs();
              }}
            >
              <span>Read the Documentation</span>
              <span className="btn-icon" aria-hidden="true">⌘</span>
            </button>

            <button 
              className="btn-cta-diagnostics"
              onClick={() => {
                playClickSound();
                onOpenDiagnostics();
              }}
            >
              <span>Node Diagnostics</span>
              <span className="pulse-dot-mini" aria-hidden="true"></span>
            </button>
          </div>

          <div className="cta-specs-row font-mono">
            <span>CORE: REACT 18 + NODE.JS</span>
            <span>INFERENCE: LM STUDIO</span>
            <span>TELEMETRY: 0 KB</span>
          </div>
        </div>
      </div>
    </section>
  );
}
