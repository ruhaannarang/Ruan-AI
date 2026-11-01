import React, { useState, useRef, useEffect } from 'react';
import './MessageComposer.css';

export default function MessageComposer({
  onSendMessage,
  onStopGeneration,
  isGenerating,
  disabled = false,
  placeholder = 'Message Ruan AI... (Enter to send, Shift + Enter for newline)'
}) {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea height to fit content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 48), 180);
    textarea.style.height = `${nextHeight}px`;
  }, [input]);

  // Focus textarea when generation finishes
  useEffect(() => {
    if (!isGenerating && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isGenerating]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || isGenerating || disabled) return;

    onSendMessage(text);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSend = input.trim().length > 0 && !isGenerating && !disabled;

  return (
    <div className="ruan-composer-container">
      <form onSubmit={handleSubmit} className="composer-form">
        <div className={`composer-input-wrapper ${isGenerating ? 'generating' : ''}`}>
          <textarea
            ref={textareaRef}
            className="composer-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isGenerating ? 'Ruan AI is responding...' : placeholder}
            disabled={isGenerating || disabled}
            rows={1}
            aria-label="Message input"
          />

          <div className="composer-controls">
            {isGenerating ? (
              <button
                type="button"
                className="composer-stop-btn"
                onClick={onStopGeneration}
                aria-label="Stop generation"
                title="Stop generation (Esc)"
              >
                <div className="stop-square" aria-hidden="true"></div>
                <span className="stop-label font-mono">STOP</span>
              </button>
            ) : (
              <button
                type="submit"
                className={`composer-send-btn ${canSend ? 'active' : ''}`}
                disabled={!canSend}
                aria-label="Send message"
                title="Send message (Enter)"
              >
                <svg className="send-icon" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M15.854.146a.5.5 0 01.11.54l-5.8 14.5a.5.5 0 01-.928.008L6.47 9.53 1.096 6.764a.5.5 0 01.008-.928L15.604.036a.5.5 0 01.25.11zM6.75 8.75l2.25 2.25L13.75 3.5 6.75 8.75z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="composer-footer-info">
          <span className="info-item font-mono">Gemma 4 E2B IT QAT</span>
          <span className="info-sep">•</span>
          <span className="info-item font-mono">100% Local Execution</span>
          <span className="info-sep">•</span>
          <span className="info-item font-mono">Push-to-Talk Voice: Phase 1.6</span>
        </div>
      </form>
    </div>
  );
}
