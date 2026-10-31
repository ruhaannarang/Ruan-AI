import crypto from 'crypto';
import { lmStudioService } from '../services/lmStudioService.js';

/**
 * Server-side registry of in-flight generation AbortControllers.
 * Key: requestId (string), Value: { controller: AbortController, startedAt: number }
 */
const activeGenerations = new Map();

// Allowed standard chat roles
const ALLOWED_ROLES = new Set(['system', 'user', 'assistant']);
const MAX_MESSAGE_LENGTH = 65536; // 64 KB per message safety limit

/**
 * Helper to write a Server-Sent Event to the Express response.
 * @param {import('express').Response} res
 * @param {string} event - Event name ('init' | 'token' | 'done' | 'error')
 * @param {Object} data - Event payload
 */
function sendSSE(res, event, data) {
  if (res.writableEnded || res.destroyed) return;
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/**
 * Validates the incoming chat request body.
 * @param {Object} body
 * @returns {{ valid: boolean, error?: string }}
 */
function validateChatPayload(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const { messages, temperature, max_tokens } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return { valid: false, error: "'messages' must be a non-empty array of message objects" };
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || typeof msg !== 'object') {
      return { valid: false, error: `Message at index ${i} must be an object` };
    }
    if (!ALLOWED_ROLES.has(msg.role)) {
      return {
        valid: false,
        error: `Message at index ${i} has invalid role '${msg.role}'. Allowed roles: system, user, assistant`
      };
    }
    if (typeof msg.content !== 'string' || msg.content.trim().length === 0) {
      return { valid: false, error: `Message at index ${i} must contain a non-empty string in 'content'` };
    }
    if (msg.content.length > MAX_MESSAGE_LENGTH) {
      return { valid: false, error: `Message at index ${i} exceeds maximum length limit of ${MAX_MESSAGE_LENGTH} characters` };
    }
  }

  if (temperature !== undefined) {
    if (typeof temperature !== 'number' || isNaN(temperature) || temperature < 0 || temperature > 2) {
      return { valid: false, error: "'temperature' must be a number between 0.0 and 2.0" };
    }
  }

  if (max_tokens !== undefined) {
    if (typeof max_tokens !== 'number' || !Number.isInteger(max_tokens) || max_tokens <= 0) {
      return { valid: false, error: "'max_tokens' must be a positive integer" };
    }
  }

  return { valid: true };
}

/**
 * POST /api/chat/stream
 * Streams chat completion tokens from LM Studio via Server-Sent Events (SSE).
 */
export async function streamChat(req, res, next) {
  const validation = validateChatPayload(req.body);
  if (!validation.valid) {
    return res.status(400).json({
      error: {
        message: validation.error,
        code: 'INVALID_REQUEST_PAYLOAD',
        details: null
      }
    });
  }

  const { messages, temperature, max_tokens } = req.body;
  const requestId = req.body.requestId && typeof req.body.requestId === 'string'
    ? req.body.requestId
    : crypto.randomUUID();

  // Initialize AbortController for this generation
  const abortController = new AbortController();
  activeGenerations.set(requestId, {
    controller: abortController,
    startedAt: Date.now()
  });

  // Track if SSE stream has started and whether generation completed normally
  let sseStarted = false;
  let isCompletedNormally = false;
  let isThinking = false;
  let reader = null;

  // Handler for premature client disconnections
  const handleClientClose = () => {
    if (!res.writableEnded && !isCompletedNormally) {
      console.log(`[Chat-Stream] Client disconnected prematurely for request ${requestId}. Aborting upstream generation.`);
      abortController.abort('CLIENT_DISCONNECTED');
    }
    cleanup();
  };

  const cleanup = () => {
    activeGenerations.delete(requestId);
    res.removeListener('close', handleClientClose);
    if (reader) {
      try {
        reader.releaseLock();
      } catch {
        // Stream may already be closed or released
      }
    }
  };

  // When client terminates connection prematurely, abort upstream LM Studio fetch
  res.on('close', handleClientClose);

  try {
    const { stream, model } = await lmStudioService.streamChatCompletion({
      messages,
      temperature,
      maxTokens: max_tokens,
      signal: abortController.signal
    });

    // Upstream stream connected: Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }
    sseStarted = true;

    // Send initial metadata event
    sendSSE(res, 'init', {
      requestId,
      model,
      timestamp: new Date().toISOString()
    });

    // Stream and parse incoming SSE chunks across network boundaries
    reader = stream.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let finishReason = 'stop';
    let tokenCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete trailing slice in buffer

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        // Upstream SSE standard completion flag
        if (line === 'data: [DONE]') {
          isCompletedNormally = true;
          sendSSE(res, 'done', {
            requestId,
            model,
            finish_reason: finishReason,
            totalTokens: tokenCount
          });
          res.end();
          cleanup();
          return;
        }

        if (line.startsWith('data: ')) {
          try {
            const dataStr = line.slice(6);
            const json = JSON.parse(dataStr);
            const choice = json.choices?.[0];
            const delta = choice?.delta;

            if (choice?.finish_reason) {
              finishReason = choice.finish_reason;
            }

            if (delta?.content) {
              if (isThinking) {
                isThinking = false;
              }
              tokenCount++;
              // Strictly stream actual content tokens for user display
              sendSSE(res, 'token', {
                token: delta.content,
                requestId
              });
            } else if (delta?.reasoning_content) {
              // Internal model reasoning trace: Do NOT expose raw reasoning text.
              // Instead, notify the client with a clean 'Thinking...' status event.
              if (!isThinking) {
                isThinking = true;
                sendSSE(res, 'status', {
                  status: 'thinking',
                  message: 'Thinking...',
                  requestId
                });
              }
            }
          } catch {
            // Non-JSON SSE line from upstream, skip
          }
        }
      }
    }

    // Process any remaining bytes in buffer
    if (buffer.trim() === 'data: [DONE]') {
      isCompletedNormally = true;
      sendSSE(res, 'done', {
        requestId,
        model,
        finish_reason: finishReason,
        totalTokens: tokenCount
      });
    }

    isCompletedNormally = true;
    if (!res.writableEnded) {
      res.end();
    }
    cleanup();
  } catch (err) {
    cleanup();

    if (isCompletedNormally || res.writableEnded) {
      // Normal completion already succeeded; do not emit error or abort
      return;
    }

    const isAborted = err.name === 'AbortError' || err.code === 'GENERATION_ABORTED' || abortController.signal.aborted;

    if (sseStarted) {
      // If SSE already started, emit error event and close stream
      sendSSE(res, 'error', {
        requestId,
        code: isAborted ? 'GENERATION_ABORTED' : err.code || 'STREAM_ERROR',
        message: isAborted ? 'Generation was aborted by user or client disconnect' : err.message
      });
      res.end();
    } else {
      // If SSE hasn't started yet, respond with normal JSON HTTP status
      if (isAborted) {
        return res.status(499).json({
          error: {
            message: 'Generation request was cancelled before stream started',
            code: 'GENERATION_ABORTED',
            details: null
          }
        });
      }

      const statusCode = err.statusCode || 500;
      return res.status(statusCode).json({
        error: {
          message: err.message || 'Failed to initiate LM Studio stream',
          code: err.code || 'LM_STUDIO_STREAM_INIT_FAILED',
          details: err.details || null
        }
      });
    }
  } finally {
    cleanup();
  }
}

/**
 * POST /api/chat/abort
 * Aborts an active in-flight generation session.
 */
export function abortChat(req, res) {
  const { requestId } = req.body || {};

  if (!requestId || typeof requestId !== 'string') {
    return res.status(400).json({
      error: {
        message: "Missing or invalid 'requestId' string in request body",
        code: 'INVALID_REQUEST_ID',
        details: null
      }
    });
  }

  const session = activeGenerations.get(requestId);

  if (session) {
    try {
      session.controller.abort('ABORTED_BY_USER');
      activeGenerations.delete(requestId);
      return res.status(200).json({
        success: true,
        message: `Generation session '${requestId}' aborted successfully.`,
        aborted: true
      });
    } catch (err) {
      return res.status(500).json({
        error: {
          message: `Failed to abort generation '${requestId}': ${err.message}`,
          code: 'ABORT_FAILED',
          details: null
        }
      });
    }
  }

  // Idempotent: Request ID not found or already finished
  return res.status(200).json({
    success: true,
    message: `Generation session '${requestId}' was not active or already finished.`,
    aborted: false
  });
}
