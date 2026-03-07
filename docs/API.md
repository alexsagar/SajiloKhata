# SajiloKhata API Reference

This document describes the currently implemented API surface in the codebase.

Base URL:

```text
http://localhost:5000/api
```

## 1. Authentication and Security

Auth model:

- Cookie-based JWT auth (`accessToken`, `refreshToken`)
- `accessToken` is short-lived, refreshed through `/auth/refresh`
- Most mutating routes enforce CSRF via `XSRF-TOKEN` cookie + `X-CSRF-Token` header

Notes:

- `/api/auth/*` endpoints are public (except `/auth/me` and `/auth/logout` which require auth).
- Most non-auth routes are mounted behind `authenticateToken`.

## 2. Route Groups

## Auth (`/auth`)

- `POST /register`
- `POST /register/verify-otp`
- `POST /register/resend-otp`
- `POST /login`
- `GET /me`
- `POST /refresh`
- `POST /verify-email`
- `POST /forgot-password`
- `POST /reset-password`
- `POST /logout`
- `POST /oauth`

## Users (`/users`)

- `GET /profile`
- `PUT /profile`
- `POST /email-change/request`
- `POST /email-change/resend`
- `POST /email-change/verify`
- `POST /avatar`
- `PUT /preferences`
- `PUT /password`
- `GET /groups`
- `GET /expenses/recent`
- `GET /search/global`
- `GET /balance-summary`
- `GET /search`
- `GET /balance`
- `DELETE /account`
- `GET /admin/all` (admin only)

## Friends (`/friends`)

- `GET /`
- `GET /my-invites`
- `POST /invites`
- `GET /invites/:code`
- `POST /invites/:code/accept`
- `POST /invites/:code/decline`
- `POST /invites/:code/revoke`
- `DELETE /:friendId`

## Groups (`/groups`)

- `GET /`
- `GET /my-balance`
- `GET /:id`
- `GET /:id/activity`
- `GET /:id/friends-eligible`
- `POST /`
- `PUT /:id`
- `POST /join`
- `POST /:id/members`
- `PUT /:id/members/:userId`
- `DELETE /:id/members/:userId`
- `GET /:id/balances`
- `POST /:id/settle-up`
- `GET /:id/settlements`
- `DELETE /:id`

## Expenses (`/expenses`)

- `GET /`
- `GET /group/:groupId`
- `GET /:id`
- `POST /`
- `PUT /:id`
- `DELETE /:id`
- `PATCH /:id/settle`
- `GET /:id/comments`
- `POST /:id/comments`
- `PATCH /:id/comments/:commentId`
- `DELETE /:id/comments/:commentId`

## Settlements (`/settlements`)

- `PATCH /:id/payment-link`
- `POST /:id/remind`
- `POST /:id/remind-later`
- `PATCH /:id/confirm`

## Receipts (`/receipts`)

- `POST /upload`
- `GET /`
- `GET /stats/summary`
- `GET /:id`
- `PUT /:id`
- `POST /:id/review`
- `PUT /:id/link-expense`
- `POST /:id/reprocess`
- `DELETE /:id`

## Notifications (`/notifications`)

- `GET /`
- `GET /unread-count`
- `PATCH /:id/read` (`PUT` alias exists)
- `PATCH /read-all` (`PUT` alias exists)
- `DELETE /:id`
- `DELETE /read`
- `GET /preferences`
- `PUT /preferences`
- `POST /` (admin)
- `POST /bulk` (admin)
- `GET /stats` (admin)

## Conversations (`/conversations`)

- `POST /dm`
- `POST /group`
- `GET /`
- `GET /:id/messages`
- `POST /messages`
- `POST /:id/read`

## Calendar (`/calendar`)

- `GET /month`
- `GET /events`
- `POST /connect/:provider`
- `GET /settings`
- `PUT /settings`
- `POST /sync/:provider`

## Reminders (`/reminders`)

- `POST /`
- `GET /month`
- `GET /`
- `PATCH /:id`

## Analytics (`/analytics`)

- `GET /kpis`
- `GET /spend-over-time`
- `GET /category-breakdown`
- `GET /top-partners`
- `GET /balance-matrix`
- `GET /simplify`
- `GET /aging`
- `GET /ledger`
- `GET /export/csv`
- `GET /group-health`

## Admin (`/admin`)

- `GET /dashboard`
- `GET /users`
- `PUT /users/:id/status`
- `GET /health`
- `POST /reconciliation/run`
- `GET /reconciliation/latest`

## 3. Core Response Patterns

Responses are mixed across legacy and newer handlers. Common patterns:

- `ok(...)` wrapper:
  - `{ success: true, data: ... }`
- direct JSON payload:
  - `{ message: "...", ... }`
- paginated list payloads:
  - include `pagination` with page/limit/total

Frontend API adapter (`frontend/src/lib/api.ts`) normalizes many of these variants.

## 4. Realtime Events

Socket.IO rooms:

- `user_<userId>`
- `group_<groupId>`
- `conv_<conversationId>`

Common event families:

- Expense lifecycle events
- Group membership updates
- Notification push events
- Conversation typing/read/presence events

## 5. Compatibility Notes

- For writes, include CSRF header from `XSRF-TOKEN` cookie.
- Some routes expose both `PATCH` and `PUT` for backward compatibility.
- Money values are persisted in cents (`amountCents`) and converted for display by clients.

