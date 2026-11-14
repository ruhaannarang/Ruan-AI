/**
 * Ruan AI — Streaming TTS Coordinator
 * Orchestrates sentence-level buffering, Kokoro TTS synthesis,
 * bounded sequential queuing, backpressure, cancellation, and SSE dispatch.
 */

import { SentenceBuffer } from './sentenceBuffer.js';
import { ttsService } from './ttsService.js';

export class StreamingTTSCoordinator {
  /**
   * @param {Object} options
   * @param {string} options.requestId - Unique generation request identifier
   * @param {import('express').Response} options.res - Active Express SSE response
   * @param {Object} [options.voiceOptions] - TTS voice configuration (voice, speed, lang)
   * @param {AbortSignal} [options.signal] - Cancellation abort signal
   * @param {(res: import('express').Response, event: string, data: any) => void} options.sendSSE - SSE sender helper
   */
  constructor({ requestId, res, voiceOptions = {}, signal, sendSSE }) {
    this.requestId = requestId;
    this.res = res;
    this.voiceOptions = voiceOptions;
    this.signal = signal;
    this.sendSSE = sendSSE;

    this.sentenceBuffer = new SentenceBuffer();
    this.queue = [];
    this.isProcessing = false;
    this.isAborted = false;
    this.hasFinishedInput = false;
    this.nextChunkIndex = 0;
    this.synthesisFailures = 0;
    this.maxConsecutiveFailures = 2;

    // Performance instrumentation
    this.tCreated = Date.now();
    this.tFirstToken = null;
    this.tFirstChunk = null;
    this.tFirstAudio = null;
    this.chunkLatencies = [];

    // Promise completion resolver for finish()
    this._drainResolve = null;
    this._drainPromise = new Promise(resolve => {
      this._drainResolve = resolve;
    });

    if (this.signal) {
      this.signal.addEventListener('abort', () => this.abort());
    }
  }

  /**
   * Feeds a streaming LLM token into the sentence buffer.
   * Dispatches completed sentence chunks to the synthesis queue.
   * @param {string} token
   */
  feedToken(token) {
    if (this.isAborted || this.hasFinishedInput) return;

    if (!this.tFirstToken) {
      this.tFirstToken = Date.now() - this.tCreated;
    }

    const sentences = this.sentenceBuffer.push(token);
    for (const text of sentences) {
      this._enqueueChunk(text, false);
    }
  }

  /**
   * Signals that LLM token generation has completed.
   * Flushes remaining text and waits for all audio synthesis to finish.
   * @returns {Promise<void>}
   */
  async finish() {
    if (this.isAborted) return;
    this.hasFinishedInput = true;

    const remaining = this.sentenceBuffer.flush();
    for (let i = 0; i < remaining.length; i++) {
      const isLast = i === remaining.length - 1;
      this._enqueueChunk(remaining[i], isLast);
    }

    // If nothing was enqueued and queue is empty, resolve immediately
    if (this.queue.length === 0 && !this.isProcessing) {
      this._emitAudioDone();
      this._drainResolve();
      return;
    }

    // If queue is not empty but no remaining chunk was flagged isLast,
    // mark the last item in queue as isLast
    if (this.queue.length > 0 && remaining.length === 0) {
      this.queue[this.queue.length - 1].isLast = true;
    }

    return this._drainPromise;
  }

  /**
   * Aborts all pending synthesis tasks and frees resources.
   */
  abort() {
    if (this.isAborted) return;
    this.isAborted = true;
    this.queue = [];
    if (this._drainResolve) {
      this._drainResolve();
    }
  }

  /**
   * Enqueues a chunk for sequential TTS synthesis.
   * @private
   * @param {string} text
   * @param {boolean} isLast
   */
  _enqueueChunk(text, isLast) {
    if (this.isAborted) return;

    if (!this.tFirstChunk) {
      this.tFirstChunk = Date.now() - this.tCreated;
    }

    const chunk = {
      index: this.nextChunkIndex++,
      text,
      isLast
    };

    // Bounded queue: Safety limit to prevent unbounded memory growth on runaway responses
    if (this.queue.length >= 80) {
      console.warn(`[StreamingTTS] Synthesis queue capacity reached (${this.queue.length}) for req ${this.requestId}`);
      return;
    }

    this.queue.push(chunk);
    this._processQueue();
  }

  /**
   * Processes the synthesis queue sequentially to prevent CPU contention.
   * @private
   */
  async _processQueue() {
    if (this.isProcessing || this.isAborted) return;
    this.isProcessing = true;

    while (this.queue.length > 0 && !this.isAborted) {
      const item = this.queue.shift();

      // If synthesis has repeatedly failed (e.g. voice service offline),
      // stop attempting further chunks to prevent stalling
      if (this.synthesisFailures >= this.maxConsecutiveFailures) {
        continue;
      }

      const t0 = Date.now();
      try {
        const { buffer } = await ttsService.synthesizeSpeech({
          text: item.text,
          voice: this.voiceOptions.voice,
          speed: this.voiceOptions.speed || 1.0,
          lang: this.voiceOptions.lang || 'auto',
          signal: this.signal
        });

        const synthDuration = Date.now() - t0;
        this.chunkLatencies.push(synthDuration);
        this.synthesisFailures = 0; // Reset consecutive failures on success

        if (this.isAborted) break;

        if (!this.tFirstAudio) {
          this.tFirstAudio = Date.now() - this.tCreated;
        }

        const base64Wav = buffer.toString('base64');

        this.sendSSE(this.res, 'audio', {
          requestId: this.requestId,
          chunkIndex: item.index,
          text: item.text,
          audio: base64Wav,
          mimeType: 'audio/wav',
          isLast: item.isLast,
          metrics: {
            chunkIndex: item.index,
            synthesisMs: synthDuration,
            elapsedMs: Date.now() - this.tCreated,
            ttfaMs: this.tFirstAudio
          }
        });
      } catch (err) {
        this.synthesisFailures++;
        if (err.name === 'AbortError' || this.isAborted) {
          break;
        }

        console.warn(`[StreamingTTS] Synthesis failed for chunk ${item.index} (req: ${this.requestId}):`, err.message);

        // Notify client of non-fatal audio chunk failure so UI stays responsive
        this.sendSSE(this.res, 'audio_error', {
          requestId: this.requestId,
          chunkIndex: item.index,
          error: err.message,
          fatal: this.synthesisFailures >= this.maxConsecutiveFailures
        });
      }
    }

    this.isProcessing = false;

    // Check if queue is drained and input has finished
    if (this.hasFinishedInput && this.queue.length === 0 && !this.isAborted) {
      this._emitAudioDone();
      if (this._drainResolve) {
        this._drainResolve();
      }
    }
  }

  /**
   * Emits final audio_done SSE event with overall performance instrumentation.
   * @private
   */
  _emitAudioDone() {
    const totalSynthMs = this.chunkLatencies.reduce((a, b) => a + b, 0);
    const avgSynthMs = this.chunkLatencies.length > 0 ? Math.round(totalSynthMs / this.chunkLatencies.length) : 0;

    this.sendSSE(this.res, 'audio_done', {
      requestId: this.requestId,
      totalChunks: this.nextChunkIndex,
      metrics: {
        ttftMs: this.tFirstToken,
        ttfcMs: this.tFirstChunk,
        ttfaMs: this.tFirstAudio,
        totalAudioChunks: this.chunkLatencies.length,
        avgSynthesisMs: avgSynthMs,
        totalElapsedMs: Date.now() - this.tCreated
      }
    });
  }
}

