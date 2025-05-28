Write-Host "=== AI Notes Service Status Check ===" -ForegroundColor Cyan

# Test Docker services
Write-Host "`n1. Checking Docker Services:" -ForegroundColor Yellow
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "ai-notes"

# Test Whisper directly
Write-Host "`n2. Testing Whisper Service:" -ForegroundColor Yellow
try {
    $whisperResponse = Invoke-WebRequest -Uri "http://localhost:9002/" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Whisper: AVAILABLE (Status: $($whisperResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Whisper: UNAVAILABLE" -ForegroundColor Red
}

# Start backend if not running
Write-Host "`n3. Starting Backend Server:" -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev:backend"
Start-Sleep -Seconds 5

# Test backend API
Write-Host "`n4. Testing Backend API:" -ForegroundColor Yellow
try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:3002/api/ai/health" -TimeoutSec 10 -ErrorAction Stop
    $healthData = $backendResponse.Content | ConvertFrom-Json
    Write-Host "✅ Backend: AVAILABLE" -ForegroundColor Green
    Write-Host "   - Whisper: $($healthData.whisper.available)" -ForegroundColor $(if($healthData.whisper.available){"Green"}else{"Yellow"})
    Write-Host "   - Ollama: $($healthData.ollama.available)" -ForegroundColor $(if($healthData.ollama.available){"Green"}else{"Yellow"})
} catch {
    Write-Host "❌ Backend: UNAVAILABLE" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Setup Complete ===" -ForegroundColor Cyan
Write-Host "🎯 You can now test audio transcription in the frontend!" -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost:5173" -ForegroundColor Cyan
