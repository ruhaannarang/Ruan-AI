import React, { useRef, useEffect, useState, useCallback } from 'react';
import MessageBubble from './MessageBubble';
import WelcomeScreen from './WelcomeScreen';
import './MessageList.css';

export default function MessageList({
  messages,
  isGenerating,
  onSelectSuggestion
}) {
  const containerRef = useRef(null);
  const bottomAnchorRef = useRef(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  // Monitor user scrolling to detect if they scrolled up
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const threshold = 120;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceToBottom <= threshold;

    setIsNearBottom(nearBottom);
    setShowScrollBottomBtn(distanceToBottom > threshold);
  }, []);

  // Smoothly scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    if (bottomAnchorRef.current) {
      bottomAnchorRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  }, []);

  // Auto-scroll on new messages or incoming streaming tokens ONLY if user is already near bottom
  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom(false);
    }
  }, [messages, isGenerating, isNearBottom, scrollToBottom]);

  if (!messages || messages.length === 0) {
    return (
      <div className="message-list-empty-wrapper">
        <WelcomeScreen onSelectSuggestion={onSelectSuggestion} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="message-list-scroll-area"
      onScroll={handleScroll}
      id="chat-message-list"
    >
      <div className="message-list-inner">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={bottomAnchorRef} className="scroll-bottom-anchor" />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottomBtn && (
        <button
          className="scroll-to-bottom-floating-btn"
          onClick={() => scrollToBottom(true)}
          aria-label="Scroll to latest messages"
          title="Scroll to bottom"
        >
          <svg className="scroll-arrow-icon" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M8 1a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V1.75A.75.75 0 018 1z" />
          </svg>
          {isGenerating && <span className="generating-pulse-dot" />}
        </button>
      )}
    </div>
  );
}
