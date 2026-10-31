import React, { useState } from 'react';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import './ChatLayout.css';

export default function ChatLayout({
  chatState,
  navigateTo,
  onOpenDiagnostics
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    conversations,
    activeId,
    activeConversation,
    isGenerating,
    setActiveId,
    createNewChat,
    deleteConversation,
    sendMessage,
    stopGeneration
  } = chatState;

  return (
    <div className="ruan-chat-layout" id="ruan-chat-container">
      {/* Sidebar Navigation */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={setActiveId}
        onCreateNewChat={createNewChat}
        onDeleteConversation={deleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        navigateTo={navigateTo}
        onOpenDiagnostics={onOpenDiagnostics}
      />

      {/* Main Conversation Window */}
      <ChatWindow
        activeConversation={activeConversation}
        isGenerating={isGenerating}
        onSendMessage={sendMessage}
        onStopGeneration={stopGeneration}
        onCreateNewChat={createNewChat}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenDiagnostics={onOpenDiagnostics}
      />
    </div>
  );
}
