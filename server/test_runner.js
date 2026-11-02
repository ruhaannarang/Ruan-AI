/**
 * Integrated Test Runner for Ruan AI Voice Subsystem
 * Starts Python voice service, starts Express server, executes comprehensive test suite.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const pythonExe = path.join(projectRoot, 'voice-service', '.venv', 'Scripts', 'python.exe');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startPythonService() {
  console.log('[Runner] Spawning Python Voice Service...');
  const appPy = path.join(projectRoot, 'voice-service', 'app.py');
  const pyProcess = spawn(
    pythonExe,
    ['-u', appPy],
    {
      cwd: projectRoot,
      env: { ...process.env, PYTHONPATH: path.join(projectRoot, 'voice-service'), PYTHONUNBUFFERED: '1' },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );

  pyProcess.stdout.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg) console.log(`[Python-stdout] ${msg}`);
  });

  pyProcess.stderr.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg) console.log(`[Python-stderr] ${msg}`);
  });

  pyProcess.on('exit', (code) => {
    console.log(`[Runner] Python service exited with code ${code}`);
  });

  // Wait for health check
  console.log('[Runner] Polling http://127.0.0.1:8008/health...');
  let ready = false;
  for (let i = 0; i < 40; i++) {
    await sleep(1000);
    try {
      const res = await fetch('http://127.0.0.1:8008/health');
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'ok') {
          console.log(`[Runner] Python Voice Service is READY! (status: ${json.status})`);
          ready = true;
          break;
        } else {
          console.log(`[Runner] Python Voice Service status: ${json.status}...`);
        }
      }
    } catch {}
  }

  if (!ready) {
    pyProcess.kill();
    throw new Error('Python Voice Service failed to become ready within 40 seconds.');
  }

  return pyProcess;
}

async function main() {
  process.env.PORT = process.env.TEST_PORT || '5005';
  let pyProcess = null;
  let serverInstance = null;

  try {
    pyProcess = await startPythonService();

    console.log('[Runner] Starting Express server in process...');
    // Dynamically import server app
    const appModule = await import('./src/app.js');
    serverInstance = appModule.server;
    console.log('[Runner] Express app imported and listening.');

    // Wait a brief moment for Express to bind
    await sleep(1000);

    // Now run test_voice_e2e.js logic
    console.log('[Runner] Running test suite...');
    const e2eModule = await import('./test_voice_e2e.js');
    await e2eModule.runTests();

  } catch (err) {
    console.error('[Runner] Error in test runner:', err);
    process.exitCode = 1;
  } finally {
    console.log('[Runner] Teardown: Stopping servers...');
    if (serverInstance) {
      serverInstance.close();
    }
    if (pyProcess) {
      try {
        pyProcess.kill('SIGTERM');
      } catch {}
    }
    await sleep(500);
    console.log('[Runner] Done!');
    process.exit(process.exitCode || 0);
  }
}

main();
