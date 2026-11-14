import React, { useState, useRef, useEffect, useCallback } from 'react';
import './MessageComposer.css';

export default function MessageComposer({
  onSendMessage,
  onStopGeneration,
  isGenerating,
  voiceState,
  onToast,
  placeholder = 'Message Ruan…'
}) {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  const isRecording = voiceState?.isRecording || false;

  // Auto-resize textarea height
  const grow = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    grow();
  }, [input, grow]);

  // Focus textarea when generation finishes or on load
  useEffect(() => {
    if (!isGenerating && !isRecording && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isGenerating, isRecording]);

  // Insert transcription preview if microphone finishes
  useEffect(() => {
    if (voiceState?.transcriptionPreview) {
      setInput(prev => {
        if (!prev || !prev.trim()) {
          return voiceState.transcriptionPreview;
        }
        return `${prev.trim()} ${voiceState.transcriptionPreview}`;
      });
      if (voiceState.clearPreview) {
        voiceState.clearPreview();
      }
      setTimeout(grow, 50);
    }
  }, [voiceState?.transcriptionPreview, grow]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (isGenerating) {
      onStopGeneration();
      return;
    }
    const text = input.trim();
    if (!text) return;

    onSendMessage(text);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleMicClick = () => {
    if (!voiceState) return;
    if (isRecording) {
      voiceState.stopRecording(voiceState.isAutoSendEnabled);
    } else {
      voiceState.startRecording();
    }
  };

  const handleReviewToggle = () => {
    if (voiceState?.toggleAutoSend) {
      voiceState.toggleAutoSend();
      const newState = !voiceState.isAutoSendEnabled;
      onToast && onToast(newState ? 'Review before send off (Direct auto-send).' : 'Review before send on.');
    } else {
      onToast && onToast('Review before send toggled.');
    }
  };

  const isReviewActive = voiceState ? !voiceState.isAutoSendEnabled : false;
  const canSend = input.trim().length > 0;

  return (
    <form
      className={`composer ${isRecording ? 'listening' : ''}`}
      id="composer"
      onSubmit={handleSubmit}
      autoComplete="off"
    >
      <label className="sr" htmlFor="input">Message Ruan</label>
      
      <textarea
        ref={textareaRef}
        id="input"
        rows={1}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />

      <div className="listen" aria-live="polite">
        <i></i>
        <i style={{ animationDelay: '.1s' }}></i>
        <i style={{ animationDelay: '.2s' }}></i>
        <i style={{ animationDelay: '.3s' }}></i>
        <i style={{ animationDelay: '.4s' }}></i>
        <i style={{ animationDelay: '.5s' }}></i>
        <i style={{ animationDelay: '.6s' }}></i>
        <span>Listening…</span>
      </div>

      <div className="c-row">
        <button
          className="icon-btn"
          type="button"
          id="attach"
          aria-label="Attach a file"
          title="Attach a file"
          onClick={() => onToast && onToast('File attachments are part of the full app.')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4L14.5 7" />
          </svg>
        </button>

        <button
          className="tg"
          type="button"
          id="review"
          aria-pressed={isReviewActive}
          title="Look over dictated text before it is sent"
          onClick={handleReviewToggle}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" />
          </svg>
          <span className="lbl">Review before send</span>
        </button>

        <span className="grow" />

        <button
          className="icon-btn mic"
          type="button"
          id="mic"
          aria-pressed={isRecording}
          aria-label={isRecording ? 'Stop recording' : 'Dictate'}
          title={isRecording ? 'Stop recording' : 'Dictate'}
          onClick={handleMicClick}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
          </svg>
        </button>

        <button
          className={`send ${isGenerating ? 'stop' : ''}`}
          type="submit"
          id="send"
          disabled={!isGenerating && !canSend}
          aria-label={isGenerating ? 'Stop generating' : 'Send message'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        </button>
      </div>
    </form>
  );
}
