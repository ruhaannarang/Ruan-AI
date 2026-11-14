import assert from 'assert';
import app, { server as defaultServer } from './src/app.js';
import { authService } from './src/services/authService.js';
import { config } from './src/config/index.js';

console.log('--- Testing Ruan AI Authentication Gate & Enforcement ---');

async function runAuthTests() {
  const baseUrl = `http://${config.host}:${config.port}`;

  try {
    // Test 1: Unauthenticated request to /api/chat/stream should be rejected with 401
    console.log('[Test 1] Testing unauthenticated /api/chat/stream returns 401 AUTH_REQUIRED...');
    const unauthStreamRes = await fetch(`${baseUrl}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Hello Ruan',
        conversationId: 'conv_test_unauth'
      })
    });

    assert.strictEqual(unauthStreamRes.status, 401, `Expected status 401, got ${unauthStreamRes.status}`);
    const unauthStreamData = await unauthStreamRes.json();
    assert.strictEqual(unauthStreamData.error?.code, 'AUTH_REQUIRED', `Expected code AUTH_REQUIRED, got ${unauthStreamData.error?.code}`);
    console.log('  -> Passed: Unauthenticated chat stream correctly blocked with 401 AUTH_REQUIRED.');

    // Test 2: Unauthenticated request to /api/chat/abort should be rejected with 401
    console.log('[Test 2] Testing unauthenticated /api/chat/abort returns 401 AUTH_REQUIRED...');
    const unauthAbortRes = await fetch(`${baseUrl}/api/chat/abort`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: 'req_123'
      })
    });

    assert.strictEqual(unauthAbortRes.status, 401, `Expected status 401, got ${unauthAbortRes.status}`);
    const unauthAbortData = await unauthAbortRes.json();
    assert.strictEqual(unauthAbortData.error?.code, 'AUTH_REQUIRED', `Expected code AUTH_REQUIRED, got ${unauthAbortData.error?.code}`);
    console.log('  -> Passed: Unauthenticated chat abort correctly blocked with 401 AUTH_REQUIRED.');

    // Test 3: Public endpoints (/api/health, /api/auth/config) must remain accessible without auth
    console.log('[Test 3] Testing public endpoints accessibility...');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(healthRes.status, 200, `Expected health to return 200, got ${healthRes.status}`);
    const healthData = await healthRes.json();
    assert.strictEqual(healthData.status, 'ok');

    const configRes = await fetch(`${baseUrl}/api/auth/config`);
    assert.strictEqual(configRes.status, 200, `Expected auth config to return 200, got ${configRes.status}`);
    const configData = await configRes.json();
    assert.ok('isConfigured' in configData);
    console.log('  -> Passed: Public endpoints (/api/health, /api/auth/config) operate smoothly.');

    // Test 4: Authenticated user via session token should pass requireAuth
    console.log('[Test 4] Testing authenticated user passing requireAuth...');
    const testUser = authService.upsertUserFromGoogle({
      googleSub: 'test_google_sub_9999',
      email: 'testuser@example.com',
      name: 'Test Explorer',
      picture: 'https://example.com/avatar.jpg'
    });
    assert.ok(testUser?.id, 'Test user creation failed');

    const session = authService.createSession(testUser.id);
    const sessionToken = session.token;
    assert.ok(sessionToken, 'Session token generation failed');

    // Verify /api/auth/me with session cookie
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        'Cookie': `ruan_session=${sessionToken}`
      }
    });

    assert.strictEqual(meRes.status, 200, `Expected 200 from /api/auth/me, got ${meRes.status}`);
    const meData = await meRes.json();
    assert.strictEqual(meData.user.email, 'testuser@example.com');
    console.log('  -> Passed: Authenticated session cookie successfully retrieves profile.');

    // Verify /api/auth/me with Bearer token authorization header
    const meBearerRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });

    assert.strictEqual(meBearerRes.status, 200, `Expected 200 from /api/auth/me with Bearer, got ${meBearerRes.status}`);
    const meBearerData = await meBearerRes.json();
    assert.strictEqual(meBearerData.user.name, 'Test Explorer');
    console.log('  -> Passed: Bearer token in Authorization header successfully verified.');

    // Test 5: Verify requireAuth clears stale/invalid cookie
    console.log('[Test 5] Testing invalid session cookie cleanup...');
    const invalidRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        'Cookie': 'ruan_session=invalid_nonexistent_token_12345'
      }
    });

    assert.strictEqual(invalidRes.status, 401);
    const invalidData = await invalidRes.json();
    assert.strictEqual(invalidData.error?.code, 'SESSION_EXPIRED');
    console.log('  -> Passed: Invalid cookie detected and SESSION_EXPIRED returned.');

    // Clean up test session
    authService.invalidateSession(sessionToken);
    console.log('\nAll 5 Authentication Gate & Enforcement tests passed successfully!');
  } finally {
    if (defaultServer) {
      defaultServer.close();
    }
  }
}

runAuthTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Auth test failed:', err);
    process.exit(1);
  });
