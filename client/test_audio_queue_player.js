import assert from 'assert';
import { AudioQueuePlayer } from './src/utils/AudioQueuePlayer.js';

console.log('--- Running AudioQueuePlayer Unit Tests ---');

// Mock Web Audio Context
class MockAudioBuffer {
  constructor(duration = 1.0) {
    this.duration = duration;
    this.sampleRate = 24000;
  }
}

class MockAudioBufferSourceNode {
  constructor() {
    this.buffer = null;
    this.startedAt = null;
    this.stopped = false;
  }
  connect(dest) {}
  disconnect() {}
  start(time) {
    this.startedAt = time;
  }
  stop() {
    this.stopped = true;
  }
}

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.destination = {};
  }
  createBufferSource() {
    return new MockAudioBufferSourceNode();
  }
  async decodeAudioData(arrayBuffer) {
    return new MockAudioBuffer(1.5); // 1.5 seconds per chunk
  }
  async resume() {
    this.state = 'running';
  }
  async close() {
    this.state = 'closed';
  }
}

// Inject Mock AudioContext
global.window = {
  AudioContext: MockAudioContext
};

// Test 1: Immediate chunk 0 scheduling and gapless chaining
{
  const events = [];
  const player = new AudioQueuePlayer({
    onPlaybackStateChange: (isPlaying) => events.push({ type: 'state', isPlaying }),
    onFirstPlay: (metrics) => events.push({ type: 'first_play', metrics })
  });

  player.startSession('req_123', Date.now());

  // Enqueue chunk 0
  const fakeAudioBase64 = Buffer.from('FAKE_AUDIO_DATA').toString('base64');
  await player.enqueueChunk({
    requestId: 'req_123',
    chunkIndex: 0,
    text: 'Sentence one.',
    audio: fakeAudioBase64,
    metrics: { ttfaMs: 250 }
  });

  assert.strictEqual(player.isPlaying, true);
  assert.strictEqual(player.scheduledSources.length, 1);
  const source0 = player.scheduledSources[0];
  assert(source0.startedAt >= 0.02, 'Chunk 0 should start immediately (+ 20ms offset)');

  // Enqueue chunk 1
  await player.enqueueChunk({
    requestId: 'req_123',
    chunkIndex: 1,
    text: 'Sentence two.',
    audio: fakeAudioBase64
  });

  assert.strictEqual(player.scheduledSources.length, 2);
  const source1 = player.scheduledSources[1];
  // Gapless check: source1 should start exactly when source0 finishes (source0.startedAt + 1.5s duration)
  assert.strictEqual(source1.startedAt, source0.startedAt + 1.5);
  console.log(`✓ Test 1: Gapless scheduling passed (source 0 at ${source0.startedAt.toFixed(3)}s, source 1 at ${source1.startedAt.toFixed(3)}s)`);

  // Test 2: Request ID isolation (stale chunk rejection)
  await player.enqueueChunk({
    requestId: 'old_stale_req',
    chunkIndex: 2,
    audio: fakeAudioBase64
  });
  assert.strictEqual(player.scheduledSources.length, 2, 'Stale requestId chunk must be ignored');
  console.log('✓ Test 2: Stale requestId rejection passed');

  // Test 3: Stop / Cancellation
  player.stop();
  assert.strictEqual(player.isPlaying, false);
  assert.strictEqual(player.scheduledSources.length, 0);
  assert.strictEqual(source0.stopped, true);
  assert.strictEqual(source1.stopped, true);
  console.log('✓ Test 3: Stop and cancellation cleanup passed');
}

console.log('--- ALL AUDIO QUEUE PLAYER TESTS PASSED ---');

