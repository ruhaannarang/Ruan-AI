import React from 'react';
import LogoMark from '../LogoMark';
import './WelcomeScreen.css';

const STARTER_PROMPTS = [
  {
    title: 'Operating Systems',
    prompt: 'Explain the difference between a mutex and a semaphore.'
  },
  {
    title: 'Full-Stack Architecture',
    prompt: 'How do I implement low-latency SSE streaming in Node.js Express?'
  },
  {
    title: 'Hinglish & Multilingual',
    prompt: 'Mujhe explain karo React mein useEffect cleanup function kaise kaam karta hai.'
  },
  {
    title: 'Local Privacy & Memory',
    prompt: 'How does Ruan keep conversation history private on my machine?'
  }
];

/**
 * Minimal, distraction-free welcome screen for Ruan AI.
 * Displays the iconic Ruan AI logo mark, personal greeting, and prompt to begin conversation.
 */
export default function WelcomeScreen({ onSelectPrompt }) {
  return (
    <div className="ruan-welcome-screen">
      {/* Central Ruan AI Logo Mark with ambient halo */}
      <div className="welcome-logo-container" aria-hidden="true">
        <LogoMark size={76} glow={true} className="welcome-hero-mark" />
      </div>

      <div className="welcome-header">
        <div className="welcome-status-chip font-mono">
          <span className="welcome-status-dot"></span>
          <span>SESSION · LOCAL RUNTIME ACTIVE</span>
        </div>
        <h1 className="welcome-title">
          <span>Good to see you. </span>
          <span className="welcome-accent">Your Machine. Your Rules.</span>
        </h1>
        <p className="welcome-subtitle">
          Ask anything in English, Hindi, or Hinglish. Every token and memory stays strictly on your machine.
        </p>
      </div>

      {onSelectPrompt && (
        <div className="welcome-prompts-grid">
          {STARTER_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              className="welcome-prompt-card"
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              title={`Send prompt: "${item.prompt}"`}
            >
              <div className="prompt-card-top font-mono">
                <span>{item.title}</span>
                <span className="prompt-arrow">→</span>
              </div>
              <p className="prompt-card-text">{item.prompt}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
