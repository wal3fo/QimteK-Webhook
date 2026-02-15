# Scalability Upgrades

Production-grade scalability changes for QimteK Webhook. Implemented incrementally without breaking existing behavior.

## Critical Changes (Implemented)

### 1. Webhook Request Storage

- **Migration**: `supabase/migrations/20250215000001_requests_partitioned.sql`
  - Indexes: `webhook_token`, `timestamp`, `(webhook_token, timestamp DESC)`
  - Optional partition schema (commented) for future use
- **Bug fix**: Cloudflare webhook ingestion now writes to `requests` (was incorrectly using `webhook_requests`)

### 2. Retention Enforcement

- **`api/utils/cleanup.ts`**: Plan-based retention from `system_config` / `getPlans()`
  - Free: 24h (configurable via `retentionHours`)
  - Pro/Admin: from plan config (0 = unlimited)
- Run `cleanupOldRequests()` and `cleanupExpiredWebhooks()` via cron or `startCleanupJob(60)`

### 3. Async Webhook Ingestion (Optional)

- **Cloudflare Queues** are not supported in Pages Functions.
- **Standalone Worker**: `workers/webhook-ingest/` – validate → enqueue → 200 OK; consumer inserts to Supabase.
- Deploy and route webhook traffic to this Worker for non-blocking ingestion.
- See `workers/webhook-ingest/README.md` for setup.

### 4. Rate Limiting

- **`api/utils/rate-limit.ts`**: Per-IP (120/min) and per-token (60/min default).
- Integrated in `api/routes/webhook-receiver.ts`.
- For Cloudflare: use KV or Durable Objects for shared rate state across isolates.

### 5. Cursor-Based Pagination

- **API**: `GET /api/webhooks/:token/requests?limit=50&cursor=<base64>`
- Response: `requests`, `nextCursor`, `hasMore` (no `total`).
- **Frontend**: `useWebhook` exposes `loadMoreRequests`, `hasMoreRequests`; `RequestsTable` has “Load more”.

## Performance & Data Access

### 6. Pre-Aggregated Analytics

- **Migration**: `supabase/migrations/20250215000003_analytics_tables.sql`
  - `webhook_request_stats_hourly`, `webhook_request_stats_daily`
  - Add aggregation jobs (e.g. pg_cron or external cron) to populate from `requests`.

### 7. Virtualized Lists

- **`react-window`** in `RequestsTable` – activates when list size ≥ 100 rows.
- Keeps UI responsive for 10k+ items.

### 8. Real-Time Updates

- Replace polling with **Supabase Realtime** on `requests` filtered by `webhook_token`.
- Subscribe in `useWebhook` and update `requests` on `INSERT`.
- Fallback to polling if Realtime is unavailable.

## Multi-Tenancy & Safety

### 9. DB-Enforced Quotas

- `getPlans()` already provides `maxWebhooks`; enforce in API before insert.
- Add RLS or triggers for extra safety if needed.

### 10. Feature Flags

- **Migration**: `supabase/migrations/20250215000004_feature_flags.sql`
  - `feature_flags`, `user_feature_overrides` for plan and per-user overrides.

### 11. Webhook Signature Verification

- **`api/utils/webhook-signature.ts`** – HMAC SHA256, header `X-Qimtek-Signature`.
- Hook into ingestion when webhooks have a configured secret.

### 12. Replay Safety

- **`api/utils/replay-safety.ts`** – blocks localhost/private IPs.
- Use `isUrlSafeForReplay(url)` when adding outbound replay to a custom URL.

## Reliability & Ops

### 13. Structured Logging

- Log per request: `request_id`, `webhook_token`, `user_id`, `latency`, `payload_size`, `status`.
- Add a logging middleware that emits JSON logs.

### 14. Dead-Letter Queue

- **Migration**: `supabase/migrations/20250215000005_dead_letter_ingest.sql`
  - `ingestion_dlq` for failed queue messages.
- Queue consumer should insert into `ingestion_dlq` on retry exhaustion.

## Configuration

- **`config/scalability.ts`**: Centralized plan limits and retention.
- **`api/utils/plan-storage.ts`**: Fetches plan config from `system_config`; `retentionHours` used for cleanup.
