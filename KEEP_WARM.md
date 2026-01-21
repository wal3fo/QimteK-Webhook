# Keep Vercel Functions Warm

## Why Keep Functions Warm?

Vercel serverless functions can experience "cold starts" - a delay of 1-2 seconds when a function hasn't been used recently. To minimize this for webhooks, you can keep functions warm by periodically pinging them.

## Option 1: Vercel Cron Jobs (Recommended)

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Cron Jobs**
2. Click **Create Cron Job**
3. Configure:
   - **Name**: `keep-webhook-warm`
   - **Schedule**: `*/5 * * * *` (every 5 minutes)
   - **Path**: `/api/health`
   - **Timezone**: Your timezone

This will automatically ping your health endpoint every 5 minutes, keeping the function warm.

## Option 2: External Cron Service

### Using cron-job.org (Free)

1. Go to [cron-job.org](https://cron-job.org)
2. Sign up (free)
3. Create a new cron job:
   - **Title**: Keep Webhook Warm
   - **URL**: `https://your-app.vercel.app/api/health`
   - **Schedule**: Every 5 minutes
   - **Request Method**: GET

### Using UptimeRobot (Free)

1. Go to [UptimeRobot](https://uptimerobot.com)
2. Sign up (free, 50 monitors)
3. Add a new monitor:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: Webhook Health Check
   - **URL**: `https://your-app.vercel.app/api/health`
   - **Monitoring Interval**: 5 minutes

## Option 3: GitHub Actions (If using GitHub)

Create `.github/workflows/keep-warm.yml`:

```yaml
name: Keep Webhook Warm

on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:  # Manual trigger

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Health Endpoint
        run: |
          curl -f https://your-app.vercel.app/api/health || exit 1
```

## Testing

Test your health endpoint:

```bash
curl https://your-app.vercel.app/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "ok"
}
```

## Monitoring

Check Vercel Dashboard → **Logs** to see:
- Function invocations from warm-up pings
- Response times
- Any errors

## Notes

- **Free Tier**: Vercel's free tier includes 100GB-hours of function execution time
- **Warm-up Frequency**: Every 5 minutes is usually sufficient
- **Cost**: Minimal - health checks are very fast (<100ms)
- **Alternative**: If you have high traffic, functions stay warm naturally
