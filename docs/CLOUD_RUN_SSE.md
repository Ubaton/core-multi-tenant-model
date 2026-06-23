# GCP Cloud Run — SSE Configuration Reference

## 1. Why SSE needs special Cloud Run settings

Server-Sent Events keep an HTTP response open for minutes or hours.  Cloud Run's
default request timeout is **60 seconds** — the connection would be killed before
any useful data flows.  Three settings need adjusting:

---

## 2. `gcloud` deployment snippet

```bash
gcloud run deploy core-api \
  --image gcr.io/$PROJECT_ID/core-api:$TAG \
  --platform managed \
  --region us-central1 \
  \
  # ── SSE-critical settings ─────────────────────────────────────────────────
  --timeout 3600          \  # Max 3600 s (1 h) — set to the longest SSE session you want
  --min-instances 1       \  # Prevents scale-to-zero; SSE clients reconnect instantly
  --max-instances 10      \
  --concurrency 1000      \  # Each SSE connection is a long-lived request; set high
  \
  # ── General ───────────────────────────────────────────────────────────────
  --cpu 1 \
  --memory 512Mi \
  --set-env-vars "NODE_ENV=production,ALLOWED_ORIGINS=https://your-app.vercel.app"
```

### Why `--min-instances 1`

With `min-instances 0` (scale-to-zero), the first request after an idle period
hits a cold start of 2-4 s.  For SSE this means clients reconnect and see a
delay before receiving events.  One warm instance eliminates this.

### Why `--timeout 3600`

The default is 300 s (5 min) on most regions; the max is 3600 s.
The frontend `useServerEvents` hook reconnects automatically on close, so
even with 3600 s the worst-case reconnect gap is one heartbeat interval (25 s).

### Why high `--concurrency`

Each Cloud Run instance handles N concurrent requests.  SSE connections are
idle most of the time (waiting for events) so CPU/memory are not stressed.
Set concurrency to 500-1000 and monitor actual resource usage.

---

## 3. CORS headers for SSE (Cloud Run → Vercel)

`EventSource` with `withCredentials: true` requires:

| Header | Value |
|---|---|
| `Access-Control-Allow-Origin` | Exact origin (NOT `*`) |
| `Access-Control-Allow-Credentials` | `true` |
| `Access-Control-Allow-Methods` | `GET, OPTIONS` |
| `Access-Control-Allow-Headers` | `Content-Type, Authorization` |

### Express middleware (Cloud Run backend)

```typescript
// src/middleware/cors.ts
import cors from 'cors';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim());

export const corsMiddleware = cors({
  origin(requestOrigin, callback) {
    // Allow requests with no origin (curl, Postman) in dev only.
    if (!requestOrigin) {
      if (process.env.NODE_ENV !== 'production') return callback(null, true);
      return callback(new Error('Missing origin'), false);
    }
    if (ALLOWED_ORIGINS.includes(requestOrigin)) {
      callback(null, requestOrigin); // echo the exact origin — required for credentials
    } else {
      callback(new Error(`Origin ${requestOrigin} not allowed`), false);
    }
  },
  credentials: true,                 // required for withCredentials: true on EventSource
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: [],
  maxAge: 600,                       // cache preflight for 10 min
});
```

**Set in Cloud Run environment:**
```
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-app-git-branch.vercel.app
```

---

## 4. Prisma connection pooling with SSE

### The problem

The Prisma connection pool is sized for short query/response cycles.  Each
Cloud Run instance opens `pool_size` connections to Postgres.  The SSE
`PgListenerPool` adds **1 extra raw `pg.Client` connection per instance** for
`LISTEN`.

With `max-instances 10` and `pool_size 10`:

```
Max Postgres connections = (10 instances × 10 pool) + (10 instances × 1 LISTEN)
                        = 110 connections
```

Postgres default `max_connections` is 100.  **You will exhaust connections.**

### Solution

```typescript
// lib/db.ts — adjust pool_size based on Cloud Run max-instances
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_SIZE ?? '5'),   // 5 per instance
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});
```

```bash
# Cloud Run env vars
DB_POOL_SIZE=5
# With max-instances 10: 10 × 5 + 10 × 1 = 60 connections — well within limit
```

### Using PgBouncer / Prisma Accelerate

If you use Prisma Accelerate or PgBouncer as a pooler:

- Set `DATABASE_URL` to the pooler URL (transaction mode for Prisma).
- Set `DATABASE_DIRECT_URL` to the direct Postgres URL.
- `PgListenerPool` in `lib/sse/pg-listener.ts` already reads
  `DATABASE_DIRECT_URL` first — LISTEN MUST use a direct connection because
  PgBouncer transaction mode drops the LISTEN state between transactions.

```bash
DATABASE_URL=postgres://user:pass@pgbouncer-host:5432/db?pgbouncer=true
DATABASE_DIRECT_URL=postgres://user:pass@postgres-host:5432/db
```

---

## 5. Cloud Run service YAML (infrastructure-as-code)

```yaml
# cloud-run-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: core-api
  namespace: default
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"
        autoscaling.knative.dev/maxScale: "10"
        autoscaling.knative.dev/target: "800"      # concurrent requests per instance
        run.googleapis.com/execution-environment: gen2
    spec:
      timeoutSeconds: 3600
      containerConcurrency: 1000
      containers:
        - image: gcr.io/PROJECT_ID/core-api:TAG
          env:
            - name: NODE_ENV
              value: production
            - name: ALLOWED_ORIGINS
              value: https://your-app.vercel.app
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-url
                  key: latest
            - name: DATABASE_DIRECT_URL
              valueFrom:
                secretKeyRef:
                  name: db-direct-url
                  key: latest
          resources:
            limits:
              cpu: "1"
              memory: 512Mi
```

---

## 6. Vercel `next.config.ts` rewrites (optional but recommended)

Rather than exposing your Cloud Run URL to the browser, proxy SSE through
Vercel rewrites.  This removes the CORS requirement entirely.

```typescript
// next.config.ts
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/events',
        destination: `${process.env.API_BASE_URL}/api/events`,
      },
    ];
  },
};
```

**Caveat:** Vercel's Edge Network buffers responses.  For SSE you MUST add:

```typescript
// app/api/events/route.ts  (thin proxy)
export const runtime = 'edge';  // Edge runtime supports streaming
// Or use rewrites above — both work, but rewrites are simpler.
```

If you use rewrites, set `withCredentials: false` in `useServerEvents` (same
origin, so cookies are sent automatically) and remove the CORS headers.
