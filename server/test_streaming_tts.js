import assert from 'assert';
import { StreamingTTSCoordinator } from './src/services/voice/streamingTtsCoordinator.js';

console.log('--- Running Streaming TTS Coordinator Unit & Integration Tests ---');

// Mock SSE response collector
class MockSSEResponse {
  constructor() {
    this.events = [];
    this.writableEnded = false;
    this.destroyed = false;
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

// Test 1: Full streaming pipeline with mock synthesis
{
  const res = new MockSSEResponse();
  const coordinator = new StreamingTTSCoordinator({
    requestId: 'test_req_1',
    res,
    voiceOptions: { voice: 'af_heart' },
    sendSSE
  });

  // Mock ttsService inside coordinator to avoid needing running python daemon in pure unit test
  const originalSynthesize = coordinator._processQueue;

  // Let's test coordinator token feeding and event ordering
  coordinator.feedToken('Hello world! ');
  coordinator.feedToken('This is sentence number two. ');
  coordinator.feedToken('And the final conclusion.');

  await coordinator.finish();

  // Find all audio or audio_done events
  const audioDone = res.events.find(e => e.event === 'audio_done');
  assert(audioDone, 'Expected audio_done event to be emitted');
  assert.strictEqual(audioDone.data.requestId, 'test_req_1');
  assert.strictEqual(audioDone.data.totalChunks, 3);
  assert(audioDone.data.metrics.ttftMs !== null, 'Expected ttftMs to be recorded');
  assert(audioDone.data.metrics.ttfcMs !== null, 'Expected ttfcMs to be recorded');
  console.log('✓ Test 1: Sequential sentence buffering and lifecycle completion passed');
}

// Test 2: User cancellation / abort lifecycle
{
  const res = new MockSSEResponse();
  const abortController = new AbortController();

  const coordinator = new StreamingTTSCoordinator({
    requestId: 'test_req_cancel',
    res,
    signal: abortController.signal,
    sendSSE
  });

  coordinator.feedToken('Sentence one is here. ');
  coordinator.feedToken('Sentence two should be aborted.');

  // Trigger abort immediately
  abortController.abort('USER_STOPPED');

  assert.strictEqual(coordinator.isAborted, true);
  assert.strictEqual(coordinator.queue.length, 0);

  // Calling finish after abort should return immediately
  await coordinator.finish();
  console.log('✓ Test 2: Abort signal cancellation lifecycle passed');
}

// Test 3: Empty input handling
{
  const res = new MockSSEResponse();
  const coordinator = new StreamingTTSCoordinator({
    requestId: 'test_req_empty',
    res,
    sendSSE
  });

  coordinator.feedToken('   \n\n  ');
  await coordinator.finish();

  const audioDone = res.events.find(e => e.event === 'audio_done');
  assert(audioDone, 'Expected audio_done even on empty input');
  assert.strictEqual(audioDone.data.totalChunks, 0);
  console.log('✓ Test 3: Empty and whitespace input handling passed');
}

console.log('--- ALL STREAMING TTS COORDINATOR TESTS PASSED ---');

