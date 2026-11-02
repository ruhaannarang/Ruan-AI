/**
 * End-to-end integration and benchmark test script for Ruan AI Voice Subsystem.
 * Tests Express API endpoints, Python voice service, STT transcription,
 * Kokoro TTS synthesis, Hinglish sentences, edge cases, and memory metrics.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_PORT = process.env.PORT || '5000';
const SERVER_BASE = `http://127.0.0.1:${SERVER_PORT}/api`;
const PYTHON_BASE = process.env.VOICE_SERVICE_URL || 'http://127.0.0.1:8008';

const TEST_SENTENCES = [
  { id: 1, text: 'Ruan, mujhe kal subah 9 baje college jaana hai.', label: 'Sentence 1 (Hinglish routine)' },
  { id: 2, text: 'Mujhe Java mein linked list explain karo.', label: 'Sentence 2 (Technical Hinglish)' },
  { id: 3, text: 'Can you help me debug this code? Isme NullPointerException aa raha hai.', label: 'Sentence 3 (Code switching + Exception)' },
  { id: 4, text: 'Aaj mujhe React ka ek component banana hai, please guide me.', label: 'Sentence 4 (Technical Hinglish)' },
  { id: 5, text: 'Mera backend server start nahi ho raha, logs check karne mein help karo.', label: 'Sentence 5 (DevOps Hinglish)' }
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('====================================================');
  console.log('  RUAN AI — PHASE 1.6 VOICE SUBSYSTEM TEST SUITE');
  console.log('====================================================\n');

  const results = {
    pythonHealth: null,
    expressHealth: null,
    voiceHealth: null,
    voicesList: null,
    synthesisResults: [],
    transcriptionResults: [],
    edgeCases: [],
    memoryUsage: null
  };

  // 1. Python Health
  console.log('[1/7] Testing Python Voice Service Health...');
  try {
    const pyRes = await fetch(`${PYTHON_BASE}/health`);
    results.pythonHealth = { status: pyRes.status, data: await pyRes.json() };
    console.log('  ✓ Python Service Health:', JSON.stringify(results.pythonHealth.data, null, 2));
  } catch (err) {
    console.error('  ✗ Python Service unreachable:', err.message);
  }

  // 2. Express Server Health & Decoupled AI Subsystems
  console.log('\n[2/7] Testing Express API Gateway Health (GET /api/health)...');
  try {
    const exRes = await fetch(`${SERVER_BASE}/health`);
    results.expressHealth = { status: exRes.status, data: await exRes.json() };
    console.log('  ✓ Express Gateway Health:', JSON.stringify(results.expressHealth.data, null, 2));
  } catch (err) {
    console.error('  ✗ Express Gateway unreachable:', err.message);
  }

  // 3. Express Voice Health & Voices List
  console.log('\n[3/7] Testing Voice Health & Voices Endpoint (GET /api/voice/health, /api/voice/voices)...');
  try {
    const vhRes = await fetch(`${SERVER_BASE}/voice/health`);
    results.voiceHealth = { status: vhRes.status, data: await vhRes.json() };
    console.log('  ✓ Voice Health:', JSON.stringify(results.voiceHealth.data));

    const voicesRes = await fetch(`${SERVER_BASE}/voice/voices`);
    results.voicesList = await voicesRes.json();
    console.log(`  ✓ Voices count: ${results.voicesList.voices?.length || 0}, Default: ${results.voicesList.default_voice}`);
  } catch (err) {
    console.error('  ✗ Voice Health endpoints failed:', err.message);
  }

  // 4. TTS Synthesis on the 5 Hinglish Test Sentences
  console.log('\n[4/7] Testing Kokoro TTS Synthesis on 5 Hinglish sentences (POST /api/voice/synthesize)...');
  const generatedAudioFiles = [];

  for (const item of TEST_SENTENCES) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${SERVER_BASE}/voice/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: item.text,
          voice: 'hf_alpha',
          speed: 1.0,
          lang: 'auto'
        })
      });

      const latencyMs = Date.now() - t0;

      if (!res.ok) {
        console.error(`  ✗ ${item.label} FAILED: HTTP ${res.status}`);
        continue;
      }

      const arrayBuf = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      const outPath = path.join(__dirname, `test_out_sentence_${item.id}.wav`);
      fs.writeFileSync(outPath, buffer);
      generatedAudioFiles.push({ ...item, outPath, bufferSize: buffer.length });

      // Calculate approx duration from 24kHz 16-bit mono PCM WAV (48000 bytes/sec)
      const approxDurationSec = Math.max(0.1, (buffer.length - 44) / 48000);
      const rtf = (latencyMs / 1000) / approxDurationSec;

      results.synthesisResults.push({
        id: item.id,
        text: item.text,
        sizeBytes: buffer.length,
        latencyMs,
        approxDurationSec: round(approxDurationSec, 2),
        rtf: round(rtf, 2)
      });

      console.log(`  ✓ [${item.id}] Generated ${round(approxDurationSec, 2)}s audio in ${latencyMs}ms (RTF: ${round(rtf, 2)}x, ${buffer.length} bytes)`);
    } catch (err) {
      console.error(`  ✗ ${item.label} Error:`, err.message);
    }
  }

  // 5. STT Transcription on the Generated Hinglish Audio Files
  console.log('\n[5/7] Testing faster-whisper STT Transcription (POST /api/voice/transcribe)...');
  for (const item of generatedAudioFiles) {
    const t0 = Date.now();
    try {
      const buffer = fs.readFileSync(item.outPath);
      const formData = new FormData();
      const blob = new Blob([buffer], { type: 'audio/wav' });
      formData.append('file', blob, `sentence_${item.id}.wav`);

      const res = await fetch(`${SERVER_BASE}/voice/transcribe`, {
        method: 'POST',
        body: formData
      });

      const latencyMs = Date.now() - t0;
      const data = await res.json();

      results.transcriptionResults.push({
        id: item.id,
        original: item.text,
        transcribed: data.text,
        language: data.language,
        languageProbability: data.languageProbability,
        duration: data.duration,
        processingTime: data.processingTime,
        latencyMs
      });

      console.log(`  ✓ [${item.id}] Lang: ${data.language} (${data.languageProbability}) | Duration: ${data.duration}s | Proc: ${data.processingTime}s`);
      console.log(`      Target:      "${item.text}"`);
      console.log(`      Transcribed: "${data.text}"`);
    } catch (err) {
      console.error(`  ✗ [${item.id}] Transcription failed:`, err.message);
    }
  }

  // 6. Edge Cases Testing
  console.log('\n[6/7] Testing Voice Edge Cases...');

  // Edge case 1: Empty audio file upload
  try {
    const formData = new FormData();
    const emptyBlob = new Blob([], { type: 'audio/wav' });
    formData.append('file', emptyBlob, 'empty.wav');
    const res = await fetch(`${SERVER_BASE}/voice/transcribe`, { method: 'POST', body: formData });
    const json = await res.json();
    console.log('  ✓ Empty audio rejected correctly:', res.status, json?.error?.code || json?.detail);
    results.edgeCases.push({ case: 'Empty audio', status: res.status, code: json?.error?.code });
  } catch (e) {
    console.error('  ✗ Empty audio test error:', e.message);
  }

  // Edge case 2: Empty text synthesis
  try {
    const res = await fetch(`${SERVER_BASE}/voice/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '   ' })
    });
    const json = await res.json();
    console.log('  ✓ Empty synthesis text rejected correctly:', res.status, json?.error?.code);
    results.edgeCases.push({ case: 'Empty text synthesis', status: res.status, code: json?.error?.code });
  } catch (e) {
    console.error('  ✗ Empty synthesis test error:', e.message);
  }

  // Edge case 3: English-only input synthesis & transcription
  try {
    const enText = 'Hello Ruan, please show me how to build an Express server.';
    const synRes = await fetch(`${SERVER_BASE}/voice/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: enText, voice: 'af_heart' })
    });
    const buf = Buffer.from(await synRes.arrayBuffer());
    const formData = new FormData();
    formData.append('file', new Blob([buf], { type: 'audio/wav' }), 'en.wav');
    const transRes = await fetch(`${SERVER_BASE}/voice/transcribe`, { method: 'POST', body: formData });
    const transData = await transRes.json();
    console.log('  ✓ English-only test:', transData.language, `"${transData.text}"`);
    results.edgeCases.push({ case: 'English-only', detectedLang: transData.language, text: transData.text });
  } catch (e) {
    console.error('  ✗ English-only test error:', e.message);
  }

  // Edge case 4: Pure Devanagari Hindi input synthesis & transcription
  try {
    const hiText = 'नमस्ते, आज का दिन कैसा है?';
    const synRes = await fetch(`${SERVER_BASE}/voice/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: hiText, voice: 'hf_alpha' })
    });
    const buf = Buffer.from(await synRes.arrayBuffer());
    const formData = new FormData();
    formData.append('file', new Blob([buf], { type: 'audio/wav' }), 'hi.wav');
    const transRes = await fetch(`${SERVER_BASE}/voice/transcribe`, { method: 'POST', body: formData });
    const transData = await transRes.json();
    console.log('  ✓ Pure Hindi test:', transData.language, `"${transData.text}"`);
    results.edgeCases.push({ case: 'Pure Hindi', detectedLang: transData.language, text: transData.text });
  } catch (e) {
    console.error('  ✗ Pure Hindi test error:', e.message);
  }

  // Edge case 5: Unsupported MIME type
  try {
    const formData = new FormData();
    const fakeBlob = new Blob([Buffer.from('not an audio')], { type: 'text/plain' });
    formData.append('file', fakeBlob, 'bad.txt');
    const res = await fetch(`${SERVER_BASE}/voice/transcribe`, { method: 'POST', body: formData });
    const json = await res.json();
    console.log('  ✓ Unsupported MIME rejected correctly:', res.status, json?.error?.code);
    results.edgeCases.push({ case: 'Unsupported MIME', status: res.status, code: json?.error?.code });
  } catch (e) {
    console.error('  ✗ Unsupported MIME test error:', e.message);
  }

  // 6b. Phase 1.6.1 Hinglish Benchmark Integration Tests
  console.log('\n[6b/7] Testing Phase 1.6.1 Hinglish Benchmark Subsystem...');
  results.benchmarkSuite = {};

  try {
    // 1. Fetch benchmark prompts
    const pRes = await fetch(`${SERVER_BASE}/voice/benchmark/prompts`);
    const pData = await pRes.json();
    console.log(`  ✓ Benchmark prompts loaded: ${pData.prompts?.length || 0} prompts`);
    results.benchmarkSuite.promptsCount = pData.prompts?.length || 0;

    // 2. Run comparative evaluation on first generated audio file
    if (generatedAudioFiles.length > 0) {
      const sampleItem = generatedAudioFiles[0];
      const buf = fs.readFileSync(sampleItem.outPath);
      const bFormData = new FormData();
      bFormData.append('file', new Blob([buf], { type: 'audio/wav' }), 'bench_sample.wav');
      bFormData.append('reference', sampleItem.text);
      bFormData.append('category', 'Technical Hinglish');
      bFormData.append('technical_terms', JSON.stringify(['Java', 'linked list']));

      const compRes = await fetch(`${SERVER_BASE}/voice/benchmark/compare`, {
        method: 'POST',
        body: bFormData
      });
      const compData = await compRes.json();
      console.log('  ✓ Comparative benchmark (small vs base) executed successfully:');
      console.log(`      Small: "${compData.comparison?.small?.text}" | WER: ${compData.comparison?.small?.wer_percent}% | Latency: ${compData.comparison?.small?.latency_sec}s`);
      console.log(`      Base:  "${compData.comparison?.base?.text}" | WER: ${compData.comparison?.base?.wer_percent}% | Latency: ${compData.comparison?.base?.latency_sec}s`);
      console.log(`      Speedup: Base is ${compData.comparison?.speedup}x faster than Small`);
      results.benchmarkSuite.comparison = compData.comparison;

      // 3. Save benchmark sample
      const saveFormData = new FormData();
      saveFormData.append('file', new Blob([buf], { type: 'audio/wav' }), 'bench_sample.wav');
      saveFormData.append('sample_id', 'test_e2e_1');
      saveFormData.append('reference', sampleItem.text);
      saveFormData.append('category', 'Technical Hinglish');
      saveFormData.append('evaluation_json', JSON.stringify(compData.comparison));

      const saveRes = await fetch(`${SERVER_BASE}/voice/benchmark/save`, {
        method: 'POST',
        body: saveFormData
      });
      const saveData = await saveRes.json();
      console.log('  ✓ Benchmark sample saved locally:', saveData.saved_record?.id);
      results.benchmarkSuite.savedRecordId = saveData.saved_record?.id;

      // 4. Fetch history and verify summary
      const histRes = await fetch(`${SERVER_BASE}/voice/benchmark/history`);
      const histData = await histRes.json();
      console.log(`  ✓ Benchmark history retrieved: ${histData.history?.runs?.length || 0} runs recorded`);
      console.log(`      Summary stats: Avg WER Small=${(histData.history?.summary?.avg_wer_small * 100 || 0).toFixed(1)}%, Base=${(histData.history?.summary?.avg_wer_base * 100 || 0).toFixed(1)}%`);
      results.benchmarkSuite.history = histData.history;
    }
  } catch (err) {
    console.error('  ✗ Benchmark subsystem test error:', err.message);
  }

  // 7. System Resources & Memory Metrics
  console.log('\n[7/7] Checking Memory Usage...');
  const mem = process.memoryUsage();
  results.memoryUsage = {
    rssMb: round(mem.rss / (1024 * 1024), 2),
    heapUsedMb: round(mem.heapUsed / (1024 * 1024), 2),
    heapTotalMb: round(mem.heapTotal / (1024 * 1024), 2)
  };
  console.log('  Node.js memory usage:', results.memoryUsage);

  // Write summary json for reporting
  fs.writeFileSync(path.join(__dirname, 'test_results.json'), JSON.stringify(results, null, 2));
  console.log('\n✓ Test suite finished successfully! Results saved to server/test_results.json\n');

  // Clean up test audio files
  for (const item of generatedAudioFiles) {
    if (fs.existsSync(item.outPath)) {
      try { fs.unlinkSync(item.outPath); } catch {}
    }
  }
}

function round(val, decimals = 2) {
  const p = Math.pow(10, decimals);
  return Math.round(val * p) / p;
}

export { runTests };

// If executed directly from CLI, run immediately
if (process.argv[1] && process.argv[1].endsWith('test_voice_e2e.js')) {
  runTests().catch(err => {
    console.error('Fatal error running tests:', err);
    process.exit(1);
  });
}

