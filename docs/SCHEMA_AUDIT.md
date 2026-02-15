# Supabase Schema Audit Report

**Date:** 2025-02-15  
**Scope:** public schema, all tables, RLS, indexes, and application usage.

---

## 1. Schema Overview

### Base Tables (supabase_schema.sql)

| Table | Purpose | PK | FKs |
|-------|---------|-----|-----|
| `users` | Auth & RBAC – email, password_hash, role, MFA, verification | id (UUID) | — |
| `webhooks` | Webhook endpoints – token, name, expiration, owner | token (TEXT) | user_id → users |
| `requests` | Captured webhook payloads – method, url, headers, body, etc. | id (UUID) | webhook_token → webhooks |
| `visitor_sessions` | Visitor tracking (for Visitor Service) | session_id (TEXT) | — |
| `system_config` | Key-value config (e.g. plan_config) | key (TEXT) | — |

### Migration Tables (001_all_migrations.sql)

| Table | Purpose | PK | FKs |
|-------|---------|-----|-----|
| `webhook_request_stats_hourly` | Pre-aggregated hourly analytics | (webhook_token, hour_bucket) | webhook_token → webhooks |
| `webhook_request_stats_daily` | Pre-aggregated daily analytics | (webhook_token, day_bucket) | webhook_token → webhooks |
| `feature_flags` | Plan/per-user feature overrides | id (UUID) | — |
| `user_feature_overrides` | Per-user flag overrides | (user_id, flag_key) | user_id → users |
| `ingestion_dlq` | Dead-letter queue for failed ingestion | id (UUID) | — |

### Additional Schema Elements

- **Function:** `drop_old_request_partitions(retention_days INT)` – for future partitioned `requests`
- **Columns added by migration:** `requests.raw_body`, `webhooks.last_active_at`
- **Indexes:** See Section 4

---

## 2. Table Usage Classification

| Table | Classification | Evidence | Risk if Modified |
|-------|----------------|----------|------------------|
| **users** | Actively used | auth routes (login, register, MFA, verify-email, change-password), users API, payments, cleanup | Critical – core auth |
| **webhooks** | Actively used | webhook routes, generate, receiver, cleanup, users (cascade delete) | Critical |
| **requests** | Actively used | webhook receiver, requests API, replay, cleanup, users (cascade delete) | Critical |
| **system_config** | Actively used | plan-storage.ts (getPlans, savePlans) – key `plan_config` | High – plan config |
| **visitor_sessions** | Unused / safe to remove | No references in api, functions, or src | Low – no code uses it |
| **webhook_request_stats_hourly** | Possibly used / unclear | Created by migration, no app code references | Low – prepared for charts |
| **webhook_request_stats_daily** | Possibly used / unclear | Same as above | Low |
| **feature_flags** | Possibly used / unclear | Created by migration, no app code references | Low – prepared for future |
| **user_feature_overrides** | Possibly used / unclear | Same as above | Low |
| **ingestion_dlq** | Possibly used / unclear | Created for async queue; Worker uses Cloudflare DLQ, not this table | Low – not yet wired |

---

## 3. Table & Column Rename Proposals

| Current Name | Proposed Name | Reason | Risk Level |
|--------------|---------------|--------|------------|
| `requests` | *(keep)* | Generic but clear; `webhook_requests` would be more precise but requires large refactor | N/A |
| `requests.timestamp` | `created_at` | Matches `webhooks.created_at`; `timestamp` is vague | Medium – many API/code references |
| `webhooks.expires_at` | *(keep)* | Clear | N/A |
| `system_config.value` | *(keep)* | Generic but acceptable for key-value store | N/A |
| `user_feature_overrides.flag_key` | *(keep)* | Clear | N/A |
| `ingestion_dlq` | `webhook_ingestion_failures` | More descriptive than acronym | Low – no usage yet |

**Recommendation:** Avoid renames until a dedicated refactor. `timestamp` → `created_at` is the only one worth considering long term.

---

## 4. Tables Proposed for Removal

| Table | Reason | Evidence | Deletion Risk |
|-------|--------|----------|---------------|
| **visitor_sessions** | Never used | Only in supabase_schema.sql; no grep hits in api/, functions/, src/ | **Low** – no dependencies; schema comment says "For Visitor Service" but no such service exists |

**Recommendation:** Soft deprecate first: stop writes, add comment, then drop after verification.

---

## 5. Index Improvements

### Existing Indexes (after migrations)

**requests:**
- `idx_requests_webhook_token`
- `idx_requests_timestamp`
- `idx_requests_webhook_token_timestamp`

**webhook_request_stats_hourly:** `idx_stats_hourly_webhook_hour`  
**webhook_request_stats_daily:** `idx_stats_daily_webhook_day`  
**ingestion_dlq:** `idx_ingestion_dlq_created`

### Missing Indexes

| Table | Index | Reason |
|-------|-------|--------|
| `webhooks` | `(user_id)` | Cleanup and user-scoped queries |
| `webhooks` | `(user_id, is_active)` | Webhook limit checks |
| `webhooks` | `(expires_at)` | Cleanup of expired webhooks |
| `users` | `(email)` | Login (may already have UNIQUE) – verify unique index exists |
| `system_config` | *(none needed)* | PK lookup by key |

### Redundant / Optional

- No clearly redundant indexes.
- `idx_requests_webhook_token_timestamp` covers `idx_requests_webhook_token` for typical queries; keeping both is acceptable for different access patterns.

---

## 6. RLS Audit

### Current Policies

| Table | Policies | Notes |
|-------|----------|-------|
| users | "Users can view own data" (SELECT), "Service Role full access" | Backend uses service role → bypasses RLS |
| webhooks | View/insert/update/delete own | Same |
| requests | Public INSERT, SELECT for webhook owner | Public INSERT required for ingestion |
| system_config | Public read | Plans readable by all |
| visitor_sessions | RLS enabled, no policies | Effectively deny-all for non–service-role |

### Migration Tables (no RLS)

`webhook_request_stats_*`, `feature_flags`, `user_feature_overrides`, `ingestion_dlq` – RLS not enabled. Access is via service role only. Consider enabling RLS and adding policies when these tables are used from the client.

### Auth Usage

Policies use `auth.uid()`. This project uses a custom JWT and custom `users` table, not Supabase Auth. Direct client access with `auth.uid()` would be null. All DB access goes through the backend with `SERVICE_ROLE_KEY`, so RLS is effectively bypassed in production.

---

## 7. Migration Plan (Ordered Steps)

### Phase 1: Index Additions (safe)

```sql
-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON public.webhooks (user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_user_active ON public.webhooks (user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_webhooks_expires_at ON public.webhooks (expires_at) WHERE expires_at IS NOT NULL;
```

### Phase 2: visitor_sessions Deprecation (optional)

```sql
-- 1. Rename (soft deprecation)
ALTER TABLE public.visitor_sessions RENAME TO _deprecated_visitor_sessions;

-- 2. After verification period, drop
-- DROP TABLE IF EXISTS public._deprecated_visitor_sessions;
```

### Phase 3: Column Rename (optional, breaking)

⚠️ Only if `timestamp` → `created_at` is desired:

```sql
-- 1. Add new column
ALTER TABLE public.requests ADD COLUMN created_at TIMESTAMP WITH TIME ZONE;
UPDATE public.requests SET created_at = timestamp;
ALTER TABLE public.requests ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.requests ALTER COLUMN created_at SET NOT NULL;

-- 2. Update indexes to use created_at
-- 3. Update application code
-- 4. Drop timestamp, rename created_at if needed
```

**Recommendation:** Skip Phase 3 unless you are doing a larger schema refactor.

---

## 8. Rollback Plan

### Index Additions (Phase 1)

```sql
DROP INDEX IF EXISTS idx_webhooks_user_id;
DROP INDEX IF EXISTS idx_webhooks_user_active;
DROP INDEX IF EXISTS idx_webhooks_expires_at;
```

### visitor_sessions Deprecation (Phase 2)

```sql
ALTER TABLE public._deprecated_visitor_sessions RENAME TO visitor_sessions;
```

### Validation Queries

```sql
-- Verify indexes
SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'webhooks';

-- Verify visitor_sessions (if kept)
SELECT COUNT(*) FROM public.visitor_sessions;
```

---

## 9. Supabase-Specific Notes

- **PostgREST:** Table/column renames change API paths; update OpenAPI/SDK usage.
- **Auth:** No Supabase Auth schema usage; policies depend on `auth.uid()` which is unused with custom JWT.
- **Realtime:** Not used; `requests` could be subscribed if Realtime is added later.
- **Service Role:** Backend uses `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS.

---

## 10. Unknowns / Missing Visibility

1. **visitor_sessions:** Purpose unclear; no "Visitor Service" in the codebase.
2. **feature_flags / user_feature_overrides:** Tables exist but app still uses `plan_config` in `system_config` for plan features.
3. **webhook_request_stats_*:** No aggregation jobs or chart code using them yet.
4. **ingestion_dlq:** Defined for failed ingestion, but queue consumer does not write to it.

---

## Summary

| Action | Priority | Risk |
|--------|----------|------|
| Add `webhooks` indexes | High | Low |
| Deprecate/remove `visitor_sessions` | Low | Low |
| Wire `feature_flags` into app | Medium | Medium |
| Add aggregation for stats tables | Medium | Low |
| Wire `ingestion_dlq` into queue consumer | Low | Low |

**Conservative approach:** Add indexes (Phase 1), optionally deprecate `visitor_sessions` (Phase 2). Defer renames and other changes until a planned refactor.
