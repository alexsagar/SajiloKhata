# SajiloKhata

SajiloKhata is a full-stack expense sharing application built with:

- Next.js App Router frontend (`frontend`)
- Express + MongoDB backend (`backend`)
- Socket.IO realtime updates
- OCR receipt scanning with async queue processing
- Splitwise-style debt tracking (no wallet flow)

This document is the primary project guide for setup, architecture, features, and operations.

## 1. Monorepo Layout

```text
.
|- backend/                Express API, jobs, queue workers, Mongo models
|- frontend/               Next.js app (App Router, React Query, TypeScript)
|- docs/                   Additional project docs
|- scripts/                Utility and migration scripts
|- README.md               This file
```

## 2. Core Product Capabilities

- Authentication
  - Email/password auth with OTP-assisted signup verification
  - OAuth sync path
  - Refresh-token cookie flow
- Expenses
  - Personal and group expenses
  - Split types: equal, exact, percentage
  - Comment threads on expenses with `@mention` notifications
- Groups and balances
  - Member management and roles
  - Group-level balances and settle-up plan
  - User-level balance summary across all groups
- Settlements
  - Request, reminder, confirm payment records
  - Recorded debt reduction (no in-app wallet requirement)
- Receipts and OCR
  - Async OCR upload and polling
  - Parsed/normalized receipt data for prefill
  - Review flags and duplicate detection metadata
- Notifications
  - In-app notifications with unread count and read state
  - Event-driven notifications for expense/settlement/receipt flows
- Analytics
  - KPI, spend over time, category breakdown, partners, aging, ledger export
- Calendar and reminders
  - Reminder-oriented calendar workflow
  - Scheduled reminder notifications
- Chat
  - Group and direct conversations
  - Presence and typing indicators via Socket.IO
- Platform features
  - Redis caching layer
  - Structured logging and request context
  - Audit/ledger/reconciliation infrastructure

## 3. Architecture Overview

### Backend

- Runtime: Node.js + Express
- Database: MongoDB + Mongoose
- Realtime: Socket.IO
- Queue: Bull + Redis
- OCR services: queue workers and parsing services
- Security:
  - JWT cookies (`accessToken`, `refreshToken`)
  - CSRF protection with `XSRF-TOKEN` cookie + `X-CSRF-Token` header
  - Rate limiting (`auth`, `write`, `upload`, `message`)
  - Helmet + CORS controls

Main entrypoint: `backend/app.js`

### Frontend

- Next.js (App Router) + React + TypeScript
- React Query for server state
- Central API client in `frontend/src/lib/api.ts`
- Contexts for auth/currency/notifications/socket
- UI primitives under `frontend/src/components/ui`

## 4. Quick Start (Local)

## Prerequisites

- Node.js 18+
- MongoDB 6+
- Redis 6+ (recommended for queue + caching)

## Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

## Environment setup

Use `backend/.env.example` as baseline.

Minimum backend variables:

```bash
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/splitwise
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
REDIS_URL=redis://localhost:6379
```

Frontend:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Run

```bash
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd frontend
npm run dev
```

URLs:

- Frontend: `http://localhost:3000`
- API: `http://localhost:5000/api`
- Health check: `http://localhost:5000/api/health`

## 5. API Surface (High Level)

All routes are mounted under `/api`.

- Auth: `/auth/*`
- Users: `/users/*`
- Friends: `/friends/*`
- Groups: `/groups/*`
- Expenses: `/expenses/*`
- Settlements: `/settlements/*`
- Receipts: `/receipts/*`
- Notifications: `/notifications/*`
- Conversations: `/conversations/*`
- Calendar: `/calendar/*`
- Reminders: `/reminders/*`
- Analytics: `/analytics/*`
- Admin: `/admin/*`

For detailed route reference, see `docs/API.md`.

## 6. Notable Operational Jobs and Workers

- Reminder job: `backend/jobs/reminderNotifications.js`
- Reconciliation job: `backend/jobs/reconciliationJob.js`
- Expense queue worker: `backend/queues/expenseQueue.js`
- Receipt queue worker: `backend/queues/receiptQueue.js`

## 7. Important Product Rules

- Money math is handled in cents in persistence (`amountCents`), with display conversion in UI/API responses.
- Group debt is computed from expenses and settlements.
- Settlement records update balances; no in-app wallet load is required for debt tracking.

## 8. Development Scripts

### Backend (`backend/package.json`)

- `npm run dev` - run API server
- `npm run start` - run API server
- `npm run test` - run backend tests
- `npm run test:watch` - watch mode tests
- `npm run seed:notifications` - seed notification data

### Frontend (`frontend/package.json`)

- `npm run dev` - run Next.js dev server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - lint
- `npm run typecheck` - TypeScript check

### Utility scripts (`scripts/`)

See `scripts/README.md` for script usage and safety notes.

## 9. Documentation Map

- `docs/API.md` - endpoint and auth/CSRF reference
- `docs/analytics-system.md` - analytics architecture and endpoints
- `docs/currency-feature.md` - currency handling and formatting behavior
- `docs/DEPLOYMENT.md` - production deployment runbook

## 10. Troubleshooting

Common checks:

- API unreachable
  - verify backend is running on expected port
  - verify `NEXT_PUBLIC_API_URL`
- Auth issues
  - confirm cookies are set
  - ensure CSRF header is sent for mutating calls
- OCR delays/failures
  - verify Redis and queue worker availability
  - inspect backend logs for OCR and receipt worker errors
- Realtime issues
  - verify `CLIENT_URL` CORS setting
  - inspect browser console for socket auth errors

## 11. Repository Audit Notes

Recent cleanup included:

- Removed stray accidental root files with invalid names.
- Removed stale `scripts/package-lock.json` that was not part of runtime or tooling.
- Updated docs to reflect current app behavior and route surface.

## 12. Contributing

- Keep backend route changes synchronized with `frontend/src/lib/api.ts`.
- Prefer cents-safe money operations and avoid floating-point persistence.
- Run at least:
  - backend syntax check for changed JS files
  - `frontend` typecheck before merging

