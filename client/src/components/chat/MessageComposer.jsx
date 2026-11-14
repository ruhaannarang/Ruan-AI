import React, { useState, useRef, useEffect, useCallback } from 'react';
import './MessageComposer.css';

// Ensure browser registers custom property for smooth angle rotation
if (typeof window !== 'undefined' && window.CSS && typeof window.CSS.registerProperty === 'function') {
  try {
    window.CSS.registerProperty({
      name: '--composer-angle',
      syntax: '<angle>',
      inherits: false,
      initialValue: '0deg',
    });
  } catch {
    // Already defined or unsupported
  }
}

// Optimizes oversized images to max dimension 1600px for snappy upload and LLM vision
function optimizeImage(dataUrl, maxDimension = 1600, quality = 0.85) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDimension && height <= maxDimension) {
        resolve(dataUrl);
        return;
      }
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export default function MessageComposer({
  onSendMessage,
  onStopGeneration,
  isGenerating,
  voiceState,
  onToast,
  placeholder = 'Message Ruan…'
}) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

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

  const addFiles = useCallback((fileList) => {
    if (!fileList || fileList.length === 0) return;
    const maxFiles = 5;
    const maxSizeBytes = 20 * 1024 * 1024; // 20 MB safety limit
    const incoming = Array.from(fileList);

    incoming.slice(0, maxFiles).forEach(file => {
      if (file.size > maxSizeBytes) {
        onToast && onToast(`File ${file.name} exceeds 20MB limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = async (e) => {
        let dataUrl = e.target.result;
        const isImg = file.type?.startsWith('image/');
        if (isImg) {
          try {
            dataUrl = await optimizeImage(dataUrl, 1600, 0.88);
          } catch {}
        }
        setAttachments(prev => [
          ...prev,
          {
            id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            dataUrl: dataUrl,
            previewUrl: isImg ? dataUrl : null
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, [onToast]);

  const handleFileInputChange = (e) => {
    if (e.target.files) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer?.files) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handlePaste = (e) => {
    if (e.clipboardData?.files?.length > 0) {
      addFiles(e.clipboardData.files);
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (isGenerating) {
      onStopGeneration();
      return;
    }
    const text = input.trim();
    if (!text && attachments.length === 0) return;

    onSendMessage(text, null, attachments);
    setInput('');
    setAttachments([]);
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
  const canSend = input.trim().length > 0 || attachments.length > 0;

  return (
    <form
      className={`composer ${isRecording ? 'listening' : ''} ${isDragOver ? 'drag-over' : ''}`}
      id="composer"
      onSubmit={handleSubmit}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      autoComplete="off"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        multiple
        accept="image/*,.pdf,.txt,.md,.markdown,.json,.csv,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.html,.css,.sql"
        style={{ display: 'none' }}
      />

      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="composer-attachments" aria-label="Attached files">
          {attachments.map(att => (
            <div key={att.id} className="composer-att-chip">
              {att.previewUrl ? (
                <img src={att.previewUrl} alt={att.name} className="composer-att-thumb" />
              ) : (
                <span className="composer-att-icon">📄</span>
              )}
              <span className="composer-att-name" title={att.name}>{att.name}</span>
              <button
                type="button"
                className="composer-att-remove"
                onClick={() => handleRemoveAttachment(att.id)}
                aria-label={`Remove ${att.name}`}
                title="Remove attachment"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

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
          className={`icon-btn ${attachments.length > 0 ? 'has-attachments' : ''}`}
          type="button"
          id="attach"
          aria-label="Attach images or documents"
          title="Attach images or documents (PDF, Text, Code, Images)"
          onClick={() => fileInputRef.current?.click()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4L14.5 7" />
          </svg>
        </button>

        <button
          className="icon-btn"
          type="button"
          id="imgGenBtn"
          aria-label={attachments.some(a => a.type?.startsWith('image/') || a.dataUrl?.startsWith('data:image/')) ? 'Edit Image' : 'Generate Image'}
          title={attachments.some(a => a.type?.startsWith('image/') || a.dataUrl?.startsWith('data:image/')) ? 'Edit attached image (/edit <prompt>)' : 'Generate Image (/image <prompt>)'}
          onClick={() => {
            const hasImg = attachments.some(a => a.type?.startsWith('image/') || a.dataUrl?.startsWith('data:image/'));
            setInput(prev => {
              if (hasImg) {
                if (prev.startsWith('/edit ')) return prev;
                return prev ? `/edit ${prev}` : '/edit ';
              } else {
                if (prev.startsWith('/image ')) return prev;
                return prev ? `/image ${prev}` : '/image ';
              }
            });
            textareaRef.current?.focus();
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
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
