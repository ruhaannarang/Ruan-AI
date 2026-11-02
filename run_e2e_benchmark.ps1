# Script to orchestrate Python Voice Service, Express API Gateway, and run the E2E Voice Test Suite

$env:PYTHONPATH = "voice-service"
$env:PORT = "5000"
$env:HOST = "127.0.0.1"

Write-Host "Starting Python Voice Service on 127.0.0.1:8008..."
$pyProc = Start-Process -FilePath "voice-service\.venv\Scripts\python.exe" -ArgumentList "-m uvicorn app:app --app-dir voice-service --host 127.0.0.1 --port 8008" -PassThru -NoNewWindow

# Wait for Python service to become healthy
$pyReady = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8008/health" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($resp.status -eq "ok" -or $resp.status -eq "degraded") {
            $pyReady = $true
            Write-Host "Python Voice Service is READY! (status: $($resp.status))"
            break
        }
    } catch {}
}

if (-not $pyReady) {
    Write-Error "Python Voice Service failed to start within 30 seconds."
    Stop-Process -Id $pyProc.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "Starting Express API Gateway on 127.0.0.1:5000..."
$nodeProc = Start-Process -FilePath "node" -ArgumentList "server/src/app.js" -PassThru -NoNewWindow

# Wait for Express server to become healthy
$nodeReady = $false
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    try {
        $resp = Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/health" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($resp.status -eq "ok") {
            $nodeReady = $true
            Write-Host "Express API Gateway is READY! (status: $($resp.status))"
            break
        }
    } catch {}
}

if (-not $nodeReady) {
    Write-Error "Express Gateway failed to start within 15 seconds."
    Stop-Process -Id $pyProc.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $nodeProc.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "Running End-to-End Voice Subsystem Tests..."
try {
    & node server/test_voice_e2e.js
} finally {
    Write-Host "Stopping background services..."
    Stop-Process -Id $nodeProc.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $pyProc.Id -Force -ErrorAction SilentlyContinue
    Write-Host "Services stopped cleanly."
}

