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

## 🛠️ Design Decisions & Core Features

### 1. Robust Queueing & Persistence (BullMQ + Redis + Postgres)
- The system heavily utilizes **BullMQ** to manage the sending queue.
- Jobs are durably persisted in both PostgreSQL and Redis. If the server crashes or restarts, BullMQ will automatically resume processing pending and delayed jobs from where it left off, ensuring that **no emails are lost and no emails are duplicated**.
- **Worker Concurrency**: The worker concurrency is strictly controlled via environment variables to prevent overwhelming the application memory or database connection limits.

### 2. Distributed Rate Limiting
- Built a specialized rate limiter using **Redis Counters**.
- It enforces strict hourly limits per `senderId`.
- **Intelligent Backoff**: If an email job exceeds the sender's hourly limit bucket, it does *not* fail. Instead, the rate limiter uses BullMQ's `moveToDelayed` functionality to purposefully suspend the job until the exact start of the **next hour**. This is handled invisibly without polling.

### 3. Dynamic Scheduling & "Send Later"
- Users can choose to send emails immediately or schedule them for a specific time in the future.
- BullMQ's `opts.delay` handles holding the job in a separate Redis sorted set until the precise moment it needs to be executed.
- The `delayBetweenMs` parameter allows a staggered send of massive campaigns, automatically spacing out deliveries (e.g., waiting 2 seconds between each dispatch) to avoid sudden spikes.

### 4. Idempotency & Fault Tolerance
- Each job has a strict status state machine (`queued`, `delayed_retry`, `sent`, `failed`).
- The worker verifies the state in Postgres before proceeding. If a job is marked as `sent`, it will immediately return early, preventing accidental double-sends in case of network timeouts or rapid worker restarts.
- Automatic retries handle intermittent SMTP failures.

### 5. CSV Upload Integration
- The frontend Compose Panel supports uploading `.csv` or `.txt` lists.
- A built-in deduplication and regex-validation layer sanitizes the emails immediately on the client side before submission, preventing invalid requests from hitting the queue.

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

# Apply database migrations
npx prisma generate
npx prisma db push

# Seed the database with test sender credentials (Ethereal)
npm run db:seed

# Start the backend server
npm run dev
```

### 4. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install

# Start the frontend Vite server
npm run dev
```

The frontend will be available at `http://localhost:5173`.

---

## 🔍 Health Checks
A lightweight health endpoint is available to check server uptime and responsiveness:
- `GET /health` returns `200 OK` `{ "status": "ok" }`.

## 🧪 Testing Email Delivery
By default, the database seeding script creates **Ethereal** test email accounts. All emails sent through the system will route to these isolated inboxes. You can view the delivery preview URLs in the backend server logs when jobs complete successfully.