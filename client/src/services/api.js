const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '/api';

/**
 * Calls the backend decoupled health check endpoint (GET /api/health).
 * Records response payload and measures network latency in milliseconds.
 * 
 * @param {AbortSignal} [signal] Optional AbortSignal for request cancellation and cleanup
 * @returns {Promise<{
 *   success: boolean,
 *   status?: number,
 *   data?: Object,
 *   latencyMs: number,
 *   error?: string,
 *   aborted?: boolean
 * }>}
 */
export async function checkHealth(signal) {
  const start = performance.now();
  try {
    const response = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal
    });

    const latencyMs = Math.round(performance.now() - start);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        success: false,
        status: response.status,
        error: errorData?.error?.message || `HTTP ${response.status}: Failed to reach health service`,
        latencyMs
      };
    }

    const data = await response.json();
    return {
      success: true,
      status: response.status,
      data,
      latencyMs
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    
    // Distinguish intentional aborts from real network failures
    if (err.name === 'AbortError') {
      return {
        success: false,
        aborted: true,
        latencyMs
      };
    }

    return {
      success: false,
      aborted: false,
      error: err.message || 'Network connection failed. Is the Express server running on port 5000?',
      latencyMs
    };
  }
}

/**
 * Initiates a streaming chat completion through the Express backend (POST /api/chat/stream).
 * Robust, zero-dependency W3C-compliant SSE streaming parser handling CRLF, multiple data lines,
 * cross-chunk event boundaries, safe completion lifecycle, and resource release.
 * 
 * @param {Object} options
 * @param {Array<{role: 'system'|'user'|'assistant', content: string}>} options.messages - Message history
 * @param {number} [options.temperature] - Optional sampling temperature (0.0 to 2.0)
 * @param {number} [options.maxTokens] - Optional maximum tokens limit
 * @param {string} [options.requestId] - Optional request ID tracking
 * @param {AbortSignal} [options.signal] - Optional AbortSignal to cancel from client
 * @param {(status: 'thinking'|'generating', message: string, data: Object) => void} [options.onStatus] - Callback for status updates
 * @param {(token: string, data: Object) => void} [options.onToken] - Callback for each streamed user-facing content token
 * @param {(data: { requestId: string, model: string, finish_reason: string, totalTokens: number }) => void} [options.onDone] - Callback when generation is complete
 * @param {(error: { message: string, code: string, details?: any }) => void} [options.onError] - Callback on structured error
 * @returns {Promise<{ requestId: string, aborted: boolean, error?: Object }>}
 */
export async function streamChat({
  messages,
  temperature,
  maxTokens,
  requestId,
  signal,
  onStatus,
  onToken,
  onDone,
  onError
}) {
  const genRequestId = requestId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}`);

  // Guaranteed single-invocation lifecycle guards
  let hasTerminated = false;

  const safeOnToken = (token, data) => {
    if (hasTerminated || signal?.aborted) return;
    if (onToken) onToken(token, data);
  };

  const safeOnStatus = (status, msg, data) => {
    if (hasTerminated || signal?.aborted) return;
    if (onStatus) onStatus(status, msg, data);
  };

  const safeOnDone = (data) => {
    if (hasTerminated || signal?.aborted) return;
    hasTerminated = true;
    if (onDone) onDone(data);
  };

  const safeOnError = (err) => {
    if (hasTerminated || signal?.aborted) return;
    hasTerminated = true;
    if (onError) onError(err);
  };

  try {
    const response = await fetch(`${BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        messages,
        temperature,
        max_tokens: maxTokens,
        requestId: genRequestId
      }),
      signal
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => null);
      const err = {
        message: errorJson?.error?.message || `HTTP ${response.status}: Failed to initiate chat stream`,
        code: errorJson?.error?.code || 'STREAM_INIT_FAILED',
        details: errorJson?.error?.details || null
      };
      safeOnError(err);
      return { requestId: genRequestId, aborted: false, error: err };
    }

    if (!response.body) {
      const err = {
        message: 'Readable stream is not supported in this client environment',
        code: 'STREAM_UNSUPPORTED',
        details: null
      };
      safeOnError(err);
      return { requestId: genRequestId, aborted: false, error: err };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    let buffer = '';
    let currentEvent = 'message';
    let dataLines = [];

    // Helper to dispatch an assembled SSE message
    const dispatchMessage = (event, rawData) => {
      if (hasTerminated || signal?.aborted) return;

      if (event === 'error') {
        let errData;
        try {
          errData = JSON.parse(rawData);
        } catch {
          errData = { message: rawData || 'Upstream stream error', code: 'STREAM_ERROR' };
        }
        safeOnError({
          message: errData.message || 'Stream error occurred',
          code: errData.code || 'STREAM_ERROR',
          details: errData.details || null
        });
        return;
      }

      if (rawData === '[DONE]') {
        safeOnDone({
          requestId: genRequestId,
          finish_reason: 'stop'
        });
        return;
      }

      try {
        const json = JSON.parse(rawData);

        if (event === 'status' || json.status !== undefined) {
          safeOnStatus(json.status, json.message || 'Thinking...', json);
        } else if (event === 'token' || json.token !== undefined) {
          safeOnToken(json.token, json);
        } else if (event === 'done' || json.finish_reason !== undefined) {
          safeOnDone(json);
        } else if (event === 'error' || json.error) {
          safeOnError({
            message: json.error?.message || json.message || 'Error received from backend stream',
            code: json.error?.code || json.code || 'STREAM_ERROR',
            details: json.error?.details || null
          });
        }
      } catch {
        // Non-JSON SSE data payload; handle gracefully based on event type
        if (event === 'token') {
          safeOnToken(rawData, { token: rawData });
        } else if (event === 'status') {
          safeOnStatus('status', rawData, { message: rawData });
        }
      }
    };

    // Parser loop handling chunk splits, CRLF and LF, and reader lock release
    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;
        if (signal?.aborted) {
          return { requestId: genRequestId, aborted: true };
        }

        // Decode value and normalize CRLF (\r\n) or lone \r to standard \n
        const chunkText = decoder.decode(value, { stream: true });
        buffer += chunkText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        const lines = buffer.split('\n');
        // Retain the trailing incomplete segment in buffer
        buffer = lines.pop() || '';

        for (const rawLine of lines) {
          const line = rawLine;

          // Empty line indicates event boundary in SSE protocol
          if (line === '') {
            if (dataLines.length > 0) {
              const fullData = dataLines.join('\n');
              dispatchMessage(currentEvent, fullData);
              dataLines = [];
            }
            currentEvent = 'message';
            continue;
          }

          // Ignore comments (lines starting with ':')
          if (line.startsWith(':')) {
            continue;
          }

          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
            continue;
          }

          if (line.startsWith('data:')) {
            // Strip leading space after colon if present
            const val = line.slice(5).replace(/^\s/, '');
            dataLines.push(val);
            continue;
          }
        }
      }

      // Flush remaining data in buffer after stream reaches EOF
      if (buffer.trim()) {
        const remainingLines = buffer.split('\n');
        for (const rawLine of remainingLines) {
          if (rawLine.startsWith('event:')) {
            currentEvent = rawLine.slice(6).trim();
          } else if (rawLine.startsWith('data:')) {
            dataLines.push(rawLine.slice(5).replace(/^\s/, ''));
          }
        }
      }

      if (dataLines.length > 0) {
        dispatchMessage(currentEvent, dataLines.join('\n'));
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // Reader already closed or released
      }
    }

    return { requestId: genRequestId, aborted: false };
  } catch (err) {
    if (err.name === 'AbortError' || signal?.aborted) {
      return { requestId: genRequestId, aborted: true };
    }
    const errorObj = {
      message: err.message || 'An unexpected error occurred during streaming',
      code: 'NETWORK_STREAM_ERROR'
    };
    safeOnError(errorObj);
    return { requestId: genRequestId, aborted: false, error: errorObj };
  }
}

/**
 * Dispatches an explicit abort request to POST /api/chat/abort to cancel an in-flight session on the server.
 * 
 * @param {string} requestId - The unique ID of the generation session to abort
 * @returns {Promise<{ success: boolean, message: string, aborted: boolean }>}
 */
export async function abortChat(requestId) {
  if (!requestId || typeof requestId !== 'string') {
    return { success: false, message: 'Invalid requestId', aborted: false };
  }

  try {
    const response = await fetch(`${BASE_URL}/chat/abort`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ requestId })
    });

    return await response.json();
  } catch (err) {
    return {
      success: false,
      message: err.message || 'Failed to dispatch abort request',
      aborted: false
    };
  }
}

/**
 * Formats a raw model identifier (e.g. 'gemma-4-e2b-it-qat') into a readable display title.
 * @param {string} [modelId]
 * @returns {string}
 */
export function formatModelDisplayName(modelId) {
  if (!modelId || typeof modelId !== 'string') return 'Gemma 4 E2B IT QAT';
  if (modelId === 'gemma-4-e2b-it-qat') return 'Gemma 4 E2B IT QAT';
  if (modelId === 'ling-3.0-tiny') return 'Ling 3.0 Tiny';
  if (modelId.includes('qwen2.5-vl-7b')) return 'Qwen 2.5 VL 7B';
  return modelId.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
