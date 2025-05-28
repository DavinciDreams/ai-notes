Write-Host "Restarting backend to pick up new Whisper configuration..." -ForegroundColor Yellow

# Kill existing Node processes
Write-Host "Stopping existing Node processes..." -ForegroundColor Red
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait a moment
Start-Sleep -Seconds 2

# Start backend server
Write-Host "Starting backend server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev:backend"

Write-Host "Backend restarted with new configuration!" -ForegroundColor Green
