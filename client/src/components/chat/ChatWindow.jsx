import React from 'react';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import ModelStatus from './ModelStatus';
import UserMenu from '../auth/UserMenu';
import './ChatWindow.css';

export default function ChatWindow({
  activeConversation,
  isGenerating,
  onSendMessage,
  onStopGeneration,
  onCreateNewChat,
  onToggleSidebar,
  onOpenDiagnostics
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
          {/* Model Status Pill & Popover */}
          <ModelStatus onOpenDiagnostics={onOpenDiagnostics} />

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
        />
      </div>

      {/* Sticky Message Composer at Bottom */}
      <footer className="chat-window-footer">
        <MessageComposer
          onSendMessage={onSendMessage}
          onStopGeneration={onStopGeneration}
          isGenerating={isGenerating}
        />
      </footer>
    </main>
  );
}
