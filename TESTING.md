# Testing Guide

## Quick Start

1. **Start the development servers:**
   ```bash
   npm run dev
   ```
   This will start both:
   - Backend API server on http://localhost:3001
   - Frontend Vite dev server on http://localhost:5173

2. **Open your browser:**
   Navigate to http://localhost:5173

## Testing Steps

### 1. Generate a Webhook URL
- Click the "Generate Webhook URL" button
- Copy the generated webhook URL (e.g., `http://localhost:3001/api/webhook/abc123...`)

### 2. Send Test Requests

You can test using various methods:

#### Using cURL:
```bash
# POST request with JSON body
curl -X POST http://localhost:3001/api/webhook/YOUR_TOKEN \
  -H "Content-Type: application/json" \
  -d '{"test": "data", "message": "Hello Webhook!"}'

# GET request
curl http://localhost:3001/api/webhook/YOUR_TOKEN?param1=value1&param2=value2

# POST request with form data
curl -X POST http://localhost:3001/api/webhook/YOUR_TOKEN \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "name=John&email=john@example.com"
```

#### Using PowerShell:
```powershell
# POST request with JSON
Invoke-RestMethod -Uri "http://localhost:3001/api/webhook/YOUR_TOKEN" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"test": "data"}'

# GET request
Invoke-RestMethod -Uri "http://localhost:3001/api/webhook/YOUR_TOKEN?param1=value1"
```

#### Using Postman or Insomnia:
- Create a new request
- Set method to POST/GET/etc.
- Enter your webhook URL
- Add headers and body as needed
- Send the request

### 3. Verify Real-time Updates
- After sending a request, it should appear immediately in the dashboard
- Check the connection status indicator (should show "Connected")
- Requests should appear in real-time without refreshing

### 4. Test Request Details
- Click on any request in the dashboard
- Verify all details are displayed:
  - Method, URL, Timestamp, IP Address
  - Headers (full JSON)
  - Query Parameters (if any)
  - Body (if any)

### 5. Test Features
- **Copy URL**: Click the copy button next to the webhook URL
- **Search & Filter**: 
  - Filter by HTTP method (GET, POST, etc.)
  - Search in body/headers
- **Export**: Click "Export" to download requests as JSON
- **Delete Webhook**: Click the trash icon to delete the webhook

### 6. Test Socket.io Connection
- Check the connection status indicator
- Disconnect your internet briefly and reconnect
- The status should update automatically
- Requests should resume appearing in real-time

## API Testing

You can also test the API directly:

### Generate Webhook:
```bash
curl -X POST http://localhost:3001/api/webhooks/generate \
  -H "Content-Type: application/json" \
  -d '{"expiresIn": 60}'
```

### Get Requests:
```bash
curl http://localhost:3001/api/webhooks/YOUR_TOKEN/requests
```

### Get Single Request:
```bash
curl http://localhost:3001/api/webhooks/requests/REQUEST_ID
```

### Health Check:
```bash
curl http://localhost:3001/api/health
```

## Expected Behavior

✅ **Working correctly if:**
- Webhook URLs are generated successfully
- Requests appear in the dashboard immediately
- Request details show all information correctly
- Copy buttons work
- Export downloads JSON file
- Connection status shows "Connected"
- Search and filter work properly

❌ **Issues to check:**
- If requests don't appear: Check Socket.io connection status
- If webhook generation fails: Check backend server logs
- If 404 errors: Verify the webhook token is correct
- If database errors: Check if webhook.db file is created

## Troubleshooting

1. **Port already in use:**
   - Change PORT in .env file
   - Kill the process using the port: `netstat -ano | findstr :3001`

2. **Database errors:**
   - Delete webhook.db file and restart server
   - Check file permissions

3. **Socket.io connection issues:**
   - Verify VITE_SOCKET_URL in .env matches backend URL
   - Check browser console for connection errors

4. **CORS errors:**
   - Verify CLIENT_URL in .env matches frontend URL
   - Check backend CORS configuration
