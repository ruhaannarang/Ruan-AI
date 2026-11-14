import React, { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';

export default function MessageList({ messages, voiceState, onToast }) {
  const bottomRef = useRef(null);

  // Auto scroll to bottom when new messages arrive or tokens stream
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="col" id="col">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          voiceState={voiceState}
          onToast={onToast}
        />
      ))}
      <div ref={bottomRef} style={{ height: 1 }} />
    </div>
  );
}
