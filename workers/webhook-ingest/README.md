# Webhook Ingestion Worker (Async Queue)

**WHY:** Cloudflare Queues are NOT supported in Pages Functions. This standalone Worker provides:

- **Non-blocking ingestion**: Validate → Enqueue → Return 200 immediately
- **Background processing**: Consumer reads from queue and inserts to Supabase
- **Retry + DLQ**: Failed messages go to dead-letter queue

## Deployment

1. Create the queue:
   ```bash
   npx wrangler queues create qimtek-webhook-ingest
   npx wrangler queues create qimtek-webhook-ingest-dlq
   ```

2. Deploy the Worker:
   ```bash
   cd workers/webhook-ingest
   npx wrangler deploy
   ```

3. Route webhook traffic to this Worker:
   - Option A: Subdomain `webhooks.yourdomain.com` → Worker
   - Option B: Path `/api/webhook/*` on a Worker route (requires main app routing)

## Configuration

Set secrets:
```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

## Queue Flow

```
Request → Validate token → Enqueue payload → 200 OK
                              ↓
                    Consumer Worker
                              ↓
                    Insert to Supabase requests table
                              ↓
                    On failure → Retry → DLQ
```
