import React, { useState, useEffect, useRef } from 'react';
import {
  getBenchmarkPrompts,
  compareBenchmarkSample,
  saveBenchmarkSample,
  getBenchmarkHistory,
  clearBenchmarkHistory
} from '../../services/voiceApi';
import { playClickSound } from '../../services/sound';
import './HinglishBenchmarkModal.css';

export default function HinglishBenchmarkModal({ isOpen, onClose }) {
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [customText, setCustomText] = useState('');
  const [customTerms, setCustomTerms] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Results
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [history, setHistory] = useState({ runs: [], summary: {} });

  // References
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const mediaStreamRef = useRef(null);

  // Load prompts and history on mount
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    getBenchmarkPrompts().then(data => {
      if (mounted && data.prompts) {
        setPrompts(data.prompts);
        if (data.prompts.length > 0 && !selectedPrompt) {
          setSelectedPrompt(data.prompts[0]);
        }
      }
    });

    getBenchmarkHistory().then(data => {
      if (mounted && data.history) {
        setHistory(data.history);
      }
    });

    return () => {
      mounted = false;
      cleanupAudio();
    };
  }, [isOpen]);

  const cleanupAudio = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
  };

  const handleStartRecording = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setComparisonResult(null);
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
    setRecordedBlob(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone recording is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      mediaStreamRef.current = stream;

      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/wav'
      ];
      let selectedMime = '';
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }

      const recorder = new MediaRecorder(stream, selectedMime ? { mimeType: selectedMime } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      setIsRecording(true);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to start microphone recording');
    }
  };

  const handleStopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    recorder.onstop = async () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }

      const mime = recorder.mimeType || 'audio/webm';
      const blob = new Blob(audioChunksRef.current, { type: mime });
      audioChunksRef.current = [];
      setIsRecording(false);

      if (blob.size < 500) {
        setErrorMessage('Recording was too short or silent.');
        return;
      }

      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      setRecordedAudioUrl(url);

      // Run benchmark comparison immediately
      await runComparison(blob);
    };

    recorder.stop();
  };

  const runComparison = async (blob) => {
    setIsEvaluating(true);
    setErrorMessage(null);

    const refText = isCustom ? customText.trim() : (selectedPrompt?.reference || '');
    const category = isCustom ? 'Custom' : (selectedPrompt?.category || 'Unspecified');
    const terms = isCustom
      ? customTerms.split(',').map(t => t.trim()).filter(Boolean)
      : (selectedPrompt?.technical_terms || []);

    if (!refText) {
      setErrorMessage('Reference text is required for benchmark comparison.');
      setIsEvaluating(false);
      return;
    }

    try {
      const res = await compareBenchmarkSample(blob, {
        reference: refText,
        category,
        technicalTerms: terms
      });

      if (!res.success || !res.comparison) {
        throw new Error(res.error || 'Failed to compare speech models');
      }

      setComparisonResult(res.comparison);
    } catch (err) {
      setErrorMessage(err.message || 'Comparison failed');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSaveResult = async () => {
    if (!recordedBlob || !comparisonResult) return;
    setIsSaving(true);
    setErrorMessage(null);

    const sampleId = isCustom ? `custom_${Date.now()}` : (selectedPrompt?.id || `sample_${Date.now()}`);
    const refText = isCustom ? customText.trim() : selectedPrompt.reference;
    const category = isCustom ? 'Custom' : selectedPrompt.category;

    try {
      const res = await saveBenchmarkSample(recordedBlob, {
        sampleId,
        reference: refText,
        category,
        evaluation: comparisonResult
      });

      if (res.success) {
        setSuccessMessage('Sample and comparative result saved to local benchmark dataset.');
        // Refresh history
        const hRes = await getBenchmarkHistory();
        if (hRes.history) setHistory(hRes.history);
      } else {
        throw new Error(res.error || 'Failed to save sample');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all local benchmark recordings and results?')) return;
    try {
      await clearBenchmarkHistory();
      setHistory({ runs: [], summary: {} });
      setSuccessMessage('Local benchmark history cleared.');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to clear history');
    }
  };

  if (!isOpen) return null;

  const categories = ['All', 'English', 'Hindi', 'Romanized Hinglish', 'Technical Hinglish'];
  const filteredPrompts = selectedCategory === 'All'
    ? prompts
    : prompts.filter(p => p.category === selectedCategory);

  return (
    <div className="bench-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bench-modal-box" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="bench-modal-header">
          <div className="bench-header-titles">
            <span className="bench-badge font-mono">PHASE 1.6.1 // VOICE QUALITY BENCHMARK</span>
            <h3 className="bench-title">Hinglish &amp; Multilingual STT Model Comparison</h3>
            <p className="bench-subtitle">
              Evaluating <strong>faster-whisper-small</strong> vs <strong>faster-whisper-base</strong> on CPU INT8 using genuine microphone recordings.
            </p>
          </div>
          <button className="bench-close-btn" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="bench-alert error font-mono" role="alert">
            <span>⚠️ {errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage(null)}>✕</button>
          </div>
        )}
        {successMessage && (
          <div className="bench-alert success font-mono" role="status">
            <span>✓ {successMessage}</span>
            <button type="button" onClick={() => setSuccessMessage(null)}>✕</button>
          </div>
        )}

        <div className="bench-modal-body">
          {/* Category Tabs */}
          <div className="bench-category-tabs font-mono">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                className={`bench-cat-btn ${selectedCategory === cat && !isCustom ? 'active' : ''}`}
                onClick={() => {
                  playClickSound();
                  setSelectedCategory(cat);
                  setIsCustom(false);
                  const first = cat === 'All' ? prompts[0] : prompts.find(p => p.category === cat);
                  if (first) setSelectedPrompt(first);
                }}
              >
                {cat}
              </button>
            ))}
            <button
              type="button"
              className={`bench-cat-btn ${isCustom ? 'active' : ''}`}
              onClick={() => {
                playClickSound();
                setIsCustom(true);
              }}
            >
              Custom Sentence
            </button>
          </div>

          {/* Reference Selection Area */}
          <div className="bench-selection-card">
            {!isCustom ? (
              <div className="bench-prompt-selector">
                <label className="bench-label font-mono">SELECT BENCHMARK PROMPT:</label>
                <select
                  className="bench-select font-mono"
                  value={selectedPrompt?.id || ''}
                  onChange={(e) => {
                    const p = prompts.find(item => item.id === e.target.value);
                    if (p) setSelectedPrompt(p);
                  }}
                >
                  {filteredPrompts.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.category}] {p.reference}
                    </option>
                  ))}
                </select>

                <div className="bench-reference-display">
                  <div className="bench-ref-quote">
                    "{selectedPrompt?.reference}"
                  </div>
                  {selectedPrompt?.reference_devanagari && (
                    <div className="bench-ref-devanagari">
                      Devanagari: {selectedPrompt.reference_devanagari}
                    </div>
                  )}
                  {selectedPrompt?.technical_terms?.length > 0 && (
                    <div className="bench-tech-terms font-mono">
                      <span>Target Technical Terms:</span>
                      {selectedPrompt.technical_terms.map(t => (
                        <span key={t} className="tech-term-pill">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bench-custom-form">
                <label className="bench-label font-mono">CUSTOM REFERENCE SENTENCE:</label>
                <textarea
                  className="bench-custom-input"
                  placeholder="Enter the exact sentence you will speak (Hinglish, Hindi, or English)..."
                  value={customText}
                  onChange={e => setCustomText(e.target.value)}
                  rows={2}
                />
                <label className="bench-label font-mono" style={{ marginTop: '8px' }}>
                  EXPECTED TECHNICAL TERMS (comma separated):
                </label>
                <input
                  type="text"
                  className="bench-custom-terms font-mono"
                  placeholder="e.g. React, component, API, database"
                  value={customTerms}
                  onChange={e => setCustomTerms(e.target.value)}
                />
              </div>
            )}

            {/* Recording Controls */}
            <div className="bench-record-panel">
              <div className="record-actions">
                {!isRecording ? (
                  <button
                    type="button"
                    className="btn-bench-record font-mono"
                    onClick={handleStartRecording}
                    disabled={isEvaluating}
                  >
                    <span className="rec-dot"></span>
                    <span>Record Microphone Sample</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-bench-stop font-mono"
                    onClick={handleStopRecording}
                  >
                    <span className="stop-square"></span>
                    <span>Stop Recording &amp; Evaluate</span>
                  </button>
                )}

                {recordedAudioUrl && (
                  <audio
                    src={recordedAudioUrl}
                    controls
                    className="bench-audio-player"
                  />
                )}
              </div>

              {isRecording && (
                <div className="bench-recording-live font-mono">
                  <span className="live-pulse"></span>
                  <span>Speak the sentence now through your laptop microphone...</span>
                </div>
              )}

              {isEvaluating && (
                <div className="bench-eval-spinner font-mono">
                  <span className="spinner-icon">↻</span>
                  <span>Transcribing with both 'small' and 'base' models on CPU INT8...</span>
                </div>
              )}
            </div>
          </div>

          {/* Comparative Results Area */}
          {comparisonResult && (
            <div className="bench-comparison-section">
              <div className="bench-comparison-header font-mono">
                <h4>COMPARATIVE EVALUATION RESULTS</h4>
                <div className="bench-comp-actions">
                  <button
                    type="button"
                    className="btn-save-dataset font-mono"
                    onClick={handleSaveResult}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : '💾 Save Sample to Benchmark'}
                  </button>
                </div>
              </div>

              <div className="bench-comparison-grid">
                {/* Faster Whisper Small */}
                <div className="model-result-card small-card">
                  <div className="model-header font-mono">
                    <span className="model-title">FASTER-WHISPER-SMALL</span>
                    <span className="badge-int8">CPU INT8</span>
                  </div>
                  <div className="transcript-box">
                    "{comparisonResult.small.text || '—'}"
                  </div>
                  <div className="metrics-row font-mono">
                    <div className="metric">
                      <span className="label">WORD ERROR RATE</span>
                      <strong className={comparisonResult.small.wer === 0 ? 'green' : (comparisonResult.small.wer < 0.3 ? 'teal' : 'amber')}>
                        {comparisonResult.small.wer_percent}%
                      </strong>
                    </div>
                    <div className="metric">
                      <span className="label">LATENCY</span>
                      <strong>{comparisonResult.small.latency_sec}s</strong>
                    </div>
                    <div className="metric">
                      <span className="label">RTF</span>
                      <strong>{comparisonResult.small.rtf}x</strong>
                    </div>
                    <div className="metric">
                      <span className="label">DETECTED LANG</span>
                      <strong>
                        {comparisonResult.small.language} ({Math.round(comparisonResult.small.language_probability * 100)}%)
                      </strong>
                    </div>
                  </div>
                  {comparisonResult.small.technical_terms?.total > 0 && (
                    <div className="tech-report font-mono">
                      <span>Tech Vocab: </span>
                      <strong>
                        {comparisonResult.small.technical_terms.matched}/{comparisonResult.small.technical_terms.total} preserved
                        ({Math.round(comparisonResult.small.technical_terms.preservation_rate * 100)}%)
                      </strong>
                    </div>
                  )}
                </div>

                {/* Faster Whisper Base */}
                <div className="model-result-card base-card">
                  <div className="model-header font-mono">
                    <span className="model-title">FASTER-WHISPER-BASE</span>
                    <span className="badge-int8">CPU INT8</span>
                  </div>
                  <div className="transcript-box">
                    "{comparisonResult.base.text || '—'}"
                  </div>
                  <div className="metrics-row font-mono">
                    <div className="metric">
                      <span className="label">WORD ERROR RATE</span>
                      <strong className={comparisonResult.base.wer === 0 ? 'green' : (comparisonResult.base.wer < 0.3 ? 'teal' : 'amber')}>
                        {comparisonResult.base.wer_percent}%
                      </strong>
                    </div>
                    <div className="metric">
                      <span className="label">LATENCY</span>
                      <strong className="green">{comparisonResult.base.latency_sec}s</strong>
                    </div>
                    <div className="metric">
                      <span className="label">RTF</span>
                      <strong>{comparisonResult.base.rtf}x</strong>
                    </div>
                    <div className="metric">
                      <span className="label">DETECTED LANG</span>
                      <strong>
                        {comparisonResult.base.language} ({Math.round(comparisonResult.base.language_probability * 100)}%)
                      </strong>
                    </div>
                  </div>
                  {comparisonResult.base.technical_terms?.total > 0 && (
                    <div className="tech-report font-mono">
                      <span>Tech Vocab: </span>
                      <strong>
                        {comparisonResult.base.technical_terms.matched}/{comparisonResult.base.technical_terms.total} preserved
                        ({Math.round(comparisonResult.base.technical_terms.preservation_rate * 100)}%)
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Side-by-side trade-off insight */}
              <div className="bench-tradeoff-bar font-mono">
                <span>
                  ⚡ Base is <strong>{comparisonResult.speedup}x faster</strong> ({comparisonResult.base.latency_sec}s vs {comparisonResult.small.latency_sec}s).
                </span>
                <span>
                  🎯 {comparisonResult.wer_diff > 0
                    ? `Small is more accurate (WER lower by ${(comparisonResult.wer_diff * 100).toFixed(1)}%).`
                    : comparisonResult.wer_diff === 0
                    ? 'Both models achieved equal WER on this sample.'
                    : `Base achieved lower WER on this sample.`}
                </span>
              </div>
            </div>
          )}

          {/* Aggregated Benchmark Summary */}
          {history.summary && history.summary.total_samples > 0 && (
            <div className="bench-history-summary">
              <div className="history-header font-mono">
                <h4>LOCAL BENCHMARK DATASET SUMMARY ({history.summary.total_samples} SAMPLES)</h4>
                <button
                  type="button"
                  className="btn-clear-history font-mono"
                  onClick={handleClearHistory}
                >
                  Clear Dataset
                </button>
              </div>

              <div className="summary-grid font-mono">
                <div className="summary-box">
                  <span className="s-label">AVERAGE WER (SMALL)</span>
                  <strong className="teal">{(history.summary.avg_wer_small * 100).toFixed(1)}%</strong>
                </div>
                <div className="summary-box">
                  <span className="s-label">AVERAGE WER (BASE)</span>
                  <strong>{(history.summary.avg_wer_base * 100).toFixed(1)}%</strong>
                </div>
                <div className="summary-box">
                  <span className="s-label">AVG LATENCY (SMALL)</span>
                  <strong>{history.summary.avg_latency_small.toFixed(2)}s</strong>
                </div>
                <div className="summary-box">
                  <span className="s-label">AVG LATENCY (BASE)</span>
                  <strong className="green">{history.summary.avg_latency_base.toFixed(2)}s</strong>
                </div>
                <div className="summary-box">
                  <span className="s-label">TECH WORDS (SMALL)</span>
                  <strong className="teal">{(history.summary.avg_tech_preservation_small * 100).toFixed(1)}%</strong>
                </div>
                <div className="summary-box">
                  <span className="s-label">TECH WORDS (BASE)</span>
                  <strong>{(history.summary.avg_tech_preservation_base * 100).toFixed(1)}%</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bench-modal-footer font-mono">
          <span className="privacy-note">
            🔒 All benchmark audio &amp; transcripts remain strictly local on your laptop. Never uploaded to any cloud.
          </span>
          <button type="button" className="btn-close-bench" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

