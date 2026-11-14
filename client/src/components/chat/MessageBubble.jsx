import React, { useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import './MessageBubble.css';

export default function MessageBubble({ message, voiceState, onToast }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message.content);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = message.content;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      onToast && onToast('Copied to clipboard.');
    } catch {
      onToast && onToast('Failed to copy. Select and copy manually.');
    }
  };

  const handleSpeak = () => {
    if (voiceState?.speakMessage) {
      voiceState.speakMessage(message.id, message.content);
      onToast && onToast('Reading reply aloud…');
    } else {
      onToast && onToast('Voice playback unavailable.');
    }
  };

  if (isUser) {
    return (
      <div className="msg user">
        <div className="bubble">{message.content}</div>
      </div>
    );
  }

  return (
    <div className="msg ai">
      <div className="mk" aria-hidden="true">
        <svg viewBox="0 0 112 119"><use href="#mark" /></svg>
      </div>

      <div className="body">
        {/* Thinking Indicator */}
        {message.isThinking && !message.content && (
          <div className="think" role="status" aria-label="Thinking">
            <i></i>
            <i></i>
            <i></i>
          </div>
        )}

        {/* Content with rich markdown */}
        {message.content && (
          <MarkdownRenderer content={message.content} />
        )}

        {/* Streaming Blink Cursor */}
        {message.isStreaming && <span className="cur" aria-hidden="true" />}

        {/* Error message */}
        {message.error && (
          <div className="msg-error" role="alert">
            {message.error}
          </div>
        )}

        {/* Action buttons (Copy, Read aloud) */}
        {!message.isStreaming && message.content && (
          <div className="acts">
            <button type="button" onClick={handleCopy} aria-label="Copy response">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="11" height="11" rx="2.5" />
                <path d="M5 15V6a2 2 0 0 1 2-2h8" />
              </svg>
              {copied ? 'Copied' : 'Copy'}
            </button>

            <button type="button" onClick={handleSpeak} aria-label="Read reply aloud">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5 6 9H3v6h3l5 4V5z" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              </svg>
              Read aloud
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
