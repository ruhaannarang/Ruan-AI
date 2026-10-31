import React, { useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import './MessageBubble.css';

/**
 * Formats unix timestamp into readable 12-hour time (e.g., "10:45 PM").
 * @param {number} timestamp
 * @returns {string}
 */
function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message }) {
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
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy response:', err);
    }
  };

  return (
    <div className={`message-bubble-row ${isUser ? 'user-row' : 'assistant-row'}`}>
      <div className={`message-avatar ${isUser ? 'user-avatar' : 'assistant-avatar'}`} aria-hidden="true">
        {isUser ? (
          <span className="avatar-letter">U</span>
        ) : (
          <div className="ruan-avatar-orb">
            <span className="orb-inner"></span>
          </div>
        )}
      </div>

      <div className={`message-container ${isUser ? 'user-container' : 'assistant-container'}`}>
        <div className="message-meta-header">
          <span className="message-author">{isUser ? 'You' : 'Ruan AI'}</span>
          {!isUser && <span className="model-chip font-mono">Ling 3.0 Tiny</span>}
          <span className="message-timestamp font-mono">{formatTime(message.timestamp)}</span>
        </div>

        <div className="message-body">
          {/* Thinking indicator while waiting for first content token */}
          {message.isThinking && !message.content && (
            <div className="thinking-indicator" role="status" aria-label="Thinking">
              <span className="thinking-dot"></span>
              <span className="thinking-dot"></span>
              <span className="thinking-dot"></span>
              <span className="thinking-text font-mono">Thinking...</span>
            </div>
          )}

          {/* User message is rendered cleanly as paragraphs */}
          {isUser && (
            <div className="user-message-text">
              {message.content.split('\n').map((line, idx) => (
                <p key={idx}>{line || '\u00A0'}</p>
              ))}
            </div>
          )}

          {/* Assistant message with full Markdown & CodeBlock rendering */}
          {!isUser && message.content && (
            <div className="assistant-content">
              <MarkdownRenderer content={message.content} />
              {message.isStreaming && (
                <span className="streaming-cursor" aria-hidden="true"></span>
              )}
            </div>
          )}

          {/* Generation Error State */}
          {message.error && (
            <div className="message-error-banner" role="alert">
              <svg className="error-icon" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zM8 4a.75.75 0 01.75.75v4a.75.75 0 01-1.5 0v-4A.75.75 0 018 4z" />
              </svg>
              <span>{message.error}</span>
            </div>
          )}
        </div>

        {/* Action Row for Assistant responses */}
        {!isUser && message.content && !message.isStreaming && (
          <div className="message-actions">
            <button
              className={`action-btn font-mono ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
              aria-label={copied ? 'Response copied to clipboard' : 'Copy response to clipboard'}
              title="Copy response"
            >
              {copied ? (
                <>
                  <svg className="action-icon" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                  </svg>
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <svg className="action-icon" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z" />
                    <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z" />
                  </svg>
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
