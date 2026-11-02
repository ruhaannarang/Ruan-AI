import React, { useState, useRef, useEffect } from 'react';
import './MessageComposer.css';

export default function MessageComposer({
  onSendMessage,
  onStopGeneration,
  isGenerating,
  voiceState,
  disabled = false,
  placeholder = 'Message Ruan AI... (Enter to send, Shift + Enter for newline)'
}) {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  const isRecording = voiceState?.isRecording || false;
  const isTranscribing = voiceState?.isTranscribing || false;
  const isPlaying = voiceState?.isPlaying || false;

  // Auto-resize textarea height to fit content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 48), 180);
    textarea.style.height = `${nextHeight}px`;
  }, [input]);

  // Focus textarea when generation finishes
  useEffect(() => {
    if (!isGenerating && !isRecording && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isGenerating, isRecording]);

  // Populate transcribed text into input for review/editing when transcription finishes
  useEffect(() => {
    if (voiceState?.transcriptionPreview) {
      setInput(prev => {
        if (!prev || !prev.trim()) {
          return voiceState.transcriptionPreview;
        }
        return `${prev.trim()} ${voiceState.transcriptionPreview}`;
      });
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [voiceState?.transcriptionPreview]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || isGenerating || disabled) return;

    onSendMessage(text);
    setInput('');
    if (voiceState?.clearPreview) {
      voiceState.clearPreview();
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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

  const canSend = input.trim().length > 0 && !isGenerating && !disabled;

  return (
    <div className="ruan-composer-container">
      {/* Voice Status Banners */}
      {voiceState?.voiceError && (
        <div className="voice-status-banner error-banner" role="alert">
          <svg className="banner-icon" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zM8 4a.75.75 0 01.75.75v4a.75.75 0 01-1.5 0v-4A.75.75 0 018 4z" />
          </svg>
          <span className="banner-text">{voiceState.voiceError}</span>
          <button
            type="button"
            className="banner-close-btn"
            onClick={voiceState.clearError}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {isRecording && (
        <div className="voice-status-banner recording-banner font-mono" role="status">
          <div className="recording-pulse-indicator" aria-hidden="true">
            <span className="pulse-core"></span>
            <span className="pulse-ring"></span>
          </div>
          <span className="banner-text">Listening... Speak in Hinglish, Hindi, or English</span>
          <div className="recording-banner-actions">
            <button
              type="button"
              className="btn-finish-recording"
              onClick={() => voiceState.stopRecording(voiceState.isAutoSendEnabled)}
              title={voiceState.isAutoSendEnabled ? "Finish and send immediately" : "Finish and review transcribed text"}
            >
              {voiceState.isAutoSendEnabled ? 'Send' : 'Done (Review)'}
            </button>
            <button
              type="button"
              className="btn-cancel-recording"
              onClick={voiceState.cancelRecording}
              title="Cancel recording"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isTranscribing && (
        <div className="voice-status-banner transcribing-banner font-mono" role="status">
          <span className="transcribe-spinner" aria-hidden="true">↻</span>
          <span className="banner-text">Transcribing speech with faster-whisper...</span>
        </div>
      )}

      {/* Transcription Review Banner */}
      {voiceState?.transcriptionPreview && !isGenerating && !isRecording && !isTranscribing && (
        <div className="voice-status-banner preview-banner font-mono" role="status">
          <div className="preview-badge-group">
            <span className="preview-badge-icon" aria-hidden="true">🎙️</span>
            <span className="preview-badge-title">Speech Draft</span>
            {voiceState.detectedLanguage && (
              <span className="preview-lang-pill">
                {voiceState.detectedLanguage.language} ({Math.round((voiceState.detectedLanguage.probability || 0) * 100)}%)
              </span>
            )}
          </div>
          <span className="banner-text">Review and edit in the input box below before sending</span>
          <div className="recording-banner-actions">
            <button
              type="button"
              className="btn-finish-recording"
              onClick={handleSubmit}
              title="Send transcribed message (Enter)"
            >
              Send Message
            </button>
            <button
              type="button"
              className="btn-cancel-recording"
              onClick={() => {
                setInput('');
                voiceState.clearPreview();
              }}
              title="Clear transcript"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {isPlaying && (
        <div className="voice-status-banner playing-banner font-mono" role="status">
          <div className="audio-wave-mini" aria-hidden="true">
            <span className="bar b1"></span>
            <span className="bar b2"></span>
            <span className="bar b3"></span>
          </div>
          <span className="banner-text">Speaking response (Kokoro TTS)...</span>
          <button
            type="button"
            className="btn-stop-audio font-mono"
            onClick={voiceState.stopPlayback}
            title="Stop audio playback"
          >
            Stop Audio
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="composer-form">
        <div className={`composer-input-wrapper ${isGenerating ? 'generating' : ''} ${isRecording ? 'recording' : ''}`}>
          <textarea
            ref={textareaRef}
            className="composer-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isRecording
                ? 'Listening to microphone...'
                : isGenerating
                ? 'Ruan AI is responding...'
                : placeholder
            }
            disabled={isGenerating || isRecording || disabled}
            rows={1}
            aria-label="Message input"
          />

          <div className="composer-controls">
            {/* Push-to-Talk Microphone Button */}
            {voiceState && !isGenerating && (
              <button
                type="button"
                className={`composer-mic-btn ${isRecording ? 'recording active' : ''} ${isTranscribing ? 'transcribing' : ''}`}
                onClick={handleMicClick}
                disabled={disabled || isTranscribing}
                aria-label={isRecording ? 'Stop recording and send' : 'Push-to-Talk: Record audio'}
                title={isRecording ? 'Click to finish recording' : 'Click to talk (Hinglish/Hindi/English)'}
              >
                {isRecording ? (
                  <div className="mic-recording-icon">
                    <span className="mic-stop-square"></span>
                  </div>
                ) : isTranscribing ? (
                  <span className="mic-spinner">↻</span>
                ) : (
                  <svg className="mic-icon" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3.5 6.5A.5.5 0 014 7v1a4 4 0 008 0V7a.5.5 0 011 0v1a5 5 0 01-4.5 4.975V15h2.5a.5.5 0 010 1h-6a.5.5 0 010-1H7.5v-2.025A5 5 0 013 8V7a.5.5 0 01.5-.5z" />
                    <path d="M10 8a2 2 0 11-4 0V3a2 2 0 114 0v5z" />
                  </svg>
                )}
              </button>
            )}

            {/* Stop Generation Button OR Send Button */}
            {isGenerating ? (
              <button
                type="button"
                className="composer-stop-btn"
                onClick={onStopGeneration}
                aria-label="Stop generation"
                title="Stop generation (Esc)"
              >
                <div className="stop-square" aria-hidden="true"></div>
                <span className="stop-label font-mono">STOP</span>
              </button>
            ) : (
              <button
                type="submit"
                className={`composer-send-btn ${canSend ? 'active' : ''}`}
                disabled={!canSend}
                aria-label="Send message"
                title="Send message (Enter)"
              >
                <svg className="send-icon" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M15.854.146a.5.5 0 01.11.54l-5.8 14.5a.5.5 0 01-.928.008L6.47 9.53 1.096 6.764a.5.5 0 01.008-.928L15.604.036a.5.5 0 01.25.11zM6.75 8.75l2.25 2.25L13.75 3.5 6.75 8.75z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="composer-footer-info">
          <span className="info-item font-mono">Gemma 4 E2B IT QAT</span>
          <span className="info-sep">•</span>
          <span className="info-item font-mono">100% Local</span>
          <span className="info-sep">•</span>
          <span className="info-item font-mono">
            {voiceState?.isVoiceMode ? '🔊 Voice Mode (Auto-Speak)' : '🎙️ Push-to-Talk (Hinglish/English)'}
          </span>
          {voiceState && (
            <>
              <span className="info-sep">•</span>
              <button
                type="button"
                className="composer-mode-toggle font-mono"
                onClick={voiceState.toggleAutoSend}
                title={
                  voiceState.isAutoSendEnabled
                    ? 'Auto-Send is active: voice messages send immediately. Click to switch to Review Mode.'
                    : 'Review Mode is active: voice transcript is placed into composer to review/edit before sending. Click to switch to Auto-Send.'
                }
              >
                {voiceState.isAutoSendEnabled ? '⚡ Auto-Send ON' : '✏️ Review Before Send'}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
