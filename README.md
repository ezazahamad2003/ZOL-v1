# ZOL — Agentic AI Platform for Mechanic Shops

ZOL automates after-hours calls for mechanic shops. It answers calls 24/7, transcribes them, extracts car details and issues, generates quotes, sends them via Gmail, and books follow-up appointments — all without human intervention.

**Production:** [https://zol-v1.vercel.app](https://zol-v1.vercel.app) · [Sign in](https://zol-v1.vercel.app/login)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 App Router + TypeScript strict + Tailwind CSS + shadcn/ui |
| Backend | Next.js API routes + Server Actions |
| Database / Auth | Supabase (Postgres + Auth + RLS) |
| AI / Agents | OpenAI GPT-4o (function calling) |
| Voice | Vapi (per-shop phone numbers + AI assistants) |
| Email / Calendar | Google Gmail API + Google Calendar API (per-shop OAuth) |
| Queue | GCP Cloud Tasks |
| Workers | GCP Cloud Run |
| Testing | Vitest |

---

## Architecture Overview

Every mechanic shop is a **tenant** with their own:
- Vapi phone number + AI assistant
- Gmail account (connected via OAuth)
- Google Calendar

Org-level credentials (OpenAI key, Vapi API key, Google OAuth app) live in environment variables. Per-shop credentials (Vapi IDs, Google refresh tokens, pricing config) live in the `shops` table, encrypted at rest.

**Call flow:**
1. Customer calls shop's Vapi number
2. AI assistant answers, collects car details + issue
3. `call-ended` webhook fires → Cloud Tasks job enqueued
4. Cloud Run worker runs intake agent:
   - Extract structured data from transcript
   - Upsert customer record
   - Generate itemized quote
   - Send quote via shop's Gmail
   - Book follow-up in Google Calendar
5. All steps logged to `agent_runs` table, visible in dashboard

---

## Setup

### Prerequisites
- Node.js 20+
- Supabase project (free tier works)
- OpenAI API key

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in at minimum:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `ENCRYPTION_KEY` — generate with `openssl rand -base64 32`

### 3. Push database schema

```bash
npm run db:push
```

This applies all migrations in `supabase/migrations/` to your Supabase project.

### 4. Run dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Onboarding Flow

1. **Sign up** — creates Supabase Auth user
2. **Create shop** — enter shop name, business hours, pricing config
3. **Connect Google** — OAuth flow grants Gmail + Calendar access (requires `GOOGLE_CLIENT_ID/SECRET`)
4. **Provision phone** — buys Vapi phone number and creates AI assistant (requires `VAPI_API_KEY`)
5. Redirect to dashboard — shop is live

---

## API Routes

| Route | Description |
|---|---|
| `POST /api/vapi/webhook` | Receives all Vapi call events |
| `GET /api/google/oauth/callback` | Google OAuth redirect handler |
| `POST /api/onboarding/provision` | Triggers Vapi phone provisioning |
| `POST /api/agents/run` | Manual agent trigger |
| `POST /api/quotes/send` | Send a quote by ID |
| `POST /api/calendar/book` | Book a follow-up event |
| `POST /api/auth/signout` | Sign out |

---

## Agent Tools

| Tool | Description |
|---|---|
| `extract_call_details` | Transcript → structured car + issue data |
| `calculate_quote` | Issue description → line items + totals |
| `upsert_customer` | Find or create customer record |
| `send_quote_email` | Send formatted quote via shop's Gmail |
| `book_followup` | Create follow-up + Google Calendar event |

The orchestrator runs a **PLAN → TOOL_CALL → OBSERVE → FINISH** loop using OpenAI function calling. Every step is logged to `agent_runs.steps` and visible in the Runs dashboard.

---

## Workers (GCP Cloud Run)

```bash
# Build worker image
cd workers/agent-worker
docker build -t zol-worker .

# Run locally
docker run -p 8080:8080 --env-file ../../.env.local zol-worker
```

Health check: `GET /health`  
Job handler: `POST /handle` — expects `{ shopId, callId, triggerType }`

---

## Tests

```bash
npm test          # watch mode
npm run test:run  # single pass
```

Tests cover:
- Vapi webhook signature verification
- AES-256-GCM encryption/decryption
- Agent tool logic (calculate quote, extract details)
- Feature logic (identify shop)

---

## Database Schema

See `supabase/migrations/` for full schema. Key tables:

- `shops` — tenant config, Vapi IDs, Google OAuth, pricing
- `customers` — CRM records per shop
- `calls` — call records with transcript + raw Vapi payload
- `call_extractions` — structured data extracted by AI
- `quotes` — line items, totals, send status
- `agent_runs` — full step-by-step execution trace
- `followups` — scheduled callbacks / reminders

RLS is enabled on all tables. Cross-shop reads are blocked at the database level.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key |
| `OPENAI_API_KEY` | ✅ | OpenAI API key |
| `ENCRYPTION_KEY` | ✅ | 32-byte base64 key for token encryption |
| `VAPI_API_KEY` | ⏳ | Vapi org-level API key |
| `VAPI_WEBHOOK_SECRET` | ⏳ | Vapi webhook HMAC secret |
| `VAPI_WEBHOOK_URL` | ⏳ | Public URL for Vapi to POST events |
| `GOOGLE_CLIENT_ID` | ⏳ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ⏳ | Google OAuth client secret |
| `GOOGLE_OAUTH_REDIRECT_URI` | ⏳ | OAuth callback URL |
| `GCP_PROJECT_ID` | ⏳ | GCP project for Cloud Tasks |
| `GCP_REGION` | ⏳ | GCP region (default: us-central1) |
| `GCP_SERVICE_ACCOUNT_JSON` | ⏳ | GCP service account JSON (single line) |
| `CLOUD_TASKS_QUEUE_NAME` | ⏳ | Cloud Tasks queue name |
| `WORKER_URL` | ⏳ | Cloud Run worker public URL |
| `NEXT_PUBLIC_APP_URL` | ⏳ | App public URL |

✅ = needed to run locally | ⏳ = needed for full feature activation
