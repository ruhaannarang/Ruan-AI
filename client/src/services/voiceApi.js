/**
 * Ruan AI — Client Voice API Service
 * Handles audio uploads for transcription, speech synthesis requests, and voice diagnostics.
 */

const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '/api';

/**
 * Uploads an audio blob to POST /api/voice/transcribe.
 * @param {Blob} audioBlob - Recorded audio blob (WAV, WebM, etc.)
 * @param {AbortSignal} [signal] - Optional cancellation signal
 * @returns {Promise<{
 *   success: boolean,
 *   text: string,
 *   language: string,
 *   languageProbability: number,
 *   duration: number,
 *   processingTime: number,
 *   error?: string
 * }>}
 */
export async function transcribeAudio(audioBlob, signal) {
  if (!audioBlob || audioBlob.size === 0) {
    return { success: false, text: '', error: 'Audio recording is empty' };
  }

  const formData = new FormData();
  // Provide appropriate file extension based on blob type
  const mime = audioBlob.type || 'audio/webm';
  const ext = mime.includes('wav') ? 'wav' : (mime.includes('ogg') ? 'ogg' : 'webm');
  formData.append('file', audioBlob, `recording.${ext}`);

  try {
    const response = await fetch(`${BASE_URL}/voice/transcribe`, {
      method: 'POST',
      body: formData,
      signal
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      return {
        success: false,
        text: '',
        error: errData?.error?.message || `Transcription failed with HTTP ${response.status}`
      };
    }

    const data = await response.json();
    return {
      success: true,
      text: data.text || '',
      language: data.language || 'unknown',
      languageProbability: data.languageProbability || 0,
      duration: data.duration || 0,
      processingTime: data.processingTime || 0,
      segments: data.segments || []
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { success: false, text: '', error: 'Transcription was cancelled' };
    }
    return {
      success: false,
      text: '',
      error: err.message || 'Failed to connect to transcription service'
    };
  }
}

/**
 * Requests speech synthesis from POST /api/voice/synthesize.
 * @param {string} text - Response text to speak
 * @param {Object} [options]
 * @param {string} [options.voice] - Voice profile
 * @param {number} [options.speed] - Speed multiplier
 * @param {string} [options.lang] - Language context
 * @param {AbortSignal} [signal] - Optional cancellation signal
 * @returns {Promise<{ success: boolean, audioUrl?: string, blob?: Blob, error?: string }>}
 */
export async function synthesizeSpeech(text, options = {}, signal) {
  if (!text || !text.trim()) {
    return { success: false, error: 'Text parameter cannot be empty' };
  }

  try {
    const response = await fetch(`${BASE_URL}/voice/synthesize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text.trim(),
        voice: options.voice,
        speed: options.speed || 1.0,
        lang: options.lang || 'auto'
      }),
      signal
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      return {
        success: false,
        error: errData?.error?.message || `Speech synthesis failed with HTTP ${response.status}`
      };
    }

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    return { success: true, audioUrl, blob };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { success: false, error: 'Synthesis was cancelled' };
    }
    return {
      success: false,
      error: err.message || 'Failed to connect to speech synthesis service'
    };
  }
}

/**
 * Checks voice subsystem health (GET /api/voice/health).
 */
export async function getVoiceHealth(signal) {
  try {
    const response = await fetch(`${BASE_URL}/voice/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal
    });
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    const data = await response.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetches available voices (GET /api/voice/voices).
 */
export async function getAvailableVoices(signal) {
  try {
    const response = await fetch(`${BASE_URL}/voice/voices`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal
    });
    if (!response.ok) return { default_voice: 'hf_alpha', voices: [] };
    return await response.json();
  } catch {
    return { default_voice: 'hf_alpha', voices: [] };
  }
}

// ==========================================
// Phase 1.6.1 Hinglish Benchmark Client API
// ==========================================

/**
 * Fetches the standard Hinglish benchmark prompts.
 */
export async function getBenchmarkPrompts(signal) {
  try {
    const response = await fetch(`${BASE_URL}/voice/benchmark/prompts`, { signal });
    if (!response.ok) return { success: false, prompts: [] };
    return await response.json();
  } catch (err) {
    return { success: false, error: err.message, prompts: [] };
  }
}

/**
 * Sends a recorded audio blob for comparative evaluation (small vs base).
 */
export async function compareBenchmarkSample(audioBlob, { reference, category, technicalTerms }, signal) {
  if (!audioBlob) return { success: false, error: 'No audio sample provided' };

  const formData = new FormData();
  const mime = audioBlob.type || 'audio/webm';
  const ext = mime.includes('wav') ? 'wav' : 'webm';
  formData.append('file', audioBlob, `sample.${ext}`);
  formData.append('reference', reference || '');
  formData.append('category', category || 'Unspecified');
  formData.append('technical_terms', JSON.stringify(technicalTerms || []));

  try {
    const response = await fetch(`${BASE_URL}/voice/benchmark/compare`, {
      method: 'POST',
      body: formData,
      signal
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      return { success: false, error: err?.error?.message || `HTTP ${response.status}` };
    }
    return await response.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Saves a benchmark sample and its comparative result to local storage.
 */
export async function saveBenchmarkSample(audioBlob, { sampleId, reference, category, evaluation }, signal) {
  if (!audioBlob) return { success: false, error: 'No audio sample provided' };

  const formData = new FormData();
  const mime = audioBlob.type || 'audio/webm';
  const ext = mime.includes('wav') ? 'wav' : 'webm';
  formData.append('file', audioBlob, `sample.${ext}`);
  formData.append('sample_id', sampleId || 'sample');
  formData.append('reference', reference || '');
  formData.append('category', category || 'Unspecified');
  formData.append('evaluation_json', JSON.stringify(evaluation || {}));

  try {
    const response = await fetch(`${BASE_URL}/voice/benchmark/save`, {
      method: 'POST',
      body: formData,
      signal
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      return { success: false, error: err?.error?.message || `HTTP ${response.status}` };
    }
    return await response.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetches the local benchmark history and summary statistics.
 */
export async function getBenchmarkHistory(signal) {
  try {
    const response = await fetch(`${BASE_URL}/voice/benchmark/history`, { signal });
    if (!response.ok) return { success: false, history: { runs: [], summary: {} } };
    return await response.json();
  } catch (err) {
    return { success: false, error: err.message, history: { runs: [], summary: {} } };
  }
}

/**
 * Clears saved benchmark history.
 */
export async function clearBenchmarkHistory(signal) {
  try {
    const response = await fetch(`${BASE_URL}/voice/benchmark/history`, {
      method: 'DELETE',
      signal
    });
    return await response.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}


