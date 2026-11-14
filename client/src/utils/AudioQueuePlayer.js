/**
 * Ruan AI — AudioQueuePlayer
 * Web Audio API based sequential streaming audio queue.
 * Provides sample-accurate gapless playback across sentence chunks,
 * immediate first-chunk playback, cancellation by requestId,
 * and empirical TTFP (Time to First Playback) instrumentation.
 */

function base64ToArrayBuffer(base64) {
  const binaryString = typeof window !== 'undefined' && window.atob
    ? window.atob(base64)
    : Buffer.from(base64, 'base64').toString('binary');
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export class AudioQueuePlayer {
  constructor(options = {}) {
    this.options = options;
    this.audioContext = null;
    this.activeRequestId = null;
    this.isPlaying = false;
    this.nextStartTime = 0;
    this.scheduledSources = [];
    this.endTimer = null;
    this.tPlaybackStart = null;
    this.hasReportedFirstPlay = false;

    // Metrics for the current playback session
    this.metrics = {
      tRequestStart: null,
      tFirstAudioReceived: null,
      tFirstAudioPlayed: null,
      ttfpMs: null, // Time to First Playback
      totalChunksPlayed: 0,
      totalDurationSeconds: 0
    };
  }

  /**
   * Ensures an active, running AudioContext exists.
   * Handles browser autoplay policy by resuming suspended context.
   */
  async ensureAudioContext() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        throw new Error('Web Audio API is not supported in this browser.');
      }
      this.audioContext = new AudioCtx();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    return this.audioContext;
  }

  /**
   * Prepares the player for a new streaming generation session.
   * Immediately stops any previous playback and clears queues.
   * @param {string} requestId
   * @param {number} [tRequestStart] - Optional timestamp when request was initiated
   */
  startSession(requestId, tRequestStart = Date.now()) {
    this.stop();
    this.activeRequestId = requestId;
    this.nextStartTime = 0;
    this.hasReportedFirstPlay = false;
    this.metrics = {
      tRequestStart,
      tFirstAudioReceived: null,
      tFirstAudioPlayed: null,
      ttfpMs: null,
      totalChunksPlayed: 0,
      totalDurationSeconds: 0
    };
  }

  /**
   * Enqueues an audio chunk for immediate or seamless sequential playback.
   * @param {Object} chunk
   * @param {string} chunk.requestId - Request correlation ID
   * @param {number} chunk.chunkIndex - Ordered chunk index (0, 1, 2, ...)
   * @param {string} chunk.audio - Base64 encoded WAV audio bytes
   * @param {string} [chunk.text] - Spoken sentence text
   * @param {boolean} [chunk.isLast] - Whether this is the final audio chunk
   * @param {Object} [chunk.metrics] - Backend timing metrics
   */
  async enqueueChunk(chunk) {
    if (!chunk || !chunk.audio || !chunk.requestId) return;

    // Auto-initialize session if this is chunk 0 and activeRequestId does not match
    if (chunk.chunkIndex === 0 && (!this.activeRequestId || this.activeRequestId !== chunk.requestId)) {
      const estimatedStart = chunk.metrics?.ttfaMs ? (Date.now() - chunk.metrics.ttfaMs) : Date.now();
      this.startSession(chunk.requestId, estimatedStart);
    }

    // Ignore chunk if session changed or request was aborted
    if (this.activeRequestId !== chunk.requestId) {
      return;
    }

    const now = Date.now();
    if (!this.metrics.tFirstAudioReceived) {
      this.metrics.tFirstAudioReceived = now;
    }

    try {
      const ctx = await this.ensureAudioContext();
      if (this.activeRequestId !== chunk.requestId) return;

      const arrayBuffer = base64ToArrayBuffer(chunk.audio);
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      if (this.activeRequestId !== chunk.requestId) return;

      const currentTime = ctx.currentTime;
      // Schedule playback: If nextStartTime is in the past or zero, start immediately (+ 20ms safety)
      const scheduledTime = Math.max(currentTime + 0.02, this.nextStartTime);
      const duration = audioBuffer.duration;
      this.nextStartTime = scheduledTime + duration;
      this.metrics.totalDurationSeconds += duration;
      this.metrics.totalChunksPlayed++;

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      source.start(scheduledTime);
      this.scheduledSources.push(source);

      // Transition to speaking state
      if (!this.isPlaying) {
        this.isPlaying = true;
        if (this.options.onPlaybackStateChange) {
          this.options.onPlaybackStateChange(true);
        }
      }

      // Calculate delay until playback starts to notify listeners
      const delayMs = Math.max(0, (scheduledTime - currentTime) * 1000);

      // Track first playback trigger
      if (!this.hasReportedFirstPlay) {
        this.hasReportedFirstPlay = true;
        setTimeout(() => {
          if (this.activeRequestId === chunk.requestId) {
            this.metrics.tFirstAudioPlayed = Date.now();
            this.metrics.ttfpMs = this.metrics.tRequestStart ? (this.metrics.tFirstAudioPlayed - this.metrics.tRequestStart) : 0;
            console.log(`[AudioQueuePlayer] TTFP (Time to First Audible Playback): ${this.metrics.ttfpMs}ms (Chunk 0)`);
            if (this.options.onFirstPlay) {
              this.options.onFirstPlay(this.metrics);
            }
          }
        }, delayMs);
      }

      if (this.options.onChunkStart) {
        setTimeout(() => {
          if (this.activeRequestId === chunk.requestId && this.options.onChunkStart) {
            this.options.onChunkStart(chunk);
          }
        }, delayMs);
      }

      // Reset end timer to fire when the last scheduled chunk finishes
      if (this.endTimer) {
        clearTimeout(this.endTimer);
      }

      const totalRemainingMs = Math.max(0, (this.nextStartTime - currentTime) * 1000) + 100;
      this.endTimer = setTimeout(() => {
        if (this.activeRequestId === chunk.requestId) {
          this._handleSessionEnd();
        }
      }, totalRemainingMs);

    } catch (err) {
      console.warn(`[AudioQueuePlayer] Failed to decode/play chunk ${chunk.chunkIndex}:`, err.message);
      if (this.options.onChunkError) {
        this.options.onChunkError(chunk, err);
      }
    }
  }

  /**
   * Internal session end handler when all audio has finished playing.
   * @private
   */
  _handleSessionEnd() {
    this.isPlaying = false;
    this.scheduledSources = [];
    if (this.options.onPlaybackStateChange) {
      this.options.onPlaybackStateChange(false);
    }
    if (this.options.onPlaybackEnd) {
      this.options.onPlaybackEnd(this.metrics);
    }
  }

  /**
   * Immediately halts all audio playback, clears queues, and releases source nodes.
   */
  stop() {
    this.activeRequestId = null;
    this.isPlaying = false;
    this.nextStartTime = 0;

    if (this.endTimer) {
      clearTimeout(this.endTimer);
      this.endTimer = null;
    }

    for (const source of this.scheduledSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Source may have already finished
      }
    }
    this.scheduledSources = [];

    if (this.options.onPlaybackStateChange) {
      this.options.onPlaybackStateChange(false);
    }
  }

  /**
   * Closes the AudioContext when component unmounts.
   */
  dispose() {
    this.stop();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
  }
}
