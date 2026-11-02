import React from 'react';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import ModelStatus from './ModelStatus';
import UserMenu from '../auth/UserMenu';
import './ChatWindow.css';

export default function ChatWindow({
  activeConversation,
  isGenerating,
  voiceState,
  onSendMessage,
  onStopGeneration,
  onCreateNewChat,
  onToggleSidebar,
  onOpenDiagnostics,
  onOpenBenchmark
}) {
  const messages = activeConversation?.messages || [];
  const title = activeConversation?.title || 'New Chat';

  return (
    <main className="ruan-chat-window" id="chat-window-main" aria-label="Conversation View">
      {/* Top Header Bar */}
      <header className="chat-window-header">
        <div className="header-left">
          {/* Mobile hamburger button */}
          <button
            className="mobile-sidebar-toggle-btn"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation sidebar"
            type="button"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="hamburger-icon">
              <path fillRule="evenodd" d="M2 3.75A.75.75 0 012.75 3h10.5a.75.75 0 010 1.5H2.75A.75.75 0 012 3.75zM2 8a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H2.75A.75.75 0 012 8zm0 4.25a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" />
            </svg>
          </button>

          <div className="chat-title-group">
            <h2 className="active-conv-title" title={title}>
              {title}
            </h2>
            <span className="conv-msg-count font-mono">
              {messages.length} {messages.length === 1 ? 'msg' : 'msgs'}
            </span>
          </div>
        </div>

        <div className="header-right">
          {/* Voice Mode Toggle Button */}
          {voiceState && (
            <button
              className={`voice-mode-toggle-btn font-mono ${voiceState.isVoiceMode ? 'active' : ''}`}
              onClick={voiceState.toggleVoiceMode}
              type="button"
              title={voiceState.isVoiceMode ? 'Voice Mode Active: Assistant auto-speaks responses. Click to disable.' : 'Voice Mode Inactive: Click to enable auto-spoken responses.'}
              aria-label="Toggle auto voice response mode"
              aria-pressed={voiceState.isVoiceMode}
            >
              <svg className="voice-mode-icon" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.55 1.45a.75.75 0 011.06 0 9 9 0 010 12.73.75.75 0 11-1.06-1.06 7.5 7.5 0 000-10.61.75.75 0 010-1.06zM9.07 3.93a.75.75 0 011.06 0 5.5 5.5 0 010 7.78.75.75 0 11-1.06-1.06 4 4 0 000-5.66.75.75 0 010-1.06z" />
                <path d="M7 3.25v9.5a.75.75 0 01-1.28.53L3.18 10.75H1.5A1.5 1.5 0 010 9.25v-2.5A1.5 1.5 0 011.5 5.25h1.68l2.54-2.53A.75.75 0 017 3.25z" />
              </svg>
              <span className="voice-mode-label">{voiceState.isVoiceMode ? 'Voice Mode' : 'Voice Off'}</span>
            </button>
          )}

          {/* Model Status Pill & Popover */}
          <ModelStatus onOpenDiagnostics={onOpenDiagnostics} />

          {/* Voice & Hinglish Benchmark Button */}
          {onOpenBenchmark && (
            <button
              className="header-benchmark-btn font-mono"
              onClick={onOpenBenchmark}
              type="button"
              title="Open Hinglish & Multilingual Voice Benchmark (Phase 1.6.1)"
              aria-label="Open voice benchmark"
            >
              🎙️ Benchmark
            </button>
          )}

          {/* Quick New Chat Button */}
          <button
            className="header-new-chat-btn font-mono"
            onClick={onCreateNewChat}
            title="Start fresh conversation"
            type="button"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="plus-icon">
              <path d="M7.75 2a.75.75 0 01.75.75V7h4.25a.75.75 0 010 1.5H8.5v4.25a.75.75 0 01-1.5 0V8.5H2.75a.75.75 0 010-1.5H7V2.75A.75.75 0 017.75 2z" />
            </svg>
            <span className="btn-label">New</span>
          </button>

          {/* Google Account Profile / Sign-in */}
          <UserMenu compact={true} />
        </div>
      </header>

      {/* Main Messages Feed */}
      <div className="chat-window-body">
        <MessageList
          messages={messages}
          isGenerating={isGenerating}
          voiceState={voiceState}
        />
      </div>

      {/* Sticky Message Composer at Bottom */}
      <footer className="chat-window-footer">
        <MessageComposer
          onSendMessage={onSendMessage}
          onStopGeneration={onStopGeneration}
          isGenerating={isGenerating}
          voiceState={voiceState}
        />
      </footer>
    </main>
  );
}
