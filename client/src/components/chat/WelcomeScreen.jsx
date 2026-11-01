import React from 'react';
import LogoMark from '../LogoMark';
import './WelcomeScreen.css';

/**
 * Minimal, distraction-free welcome screen for Ruan AI.
 * Displays the iconic Ruan AI logo mark, personal greeting, and prompt to begin conversation.
 */
export default function WelcomeScreen() {
  return (
    <div className="ruan-welcome-screen">
      {/* Central Ruan AI Logo Mark with ambient halo */}
      <div className="welcome-logo-container" aria-hidden="true">
        <LogoMark size={72} glow={true} className="welcome-hero-mark" />
      </div>

      <div className="welcome-header">
        <h1 className="welcome-title">Good to see you.</h1>
        <p className="welcome-subtitle">What would you like to work on?</p>
      </div>
    </div>
  );
}
