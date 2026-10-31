import React from 'react';
import './WelcomeScreen.css';

const SUGGESTIONS = [
  {
    id: 'programming',
    title: 'Explain a programming concept',
    prompt: 'Explain how Node.js event loops and async/await handle asynchronous I/O under the hood.',
    icon: '⚡'
  },
  {
    id: 'debug',
    title: 'Help me debug my code',
    prompt: 'Help me identify subtle race conditions and memory leaks in an asynchronous JavaScript stream handler.',
    icon: '🔍'
  },
  {
    id: 'research',
    title: 'Research a topic',
    prompt: 'Summarize the core architectural trade-offs between faster-whisper and whisper.cpp for local STT.',
    icon: '🧠'
  },
  {
    id: 'planning',
    title: 'Help me plan my day',
    prompt: 'Help me structure a focused engineering workday with time blocks for deep architecture design and code review.',
    icon: '📅'
  }
];

export default function WelcomeScreen({ onSelectSuggestion }) {
  return (
    <div className="ruan-welcome-screen">
      {/* Subtle Animated Ruan AI Orb Element */}
      <div className="welcome-orb-container" aria-hidden="true">
        <div className="welcome-orb-halo"></div>
        <div className="welcome-orb-ring ring-1"></div>
        <div className="welcome-orb-ring ring-2"></div>
        <div className="welcome-orb-core"></div>
      </div>

      <div className="welcome-header">
        <h1 className="welcome-title">Good to see you.</h1>
        <p className="welcome-subtitle">What would you like to work on?</p>
      </div>

      {/* Suggested Prompt Cards */}
      <div className="welcome-suggestions-grid">
        {SUGGESTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="suggestion-card"
            onClick={() => onSelectSuggestion(item.prompt)}
          >
            <div className="suggestion-icon-wrap">
              <span className="suggestion-icon">{item.icon}</span>
            </div>
            <div className="suggestion-text">
              <span className="suggestion-title">{item.title}</span>
              <span className="suggestion-prompt">{item.prompt}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
