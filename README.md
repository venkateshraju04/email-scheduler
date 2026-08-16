# ReachInbox Hiring Assignment - Email Job Scheduler

A production-grade email scheduler service and dashboard built to reliably schedule, rate-limit, and send cold emails at scale.

## 🚀 Architecture & Tech Stack

### Backend
- **Node.js & Express**: API routing and request handling.
- **TypeScript**: Full type safety across the stack.
- **PostgreSQL (Prisma ORM)**: Persistent storage for campaigns, users, email jobs, and sender credentials.
- **Redis (BullMQ)**: Distributed message queue for reliable job scheduling, delayed retries, and distributed rate limiting.
- **Nodemailer**: Email delivery interface (configured to use Ethereal for testing).
- **Zod**: Runtime schema validation.

### Frontend
- **React + Vite**: Fast, modern frontend framework.
- **TypeScript**: For strict typing and better developer experience.
- **Tailwind CSS**: Utility-first styling to closely match the provided Figma design.
- **React Query**: For data fetching, caching, and background synchronization.
- **React Hook Form**: Performant form state management for the compose panel.
- **PapaParse**: For client-side CSV parsing of recipient lists.

---

## ✅ Features Implemented

### Backend
- [x] Email scheduling via API (`POST /campaigns`)
- [x] Persistent job scheduling with BullMQ delayed jobs (no cron)
- [x] Survives server restarts — future jobs still fire at the correct time (Redis AOF persistence)
- [x] Idempotent sends — DB status check prevents double-sending on retry/stall
- [x] Worker concurrency, configurable via `WORKER_CONCURRENCY` env var
- [x] Per-sender hourly rate limiting via Redis counters (`MAX_EMAILS_PER_HOUR_PER_SENDER` — configurable, not hardcoded)
- [x] Rate-limited jobs are rescheduled to the next hour window, never dropped or failed
- [x] Multi-sender support (Sender table, each with independent Ethereal credentials)
- [x] Bulk campaign creation — single `createMany` + `addBulk`, not per-recipient loops
- [x] Google OAuth login, real token verification (`google-auth-library`), no mock
- [x] JWT-based session issued by backend, auth middleware protecting `/campaigns` and `/emails`
- [x] `GET /emails?status=scheduled` and `GET /emails?status=sent`, paginated

### Frontend
- [x] Google login (real OAuth, redirects to dashboard on success)
- [x] Header with user name, email, avatar, logout
- [x] Sidebar navigation — Scheduled / Sent, with live counts
- [x] Compose panel — subject, body, CSV recipient upload with detected-count display, delay + hourly limit fields, immediate or scheduled ("Send Later") send
- [x] Scheduled emails table/list — email, subject, scheduled time, status, loading + empty states
- [x] Sent emails table/list — email, subject, sent time, status (sent/failed), loading + empty states
- [x] Reusable UI components (Button, Input, Badge, Chip, EmptyState, etc.)
- [x] Toast-based error handling on API failures

---

## 🏗️ How to Run Locally

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose

### 1. Start Infrastructure (Postgres & Redis)
The `docker-compose.yml` file defines the database and Redis instances, along with persistent volumes so data survives container restarts.
```bash
docker compose up -d
```

### 2. Environment Setup
In the `backend` directory, create a `.env` file (you can copy `.env.example` if it exists):
```env
DATABASE_URL="postgresql://admin:password123@localhost:5432/reachinbox_scheduler?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="super-secret-jwt-key"
GOOGLE_CLIENT_ID="<your-google-oauth-client-id>"
WORKER_CONCURRENCY=5
PORT=4000
```

### 3. Backend Setup
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### 4. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
The frontend will be available at `http://localhost:5173`.

---

## ⏱ Rate Limiting & Delay Configuration

**Delay between sends**: Configurable per campaign via the `delayBetweenMs` field (exposed in the compose UI as "Delay between 2 emails").
*Default: 2000ms (2 seconds) between sends within a campaign. No hard floor is enforced, so a user could set 0 — worth noting as a potential improvement: clamp to a sane minimum server-side.*

**Hourly limit**: Configurable per campaign via `hourlyLimit`, enforced per sender, not globally — so two campaigns using different senders can send concurrently without competing for the same quota.

**Enforcement mechanism**: A Redis key `ratelimit:{senderId}:{YYYY-MM-DDTHH}` is atomically incremented (`INCR`) on every send attempt. If the increment pushes the count past the configured limit, it's decremented back (so the slot isn't wasted) and the job is moved to the start of the next hour via BullMQ's `moveToDelayed`, then the processor throws `DelayedError` to correctly signal the transition to BullMQ (a plain return here causes a "missing lock" error, since `moveToDelayed` already releases the job's processing lock).

**Why Redis counters instead of BullMQ's built-in limiter**: BullMQ's queue-level limiter option is global to the queue and doesn't support the fine-grained per-sender + "push to next hour, don't fail" behavior this assignment asks for, so a custom Redis-backed counter was used instead.

---

## 🏗 Assumptions, Shortcuts & Trade-offs

- **Rate limit window is a fixed hour bucket, not a sliding window**: Keys are bucketed by wall-clock hour (`YYYY-MM-DDTHH`), which is simple to reason about but allows a burst near hour boundaries (e.g. hitting the limit at :59 and again immediately at :00 could allow close to 2x the limit within a ~2 minute span). A sliding-window algorithm would close this but adds complexity not required by the assignment scope.
- **Sender pool is developer-seeded, not user-managed**: Sender rows (Ethereal test accounts) are created via a one-off script (`utils/generate-mailer.ts`) and seeded manually, not created dynamically per-user through the dashboard. This was a deliberate scope decision — the assignment asks for multi-sender support, not a sender-management UI.
- **Worker and API run in the same Node process**: a production deployment would split them into separate services so load on one doesn't affect the other.
- **CSV validation happens client-side & server-side**: The frontend uses regex + dedup via PapaParse before submission. 
- **Google OAuth consent screen**: The application is left in "Testing" mode on the GCP Console. Specific test users must be added in the Google Cloud Console for reviewers to log in successfully.

---

## 📧 Setting Up Ethereal Email

This project uses [Ethereal](https://ethereal.email/) as a fake SMTP provider — emails aren't delivered anywhere real, but can be previewed via a generated URL.

Generate one or more test accounts:
```bash
cd backend 
npx tsx utils/generate-mailer.ts
```
This prints user, pass, and SMTP host/port for a freshly generated Ethereal inbox.

Update `prisma/seed.ts` (or run it interactively) with the generated user/pass for each Sender row you want to seed. Run multiple times if you want multiple senders for testing per-sender rate limits independently.

Re-run the seed:
```bash
npm run db:seed
```

When an email sends successfully, the backend logs a preview URL:
`Sent <emailJobId> — preview: https://ethereal.email/message/...`
Open that link in a browser to view the actual rendered email.

---

## 🔄 Verifying Restart Persistence

To confirm the core "survives restarts without losing or duplicating jobs" guarantee yourself:
1. Start the backend (`npm run dev`) with Docker infra already running.
2. Schedule an email with a delay of 60+ seconds (via the dashboard, or curl/Postman against `POST /campaigns`).
3. Within that window, stop the backend process (`Ctrl+C`).
4. Wait a few seconds, then restart it (`npm run dev`).
5. Confirm the email still sends at its original scheduled time (check backend logs / the Sent tab) — not immediately on restart, and not lost.

This works because BullMQ stores delayed jobs in Redis (not in application memory), and Redis is configured with AOF persistence (`--appendonly yes` in `docker-compose.yml`), so the job survives independently of the Node process's lifecycle.

---

## 🎥 Demo Video

[Link to Demo Video](https://drive.google.com/file/d/1MH9MmSPIj8w8cfZx1xG1nVYtYaYMPoRf/view?usp=sharing)
