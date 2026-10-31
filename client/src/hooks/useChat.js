import { useState, useEffect, useRef, useCallback } from 'react';
import { streamChat, abortChat } from '../services/api';

const SYSTEM_INSTRUCTION = 'You are Ruan AI, a helpful personal AI assistant. Be clear, thoughtful, accurate, and conversational. Explain technical concepts in an understandable way. Do not claim capabilities you do not have.';
const STORAGE_KEY = 'ruan_ai_conversations_v1';
const ACTIVE_CONV_KEY = 'ruan_ai_active_conv_id';

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
 * Creates an empty conversation object.
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
 * Custom hook managing Ruan AI conversations, multi-turn history,
 * real-time SSE token streaming, and generation cancellation lifecycle.
 */
export function useChat() {
  // Load persisted conversations or initialize with a clean one
  const [conversations, setConversations] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('[useChat] Failed to restore conversations from storage:', e);
    }
    return [createNewConversationObject()];
  });

  // Track active conversation ID
  const [activeId, setActiveId] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedId = localStorage.getItem(ACTIVE_CONV_KEY);
        if (savedId) return savedId;
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

  // Keep ref synchronized with state
  useEffect(() => {
    conversationsRef.current = conversations;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
      }
    } catch (e) {
      console.warn('[useChat] Failed to persist conversations:', e);
    }
  }, [conversations]);

  // Persist active ID
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && activeId) {
        localStorage.setItem(ACTIVE_CONV_KEY, activeId);
      }
    } catch {}
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
   * Creates a new conversation and switches to it.
   */
  const createNewChat = useCallback(() => {
    const newConv = createNewConversationObject();
    setConversations(prev => [newConv, ...prev]);
    setActiveId(newConv.id);
    return newConv.id;
  }, []);

  /**
   * Deletes a conversation by ID.
   */
  const deleteConversation = useCallback((convId) => {
    // If the conversation being deleted is currently generating, cancel it
    if (generatingConvIdRef.current === convId) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort('CONVERSATION_DELETED');
      }
      if (activeRequestIdRef.current) {
        abortChat(activeRequestIdRef.current).catch(() => {});
      }
      setIsGenerating(false);
      setGeneratingConvId(null);
      generatingConvIdRef.current = null;
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
    if (!newTitle.trim()) return;
    setConversations(prev =>
      prev.map(c => (c.id === convId ? { ...c, title: newTitle.trim(), updatedAt: Date.now() } : c))
    );
  }, []);

  /**
   * Stops an active generation.
   */
  const stopGeneration = useCallback(() => {
    const reqId = activeRequestIdRef.current;
    const targetConvId = generatingConvIdRef.current;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort('USER_STOPPED');
      abortControllerRef.current = null;
    }

    if (reqId) {
      abortChat(reqId).catch(() => {});
      activeRequestIdRef.current = null;
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
                  content: m.content || '(Generation stopped.)'
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
    generatingConvIdRef.current = null;
  }, []);

  /**
   * Sends a user message and streams assistant response from LM Studio.
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

    const requestId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `req_${Date.now()}`;

    const controller = new AbortController();
    activeRequestIdRef.current = requestId;
    abortControllerRef.current = controller;
    generatingConvIdRef.current = targetConvId;

    setIsGenerating(true);
    setGeneratingConvId(targetConvId);

    try {
      await streamChat({
        messages: messagesPayload,
        requestId,
        signal: controller.signal,

        // Status event from backend (e.g. 'Thinking...')
        onStatus: (status) => {
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
        onDone: () => {
          setConversations(prev =>
            prev.map(c => {
              if (c.id !== targetConvId) return c;
              return {
                ...c,
                updatedAt: Date.now(),
                messages: c.messages.map(m =>
                  m.id === assistantMessageId
                    ? { ...m, isStreaming: false, isThinking: false }
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
        },

        // Generation error
        onError: (err) => {
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
      if (err.name !== 'AbortError') {
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
      setIsGenerating(false);
      setGeneratingConvId(null);
      generatingConvIdRef.current = null;
      activeRequestIdRef.current = null;
      abortControllerRef.current = null;
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
