import crypto from 'crypto';
import { config } from '../config/index.js';
import { llmCoordinator } from '../services/llmCoordinator.js';
import { StreamingTTSCoordinator } from '../services/voice/streamingTtsCoordinator.js';
import { DocumentParserService } from '../services/documentParserService.js';
import { imageGenerationService } from '../services/imageGenerationService.js';

/**
 * Server-side registry of in-flight generation AbortControllers.
 * Key: requestId (string), Value: { controller: AbortController, startedAt: number }
 */
const activeGenerations = new Map();

// Allowed standard chat roles
const ALLOWED_ROLES = new Set(['system', 'user', 'assistant']);
const MAX_MESSAGE_LENGTH = 65536; // 64 KB per message safety limit

export const DEFAULT_SYSTEM_INSTRUCTION = 'You are Ruan AI, a personal AI assistant. Keep all responses short, simple, and easy to understand, just like a natural, real-life conversation. Avoid long explanations, fluff, or walls of text. Never use emojis in your responses so speech stays clean and natural. When given a direct task, instruction, or command to do something, start with "Yes boss". For questions, greetings, or explanations, answer directly without saying "Yes boss".';

/**
 * Detects whether a user prompt is asking to generate an image from scratch.
 * @param {string} text
 * @returns {{ isMatch: boolean, prompt?: string }}
 */
function isImageGenerationPrompt(text = '') {
  if (!text || typeof text !== 'string') return { isMatch: false };
  const trimmed = text.trim();
  if (trimmed.startsWith('/image') || trimmed.startsWith('/imagine') || trimmed.startsWith('/draw')) {
    const clean = trimmed.replace(/^\/(image|imagine|draw)\s*/i, '').trim();
    return { isMatch: true, prompt: clean || 'A creative artwork' };
  }
  const pattern = /^(?:please\s+)?(?:generate|create|draw|make|paint)\s+(?:an?\s+)?(?:image|picture|photo|illustration|drawing|artwork|art|graphic)\s+(?:of|showing|about|for)\s+(.+)$/i;
  const match = trimmed.match(pattern);
  if (match && match[1]) {
    return { isMatch: true, prompt: match[1].trim() };
  }
  return { isMatch: false };
}

/**
 * Detects whether a user prompt is asking to edit or modify an existing image.
 * @param {string} text
 * @param {boolean} [hasImageAttachment=false]
 * @returns {{ isMatch: boolean, prompt?: string }}
 */
function isImageEditPrompt(text = '', hasImageAttachment = false) {
  if (!text || typeof text !== 'string') return { isMatch: false };
  const trimmed = text.trim();

  // 1. Explicit edit slash commands (/edit, /img2img, /modify, /transform, /restyle, /style)
  const editSlashMatch = trimmed.match(/^\/(edit|img2img|modify|transform|restyle|style)\s*(.*)$/i);
  if (editSlashMatch) {
    return {
      isMatch: true,
      prompt: editSlashMatch[2].trim() || 'Enhance and transform this image'
    };
  }

  // 2. /image, /imagine, /draw with an attached image is an edit/img2img request
  const imgSlashMatch = trimmed.match(/^\/(image|imagine|draw)\s*(.*)$/i);
  if (imgSlashMatch && hasImageAttachment) {
    return {
      isMatch: true,
      prompt: imgSlashMatch[2].trim() || 'Enhance and transform this image'
    };
  }

  // If no image is attached, only prompts explicitly mentioning an image count
  const mentionsImage = /\b(?:this|the|attached)\s+(?:image|photo|picture|pic|graphic)\b/i.test(trimmed);
  if (!hasImageAttachment && !mentionsImage) {
    return { isMatch: false };
  }

  // 3. Reject pure informational vision queries (e.g. "what is in this photo?")
  const isQuestion = /^(?:what|who|where|when|why|how many|is this|are there|can you (?:read|see|describe|explain|tell me)|describe|explain|read|transcribe|analyze|analyse|summarize)\b/i.test(trimmed);
  if (isQuestion && !/\b(?:edit|change|transform|convert|redraw|turn into|make it look|recolor|add\s+.+?\s+(?:to|in|with))\b/i.test(trimmed)) {
    return { isMatch: false };
  }

  // Clean prompt in case it starts with /image
  const cleanText = trimmed.replace(/^\/(image|imagine|draw)\s*/i, '');

  // 4. Natural language editing patterns
  const editPatterns = [
    /^(?:can you\s+)?(?:please\s+)?(?:edit|modify|redraw|stylize|recolor|touch up|retouch)\s+(?:this|the)?\s*(?:image|photo|pic|picture)?\s*[:,-]?\s*(.+)$/i,
    /^(?:can you\s+)?(?:please\s+)?(?:turn|convert|transform|change)\s+(?:this|the|it)\s+(?:image|photo|pic|picture)?\s*(?:in)?to\s+(.+)$/i,
    /^(?:can you\s+)?(?:please\s+)?change\s+(?:the\s+)?(?:background|color|colors|style|lighting|hair|clothes|outfit|setting|face)\s*(?:to|into|with)?\s*(.+)$/i,
    /^(?:can you\s+)?(?:please\s+)?make\s+(?:this|the|it)\s+(?:image|photo|pic|picture)?\s*(?:look\s+like|into)\s+(.+)$/i,
    /^(?:can you\s+)?(?:please\s+)?make\s+(?:some\s+)?changes?\s+(?:to|in)\s+(?:this|the)\s+(?:image|photo|pic|picture)\s*[:,-]?\s*(.+)$/i,
    /^(?:can you\s+)?(?:please\s+)?add\s+(.+)$/i,
    /^(?:can you\s+)?(?:please\s+)?put\s+(.+)$/i,
    /^(?:can you\s+)?(?:please\s+)?insert\s+(.+)$/i,
    /^(?:can you\s+)?(?:please\s+)?remove\s+(.+)$/i,
    /^(?:can you\s+)?(?:please\s+)?replace\s+(.+)$/i
  ];

  for (const pattern of editPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      return { isMatch: true, prompt: (match[1] || cleanText).trim() };
    }
  }

  // Catch phrases like "edit this image", "make changes in this image", "modify this photo"
  if (/\b(?:edit|modify|transform|restyle|recolor)\s+(?:this|the)\s+(?:image|photo|picture)\b/i.test(cleanText)) {
    return { isMatch: true, prompt: cleanText };
  }

  return { isMatch: false };
}

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
    const isStringContent = typeof msg.content === 'string' && msg.content.trim().length > 0;
    const isArrayContent = Array.isArray(msg.content) && msg.content.length > 0;
    if (!isStringContent && !isArrayContent) {
      return { valid: false, error: `Message at index ${i} must contain non-empty 'content' (string or multimodal parts array)` };
    }
    if (isStringContent && msg.content.length > MAX_MESSAGE_LENGTH) {
      return { valid: false, error: `Message at index ${i} exceeds maximum length limit of ${MAX_MESSAGE_LENGTH} characters` };
    }
  }

  if (body.attachments !== undefined) {
    if (!Array.isArray(body.attachments)) {
      return { valid: false, error: "'attachments' must be an array of attachment objects" };
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

  if (body.voice !== undefined && typeof body.voice !== 'boolean') {
    return { valid: false, error: "'voice' must be a boolean (true or false)" };
  }

  if (body.voiceOptions !== undefined && (typeof body.voiceOptions !== 'object' || body.voiceOptions === null)) {
    return { valid: false, error: "'voiceOptions' must be an object" };
  }

  if (body.provider !== undefined && typeof body.provider !== 'string') {
    return { valid: false, error: "'provider' must be a string ('local' or 'nvidia_nim')" };
  }

  if (body.model !== undefined && typeof body.model !== 'string') {
    return { valid: false, error: "'model' must be a string" };
  }

  return { valid: true };
}

/**
 * POST /api/chat/stream
 * Streams chat completion tokens via Server-Sent Events (SSE).
 * Supports local LM Studio runtime and optional online NVIDIA NIM API.
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

  const { messages, temperature, max_tokens, voice, voiceOptions, provider, model } = req.body;
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

  // Initialize Streaming TTS coordinator if voice mode requested
  const ttsCoordinator = voice === true ? new StreamingTTSCoordinator({
    requestId,
    res,
    voiceOptions,
    signal: abortController.signal,
    sendSSE
  }) : null;

  // Handler for premature client disconnections
  const handleClientClose = () => {
    if (!res.writableEnded && !isCompletedNormally) {
      console.log(`[Chat-Stream] Client disconnected prematurely for request ${requestId}. Aborting upstream generation.`);
      abortController.abort('CLIENT_DISCONNECTED');
    }
    if (ttsCoordinator) {
      ttsCoordinator.abort();
    }
    cleanup();
  };

  const cleanup = () => {
    activeGenerations.delete(requestId);
    res.removeListener('close', handleClientClose);
    if (ttsCoordinator) {
      ttsCoordinator.abort();
    }
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
    // Ensure system prompt is present and standardized at the start of conversation
    const formattedMessages = [...messages];
    const systemIndex = formattedMessages.findIndex(m => m.role === 'system');
    if (systemIndex === -1) {
      formattedMessages.unshift({ role: 'system', content: DEFAULT_SYSTEM_INSTRUCTION });
    } else {
      formattedMessages[systemIndex] = { role: 'system', content: DEFAULT_SYSTEM_INSTRUCTION };
    }

    // Process attachments if provided
    const incomingAttachments = Array.isArray(req.body.attachments) ? req.body.attachments : [];
    let effectiveModel = model;
    let effectiveProvider = provider;

    if (incomingAttachments.length > 0) {
      const lastUserIndex = formattedMessages.map(m => m.role).lastIndexOf('user');
      const basePrompt = lastUserIndex !== -1 && typeof formattedMessages[lastUserIndex].content === 'string'
        ? formattedMessages[lastUserIndex].content
        : '';

      const processed = await DocumentParserService.processAttachmentsForChat(basePrompt, incomingAttachments);

      if (lastUserIndex !== -1) {
        if (processed.images.length > 0) {
          formattedMessages[lastUserIndex] = {
            role: 'user',
            content: processed.formattedContent
          };

          // Route to vision model for images when using NVIDIA NIM
          const resolved = llmCoordinator.resolveProvider(effectiveProvider);
          if (resolved === 'nvidia_nim' && !model) {
            effectiveModel = config.nvidiaNim.visionModel;
          }
        } else {
          formattedMessages[lastUserIndex] = {
            role: 'user',
            content: processed.formattedContent
          };
        }
      }
    }

    // Check if the user prompt is an Image Edit or Image Generation request
    const lastUserMsg = formattedMessages.filter(m => m.role === 'user').pop();
    const promptText = typeof lastUserMsg?.content === 'string'
      ? lastUserMsg.content
      : Array.isArray(lastUserMsg?.content)
        ? (lastUserMsg.content.find(p => p.type === 'text')?.text || '')
        : '';

    const attachedImage = incomingAttachments.find(a =>
      (a.type && a.type.startsWith('image/')) || (a.dataUrl && a.dataUrl.startsWith('data:image/'))
    );
    const hasImageAttachment = Boolean(attachedImage);

    // 1. Image Edit / img2img Check
    const imgEditMatch = isImageEditPrompt(promptText, hasImageAttachment);
    const imgGenMatch = isImageGenerationPrompt(promptText);
    const shouldEdit = imgEditMatch.isMatch || (imgGenMatch.isMatch && hasImageAttachment);
    const activeEditPrompt = imgEditMatch.isMatch
      ? imgEditMatch.prompt
      : (imgGenMatch.isMatch ? imgGenMatch.prompt : promptText);

    if (shouldEdit) {
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      if (typeof res.flushHeaders === 'function') res.flushHeaders();
      sseStarted = true;

      const chosenImgProvider = req.body.imageProvider || config.imageGen?.provider || 'cloud';

      // Find the source image to edit
      let targetImage = attachedImage?.dataUrl || null;
      if (!targetImage) {
        // Look back through recent conversation history for an image
        for (let i = formattedMessages.length - 1; i >= 0; i--) {
          const m = formattedMessages[i];
          if (Array.isArray(m.content)) {
            const imgPart = m.content.find(p => p.type === 'image_url' && p.image_url?.url);
            if (imgPart) {
              targetImage = imgPart.image_url.url;
              break;
            }
          } else if (typeof m.content === 'string') {
            const match = m.content.match(/!\[.*?\]\((data:image\/[a-zA-Z0-9+/=;,-]+|https?:\/\/[^\s)]+)\)/);
            if (match && match[1]) {
              targetImage = match[1];
              break;
            }
          }
        }
      }

      if (!targetImage) {
        // No image available to modify
        sendSSE(res, 'init', {
          requestId,
          model: 'assistant',
          provider: 'system'
        });

        const helpMsg = 'Yes boss, please attach an image first using the paperclip button, then describe how you would like me to modify it.';
        for (let i = 0; i < helpMsg.length; i += 12) {
          sendSSE(res, 'token', { token: helpMsg.slice(i, i + 12), finish_reason: null });
        }

        sendSSE(res, 'done', {
          requestId,
          model: 'assistant',
          finish_reason: 'stop',
          totalTokens: Math.ceil(helpMsg.length / 4)
        });

        isCompletedNormally = true;
        cleanup();
        res.end();
        return;
      }

      sendSSE(res, 'init', {
        requestId,
        model: `image-edit-${chosenImgProvider}`,
        provider: chosenImgProvider
      });

      sendSSE(res, 'status', {
        status: 'thinking',
        message: `Modifying image with ${chosenImgProvider === 'local' ? 'Local RTX 3050 GPU' : 'Flux Cloud'}...`
      });

      try {
        const editResult = await imageGenerationService.editImage({
          image: targetImage,
          prompt: activeEditPrompt,
          provider: chosenImgProvider
        });

        const replyMarkdown = `Yes boss, here is your edited image:\n\n![${activeEditPrompt}](${editResult.imageUrl})\n\n*Edited with ${editResult.provider === 'local' ? 'Local RTX 3050 Stable Diffusion' : 'Flux (Cloud)'} in ${(editResult.durationMs / 1000).toFixed(1)}s*`;

        const chunkSize = 12;
        for (let i = 0; i < replyMarkdown.length; i += chunkSize) {
          if (abortController.signal.aborted) break;
          const token = replyMarkdown.slice(i, i + chunkSize);
          sendSSE(res, 'token', { token, finish_reason: null });
        }

        sendSSE(res, 'done', {
          requestId,
          model: `image-edit-${chosenImgProvider}`,
          finish_reason: 'stop',
          totalTokens: Math.ceil(replyMarkdown.length / 4)
        });

        isCompletedNormally = true;
        cleanup();
        res.end();
        return;
      } catch (editErr) {
        sendSSE(res, 'error', {
          message: `Image editing failed: ${editErr.message}`,
          code: editErr.code || 'IMAGE_EDIT_FAILED'
        });
        isCompletedNormally = true;
        cleanup();
        res.end();
        return;
      }
    }

    // 2. Image Generation from scratch Check
    if (imgGenMatch.isMatch && incomingAttachments.length === 0) {
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      if (typeof res.flushHeaders === 'function') res.flushHeaders();
      sseStarted = true;

      const chosenImgProvider = req.body.imageProvider || config.imageGen?.provider || 'cloud';

      sendSSE(res, 'init', {
        requestId,
        model: `image-gen-${chosenImgProvider}`,
        provider: chosenImgProvider
      });

      sendSSE(res, 'status', {
        status: 'thinking',
        message: `Generating image with ${chosenImgProvider === 'local' ? 'Local RTX 3050 GPU' : 'Flux Cloud'}...`
      });

      try {
        const genResult = await imageGenerationService.generateImage({
          prompt: imgGenMatch.prompt,
          provider: chosenImgProvider
        });

        const imgDisplayUrl = genResult.directUrl || genResult.imageUrl;
        const replyMarkdown = `Yes boss, here is your generated image of "${imgGenMatch.prompt}":\n\n![${imgGenMatch.prompt}](${imgDisplayUrl})\n\n*Generated with ${genResult.provider === 'local' ? 'Local RTX 3050 Stable Diffusion' : 'Flux (Cloud)'} in ${(genResult.durationMs / 1000).toFixed(1)}s*`;

        const chunkSize = 12;
        for (let i = 0; i < replyMarkdown.length; i += chunkSize) {
          if (abortController.signal.aborted) break;
          const token = replyMarkdown.slice(i, i + chunkSize);
          sendSSE(res, 'token', { token, finish_reason: null });
        }

        sendSSE(res, 'done', {
          requestId,
          model: `image-gen-${chosenImgProvider}`,
          finish_reason: 'stop',
          totalTokens: Math.ceil(replyMarkdown.length / 4)
        });

        isCompletedNormally = true;
        cleanup();
        res.end();
        return;
      } catch (genErr) {
        sendSSE(res, 'error', {
          message: `Image generation failed: ${genErr.message}`,
          code: genErr.code || 'IMAGE_GEN_FAILED'
        });
        isCompletedNormally = true;
        cleanup();
        res.end();
        return;
      }
    }

    const { stream, model: activeModel, provider: activeProvider } = await llmCoordinator.streamChatCompletion({
      messages: formattedMessages,
      model: effectiveModel,
      temperature,
      maxTokens: max_tokens,
      provider: effectiveProvider,
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
      model: activeModel,
      provider: activeProvider,
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

          // Notify client that text token streaming has finished
          sendSSE(res, 'text_done', {
            requestId,
            model: activeModel,
            provider: activeProvider,
            finish_reason: finishReason,
            totalTokens: tokenCount
          });

          // In voice mode, wait for all pending audio chunks to finish synthesis and dispatch
          if (ttsCoordinator) {
            try {
              await ttsCoordinator.finish();
            } catch (ttsErr) {
              console.warn(`[Chat-Stream] Error finishing TTS for req ${requestId}:`, ttsErr.message);
            }
          }

          // Emit canonical completion event after both text and all audio chunks have been sent
          sendSSE(res, 'done', {
            requestId,
            model: activeModel,
            provider: activeProvider,
            finish_reason: finishReason,
            totalTokens: tokenCount
          });

          if (!res.writableEnded) {
            res.end();
          }
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
              if (ttsCoordinator) {
                ttsCoordinator.feedToken(delta.content);
              }
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

    // Process completion if reader loop ended without data: [DONE]
    if (!isCompletedNormally) {
      isCompletedNormally = true;

      // Notify client that text token streaming has finished
      sendSSE(res, 'text_done', {
        requestId,
        model: activeModel,
        provider: activeProvider,
        finish_reason: finishReason,
        totalTokens: tokenCount
      });

      if (ttsCoordinator) {
        try {
          await ttsCoordinator.finish();
        } catch (ttsErr) {
          console.warn(`[Chat-Stream] Error finishing TTS for req ${requestId}:`, ttsErr.message);
        }
      }

      sendSSE(res, 'done', {
        requestId,
        model: activeModel,
        provider: activeProvider,
        finish_reason: finishReason,
        totalTokens: tokenCount
      });
    }

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
