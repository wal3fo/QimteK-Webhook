# Troubleshooting

## 500 Errors on /api/plans, /api/auth/login

### 1. Check both servers are running

```bash
npm run dev
```

This starts:
- **Vite** (frontend) on port 5000
- **Express** (backend) on port 3001

If you see only one process or "server connection lost", the backend may have crashed.

### 2. Verify backend started

In the terminal, look for:

```
✅ Supabase connected
✅ Server started on port 3001
```

If you see `❌ Supabase credentials missing` or `Failed to start server`, the backend did not start.

### 3. Test backend directly

With the backend running, open:

- http://localhost:3001/api/ping — should return `pong`
- http://localhost:3001/api/health — should return JSON

If these fail, the backend is not running or is crashing.

### 4. Supabase credentials (.env)

Required in `.env`:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # Long JWT from Supabase Dashboard
```

- `SUPABASE_URL` must be `https://<project-ref>.supabase.co`
- Keys must be valid Supabase JWTs (long strings starting with `eyJ`)
- Get them from **Supabase Dashboard → Project Settings → API**

### 5. Proxy and API URL

- Frontend uses `/api` (proxied to localhost:3001)
- Ensure `VITE_API_URL` is unset or `http://localhost:5000/api` for dev (relative `/api` is fine)

### 6. "Non-JSON response"

This happens when the server returns HTML or plain text instead of JSON. Common causes:

- Backend not running (proxy returns HTML error page)
- Backend crashing before sending a response
- CORS or network error

Check the **Network** tab in DevTools: status code and response body for failing requests.
