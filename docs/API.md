# SajiloKhata API Reference

## Base URL
```
http://localhost:5000/api
```

## Authentication

All endpoints except `/auth/*` require authentication via HTTP-only cookies:
- `accessToken`: JWT access token (15 min expiry)
- `refreshToken`: JWT refresh token (7 day expiry)

### CSRF Protection
All mutating requests require the `X-CSRF-Token` header, obtained from the `XSRF-TOKEN` cookie.

---

## Auth Routes

### POST /auth/register
Register a new user. Sends OTP to email.

**Request:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string (min 6 chars)",
  "firstName": "string",
  "lastName": "string"
}
```

**Response:** `200 OK`
```json
{
  "message": "OTP sent to your email. Please verify to complete registration.",
  "email": "user@example.com"
}
```

---

### POST /auth/register/verify-otp
Verify OTP to complete registration.

**Request:**
```json
{
  "email": "string",
  "otp": "string (6 digits)"
}
```

**Response:** `201 Created`
```json
{
  "message": "Registration complete. You can now log in.",
  "user": { /* User object */ }
}
```

---

### POST /auth/login
Login with email and password.

**Request:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:** `200 OK` (Sets `accessToken` and `refreshToken` cookies)
```json
{
  "success": true,
  "data": {
    "user": { /* User object */ }
  }
}
```

---

### POST /auth/refresh
Refresh access token using refresh token cookie.

**Response:** `200 OK` (Sets new cookies)
```json
{
  "success": true
}
```

---

### POST /auth/logout
Logout user (clears cookies).

**Response:** `200 OK`
```json
{
  "success": true
}
```

---

### GET /auth/me
Get current authenticated user.

**Response:** `200 OK`
```json
{
  "user": { /* User object */ }
}
```

---

### POST /auth/oauth
OAuth login/register (Google, Facebook).

**Request:**
```json
{
  "provider": "google" | "facebook",
  "providerId": "string",
  "email": "string",
  "name": "string (optional)",
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "avatar": "string (optional)"
}
```

---

## Friends Routes

### GET /friends
List current user's friends.

**Response:** `200 OK`
```json
{
  "data": [
    {
      "_id": "string",
      "firstName": "string",
      "lastName": "string",
      "username": "string",
      "email": "string",
      "avatar": "string",
      "joinedAt": "ISO date"
    }
  ]
}
```

---

### POST /friends/invites
Create a friend invite.

**Request:**
```json
{
  "inviteeEmail": "string (optional)",
  "message": "string (optional, max 500 chars)"
}
```

**Response:** `200 OK`
```json
{
  "code": "string",
  "inviteUrl": "string",
  "expiresAt": "ISO date"
}
```

---

### POST /friends/invites/:code/accept
Accept a friend invite.

**Response:** `200 OK`
```json
{
  "success": true
}
```

---

### POST /friends/invites/:code/decline
Decline a friend invite.

**Response:** `200 OK`
```json
{
  "success": true
}
```

---

### POST /friends/invites/:code/revoke
Revoke a friend invite (inviter only).

**Response:** `200 OK`
```json
{
  "success": true
}
```

---

## Groups Routes

### GET /groups
List user's groups.

**Response:** `200 OK`
```json
{
  "data": [
    {
      "_id": "string",
      "name": "string",
      "description": "string",
      "members": [{ "user": {...}, "role": "admin" | "member", "joinedAt": "ISO date" }],
      "createdBy": {...},
      "category": "travel" | "food" | "home" | "entertainment" | "utilities" | "other"
    }
  ]
}
```

---

### POST /groups
Create a new group.

**Request:**
```json
{
  "name": "string (max 100 chars)",
  "description": "string (optional, max 500 chars)",
  "category": "travel" | "food" | "home" | "entertainment" | "utilities" | "other"
}
```

---

### GET /groups/:id
Get group details.

---

### PUT /groups/:id
Update group (admin only).

---

### DELETE /groups/:id
Delete group (creator only).

---

### POST /groups/:id/members
Add members to group (admin only).

**Request:**
```json
{
  "userIds": ["string"]
}
```

---

### PUT /groups/:id/members/:userId
Update member role (admin only).

**Request:**
```json
{
  "role": "admin" | "member"
}
```

---

### DELETE /groups/:id/members/:userId
Remove member from group.

---

### GET /groups/:id/balances
Get group balance summary.

---

### POST /groups/:id/settle-up
Generate settlement plan.

---

### GET /groups/:id/settlements
Get group settlements.

---

## Expenses Routes

### GET /expenses
List expenses (with optional filters).

**Query Parameters:**
- `groupId`: Filter by group
- `category`: Filter by category
- `startDate`: Filter by start date
- `endDate`: Filter by end date
- `page`: Page number
- `limit`: Items per page

---

### POST /expenses
Create an expense.

**Request (multipart/form-data for receipt upload):**
```json
{
  "groupId": "string (optional - null for personal)",
  "description": "string",
  "amount": "number",
  "category": "string",
  "date": "ISO date",
  "splits": [{ "user": "userId", "amount": "number" }],
  "splitType": "equal" | "percentage" | "exact",
  "currencyCode": "USD" | "EUR" | "NPR" | "INR" | ...
}
```

---

### GET /expenses/:id
Get expense details.

---

### PUT /expenses/:id
Update expense.

---

### DELETE /expenses/:id
Delete expense (soft delete).

---

### PATCH /expenses/:id/settle
Mark split as settled.

**Request:**
```json
{
  "userId": "string"
}
```

---

## Receipts Routes

### POST /receipts/upload
Upload and OCR a receipt.

**Request:** `multipart/form-data`
- `receipt`: File (JPEG, PNG, WebP, PDF)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "string",
    "merchant": "string",
    "total": "number",
    "date": "ISO date",
    "items": [...],
    "confidence": "number"
  }
}
```

---

## Socket Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `join_groups` | `string[]` | Join group rooms |
| `join_conversations` | `string[]` | Join conversation rooms |
| `presence:request` | - | Request online users list |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `presence:state` | `{ onlineUserIds: string[] }` | Initial online users |
| `presence:online` | `{ userId: string }` | User came online |
| `presence:offline` | `{ userId: string }` | User went offline |
| `message:new` | `{ conversationId, message }` | New chat message |
| `expense_added` | Expense object | New expense in group |
| `expense_updated` | Expense object | Expense updated |
| `expense_deleted` | `{ expenseId, groupId }` | Expense deleted |
| `group_created` | Group object | New group created |
| `group_updated` | Group object | Group updated |
| `member_joined` | `{ group, newMember }` | Member joined group |
| `member_removed` | `{ groupId, removedUserId }` | Member removed |
| `member_role_updated` | `{ groupId, userId, role }` | Member role changed |

---

## Error Responses

All errors follow this format:
```json
{
  "message": "Error description",
  "errors": [] // Optional validation errors
}
```

### Status Codes
| Code | Description |
|------|-------------|
| 400 | Bad Request - validation error |
| 401 | Unauthorized - not authenticated |
| 403 | Forbidden - not authorized |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Server Error |
