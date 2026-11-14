/**
 * Ruan AI — SentenceBuffer
 * Accumulates streaming LLM tokens and yields complete, speakable sentence chunks.
 * Handles abbreviations, decimals, code identifiers, Devanagari dandas,
 * markdown stripping, and phrase-level backpressure flushing.
 */

// Common abbreviations that shouldn't trigger sentence splitting on '.'
const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr',
  'vs', 'eg', 'ie', 'etc', 'approx', 'dept', 'inc', 'ltd', 'co'
]);

// Minimum characters before considering phrase-level split
const MIN_CHUNK_CHARS = 12;
// Maximum characters before forcing a phrase-level split on comma/semicolon/space for subsequent chunks
const MAX_PHRASE_CHARS = 120;
// Maximum characters before forcing a phrase-level split for the very first chunk (for low TTFP)
const FIRST_CHUNK_PHRASE_CHARS = 65;

export class SentenceBuffer {
  constructor(options = {}) {
    this.minChunkChars = options.minChunkChars || MIN_CHUNK_CHARS;
    this.maxPhraseChars = options.maxPhraseChars || MAX_PHRASE_CHARS;
    this.firstChunkPhraseChars = options.firstChunkPhraseChars || FIRST_CHUNK_PHRASE_CHARS;
    this.buffer = '';
    this.isFirstChunk = true;
  }

  /**
   * Cleans text of markdown markup for cleaner TTS pronunciation.
   * Preserves alphanumeric content and natural punctuation.
   * @param {string} text
   * @returns {string}
   */
  static cleanForSpeech(text) {
    if (!text) return '';
    let clean = text;
    // Remove markdown code blocks ```...```
    clean = clean.replace(/```[\s\S]*?```/g, '');
    // Replace inline code ticks `foo` with foo
    clean = clean.replace(/`([^`]+)`/g, '$1');
    // Remove bold/italics markers **foo** or *foo* or __foo__
    clean = clean.replace(/(\*\*|__)(.*?)\1/g, '$2');
    clean = clean.replace(/(\*|_)(.*?)\1/g, '$2');
    // Remove markdown headers (# Header)
    clean = clean.replace(/^#{1,6}\s+/gm, '');
    // Remove markdown links [text](url) -> text
    clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // Replace URLs with the word "link"
    clean = clean.replace(/https?:\/\/\S+/g, 'link');
    // Remove blockquote markers (> )
    clean = clean.replace(/^>\s+/gm, '');
    // Remove bullet points at line start (- or * or +)
    clean = clean.replace(/^[\*\-\+]\s+/gm, '');
    // Normalize multiple whitespace to single space
    clean = clean.replace(/[ \t]+/g, ' ');
    return clean;
  }

  /**
   * Pushes a new incoming token into the buffer.
   * Returns an array of newly completed sentence chunks ready for TTS.
   * @param {string} token
   * @returns {string[]}
   */
  push(token) {
    if (!token) return [];
    this.buffer += token;
    return this._extractChunks();
  }

  /**
   * Flushes any remaining unuttered text when LLM completes generation.
   * @returns {string[]}
   */
  flush() {
    const remaining = SentenceBuffer.cleanForSpeech(this.buffer).trim();
    this.buffer = '';
    this.isFirstChunk = true;
    if (remaining.length > 0) {
      return [remaining];
    }
    return [];
  }

  /**
   * Resets the buffer state.
   */
  reset() {
    this.buffer = '';
    this.isFirstChunk = true;
  }

  /**
   * Extracts completed sentences from internal buffer.
   * @private
   * @returns {string[]}
   */
  _extractChunks() {
    const chunks = [];

    while (true) {
      const splitIndex = this._findSplitIndex(this.buffer);
      if (splitIndex === -1) {
        break;
      }

      const rawChunk = this.buffer.slice(0, splitIndex + 1);
      this.buffer = this.buffer.slice(splitIndex + 1);

      const cleaned = SentenceBuffer.cleanForSpeech(rawChunk).trim();
      if (cleaned.length > 0) {
        chunks.push(cleaned);
        this.isFirstChunk = false;
      }
    }

    return chunks;
  }

  /**
   * Finds the index of the first valid sentence or phrase boundary.
   * Returns -1 if no complete boundary is found yet.
   * @private
   * @param {string} text
   * @returns {number}
   */
  _findSplitIndex(text) {
    if (!text || text.length === 0) return -1;

    // Scan through text looking for boundary characters
    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Devanagari danda or double danda
      if (char === '\u0964' || char === '\u0965') {
        if (i < text.length - 1) {
          return i;
        }
      }

      // Exclamation or Question mark
      if (char === '!' || char === '?') {
        if (i + 1 < text.length) {
          const nextChar = text[i + 1];
          if (nextChar === '!' || nextChar === '?') {
            continue; // Wait for the end of repeating punctuation
          }
          if (/\s/.test(nextChar) || nextChar === '"' || nextChar === "'") {
            return i;
          }
        }
      }

      // Newline boundary
      if (char === '\n') {
        const sliceBefore = text.slice(0, i).trim();
        if (sliceBefore.length >= (this.isFirstChunk ? 4 : this.minChunkChars)) {
          return i;
        }
      }

      // Eager clause boundaries for the FIRST chunk (comma, semicolon, colon, dash)
      // Dispatches the opening phrase to Kokoro immediately to minimize Time to First Playback (TTFP)
      if (this.isFirstChunk && (char === ',' || char === ';' || char === ':' || char === '—')) {
        if (i + 1 < text.length && /\s/.test(text[i + 1])) {
          const candidate = text.slice(0, i + 1).trim();
          if (candidate.length >= 4) {
            return i;
          }
        }
      }

      // Period (.) - Requires careful boundary validation
      if (char === '.') {
        if (i + 1 >= text.length) {
          continue; // Wait for lookahead token
        }

        const nextChar = text[i + 1];

        // 1. Check for ellipsis: "..", "...", etc.
        if (nextChar === '.') {
          while (i + 1 < text.length && text[i + 1] === '.') {
            i++;
          }
          if (i + 1 < text.length && /\s/.test(text[i + 1])) {
            return i;
          }
          continue;
        }

        // 2. Check for decimal number: e.g. "3.14", "0.5"
        const prevChar = i > 0 ? text[i - 1] : '';
        if (/\d/.test(prevChar) && /\d/.test(nextChar)) {
          continue;
        }

        // 3. Check for code identifier / filename / domain: e.g. "app.js", "model.transcribe", "expressjs.com"
        if (/[a-zA-Z0-9_]/.test(nextChar)) {
          continue;
        }

        // 4. Check for abbreviations: e.g. "Dr. Smith", "e.g. this", "vs. that", "i.e. that"
        const precedingMatch = text.slice(0, i).match(/([a-zA-Z\.]+)$/);
        if (precedingMatch) {
          const rawWord = precedingMatch[1];
          const normalized = rawWord.toLowerCase().replace(/\./g, '');
          if (ABBREVIATIONS.has(normalized)) {
            continue;
          }
          if ((normalized === 'e' && text.slice(i, i + 3).toLowerCase() === '.g.') ||
              (normalized === 'i' && text.slice(i, i + 3).toLowerCase() === '.e.')) {
            continue;
          }
          if (rawWord.length === 1 && (precedingMatch.index === 0 || /\s/.test(text[precedingMatch.index - 1]))) {
            continue;
          }
        }

        // 5. Valid sentence boundary
        if (/\s/.test(nextChar) || ((nextChar === '"' || nextChar === "'" || nextChar === ')') && i + 2 < text.length && /\s/.test(text[i + 2]))) {
          const candidate = text.slice(0, i + 1).trim();
          if (candidate.length >= 3) {
            return i;
          }
        }
      }
    }

    // Fallback: If buffer exceeds threshold without terminal punctuation,
    // search backwards for a phrase break (, ; : - space)
    const phraseLimit = this.isFirstChunk ? this.firstChunkPhraseChars : this.maxPhraseChars;
    if (text.length >= phraseLimit) {
      for (let j = Math.min(text.length - 1, phraseLimit); j >= this.minChunkChars; j--) {
        const c = text[j];
        if (c === ',' || c === ';' || c === ':' || c === '—') {
          if (j + 1 < text.length && /\s/.test(text[j + 1])) {
            return j;
          }
        }
      }

      // If no phrase punctuation, break on last whitespace
      for (let j = Math.min(text.length - 1, phraseLimit); j >= this.minChunkChars; j--) {
        if (/\s/.test(text[j])) {
          return j;
        }
      }
    }

    return -1;
  }
}
