/**
 * Ruan AI — Voice Interaction Hook (useVoice)
 * Push-to-talk recording, local transcription, voice synthesis playback,
 * and audio interruption management.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { transcribeAudio, synthesizeSpeech } from '../services/voiceApi';

const STORAGE_VOICE_MODE = 'ruan_voice_mode_enabled';
const STORAGE_AUTO_SEND = 'ruan_voice_auto_send_enabled';

export function useVoice({ onSendMessage, onTranscriptionComplete, activeConversationId }) {
  // Voice mode: auto-speaks assistant responses when enabled
  const [isVoiceMode, setIsVoiceMode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_VOICE_MODE) === 'true';
    } catch {
      return false;
    }
  });

  // Auto-send mode: if false, places transcript in input composer for user review/edit (default: false)
  const [isAutoSendEnabled, setIsAutoSendEnabled] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_AUTO_SEND) === 'true';
    } catch {
      return false;
    }
  });

  // Voice engine states: 'idle' | 'listening' | 'transcribing' | 'speaking' | 'interrupted' | 'error'
  const [voiceStatus, setVoiceStatus] = useState('idle');
  const [voiceError, setVoiceError] = useState(null);
  const [transcriptionPreview, setTranscriptionPreview] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState(null);
  const [activePlayingId, setActivePlayingId] = useState(null);

  // References
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const mediaStreamRef = useRef(null);
  const currentAudioRef = useRef(null);
  const activeAbortControllerRef = useRef(null);
  const conversationIdRef = useRef(activeConversationId);
  const isAutoSendRef = useRef(isAutoSendEnabled);

  useEffect(() => {
    isAutoSendRef.current = isAutoSendEnabled;
  }, [isAutoSendEnabled]);

  // Keep active conversation ID reference fresh
  useEffect(() => {
    conversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // Persist voice mode preference
  const toggleVoiceMode = useCallback(() => {
    setIsVoiceMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_VOICE_MODE, String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  // Persist auto-send preference
  const toggleAutoSend = useCallback(() => {
    setIsAutoSendEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_AUTO_SEND, String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  /**
   * Immediately stops any current speech audio playback and releases resources.
   */
  const stopPlayback = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }

    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort('PLAYBACK_STOPPED');
      activeAbortControllerRef.current = null;
    }

    setActivePlayingId(null);
    setVoiceStatus(prev => (prev === 'speaking' ? 'idle' : prev));
  }, []);

  // Stop playback immediately when switching conversations
  useEffect(() => {
    stopPlayback();
  }, [activeConversationId, stopPlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [stopPlayback]);

  /**
   * Starts Push-to-Talk audio recording.
   * Strictly requests microphone permissions upon user interaction only.
   */
  const startRecording = useCallback(async () => {
    setVoiceError(null);
    stopPlayback();

    try {
      // Check browser microphone support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone recording is not supported in this browser environment.');
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

      // Select supported audio mime type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
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

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstart = () => {
        setVoiceStatus('listening');
      };

      recorder.onerror = (e) => {
        console.error('[Voice] MediaRecorder error:', e);
        setVoiceError('Audio recording failed.');
        setVoiceStatus('error');
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start(100); // 100ms slices for responsive data collection
    } catch (err) {
      console.warn('[Voice] Failed to access microphone:', err);
      let message = 'Could not access microphone.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Microphone permission denied. Please allow microphone access in browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No microphone device found on this system.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        message = 'Microphone is already in use by another application.';
      }
      setVoiceError(message);
      setVoiceStatus('error');
    }
  }, [stopPlayback]);

  /**
   * Stops recording, collects the audio blob, and transcribes speech.
   * @param {boolean} [autoSend=null] - Whether to automatically send transcribed text to chat. Defaults to isAutoSendEnabled setting.
   */
  const stopRecording = useCallback((autoSend = null) => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      setVoiceStatus('idle');
      return;
    }

    setVoiceStatus('transcribing');

    recorder.onstop = async () => {
      // Release microphone tracks immediately
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      const mimeType = recorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      audioChunksRef.current = [];

      if (audioBlob.size < 500) {
        setVoiceError('No speech detected. Recording was too short or silent.');
        setVoiceStatus('idle');
        return;
      }

      const targetConvId = conversationIdRef.current;
      const abortCtrl = new AbortController();
      activeAbortControllerRef.current = abortCtrl;

      try {
        const result = await transcribeAudio(audioBlob, abortCtrl.signal);
        activeAbortControllerRef.current = null;

        // Discard result if user switched conversation during transcription
        if (targetConvId !== conversationIdRef.current) {
          setVoiceStatus('idle');
          return;
        }

        if (!result.success || !result.text?.trim()) {
          setVoiceError(result.error || 'No speech could be recognized.');
          setVoiceStatus('idle');
          return;
        }

        const cleanText = result.text.trim();
        const meta = {
          language: result.language,
          probability: result.languageProbability,
          duration: result.duration
        };

        setTranscriptionPreview(cleanText);
        setDetectedLanguage(meta);

        if (onTranscriptionComplete) {
          onTranscriptionComplete(cleanText, meta);
        }

        const shouldAuto = autoSend !== null ? autoSend : isAutoSendRef.current;
        if (shouldAuto && onSendMessage) {
          onSendMessage(cleanText, targetConvId);
          setVoiceStatus('idle');
          setTranscriptionPreview('');
        } else {
          // Keep transcriptionPreview available for review & editing
          setVoiceStatus('idle');
        }
      } catch (err) {
        setVoiceError(err.message || 'Transcription error occurred.');
        setVoiceStatus('error');
      }
    };

    recorder.stop();
  }, [onSendMessage, onTranscriptionComplete]);

  /**
   * Cancels active recording without transcribing.
   */
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    audioChunksRef.current = [];
    setVoiceStatus('idle');
    setVoiceError(null);
  }, []);

  /**
   * Synthesizes and plays back speech for a specific message.
   * @param {string} messageId - Message identifier
   * @param {string} text - Text to speak
   */
  const speakMessage = useCallback(async (messageId, text) => {
    if (!text || !text.trim()) return;

    // If currently playing this exact message, toggle pause/stop
    if (activePlayingId === messageId) {
      stopPlayback();
      return;
    }

    stopPlayback();
    setActivePlayingId(messageId);
    setVoiceStatus('speaking');

    const abortCtrl = new AbortController();
    activeAbortControllerRef.current = abortCtrl;
    const targetConvId = conversationIdRef.current;

    try {
      const { success, audioUrl, error } = await synthesizeSpeech(text, {}, abortCtrl.signal);
      activeAbortControllerRef.current = null;

      // Abort if conversation switched while fetching audio
      if (targetConvId !== conversationIdRef.current || !success || !audioUrl) {
        if (error && targetConvId === conversationIdRef.current) {
          setVoiceError(`TTS: ${error}`);
        }
        stopPlayback();
        return;
      }

      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (currentAudioRef.current === audio) {
          currentAudioRef.current = null;
          setActivePlayingId(null);
          setVoiceStatus('idle');
        }
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setVoiceError('Audio playback failed.');
        stopPlayback();
      };

      await audio.play();
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[Voice] Playback error:', err);
        setVoiceError(err.message || 'Speech playback failed.');
      }
      stopPlayback();
    }
  }, [activePlayingId, stopPlayback]);

  return {
    isVoiceMode,
    toggleVoiceMode,
    isAutoSendEnabled,
    toggleAutoSend,
    voiceStatus,
    voiceError,
    transcriptionPreview,
    detectedLanguage,
    activePlayingId,
    isRecording: voiceStatus === 'listening',
    isTranscribing: voiceStatus === 'transcribing',
    isPlaying: voiceStatus === 'speaking',
    startRecording,
    stopRecording,
    cancelRecording,
    speakMessage,
    stopPlayback,
    clearError: () => setVoiceError(null),
    clearPreview: () => {
      setTranscriptionPreview('');
      setDetectedLanguage(null);
    }
  };
}

