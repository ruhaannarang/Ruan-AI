import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';
import { useVoice } from '../hooks/useVoice';
import ChatLayout from '../components/chat/ChatLayout';
import HinglishBenchmarkModal from '../components/chat/HinglishBenchmarkModal';
import './ChatPage.css';

export default function ChatPage({ navigateTo, onOpenDiagnostics }) {
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);
  const voiceStateRef = useRef(null);

  const chatState = useChat({
    get isVoiceMode() {
      return Boolean(voiceStateRef.current?.isVoiceMode);
    },
    onAudioChunk: (chunk) => {
      voiceStateRef.current?.handleAudioChunk(chunk);
    },
    onAudioDone: (data) => {
      console.log('[ChatPage] Streaming audio session completed:', data);
    },
    onAudioError: (err) => {
      console.warn('[ChatPage] Streaming audio chunk error:', err);
    },
    onGenerationDone: (msg) => {
      // Fallback: ONLY if voice mode was active and ZERO streaming audio chunks were received
      // (e.g. if the streaming TTS coordinator failed or voice microservice was offline)
      const vs = voiceStateRef.current;
      if (vs?.isVoiceMode && msg.content && vs.hasStreamingAudio && !vs.hasStreamingAudio()) {
        console.log('[ChatPage] Zero streaming audio chunks received; falling back to full message synthesis');
        vs.speakMessage(msg.id, msg.content);
      }
    },
    onStop: () => {
      voiceStateRef.current?.stopPlayback();
    }
  });

  const voiceState = useVoice({
    onSendMessage: (text, convId) => chatState.sendMessage(text, convId),
    activeConversationId: chatState.activeConversation?.id
  });

  voiceStateRef.current = voiceState;

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
      // Escape to stop generation or playback
      if (e.key === 'Escape') {
        if (chatState.isGenerating) {
          e.preventDefault();
          chatState.stopGeneration();
        }
        if (voiceState.isPlaying) {
          e.preventDefault();
          voiceState.stopPlayback();
        }
        if (voiceState.isRecording) {
          e.preventDefault();
          voiceState.cancelRecording();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chatState, voiceState]);

  return (
    <div className="ruan-chat-page" id="ruan-chat-page-root">
      <ChatLayout
        chatState={chatState}
        voiceState={voiceState}
        navigateTo={navigateTo}
        onOpenDiagnostics={onOpenDiagnostics}
        onOpenBenchmark={() => setIsBenchmarkOpen(true)}
      />

      {/* Phase 1.6.1 Hinglish & Voice Quality Benchmark Modal */}
      <HinglishBenchmarkModal
        isOpen={isBenchmarkOpen}
        onClose={() => setIsBenchmarkOpen(false)}
      />
    </div>
  );
}
