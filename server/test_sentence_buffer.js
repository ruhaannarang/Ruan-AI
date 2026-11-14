import assert from 'assert';
import { SentenceBuffer } from './src/services/voice/sentenceBuffer.js';

console.log('--- Running SentenceBuffer Unit Tests ---');

// Test 1: Simple multi-sentence splitting
{
  const sb = new SentenceBuffer();
  let chunks = [];
  chunks.push(...sb.push('Hello world! '));
  chunks.push(...sb.push('This is Ruan AI. '));
  chunks.push(...sb.push('How are you today?'));
  chunks.push(...sb.flush());

  assert.strictEqual(chunks.length, 3);
  assert.strictEqual(chunks[0], 'Hello world!');
  assert.strictEqual(chunks[1], 'This is Ruan AI.');
  assert.strictEqual(chunks[2], 'How are you today?');
  console.log('✓ Test 1: Basic sentence boundary splitting passed');
}

// Test 2: Token-by-token streaming
{
  const sb = new SentenceBuffer();
  const input = "First sentence is short. Second sentence has words! Third one?";
  const tokens = input.match(/.{1,3}/g) || [];
  let chunks = [];
  for (const t of tokens) {
    const res = sb.push(t);
    if (res.length > 0) chunks.push(...res);
  }
  chunks.push(...sb.flush());

  assert.strictEqual(chunks.length, 3);
  assert.strictEqual(chunks[0], 'First sentence is short.');
  assert.strictEqual(chunks[1], 'Second sentence has words!');
  assert.strictEqual(chunks[2], 'Third one?');
  console.log('✓ Test 2: Fine-grained token streaming passed');
}

// Test 3: Decimal numbers (3.14, 0.05) must not split
{
  const sb = new SentenceBuffer();
  let chunks = [];
  chunks.push(...sb.push('The value of Pi is approx 3.14159 in math. Next sentence.'));
  chunks.push(...sb.flush());

  assert.strictEqual(chunks.length, 2);
  assert.strictEqual(chunks[0], 'The value of Pi is approx 3.14159 in math.');
  assert.strictEqual(chunks[1], 'Next sentence.');
  console.log('✓ Test 3: Decimal numbers protection passed');
}

// Test 4: Code identifiers and filenames (app.js, console.log) must not split
{
  const sb = new SentenceBuffer();
  let chunks = [];
  chunks.push(...sb.push('Please open index.js and call console.log(data). Everything will work.'));
  chunks.push(...sb.flush());

  assert.strictEqual(chunks.length, 2);
  assert.strictEqual(chunks[0], 'Please open index.js and call console.log(data).');
  assert.strictEqual(chunks[1], 'Everything will work.');
  console.log('✓ Test 4: Code and filename protection passed');
}

// Test 5: Common abbreviations (Dr., e.g., vs.) must not split prematurely
{
  const sb = new SentenceBuffer();
  let chunks = [];
  chunks.push(...sb.push('Dr. Sharma explained the difference e.g. SQL vs. NoSQL databases. It was helpful.'));
  chunks.push(...sb.flush());

  assert.strictEqual(chunks.length, 2);
  assert.strictEqual(chunks[0], 'Dr. Sharma explained the difference e.g. SQL vs. NoSQL databases.');
  assert.strictEqual(chunks[1], 'It was helpful.');
  console.log('✓ Test 5: Abbreviations protection passed');
}

// Test 6: Devanagari Danda (।) support
{
  const sb = new SentenceBuffer();
  let chunks = [];
  chunks.push(...sb.push('नमस्ते। आप कैसे हैं? मुझे खुशी हुई। '));
  chunks.push(...sb.flush());

  assert.strictEqual(chunks.length, 3);
  assert.strictEqual(chunks[0], 'नमस्ते।');
  assert.strictEqual(chunks[1], 'आप कैसे हैं?');
  assert.strictEqual(chunks[2], 'मुझे खुशी हुई।');
  console.log('✓ Test 6: Devanagari danda support passed');
}

// Test 7: Markdown stripping (bold, code blocks, links)
{
  const sb = new SentenceBuffer();
  let chunks = [];
  chunks.push(...sb.push('Here is **important** info with `const x = 10;`. Also check [docs](https://example.com).'));
  chunks.push(...sb.flush());

  assert.strictEqual(chunks.length, 2);
  assert.strictEqual(chunks[0], 'Here is important info with const x = 10;.');
  assert.strictEqual(chunks[1], 'Also check docs.');
  console.log('✓ Test 7: Speech markdown cleanup passed');
}

// Test 8: Long phrase backpressure / fallback flush
{
  const sb = new SentenceBuffer({ maxPhraseChars: 80 });
  const longSentence = "This is a very long run-on sentence without any period or exclamation marks, but it has a comma right here, and then continues for quite some more words until it finally ends.";
  let chunks = [];
  chunks.push(...sb.push(longSentence));
  chunks.push(...sb.flush());

  assert(chunks.length >= 2, `Expected at least 2 chunks, got ${chunks.length}`);
  console.log(`✓ Test 8: Long phrase splitting passed (produced ${chunks.length} chunks)`);
}

// Test 9: Whitespace and empty chunks guard
{
  const sb = new SentenceBuffer();
  let chunks = [];
  chunks.push(...sb.push('   \n\n  '));
  chunks.push(...sb.push('First real sentence. '));
  chunks.push(...sb.push('   \t  '));
  chunks.push(...sb.flush());

  assert.strictEqual(chunks.length, 1);
  assert.strictEqual(chunks[0], 'First real sentence.');
  console.log('✓ Test 9: Whitespace guard passed');
}

// Test 10: Emoji stripping so TTS never reads out "smiling face", "thumbs up", etc.
{
  const sb = new SentenceBuffer();
  let chunks = [];
  chunks.push(...sb.push('Yes boss! 😊 How can I help you today? 👍 '));
  chunks.push(...sb.push('It is sunny outside ☀️ and coding is great! 🚀❤️ '));
  chunks.push(...sb.flush());

  assert.strictEqual(chunks.length, 3);
  assert.strictEqual(chunks[0], 'Yes boss!');
  assert.strictEqual(chunks[1], 'How can I help you today?');
  assert.strictEqual(chunks[2], 'It is sunny outside and coding is great!');
  console.log('✓ Test 10: Emoji stripping passed (no spoken emoji descriptions)');
}

console.log('--- ALL SENTENCE BUFFER TESTS PASSED ---');

