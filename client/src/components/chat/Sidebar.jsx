import React, { useState, useMemo } from 'react';
import LogoMark from '../LogoMark';
import UserMenu from '../auth/UserMenu';
import './Sidebar.css';

/**
 * Formats conversation date into relative or concise date string.
 * @param {number} timestamp
 * @returns {string}
 */
function formatConvDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function Sidebar({
  conversations,
  activeId,
  onSelectConversation,
  onCreateNewChat,
  onDeleteConversation,
  isOpen,
  onClose,
  navigateTo,
  onOpenDiagnostics
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  // Filter conversations in-memory by search query across titles and message content
  const filteredConversations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return conversations;

    return conversations.filter((c) => {
      if (c.title?.toLowerCase().includes(q)) return true;
      return c.messages?.some((m) => m.content?.toLowerCase().includes(q));
    });
  }, [conversations, searchQuery]);

  const handleDeleteClick = (e, convId) => {
    e.stopPropagation();
    setPendingDeleteId(convId);
  };

  const handleConfirmDelete = (e, convId) => {
    e.stopPropagation();
    onDeleteConversation(convId);
    setPendingDeleteId(null);
  };

  const handleCancelDelete = (e) => {
    e.stopPropagation();
    setPendingDeleteId(null);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`ruan-sidebar ${isOpen ? 'open' : ''}`} aria-label="Conversation Sidebar">
        {/* Top Header: Brand Wordmark & Back Button */}
        <div className="sidebar-header">
          <button
            className="sidebar-brand-btn"
            onClick={() => navigateTo('/')}
            title="Return to Ruan AI overview"
            type="button"
          >
            <LogoMark size={26} />
            <div className="sidebar-brand-divider" aria-hidden="true" />
            <div className="brand-name-group">
              <span className="brand-text">Ruan <span className="brand-ai">AI</span></span>
              <span className="sidebar-version-badge font-mono">v0.1.0-alpha.3</span>
            </div>
          </button>

          {/* Close drawer on mobile */}
          <button
            className="sidebar-close-mobile-btn"
            onClick={onClose}
            aria-label="Close sidebar"
            type="button"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="close-icon">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>

        {/* Primary Action: New Chat Button */}
        <div className="sidebar-action-bar">
          <button
            className="new-chat-btn"
            onClick={() => {
              onCreateNewChat();
              if (window.innerWidth < 1024) onClose();
            }}
            type="button"
          >
            <svg className="new-chat-icon" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.75 2a.75.75 0 01.75.75V7h4.25a.75.75 0 010 1.5H8.5v4.25a.75.75 0 01-1.5 0V8.5H2.75a.75.75 0 010-1.5H7V2.75A.75.75 0 017.75 2z" />
            </svg>
            <span>New Chat</span>
          </button>
        </div>

        {/* Search Conversations Input */}
        <div className="sidebar-search-container">
          <div className="search-input-box">
            <svg className="search-icon" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M11.5 7a4.499 4.499 0 11-8.998 0A4.499 4.499 0 0111.5 7zm-.82 4.74a6 6 0 111.06-1.06l3.04 3.04a.75.75 0 11-1.06 1.06l-3.04-3.04z" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search conversations"
            />
            {searchQuery && (
              <button
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                type="button"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="sidebar-conversations-feed" role="navigation" aria-label="Recent chats">
          <div className="feed-section-label font-mono">RECENT CHATS</div>

          {filteredConversations.length === 0 ? (
            <div className="empty-search-state">
              <span>No conversations found</span>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeId;
              const isDeleting = pendingDeleteId === conv.id;

              return (
                <div
                  key={conv.id}
                  className={`conversation-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    if (window.innerWidth < 1024) onClose();
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSelectConversation(conv.id);
                  }}
                >
                  <div className="conv-indicator-bar" aria-hidden="true" />

                  <div className="conv-item-content">
                    <div className="conv-item-top">
                      <span className="conv-title" title={conv.title}>
                        {conv.title || 'New Chat'}
                      </span>
                      <span className="conv-time font-mono">{formatConvDate(conv.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Delete Action with Confirmation Dialog */}
                  {isDeleting ? (
                    <div className="inline-delete-confirm" onClick={(e) => e.stopPropagation()}>
                      <span className="confirm-prompt">Delete?</span>
                      <button
                        className="confirm-yes-btn font-mono"
                        onClick={(e) => handleConfirmDelete(e, conv.id)}
                        type="button"
                      >
                        Yes
                      </button>
                      <button
                        className="confirm-no-btn font-mono"
                        onClick={handleCancelDelete}
                        type="button"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      className="conv-delete-btn"
                      onClick={(e) => handleDeleteClick(e, conv.id)}
                      aria-label={`Delete conversation ${conv.title}`}
                      title="Delete chat"
                      type="button"
                    >
                      <svg viewBox="0 0 16 16" fill="currentColor" className="trash-icon">
                        <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 000 1.5h.3l.815 8.15A1.5 1.5 0 005.357 15h5.285a1.5 1.5 0 001.493-1.35l.815-8.15h.3a.75.75 0 000-1.5H11v-.75A2.25 2.25 0 008.75 1h-1.5A2.25 2.25 0 005 3.25zm2.25-.75a.75.75 0 00-.75.75V4h3v-.75a.75.75 0 00-.75-.75h-1.5zM6.05 6a.75.75 0 01.787.713l.275 5.5a.75.75 0 01-1.498.075l-.275-5.5A.75.75 0 016.05 6zm3.9 0a.75.75 0 01.712.787l-.275 5.5a.75.75 0 01-1.498-.075l.275-5.5a.75.75 0 01.786-.712z" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer Controls */}
        <div className="sidebar-footer">
          {/* User Account Identity & Sign-In */}
          <div className="sidebar-account-row">
            <UserMenu compact={false} />
          </div>

          {/* Settings / Diagnostics Entry */}
          <button
            className="sidebar-footer-btn"
            onClick={onOpenDiagnostics}
            type="button"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="footer-btn-icon">
              <path fillRule="evenodd" d="M7.429 1.525a6.593 6.593 0 011.142 0c.036.003.108.036.137.146l.289 1.105c.147.56.55.997 1.079 1.204.53.207 1.13.164 1.587-.137l.913-.603c.09-.06.166-.046.195-.026a6.602 6.602 0 01.808.808c.02.03.034.105-.026.195l-.603.913c-.301.456-.344 1.057-.137 1.587.207.53.644.932 1.204 1.079l1.105.289c.11.03.143.101.146.137a6.593 6.593 0 010 1.142c-.003.036-.036.108-.146.137l-1.105.289c-.56.147-.997.55-1.204 1.079-.207.53-.164 1.13.137 1.587l.603.913c.06.09.046.166.026.195a6.602 6.602 0 01-.808.808c-.03.02-.105.034-.195-.026l-.913-.603c-.456-.301-1.057-.344-1.587-.137-.53.207-.932.644-1.079 1.204l-.289 1.105c-.03.11-.101.143-.137.146a6.593 6.593 0 01-1.142 0c-.036-.003-.108-.036-.137-.146l-.289-1.105c-.147-.56-.55-.997-1.079-1.204-.53-.207-1.13-.164-1.587.137l-.913.603c-.09.06-.166.046-.195.026a6.602 6.602 0 01-.808-.808c-.02-.03-.034-.105.026-.195l.603-.913c.301-.456.344-1.057.137-1.587-.207-.53-.644-.932-1.204-1.079l-1.105-.289c-.11-.03-.143-.101-.146-.137a6.593 6.593 0 010-1.142c.003-.036.036-.108.146-.137l1.105-.289c.56-.147.997-.55 1.204-1.079.207-.53.164-1.13-.137-1.587l-.603-.913c-.06-.09-.046-.166-.026-.195a6.602 6.602 0 01.808-.808c.03-.02.105-.034.195.026l.913.603c.456.301 1.057.344 1.587.137.53-.207.932-.644 1.079-1.204l.289-1.105c.03-.11.101-.143.137-.146zM8 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
            </svg>
            <span>System Diagnostics</span>
          </button>

          {/* Model Status Tag */}
          <div className="sidebar-model-tag">
            <span className="model-status-indicator" />
            <span className="model-status-name font-mono">Gemma 4 E2B IT QAT</span>
          </div>
        </div>
      </aside>
    </>
  );
}
