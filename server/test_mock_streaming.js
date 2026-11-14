import assert from 'assert';
import { StreamingTTSCoordinator } from './src/services/voice/streamingTtsCoordinator.js';
import { ttsService } from './src/services/voice/ttsService.js';

console.log('--- Running Mock-Synthesis Streaming Audio Emission Test ---');

class MockSSEResponse {
  constructor() {
    this.events = [];
    this.writableEnded = false;
  }
  write(data) {
    this.events.push(data);
  }
  end() {
    this.writableEnded = true;
  }
}

function sendSSE(res, event, data) {
  res.write({ event, data });
}

// Backup original synthesizeSpeech
const originalSynthesize = ttsService.synthesizeSpeech;

try {
  // Mock synthesizeSpeech with simulated latency (50ms) and fake WAV buffer
  ttsService.synthesizeSpeech = async ({ text, voice, signal }) => {
    if (signal?.aborted) throw new Error('Aborted');
    await new Promise(r => setTimeout(r, 50));
    // Minimal mock WAV header (44 bytes)
    const mockWav = Buffer.alloc(44);
    mockWav.write('RIFF', 0);
    mockWav.write('WAVE', 8);
    return { buffer: mockWav, contentType: 'audio/wav' };
  };

  const res = new MockSSEResponse();
  const coordinator = new StreamingTTSCoordinator({
    requestId: 'req_stream_test',
    res,
    voiceOptions: { voice: 'af_heart' },
    sendSSE
  });

  // Feed tokens simulating LLM generation
  coordinator.feedToken('Hello, ');
  coordinator.feedToken('welcome to Ruan AI! ');
  coordinator.feedToken('Today we are testing streaming text to speech. ');
  coordinator.feedToken('It allows audio to play while the model is still thinking.');

  await coordinator.finish();

  const audioEvents = res.events.filter(e => e.event === 'audio');
  const doneEvents = res.events.filter(e => e.event === 'audio_done');

  console.log(`Received ${audioEvents.length} audio chunks and ${doneEvents.length} audio_done event`);

  assert.strictEqual(audioEvents.length, 4);
  assert.strictEqual(doneEvents.length, 1);

  // Check chunk ordering (eager first chunk "Hello," followed by the rest)
  assert.strictEqual(audioEvents[0].data.chunkIndex, 0);
  assert.strictEqual(audioEvents[0].data.text, 'Hello,');
  assert.strictEqual(audioEvents[0].data.isLast, false);

  assert.strictEqual(audioEvents[1].data.chunkIndex, 1);
  assert.strictEqual(audioEvents[1].data.text, 'welcome to Ruan AI!');
  assert.strictEqual(audioEvents[1].data.isLast, false);

  assert.strictEqual(audioEvents[2].data.chunkIndex, 2);
  assert.strictEqual(audioEvents[2].data.text, 'Today we are testing streaming text to speech.');
  assert.strictEqual(audioEvents[2].data.isLast, false);

  assert.strictEqual(audioEvents[3].data.chunkIndex, 3);
  assert.strictEqual(audioEvents[3].data.text, 'It allows audio to play while the model is still thinking.');
  assert.strictEqual(audioEvents[3].data.isLast, true);

  // Verify TTFA metric exists
  const finalMetrics = doneEvents[0].data.metrics;
  console.log('Final Metrics:', finalMetrics);
  assert(finalMetrics.ttfaMs > 0, 'Expected positive ttfaMs');
  assert(finalMetrics.avgSynthesisMs > 0, 'Expected positive avgSynthesisMs');
  assert.strictEqual(finalMetrics.totalAudioChunks, 4);

  console.log('✓ Mock-synthesis streaming audio chunk ordering and metrics test passed!');
} finally {
  ttsService.synthesizeSpeech = originalSynthesize;
}

