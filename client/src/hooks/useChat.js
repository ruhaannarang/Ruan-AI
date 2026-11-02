import { useState, useEffect, useRef, useCallback } from 'react';
import { streamChat, abortChat } from '../services/api';

const SYSTEM_INSTRUCTION = 'You are Ruan AI, a helpful personal AI assistant. Be clear, thoughtful, accurate, and conversational. Explain technical concepts in an understandable way. Do not claim capabilities you do not have.';
const STORAGE_KEY = 'ruan_ai_conversations_v1';
const ACTIVE_CONV_KEY = 'ruan_ai_active_conv_id';

const VALID_ROLES = new Set(['system', 'user', 'assistant']);

/**
 * Generates a clean preview title from the first message content.
 * @param {string} text
 * @returns {string}
 */
function generateTitle(text) {
  if (!text) return 'New Chat';
  const clean = text.trim().replace(/\n+/g, ' ');
  return clean.length > 36 ? clean.slice(0, 36) + '...' : clean;
}

/**
 * Creates a fresh, empty conversation object.
 * @returns {Object}
 */
function createNewConversationObject() {
  const now = Date.now();
  const id = `conv_${now}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    title: 'New Chat',
    createdAt: now,
    updatedAt: now,
    messages: []
  };
}

/**
 * Validates, filters, and sanitizes restored conversation data from localStorage.
 * Defends against corrupted data, invalid roles, and ensures transient streaming states are stripped.
 * 
 * @param {any} raw
 * @returns {Array<Object>}
 */
export function validateAndSanitizeConversations(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [createNewConversationObject()];
  }

  const sanitized = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;

    const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : null;
    if (!id) continue;

    const title = typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'New Chat';
    const createdAt = typeof item.createdAt === 'number' && !isNaN(item.createdAt) ? item.createdAt : Date.now();
    const updatedAt = typeof item.updatedAt === 'number' && !isNaN(item.updatedAt) ? item.updatedAt : createdAt;

    const messages = [];
    if (Array.isArray(item.messages)) {
      for (const msg of item.messages) {
        if (!msg || typeof msg !== 'object') continue;
        if (!msg.id || typeof msg.id !== 'string') continue;
        if (!VALID_ROLES.has(msg.role)) continue;
        if (typeof msg.content !== 'string') continue;

        // Strip transient streaming flags before persisting/restoring
        messages.push({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: typeof msg.timestamp === 'number' && !isNaN(msg.timestamp) ? msg.timestamp : Date.now(),
          isStreaming: false,
          isThinking: false,
          model: msg.model || (msg.role === 'assistant' ? 'gemma-4-e2b-it-qat' : undefined),
          error: msg.error || null
        });
      }
    }

    sanitized.push({
      id,
      title,
      createdAt,
      updatedAt,
      messages
    });
  }

  return sanitized.length > 0 ? sanitized : [createNewConversationObject()];
}

/**
 * Safely writes conversations to localStorage with quota and security checks.
 * Strips transient streaming flags and internal reasoning before writing.
 * 
 * @param {Array<Object>} conversations
 */
function persistConversationsToStorage(conversations) {
  if (typeof window === 'undefined') return;

  try {
    const sanitized = conversations.map(c => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messages: c.messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content || '',
        timestamp: m.timestamp,
        isStreaming: false,
        isThinking: false,
        model: m.model || (m.role === 'assistant' ? 'gemma-4-e2b-it-qat' : undefined),
        error: m.error || null
      }))
    }));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch (err) {
    // Gracefully handle QuotaExceededError or security restrictions (incognito mode)
    console.warn('[useChat] Failed to save conversations to localStorage (quota or security restriction):', err.message);
  }
}

/**
 * Custom hook managing Ruan AI conversations, multi-turn history,
 * real-time SSE token streaming, and generation cancellation lifecycle.
 * 
 * Architecture Choice: Single-active-generation policy.
 * Only one in-flight LLM generation runs across the client at any given time.
 * If the user initiates a new chat or deletes a generating conversation, any active
 * generation is cleanly aborted upstream and locally to safeguard consumer GPU VRAM.
 */
export function useChat(options = {}) {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Load persisted conversations or initialize with a clean one
  const [conversations, setConversations] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return validateAndSanitizeConversations(parsed);
        }
      }
    } catch (e) {
      console.warn('[useChat] Failed to restore conversations from storage:', e.message);
    }
    return [createNewConversationObject()];
  });

  // Track active conversation ID
  const [activeId, setActiveId] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedId = localStorage.getItem(ACTIVE_CONV_KEY);
        if (savedId && conversations.some(c => c.id === savedId)) {
          return savedId;
        }
      }
    } catch {}
    return conversations[0]?.id || '';
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingConvId, setGeneratingConvId] = useState(null);

  // References to manage in-flight requests and avoid stale closures
  const activeRequestIdRef = useRef(null);
  const abortControllerRef = useRef(null);
  const generatingConvIdRef = useRef(null);
  const conversationsRef = useRef(conversations);

  // Keep conversationsRef synchronized with state
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Persist conversations to storage ONLY when generation is NOT in progress.
  // This avoids writing to localStorage on every single incoming token (preventing main thread stalls).
  useEffect(() => {
    if (!isGenerating) {
      persistConversationsToStorage(conversations);
    }
  }, [conversations, isGenerating]);

  // Persist active ID safely
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && activeId) {
        localStorage.setItem(ACTIVE_CONV_KEY, activeId);
      }
    } catch (err) {
      console.warn('[useChat] Failed to persist active conversation ID:', err.message);
    }
  }, [activeId]);

  // Ensure activeId always points to a valid conversation
  useEffect(() => {
    if (!conversations.some(c => c.id === activeId) && conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  // Clean up any in-flight generation when hook unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort('COMPONENT_UNMOUNTED');
      }
      if (activeRequestIdRef.current) {
        abortChat(activeRequestIdRef.current).catch(() => {});
      }
    };
  }, []);

  /**
   * Stops an active generation cleanly.
   * Cancels in-flight controller, dispatches backend abort, and marks placeholder as stopped.
   */
  const stopGeneration = useCallback(() => {
    const reqId = activeRequestIdRef.current;
    const targetConvId = generatingConvIdRef.current;

    // Immediately cancel client controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort('USER_STOPPED');
      abortControllerRef.current = null;
    }

    // Immediately clear active request ID so any trailing SSE events are dropped
    activeRequestIdRef.current = null;
    generatingConvIdRef.current = null;

    if (reqId) {
      abortChat(reqId).catch(() => {});
    }

    if (targetConvId) {
      setConversations(prev =>
        prev.map(c => {
          if (c.id !== targetConvId) return c;
          return {
            ...c,
            updatedAt: Date.now(),
            messages: c.messages.map(m => {
              if (m.isStreaming) {
                return {
                  ...m,
                  isStreaming: false,
                  isThinking: false,
                  content: m.content ? m.content : '(Generation stopped.)'
                };
              }
              return m;
            })
          };
        })
      );
    }

    setIsGenerating(false);
    setGeneratingConvId(null);
    if (optionsRef.current?.onStop) {
      optionsRef.current.onStop();
    }
  }, []);

  /**
   * Creates a new conversation and switches to it.
   * If a generation is currently active, it is stopped first to respect single-active-generation policy.
   */
  const createNewChat = useCallback(() => {
    if (isGenerating) {
      stopGeneration();
    }

    const newConv = createNewConversationObject();
    setConversations(prev => [newConv, ...prev]);
    setActiveId(newConv.id);
    return newConv.id;
  }, [isGenerating, stopGeneration]);

  /**
   * Deletes a conversation by ID.
   * If the deleted conversation is currently generating, aborts it immediately.
   */
  const deleteConversation = useCallback((convId) => {
    // If the conversation being deleted is currently generating, cancel it cleanly
    if (generatingConvIdRef.current === convId) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort('CONVERSATION_DELETED');
        abortControllerRef.current = null;
      }
      if (activeRequestIdRef.current) {
        abortChat(activeRequestIdRef.current).catch(() => {});
        activeRequestIdRef.current = null;
      }
      generatingConvIdRef.current = null;
      setIsGenerating(false);
      setGeneratingConvId(null);
    }

    setConversations(prev => {
      const filtered = prev.filter(c => c.id !== convId);
      if (filtered.length === 0) {
        const fresh = createNewConversationObject();
        setActiveId(fresh.id);
        return [fresh];
      }
      if (activeId === convId) {
        setActiveId(filtered[0].id);
      }
      return filtered;
    });
  }, [activeId]);

  /**
   * Renames a conversation.
   */
  const renameConversation = useCallback((convId, newTitle) => {
    if (!newTitle || !newTitle.trim()) return;
    setConversations(prev =>
      prev.map(c => (c.id === convId ? { ...c, title: newTitle.trim(), updatedAt: Date.now() } : c))
    );
  }, []);

  /**
   * Sends a user message and streams assistant response from LM Studio.
   * Strictly isolates updates to targetConvId and ignores late callbacks if aborted.
   */
  const sendMessage = useCallback(async (content, specificConvId = null) => {
    const text = content?.trim();
    if (!text || isGenerating) return;

    const targetConvId = specificConvId || activeId;
    const targetConv = conversationsRef.current.find(c => c.id === targetConvId);
    if (!targetConv) return;

    const userMessageId = `msg_user_${Date.now()}`;
    const assistantMessageId = `msg_asst_${Date.now() + 1}`;
    const now = Date.now();

    const userMessage = {
      id: userMessageId,
      role: 'user',
      content: text,
      timestamp: now
    };

    const assistantPlaceholder = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: now + 1,
      isStreaming: true,
      isThinking: true,
      model: 'gemma-4-e2b-it-qat',
      error: null
    };

    // Update conversation with user message and streaming assistant placeholder
    setConversations(prev =>
      prev.map(c => {
        if (c.id !== targetConvId) return c;
        const newTitle = c.title === 'New Chat' ? generateTitle(text) : c.title;
        return {
          ...c,
          title: newTitle,
          updatedAt: now,
          messages: [...c.messages, userMessage, assistantPlaceholder]
        };
      })
    );

    // Prepare payload messages history for LM Studio
    // Strictly format roles and user-facing content (never send raw reasoning tokens)
    const history = targetConv.messages
      .filter(m => (m.role === 'user' || m.role === 'assistant') && m.content && !m.error)
      .map(m => ({ role: m.role, content: m.content }));

    const messagesPayload = [
      { role: 'system', content: SYSTEM_INSTRUCTION },
      ...history,
      { role: 'user', content: text }
    ];

    const currentRequestId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `req_${Date.now()}`;

    const controller = new AbortController();
    activeRequestIdRef.current = currentRequestId;
    abortControllerRef.current = controller;
    generatingConvIdRef.current = targetConvId;
    let accumulatedText = '';

    setIsGenerating(true);
    setGeneratingConvId(targetConvId);

    try {
      await streamChat({
        messages: messagesPayload,
        requestId: currentRequestId,
        signal: controller.signal,

        // Status event from backend (e.g. 'Thinking...')
        onStatus: (status) => {
          // Reject stale or aborted events
          if (controller.signal.aborted || activeRequestIdRef.current !== currentRequestId) {
            return;
          }

          if (status === 'thinking') {
            setConversations(prev =>
              prev.map(c => {
                if (c.id !== targetConvId) return c;
                return {
                  ...c,
                  messages: c.messages.map(m =>
                    m.id === assistantMessageId ? { ...m, isThinking: true } : m
                  )
                };
              })
            );
          }
        },

        // Streamed user-facing content token
        onToken: (token) => {
          // Reject stale or aborted events
          if (controller.signal.aborted || activeRequestIdRef.current !== currentRequestId) {
            return;
          }

          accumulatedText += token;

          setConversations(prev =>
            prev.map(c => {
              if (c.id !== targetConvId) return c;
              return {
                ...c,
                messages: c.messages.map(m => {
                  if (m.id === assistantMessageId) {
                    return {
                      ...m,
                      isThinking: false,
                      content: (m.content || '') + token
                    };
                  }
                  return m;
                })
              };
            })
          );
        },

        // Generation successfully finished
        onDone: (data) => {
          // Reject stale or aborted events
          if (controller.signal.aborted || activeRequestIdRef.current !== currentRequestId) {
            return;
          }

          setConversations(prev =>
            prev.map(c => {
              if (c.id !== targetConvId) return c;
              return {
                ...c,
                updatedAt: Date.now(),
                messages: c.messages.map(m =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        isStreaming: false,
                        isThinking: false,
                        model: data?.model || m.model || 'gemma-4-e2b-it-qat'
                      }
                    : m
                )
              };
            })
          );

          setIsGenerating(false);
          setGeneratingConvId(null);
          generatingConvIdRef.current = null;
          activeRequestIdRef.current = null;
          abortControllerRef.current = null;

          if (optionsRef.current?.onGenerationDone && accumulatedText) {
            optionsRef.current.onGenerationDone({
              id: assistantMessageId,
              content: accumulatedText,
              conversationId: targetConvId
            });
          }
        },

        // Generation error
        onError: (err) => {
          // Reject stale or aborted events
          if (controller.signal.aborted || activeRequestIdRef.current !== currentRequestId) {
            return;
          }

          console.error('[useChat] Stream error:', err);
          setConversations(prev =>
            prev.map(c => {
              if (c.id !== targetConvId) return c;
              return {
                ...c,
                updatedAt: Date.now(),
                messages: c.messages.map(m =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        isStreaming: false,
                        isThinking: false,
                        error: err.message || 'Generation failed'
                      }
                    : m
                )
              };
            })
          );

          setIsGenerating(false);
          setGeneratingConvId(null);
          generatingConvIdRef.current = null;
          activeRequestIdRef.current = null;
          abortControllerRef.current = null;
        }
      });
    } catch (err) {
      if (err.name !== 'AbortError' && !controller.signal.aborted && activeRequestIdRef.current === currentRequestId) {
        console.error('[useChat] Unexpected error during chat streaming:', err);
        setConversations(prev =>
          prev.map(c => {
            if (c.id !== targetConvId) return c;
            return {
              ...c,
              updatedAt: Date.now(),
              messages: c.messages.map(m =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      isStreaming: false,
                      isThinking: false,
                      error: err.message || 'Stream connection failed'
                    }
                  : m
              )
            };
          })
        );
      }

      if (activeRequestIdRef.current === currentRequestId) {
        setIsGenerating(false);
        setGeneratingConvId(null);
        generatingConvIdRef.current = null;
        activeRequestIdRef.current = null;
        abortControllerRef.current = null;
      }
    }
  }, [activeId, isGenerating]);

  const activeConversation = conversations.find(c => c.id === activeId) || conversations[0];

  return {
    conversations,
    activeId,
    activeConversation,
    isGenerating,
    generatingConvId,
    setActiveId,
    createNewChat,
    deleteConversation,
    renameConversation,
    sendMessage,
    stopGeneration
  };
}
