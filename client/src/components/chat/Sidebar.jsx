import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

/**
 * Groups conversations into 'Today', 'Yesterday', and 'Earlier'.
 */
function groupConversations(conversations) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;

  const groups = {
    Today: [],
    Yesterday: [],
    Earlier: []
  };

  for (const conv of conversations) {
    const time = conv.updatedAt || conv.createdAt || Date.now();
    if (time >= todayStart) {
      groups.Today.push(conv);
    } else if (time >= yesterdayStart) {
      groups.Yesterday.push(conv);
    } else {
      groups.Earlier.push(conv);
    }
  }

  return groups;
}

function formatConvTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now - date) / 86400000);

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
  conversations = [],
  activeId,
  onSelectConversation,
  onCreateNewChat,
  onDeleteConversation,
  onCollapse,
  onCloseDrawer,
  navigateTo,
  onOpenDiagnostics,
  onOpenBenchmark,
  onToast
}) {
  const [search, setSearch] = useState('');
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsMenuRef = useRef(null);
  const { user } = useAuth();

  // Close tools menu on click outside
  useEffect(() => {
    if (!toolsOpen) return;
    const handleClickOutside = (e) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [toolsOpen]);

  // Filter conversations by search term
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(c =>
      (c.title || 'New Chat').toLowerCase().includes(q) ||
      c.messages?.some(m => m.content?.toLowerCase().includes(q))
    );
  }, [conversations, search]);

  const grouped = useMemo(() => groupConversations(filtered), [filtered]);

  return (
    <aside className="side" id="side" aria-label="Conversations">
      {/* Brand Header */}
      <div className="s-top">
        <button
          className="brand"
          onClick={() => navigateTo ? navigateTo('/') : window.location.assign('/')}
          title="Return to Ruan AI Overview"
          type="button"
        >
          <svg viewBox="0 0 112 119" aria-hidden="true"><use href="#mark" /></svg>
          <div>
            <b>Ruan <i>AI</i></b>
            <span className="ver">v0.1.0-alpha.5</span>
          </div>
        </button>

        <button
          className="icon-btn"
          id="collapse"
          onClick={onCollapse}
          aria-label="Close sidebar"
          title="Close sidebar"
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
            <path d="M9.5 4.5v15" />
          </svg>
        </button>
      </div>

      {/* New Chat Button */}
      <button
        className="s-new"
        id="newChat"
        type="button"
        onClick={() => {
          onCreateNewChat();
          onCloseDrawer && onCloseDrawer();
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New chat <kbd>Ctrl K</kbd>
      </button>

      {/* Search Bar */}
      <label className="s-search">
        <span className="sr">Search conversations</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
        <input
          id="search"
          type="search"
          placeholder="Search"
          autoComplete="off"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>

      {/* History List */}
      <nav className="hist" id="hist" aria-label="Recent chats">
        {Object.entries(grouped).map(([groupName, items]) => {
          if (!items || items.length === 0) return null;
          return (
            <React.Fragment key={groupName}>
              <div className="grp">{groupName}</div>
              {items.map((conv) => {
                const isActive = conv.id === activeId;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    className={`item ${isActive ? 'on' : ''}`}
                    onClick={() => {
                      onSelectConversation(conv.id);
                      onCloseDrawer && onCloseDrawer();
                    }}
                  >
                    <span className="t">{conv.title || 'New Chat'}</span>
                    <time>{formatConvTime(conv.updatedAt || conv.createdAt)}</time>
                    {onDeleteConversation && (
                      <span
                        className="item-delete-btn"
                        role="button"
                        title="Delete conversation"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conv.id);
                          onToast && onToast('Conversation deleted.');
                        }}
                      >
                        ✕
                      </span>
                    )}
                  </button>
                );
              })}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Footer & User Profile */}
      <div className="s-foot" ref={toolsMenuRef}>
        {/* Tools Popup Menu */}
        <div className={`menu ${toolsOpen ? 'open' : ''}`} id="toolsMenu" role="menu">
          {onOpenBenchmark && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setToolsOpen(false);
                onOpenBenchmark();
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19V9m6 10V5m6 14v-7m4 7H2" />
              </svg>
              Benchmark
            </button>
          )}

          {onOpenDiagnostics && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setToolsOpen(false);
                onOpenDiagnostics();
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h4l2-6 4 12 2-6h6" />
              </svg>
              System diagnostics
            </button>
          )}
          <div className="sep" />
          <div className="hint">100% local-first · Private by design</div>
        </div>

        {/* User Identity */}
        <div className="me">
          <span className="av">
            {user?.picture ? (
              <img src={user.picture} alt={user.name || 'User'} referrerPolicy="no-referrer" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <circle cx="12" cy="9" r="3.6" />
                <path d="M5 20c1-3.6 3.8-5.4 7-5.4s6 1.8 7 5.4" />
              </svg>
            )}
          </span>
          <div className="who">
            <b>{user?.name || 'Guest User'}</b>
            {user?.email ? (
              <span className="sub-text">{user.email}</span>
            ) : (
              <a
                role="button"
                tabIndex={0}
                onClick={() => onToast && onToast('Sign-in via Google Identity Services')}
              >
                Local Account
              </a>
            )}
          </div>
          <button
            className="icon-btn"
            id="tools"
            aria-label="Tools"
            aria-haspopup="menu"
            aria-expanded={toolsOpen}
            title="Tools & Settings"
            type="button"
            onClick={() => setToolsOpen(!toolsOpen)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
