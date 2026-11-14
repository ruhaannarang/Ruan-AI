import assert from 'assert';
import { LLMCoordinator } from './src/services/llmCoordinator.js';
import { nvidiaNimService } from './src/services/nvidiaNimService.js';

console.log('--- Running NVIDIA NIM & LLM Coordinator Unit Tests ---');

// Backup original key
const originalKey = nvidiaNimService.apiKey;

// Test 1: Unconfigured NVIDIA NIM health check
{
  nvidiaNimService.apiKey = '';
  const health = await nvidiaNimService.checkHealth();
  assert.strictEqual(typeof health, 'object');
  assert.strictEqual(health.configured, false);
  assert.strictEqual(health.connected, false);
  console.log('✓ Test 1: Unconfigured NVIDIA NIM reports clean unconfigured status');
}

// Test 2: Unconfigured NVIDIA NIM completion rejection
{
  nvidiaNimService.apiKey = '';
  let threw = false;
  try {
    await nvidiaNimService.streamChatCompletion({
      messages: [{ role: 'user', content: 'hello' }]
    });
  } catch (err) {
    threw = true;
    assert.strictEqual(err.code, 'NVIDIA_NIM_KEY_MISSING');
    assert(err.message.includes('NVIDIA_NIM_API_KEY'));
  }
  assert.strictEqual(threw, true);
  console.log('✓ Test 2: Missing API key throws informative error for user');
}

// Restore key
nvidiaNimService.apiKey = originalKey;

// Test 3: LLMCoordinator provider resolution
{
  const coordinator = new LLMCoordinator();

  // Default provider should be local or configured
  assert(coordinator.resolveProvider() === 'local' || coordinator.resolveProvider() === 'nvidia_nim');

  // Explicit local resolution
  assert.strictEqual(coordinator.resolveProvider('local'), 'local');
  assert.strictEqual(coordinator.resolveProvider('lm_studio'), 'local');

  // Explicit nvidia_nim resolution
  assert.strictEqual(coordinator.resolveProvider('nvidia_nim'), 'nvidia_nim');
  assert.strictEqual(coordinator.resolveProvider('online'), 'nvidia_nim');
  assert.strictEqual(coordinator.resolveProvider('NIM'), 'nvidia_nim');
  console.log('✓ Test 3: LLMCoordinator resolves providers cleanly');
}

// Test 4: Combined Health Check
{
  const coordinator = new LLMCoordinator();
  const health = await coordinator.checkHealth();

  assert(health.activeProvider === 'local' || health.activeProvider === 'nvidia_nim');
  assert.strictEqual(typeof health.lmStudio, 'object');
  assert.strictEqual(typeof health.nvidiaNim, 'object');
  assert.strictEqual(typeof health.nvidiaNim.configured, 'boolean');
  console.log('✓ Test 4: Coordinator combined health reporting passed');
}

console.log('--- ALL NVIDIA NIM TESTS PASSED ---');
