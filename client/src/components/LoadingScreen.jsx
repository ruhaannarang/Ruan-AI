import React, { useState, useEffect } from 'react';
import { playOrbInitSound, playStartupSound } from '../services/sound';
import './LoadingScreen.css';

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const statusPhases = [
    'ESTABLISHING LOCAL SYSTEM BUS...',
    'ALIGNING NEURAL PIPELINES...',
    'INITIALIZING INTELLIGENCE...',
    'LOCAL ENCLAVE SECURED.'
  ];

  useEffect(() => {
    // Sound cue on initial orb activation
    playOrbInitSound();

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Smooth non-linear progression
        const delta = Math.floor(Math.random() * 8) + 4;
        const next = Math.min(prev + delta, 100);
        
        if (next > 75) setPhaseIndex(3);
        else if (next > 45) setPhaseIndex(2);
        else if (next > 20) setPhaseIndex(1);

        return next;
      });
    }, 90);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress === 100) {
      playStartupSound();
      const exitTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 400);

      const finishTimer = setTimeout(() => {
        onComplete();
      }, 1000);

      return () => {
        clearTimeout(exitTimer);
        clearTimeout(finishTimer);
      };
    }
  }, [progress, onComplete]);

  const handleSkip = (e) => {
    if (e) e.stopPropagation();
    setIsFadingOut(true);
    try {
      sessionStorage.setItem('ruan_initialized', 'true');
    } catch {}
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  return (
    <div 
      className={`loading-screen ${isFadingOut ? 'fade-out' : ''}`}
      role="dialog"
      aria-label="Ruan AI Initialization"
      aria-modal="true"
      onClick={handleSkip}
    >
      <div className="loading-content">
        {/* Animated Central Orb and Rings */}
        <div className="orbital-system" aria-hidden="true">
          <div className="ring ring-outer"></div>
          <div className="ring ring-middle"></div>
          <div className="ring ring-inner"></div>
          
          {/* Shimmering Core */}
          <div className="core-orb">
            <div className="core-glow"></div>
            <div className="core-center"></div>
          </div>

          {/* Floating Ambient Sparkles */}
          <div className="particle particle-1"></div>
          <div className="particle particle-2"></div>
          <div className="particle particle-3"></div>
          <div className="particle particle-4"></div>
        </div>

        {/* Brand Reveal */}
        <div className="loading-branding">
          <h1 className="loading-title">RUAN AI</h1>
          <div className="status-label-container">
            <span className="pulsing-indicator">●</span>
            <span className="loading-status-text">{statusPhases[phaseIndex]}</span>
          </div>
        </div>

        {/* Minimal Progress Bar */}
        <div className="progress-container">
          <div 
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="progress-percentage font-mono">{progress}%</div>

        {/* Skip Action */}
        <button 
          className="skip-btn"
          onClick={handleSkip}
          aria-label="Skip initialization sequence"
        >
          Click anywhere or Skip to Home →
        </button>
      </div>
    </div>
  );
}
