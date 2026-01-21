# Vercel Webhook Auto-Start Guide

## 🎯 Understanding Vercel Serverless Functions

**Important**: Vercel doesn't use a traditional "server" that needs to be started. Instead, it uses **serverless functions** that automatically activate when requests arrive.

### How It Works

1. **Automatic Activation**: When a webhook request arrives at your Vercel URL, Vercel automatically:
   - Spins up a serverless function (if not already warm)
   - Routes the request to your handler (`api/index.ts`)
   - Executes your code
   - Returns the response

2. **No Manual Start Required**: Your webhook endpoints are **always available** at:
   - `https://your-app.vercel.app/api/webhook/:token`
   - `https://your-app.vercel.app/api/webhooks/*`

3. **Cold Start vs Warm**: 
   - **Cold Start**: First request after inactivity (may take 1-2 seconds)
   - **Warm**: Subsequent requests (very fast, <100ms)

## ✅ Current Setup (Already Working!)

Your webhook setup is already configured correctly:

```
/api/index.ts → Handles all API requests
/api/app.ts → Express app with all routes
/api/routes/webhook-receiver.ts → Webhook receiver endpoint
```

**All webhook requests automatically go through:**
```
Request → Vercel → /api/index.ts → /api/app.ts → /api/routes/webhook-receiver.ts
```

## 🚀 Optimizing for Webhooks

### 1. Function Configuration

Update `vercel.json` to optimize function performance:

```json
{
  "functions": {
    "api/index.ts": {
      "maxDuration": 30,
      "memory": 1024
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 2. Keep Functions Warm (Optional)

To reduce cold starts, you can set up a cron job to ping your health endpoint:

1. Go to Vercel Dashboard → Your Project → **Settings** → **Cron Jobs**
2. Add a new cron job:
   - **Name**: `keep-webhook-warm`
   - **Schedule**: `*/5 * * * *` (every 5 minutes)
   - **Path**: `/api/health`

Or use an external service like:
- [UptimeRobot](https://uptimerobot.com) - Free monitoring
- [cron-job.org](https://cron-job.org) - Free cron jobs

### 3. Health Check Endpoint

Your app already has a health check at `/api/health`. Use it to:
- Monitor webhook availability
- Keep functions warm
- Verify deployment status

**Test it:**
```bash
curl https://your-app.vercel.app/api/health
```

## 📋 Webhook Endpoints

Your webhook endpoints are automatically available at:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/webhook/:token` | ALL | Receive webhook requests |
| `/api/webhooks/generate` | POST | Generate new webhook URL |
| `/api/webhooks/:token/requests` | GET | Get webhook requests |
| `/api/webhooks/requests/:id` | GET | Get single request |
| `/api/webhooks/:token` | DELETE | Delete webhook |
| `/api/health` | GET | Health check |

## 🔧 Configuration Checklist

### ✅ Required Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
NODE_ENV=production
BASE_URL=https://your-app.vercel.app
```

### ✅ Vercel Settings

1. **Function Region**: Choose closest to your users
   - Settings → Functions → Region

2. **Function Timeout**: Set to 30 seconds (default is 10s)
   - Settings → Functions → Max Duration

3. **Memory**: 1024 MB recommended for database operations
   - Settings → Functions → Memory

## 🧪 Testing Your Webhook

### 1. Generate a Webhook URL

```bash
curl -X POST https://your-app.vercel.app/api/webhooks/generate \
  -H "Content-Type: application/json" \
  -d '{"expiresIn": 60}'
```

Response:
```json
{
  "success": true,
  "token": "abc123...",
  "url": "https://your-app.vercel.app/api/webhook/abc123...",
  "expiresAt": "2024-01-01T12:00:00.000Z"
}
```

### 2. Send a Test Webhook

```bash
curl -X POST https://your-app.vercel.app/api/webhook/abc123... \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### 3. Check Webhook Requests

```bash
curl https://your-app.vercel.app/api/webhooks/abc123.../requests
```

## 🐛 Troubleshooting

### Webhook Not Receiving Requests

1. **Check Vercel Logs**:
   - Dashboard → Your Project → **Logs**
   - Look for errors or timeouts

2. **Verify Environment Variables**:
   - Settings → Environment Variables
   - Ensure all required variables are set

3. **Test Health Endpoint**:
   ```bash
   curl https://your-app.vercel.app/api/health
   ```

4. **Check Function Status**:
   - Dashboard → Functions
   - Verify function is deployed and active

### Cold Start Issues

If webhooks are slow on first request:

1. **Increase Memory**: 1024 MB or higher
2. **Set Up Warm-up Cron**: Ping `/api/health` every 5 minutes
3. **Use Edge Functions**: For faster response times (if applicable)

### Database Connection Issues

1. **Verify Supabase Credentials**: Check environment variables
2. **Check Supabase Dashboard**: Verify tables exist
3. **Review Logs**: Look for database connection errors

## 📊 Monitoring

### Vercel Analytics

1. Go to Dashboard → **Analytics**
2. Monitor:
   - Function invocations
   - Response times
   - Error rates

### Custom Monitoring

Set up monitoring for your webhook endpoints:

```bash
# Monitor webhook endpoint
curl -X GET https://your-app.vercel.app/api/health

# Check webhook requests count
curl https://your-app.vercel.app/api/webhooks/:token/requests
```

## 🎯 Best Practices

1. **Always Use HTTPS**: Vercel provides SSL automatically
2. **Set Appropriate Timeouts**: 30 seconds for webhook processing
3. **Monitor Function Logs**: Check for errors regularly
4. **Use Health Checks**: Keep functions warm
5. **Set Up Alerts**: Monitor error rates and response times

## 📚 Additional Resources

- [Vercel Serverless Functions Docs](https://vercel.com/docs/functions)
- [Vercel Function Configuration](https://vercel.com/docs/functions/serverless-functions/runtimes/node-js)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

## ✅ Summary

**Your webhooks are already auto-starting!** 

- ✅ No server to start manually
- ✅ Functions activate automatically on request
- ✅ All endpoints are always available
- ✅ Database initializes on first request
- ✅ Health check endpoint available

Just deploy to Vercel and your webhooks will work automatically! 🚀
