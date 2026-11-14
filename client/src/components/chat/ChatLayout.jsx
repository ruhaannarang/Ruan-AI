import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Sidebar from './Sidebar';
import MessageComposer from './MessageComposer';
import MessageList from './MessageList';
import ModelStatus from './ModelStatus';
import { formatModelDisplayName } from '../../services/api';
import './ChatLayout.css';

/**
 * Returns dynamic greeting based on current local time.
 */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Still up?';
  if (h < 12) return 'Good morning.';
  if (h < 17) return 'Good afternoon.';
  if (h < 22) return 'Good evening.';
  return 'Good night.';
}

export default function ChatLayout({
  chatState,
  voiceState,
  navigateTo,
  onOpenDiagnostics,
  onOpenBenchmark
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimeoutRef = useRef(null);

  const {
    conversations,
    activeId,
    activeConversation,
    isGenerating,
    setActiveId,
    createNewChat,
    deleteConversation,
    sendMessage,
    stopGeneration,
    selectedProvider,
    setSelectedProvider,
    imageProvider,
    setImageProvider
  } = chatState;

  const messages = activeConversation?.messages || [];
  const mode = messages.length === 0 ? 'empty' : 'thread';

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2600);
  }, []);

  const handleVoiceToggle = () => {
    if (!voiceState) return;
    voiceState.toggleVoiceMode();
    const nextState = !voiceState.isVoiceMode;
    showToast(nextState ? 'Voice mode on. Replies will be spoken aloud.' : 'Voice mode off.');
  };

  const greetingWords = useMemo(() => getGreeting().split(' '), []);

  // Format active model footer disclaimer
  const activeModelDisplay = useMemo(() => {
    if (selectedProvider === 'nvidia_nim') {
      return 'NVIDIA NIM (Online)';
    }
    return 'Gemma 4 E2B IT QAT · 100% local';
  }, [selectedProvider]);

  return (
    <div className={`app ${isCollapsed ? 'collapsed' : ''} ${isDrawerOpen ? 'drawer' : ''}`} data-mode={mode} id="app">
      {/* Hidden SVG Definitions Symbol */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <defs>
          <path id="pw" d="M4.5 4.2L73 4.1C92 5.5 106 22 106.9 42C107.2 52 105 62 101.8 70.2C93 58.5 78 51 60 50.2C40 49.6 22 44 12 28C7 20 5 12 4.5 4.2Z" />
          <path id="pv" d="M4 70C4 67.4 5.2 66.2 7.6 66.2L55 65.5C82 66 101 85 107.9 114.2C108.2 115 107.6 115.2 106.8 115.2L41 115.2C20 114.4 4 98 4 79Z" />
          <linearGradient id="wg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#DCDCE4" />
          </linearGradient>
          <linearGradient id="vg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="55%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#6D3FE0" />
          </linearGradient>
          <linearGradient id="shg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff" stopOpacity="0" />
            <stop offset="50%" stopColor="#fff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id="cpv"><use href="#pv" /></clipPath>
          <symbol id="mark" viewBox="0 0 112 119">
            <use href="#pw" fill="url(#wg)" />
            <use href="#pv" fill="url(#vg)" />
          </symbol>
        </defs>
      </svg>

      {/* Sidebar Navigation */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={setActiveId}
        onCreateNewChat={createNewChat}
        onDeleteConversation={deleteConversation}
        onCollapse={() => {
          if (window.innerWidth <= 860) {
            setIsDrawerOpen(false);
          } else {
            setIsCollapsed(true);
          }
        }}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        navigateTo={navigateTo}
        onOpenDiagnostics={onOpenDiagnostics}
        onOpenBenchmark={onOpenBenchmark}
        onToast={showToast}
      />

      {/* Mobile Scrim Backdrop */}
      <div className="scrim" id="scrim" onClick={() => setIsDrawerOpen(false)} />

      {/* Main Single Column Area */}
      <main className="main">
        {/* Aurora Ambient Blurred Lighting */}
        <div className="aurora" aria-hidden="true">
          <i></i>
          <i></i>
          <i></i>
        </div>

        {/* Top Controls Bar */}
        <header className="top">
          <button
            className="icon-btn only-collapsed"
            id="expand"
            aria-label="Open sidebar"
            title="Open sidebar"
            type="button"
            onClick={() => {
              if (window.innerWidth <= 860) {
                setIsDrawerOpen(true);
              } else {
                setIsCollapsed(false);
              }
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
              <path d="M9.5 4.5v15" />
            </svg>
          </button>

          <button
            className="icon-btn only-collapsed"
            id="newMini"
            aria-label="New chat"
            title="New chat"
            type="button"
            onClick={createNewChat}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>

          {/* Model Status and Switcher */}
          <ModelStatus
            selectedProvider={selectedProvider}
            onSelectProvider={setSelectedProvider}
            imageProvider={imageProvider}
            onSelectImageProvider={setImageProvider}
            onOpenDiagnostics={onOpenDiagnostics}
          />

          <div className="sp" />

          {/* Voice Mode Toggle Button */}
          <button
            className="voice"
            id="voice"
            type="button"
            aria-pressed={voiceState?.isVoiceMode ? 'true' : 'false'}
            title="Speak replies aloud with Kokoro TTS"
            onClick={handleVoiceToggle}
          >
            <span className="eq" aria-hidden="true">
              <i></i>
              <i></i>
              <i></i>
              <i></i>
            </span>
            <span className="lbl">Voice mode</span>
          </button>
        </header>

        {/* Main Stage */}
        <section className="stage" id="stage">
          {/* 1. Empty Hero View */}
          {mode === 'empty' && (
            <div className="hero enter" id="hero">
              <div className="hero-in">
                {/* Ruan AI Brand Mark with Sheen & Rings */}
                <div className="logo" aria-hidden="true">
                  <svg viewBox="0 0 112 119">
                    <g className="lw"><use href="#pw" fill="url(#wg)" /></g>
                    <g className="lv">
                      <use href="#pv" fill="url(#vg)" />
                      <g clipPath="url(#cpv)">
                        <rect className="sheen" x="0" y="50" width="46" height="80" fill="url(#shg)" />
                      </g>
                    </g>
                  </svg>
                </div>

                {/* Greeting Heading */}
                <h1 className="greet" id="greet">
                  {greetingWords.map((word, i) => (
                    <span key={i} className="w">
                      <span
                        style={{ '--i': i }}
                        className={i === greetingWords.length - 1 ? 'v' : ''}
                      >
                        {word}
                      </span>{' '}
                    </span>
                  ))}
                </h1>

                <p className="lede">
                  Ask in English, Hindi or Hinglish. Everything stays on your machine.
                </p>

                {/* Hero Centered Composer */}
                <div className="slot slot-hero" id="slotHero">
                  <MessageComposer
                    onSendMessage={sendMessage}
                    onStopGeneration={stopGeneration}
                    isGenerating={isGenerating}
                    voiceState={voiceState}
                    onToast={showToast}
                  />
                </div>

                <p className="foot-note">
                  <b>{activeModelDisplay}</b> · Ruan can make mistakes
                </p>
              </div>
            </div>
          )}

          {/* 2. Thread View */}
          {mode === 'thread' && (
            <>
              <div className="thread" id="thread">
                <MessageList
                  messages={messages}
                  voiceState={voiceState}
                  onToast={showToast}
                />
              </div>

              {/* Bottom Dock with Composer */}
              <div className="dock" id="dock">
                <div className="slot" id="slotDock">
                  <MessageComposer
                    onSendMessage={sendMessage}
                    onStopGeneration={stopGeneration}
                    isGenerating={isGenerating}
                    voiceState={voiceState}
                    onToast={showToast}
                  />
                </div>
                <p className="foot-note">
                  <b>{activeModelDisplay}</b> · Ruan can make mistakes
                </p>
              </div>
            </>
          )}
        </section>
      </main>

      {/* Floating Toast Notification */}
      <div className={`toast ${toastMessage ? 'on' : ''}`} id="toast" role="status" aria-live="polite">
        {toastMessage}
      </div>
    </div>
  );
}
