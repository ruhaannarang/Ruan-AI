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
 * Reads tokens incrementally using ReadableStream without buffering the full response.
 * 
 * @param {Object} options
 * @param {Array<{role: 'system'|'user'|'assistant', content: string}>} options.messages - Message history
 * @param {number} [options.temperature] - Optional sampling temperature (0.0 to 2.0)
 * @param {number} [options.maxTokens] - Optional maximum tokens limit
 * @param {string} [options.requestId] - Optional request ID tracking
 * @param {AbortSignal} [options.signal] - Optional AbortSignal to cancel from client
 * @param {(status: 'thinking'|'generating', message: string, data: Object) => void} [options.onStatus] - Callback for status updates (e.g., 'Thinking...')
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
      if (onError) onError(err);
      return { requestId: genRequestId, aborted: false, error: err };
    }

    if (!response.body) {
      const err = {
        message: 'Readable stream is not supported in this client environment',
        code: 'STREAM_UNSUPPORTED',
        details: null
      };
      if (onError) onError(err);
      return { requestId: genRequestId, aborted: false, error: err };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let currentEvent = 'message';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) {
          currentEvent = 'message';
          continue;
        }

        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
          continue;
        }

        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          try {
            const data = JSON.parse(dataStr);
            if (currentEvent === 'status' || data.status !== undefined) {
              if (onStatus) onStatus(data.status, data.message || 'Thinking...', data);
            } else if (currentEvent === 'token' || data.token !== undefined) {
              if (onToken) onToken(data.token, data);
            } else if (currentEvent === 'done' || data.finish_reason !== undefined) {
              if (onDone) onDone(data);
            } else if (currentEvent === 'error') {
              if (onError) onError(data);
            }
          } catch {
            // Ignore unparseable data chunk
          }
        }
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
    if (onError) onError(errorObj);
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
