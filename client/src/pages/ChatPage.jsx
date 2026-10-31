import React, { useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import ChatLayout from '../components/chat/ChatLayout';
import './ChatPage.css';

export default function ChatPage({ navigateTo, onOpenDiagnostics }) {
  const chatState = useChat();

  // Update document title dynamically
  useEffect(() => {
    const title = chatState.activeConversation?.title;
    if (title && title !== 'New Chat') {
      document.title = `${title} — Ruan AI`;
    } else {
      document.title = 'Ruan AI — Conversation';
    }
  }, [chatState.activeConversation?.title]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + K for New Chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        chatState.createNewChat();
      }
      // Escape to stop generation if generating
      if (e.key === 'Escape' && chatState.isGenerating) {
        e.preventDefault();
        chatState.stopGeneration();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chatState]);

  return (
    <div className="ruan-chat-page" id="ruan-chat-page-root">
      <ChatLayout
        chatState={chatState}
        navigateTo={navigateTo}
        onOpenDiagnostics={onOpenDiagnostics}
      />
    </div>
  );
}
