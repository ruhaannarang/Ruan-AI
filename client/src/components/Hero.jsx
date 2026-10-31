import React, { useState, useEffect, useRef } from 'react';
import { playClickSound } from '../services/sound';
import './Hero.css';

export default function Hero({ onExploreDocs, onExploreCapabilities, onLaunchApp }) {
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const heroRef = useRef(null);

  // Subtle interactive parallax tilt on cursor movement
  const handleMouseMove = (e) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseOffset({ x: x * 20, y: y * 20 });
  };

  const handleResetMouse = () => {
    setMouseOffset({ x: 0, y: 0 });
  };

  return (
    <section 
      className="hero-section" 
      id="hero" 
      ref={heroRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleResetMouse}
      aria-label="Hero Introduction"
    >
      {/* Background Radial Ambiance */}
      <div className="hero-atmosphere" aria-hidden="true">
        <div className="hero-glow-violet"></div>
        <div className="hero-glow-cyan"></div>
        <div className="hero-grid-lines"></div>
      </div>

      <div className="hero-container">
        {/* Left/Top Content */}
        <div className="hero-text-col">
          {/* Status Badge */}
          <div className="hero-status-pill">
            <span className="hero-status-dot"></span>
            <span className="font-mono hero-status-label">LOCAL-FIRST INTELLIGENCE</span>
          </div>

          {/* Main Headline */}
          <h1 className="hero-headline">
            Your AI.<br />
            Your Machine.<br />
            <span className="gradient-text">Your Rules.</span>
          </h1>

          {/* Supporting Copy */}
          <p className="hero-description">
            Meet <strong>Ruan AI</strong> — a personal, local-first AI companion built to understand you, remember what matters, and help you get things done directly on your hardware.
          </p>

          {/* Action CTAs */}
          <div className="hero-cta-group">
            <button 
              className="btn-hero-primary"
              id="cta-explore-ruan"
              onClick={() => {
                playClickSound();
                if (onLaunchApp) {
                  onLaunchApp();
                } else {
                  onExploreCapabilities();
                }
              }}
            >
              <span>Launch Ruan AI</span>
              <span className="btn-arrow" aria-hidden="true">→</span>
            </button>

            <button 
              className="btn-hero-secondary"
              id="cta-explore-docs"
              onClick={() => {
                playClickSound();
                onExploreDocs();
              }}
            >
              <span>Explore Documentation</span>
              <span className="btn-icon-code" aria-hidden="true">⌘</span>
            </button>
          </div>

          {/* Micro Telemetry Badges */}
          <div className="hero-telemetry-row">
            <div className="telemetry-item">
              <span className="telemetry-check">✓</span>
              <span>100% Local Inference (LM Studio)</span>
            </div>
            <div className="telemetry-item">
              <span className="telemetry-check">✓</span>
              <span>Zero Forced Telemetry</span>
            </div>
            <div className="telemetry-item">
              <span className="telemetry-check">✓</span>
              <span>Streaming Voice Pipeline</span>
            </div>
          </div>
        </div>

        {/* Right/Bottom Visual: Interactive 3D AI Orb Centerpiece */}
        <div className="hero-visual-col">
          <div 
            className="hero-orb-wrapper"
            style={{
              transform: `perspective(1000px) rotateY(${mouseOffset.x}deg) rotateX(${-mouseOffset.y}deg)`
            }}
          >
            {/* Outer Atmospheric Aura */}
            <div className="hero-orb-halo"></div>

            {/* Orbiting Multi-Layer Rings */}
            <div className="orb-ring ring-1"></div>
            <div className="orb-ring ring-2"></div>
            <div className="orb-ring ring-3"></div>

            {/* AI Core Orb */}
            <div className="hero-orb-core">
              <div className="orb-specular-highlight"></div>
              <div className="orb-inner-wave"></div>
            </div>

            {/* Ambient Orbiting Micro-Nodes */}
            <div className="orb-node node-alpha">
              <span className="node-tooltip font-mono">LM Studio</span>
            </div>
            <div className="orb-node node-beta">
              <span className="node-tooltip font-mono">Whisper STT</span>
            </div>
            <div className="orb-node node-gamma">
              <span className="node-tooltip font-mono">Piper TTS</span>
            </div>

            {/* Floating Hardware Metric Card */}
            <div className="hero-floating-badge" id="hero-status-card">
              <div className="badge-header">
                <span className="badge-pulse"></span>
                <span className="font-mono badge-title">ACTIVE ENCLAVE</span>
              </div>
              <div className="badge-metrics font-mono">
                <div><span>MODE:</span> <strong>LOCAL LOOPBACK</strong></div>
                <div><span>EGRESS:</span> <strong className="green">BLOCKED (0 KB)</strong></div>
                <div><span>PIPELINE:</span> <strong>SSE + VOICE</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
