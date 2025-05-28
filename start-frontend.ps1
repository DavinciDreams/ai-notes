Write-Host "Starting Frontend Development Server..." -ForegroundColor Green

# Start frontend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev:frontend"

Write-Host "Frontend server starting..." -ForegroundColor Yellow
Write-Host "It will be available at: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Please wait a moment for the server to fully start." -ForegroundColor Yellow

# Wait and then try to open the browser
Start-Sleep -Seconds 5
Write-Host "Opening browser..." -ForegroundColor Green
Start-Process "http://localhost:5173"
