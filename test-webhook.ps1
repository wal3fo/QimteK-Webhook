# Quick Webhook Test Script
# This script helps you test the webhook system

Write-Host "=== Webhook Inspector Test Script ===" -ForegroundColor Cyan
Write-Host ""

# Check if servers are running
Write-Host "Checking server status..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -TimeoutSec 2
    Write-Host "✅ Backend API is running!" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend API is not running. Please start it with: npm run server:dev" -ForegroundColor Red
    exit 1
}

# Step 1: Generate a webhook
Write-Host "`nStep 1: Generating webhook URL..." -ForegroundColor Cyan
try {
    $webhook = Invoke-RestMethod -Uri "http://localhost:3001/api/webhooks/generate" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"expiresIn": 60}'
    
    if ($webhook.success) {
        $token = $webhook.token
        $url = $webhook.url
        Write-Host "✅ Webhook generated successfully!" -ForegroundColor Green
        Write-Host "   Token: $token" -ForegroundColor Gray
        Write-Host "   URL: $url" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "❌ Failed to generate webhook" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error generating webhook: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Send test requests
Write-Host "Step 2: Sending test requests..." -ForegroundColor Cyan

# Test 1: POST with JSON
Write-Host "  Sending POST request with JSON body..." -ForegroundColor Yellow
try {
    $response1 = Invoke-RestMethod -Uri $url `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"test": "data", "message": "Hello from PowerShell!", "timestamp": "' + (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + '"}'
    Write-Host "  ✅ POST request sent successfully!" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  POST request failed: $_" -ForegroundColor Yellow
}

Start-Sleep -Seconds 1

# Test 2: GET with query parameters
Write-Host "  Sending GET request with query parameters..." -ForegroundColor Yellow
try {
    $response2 = Invoke-RestMethod -Uri "$url?param1=value1&param2=value2&test=true"
    Write-Host "  ✅ GET request sent successfully!" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  GET request failed: $_" -ForegroundColor Yellow
}

Start-Sleep -Seconds 1

# Test 3: POST with form data
Write-Host "  Sending POST request with form data..." -ForegroundColor Yellow
try {
    $formData = @{
        name = "Test User"
        email = "test@example.com"
        message = "This is a test message"
    }
    $response3 = Invoke-RestMethod -Uri $url `
        -Method POST `
        -ContentType "application/x-www-form-urlencoded" `
        -Body $formData
    Write-Host "  ✅ Form POST request sent successfully!" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Form POST request failed: $_" -ForegroundColor Yellow
}

Start-Sleep -Seconds 2

# Step 3: Retrieve requests
Write-Host "`nStep 3: Retrieving captured requests..." -ForegroundColor Cyan
try {
    $requests = Invoke-RestMethod -Uri "http://localhost:3001/api/webhooks/$token/requests"
    if ($requests.success) {
        Write-Host "✅ Retrieved $($requests.total) request(s)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Request Details:" -ForegroundColor Cyan
        foreach ($req in $requests.requests) {
            Write-Host "  - Method: $($req.method) | Time: $($req.timestamp) | ID: $($req.id)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ Error retrieving requests: $_" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
Write-Host "Open http://localhost:5173 in your browser to see the requests in the dashboard!" -ForegroundColor Green
Write-Host "Webhook URL: $url" -ForegroundColor Yellow
