# PowerShell script to start AI Notes services

Write-Host "Starting AI Notes Services..." -ForegroundColor Green

# Start Docker services
Write-Host "Starting Docker services..." -ForegroundColor Yellow
docker-compose up -d postgres redis elasticsearch minio ollama whisper

# Wait a moment for services to initialize
Write-Host "Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Start backend server
Write-Host "Starting backend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev:backend"

# Wait a moment
Start-Sleep -Seconds 3

# Start collaboration server
Write-Host "Starting collaboration server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev:collaboration"

# Wait a moment
Start-Sleep -Seconds 3

# Start frontend
Write-Host "Starting frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev:frontend"

Write-Host "All services started!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:3002" -ForegroundColor Cyan
Write-Host "Collaboration: http://localhost:1235" -ForegroundColor Cyan
Write-Host "Whisper: http://localhost:9002" -ForegroundColor Cyan
