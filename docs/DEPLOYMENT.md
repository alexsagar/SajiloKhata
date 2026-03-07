# SajiloKhata Deployment Runbook

## Prerequisites

- Node.js 18+ 
- MongoDB 6+
- Redis 6+ (recommended for queues + API cache)
- SMTP server for email (or Mailgun/SendGrid)

---

## Environment Variables

### Backend (`backend/.env`)

```bash
# Server
PORT=5000
NODE_ENV=production

# MongoDB
MONGODB_URI=mongodb://localhost:27017/sajilokhata

# Redis (queues + API response cache)
REDIS_URL=redis://127.0.0.1:6379
REDIS_CACHE_ENABLED=true
REDIS_CACHE_DEFAULT_TTL=120
REDIS_CACHE_PREFIX=splitwise:cache

# JWT
JWT_SECRET=<generate-secure-random-string>
JWT_REFRESH_SECRET=<generate-secure-random-string>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Cookies
COOKIE_SECURE=true
COOKIE_SAMESITE=None

# Client
CLIENT_URL=https://your-domain.com

# Email
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
EMAIL_FROM=noreply@sajilokhata.com
```

### Frontend (`frontend/.env.local`)

```bash
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api
NEXT_PUBLIC_SOCKET_URL=https://api.your-domain.com

# NextAuth (optional for OAuth)
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<generate-secure-random-string>
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
```

---

## Installation

### Backend

```bash
cd backend
npm ci --production
```

### Frontend

```bash
cd frontend
npm ci
npm run build
```

---

## Running

### Backend (Production)

```bash
cd backend
NODE_ENV=production node app.js
```

Or with PM2:
```bash
pm2 start app.js --name sajilokhata-api
```

### Frontend (Production)

```bash
cd frontend
npm start
```

Or with PM2:
```bash
pm2 start npm --name sajilokhata-web -- start
```

---

## Health Checks

Backend health endpoint:
```
GET /api/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2026-02-05T12:30:00.000Z"
}
```

---

## Database

### Indexes
The MongoDB collections have built-in indexes. Verify with:
```bash
mongosh sajilokhata --eval "db.users.getIndexes()"
```

### Backup
```bash
mongodump --db sajilokhata --out /backup/$(date +%Y%m%d)
```

### Restore
```bash
mongorestore --db sajilokhata /backup/20260205/sajilokhata
```

---

## Troubleshooting

### Auth Issues
1. Check `accessToken` cookie is being set (not `token`)
2. Verify `COOKIE_SECURE` matches your HTTPS status
3. Verify `CLIENT_URL` matches frontend origin

### Socket Connection Issues
1. Check `NEXT_PUBLIC_SOCKET_URL` is correct
2. Verify CORS settings in backend `app.js`
3. Check browser console for connection errors

### OCR Issues
1. Verify `eng.traineddata` file exists in backend root
2. Check Tesseract dependencies are installed
3. Review `NODE_ENV=development` logs for errors

---

## Rollback

### Quick Rollback Steps

1. Stop current processes:
   ```bash
   pm2 stop all
   ```

2. Restore previous code:
   ```bash
   git checkout <previous-version-tag>
   ```

3. Reinstall dependencies:
   ```bash
   cd backend && npm ci
   cd ../frontend && npm ci && npm run build
   ```

4. Restart:
   ```bash
   pm2 restart all
   ```

---

## Monitoring

Recommended monitoring:
- **Logs**: PM2 logs or centralized logging (ELK, Datadog)
- **Metrics**: Node.js process metrics
- **Uptime**: Health check monitoring
- **Errors**: Sentry or similar error tracking
