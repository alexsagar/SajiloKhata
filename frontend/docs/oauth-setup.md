# OAuth Setup Guide for Google & Facebook Authentication

This guide explains how to set up Google and Facebook OAuth for the SajiloKhata application.

## Prerequisites

- A Google Cloud Platform account
- A Meta (Facebook) Developer account
- Access to the `.env.local` file

---

## 1️⃣ Google OAuth Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `SajiloKhata` (or your preferred name)
4. Click "Create"

### Step 2: Enable Google+ API

1. In the sidebar, go to "APIs & Services" → "Library"
2. Search for "Google+ API" and enable it
3. Also enable "Google Identity" if available

### Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" user type → Click "Create"
3. Fill in the required fields:
   - **App name**: SajiloKhata
   - **User support email**: your-email@example.com
   - **Developer contact email**: your-email@example.com
4. Click "Save and Continue"
5. Add scopes:
   - `email`
   - `profile`
   - `openid`
6. Click "Save and Continue"
7. Add test users (your email) for development
8. Click "Save and Continue"

### Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Web application"
4. Enter name: `SajiloKhata Web Client`
5. Add **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   ```
6. Add **Authorized redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
7. Click "Create"
8. Copy the **Client ID** and **Client Secret**

### Step 5: Add to Environment Variables

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

---

## 2️⃣ Facebook OAuth Setup

### Step 1: Create a Facebook App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Select "Consumer" as the app type
4. Enter app name: `SajiloKhata`
5. Click "Create App"

### Step 2: Set Up Facebook Login

1. In your app dashboard, find "Facebook Login" and click "Set Up"
2. Select "Web" as the platform
3. Enter your site URL: `http://localhost:3000`
4. Click "Save" → "Continue"

### Step 3: Configure OAuth Settings

1. Go to "Facebook Login" → "Settings" in the sidebar
2. Add **Valid OAuth Redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback/facebook
   ```
3. Enable:
   - ✅ Client OAuth Login
   - ✅ Web OAuth Login
   - ✅ Enforce HTTPS (disable for localhost)
4. Click "Save Changes"

### Step 4: Get App Credentials

1. Go to "Settings" → "Basic" in the sidebar
2. Copy the **App ID** and **App Secret**
3. Note: You may need to click "Show" to reveal the App Secret

### Step 5: Add to Environment Variables

```env
FACEBOOK_CLIENT_ID=your-app-id
FACEBOOK_CLIENT_SECRET=your-app-secret
```

---

## 3️⃣ Generate NextAuth Secret

Generate a secure secret for NextAuth:

```bash
# Using OpenSSL (recommended)
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Add to `.env.local`:

```env
AUTH_SECRET=your-generated-secret-here
NEXTAUTH_URL=http://localhost:3000
```

---

## 4️⃣ Complete Environment Variables

Your `.env.local` should include:

```env
# NextAuth Configuration
AUTH_SECRET=your-generated-secret
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Facebook OAuth
FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret
```

---

## 5️⃣ Testing the Integration

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/login`

3. Click "Continue with Google" or "Continue with Facebook"

4. Complete the OAuth flow

5. You should be redirected to the homepage after successful login

---

## 6️⃣ Production Setup

For production deployment, update the following:

### Google Cloud Console
- Add your production domain to "Authorized JavaScript origins"
- Add production callback URL: `https://yourdomain.com/api/auth/callback/google`

### Facebook Developer Portal
- Add production callback URL: `https://yourdomain.com/api/auth/callback/facebook`
- Switch app from "Development" to "Live" mode
- Complete App Review if required

### Environment Variables
```env
NEXTAUTH_URL=https://yourdomain.com
```

---

## 7️⃣ Troubleshooting

### "redirect_uri_mismatch" Error
- Ensure the callback URL in your OAuth provider matches exactly:
  - Google: `http://localhost:3000/api/auth/callback/google`
  - Facebook: `http://localhost:3000/api/auth/callback/facebook`

### "Access Denied" Error
- Check that your app is in development mode
- Ensure your email is added as a test user

### Session Not Persisting
- Verify `AUTH_SECRET` is set correctly
- Check that cookies are enabled in your browser

### Facebook Login Not Working
- Ensure "Facebook Login" product is added to your app
- Check that the app is not in "Development" mode restrictions

---

## 8️⃣ File Structure

```
src/
├── app/
│   └── api/
│       └── auth/
│           └── [...nextauth]/
│               └── route.ts          # NextAuth API route
├── components/
│   ├── auth/
│   │   ├── social-login-buttons.tsx  # Google/Facebook buttons
│   │   └── user-auth-menu.tsx        # User dropdown menu
│   └── providers/
│       └── session-provider.tsx      # NextAuth SessionProvider
├── hooks/
│   └── use-oauth-session.ts          # Combined auth hook
├── lib/
│   └── next-auth.ts                  # NextAuth configuration
└── middleware.ts                     # Route protection
```

---

## 9️⃣ API Reference

### Using the Session

```tsx
"use client"

import { useSession, signIn, signOut } from "next-auth/react"

export function MyComponent() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (session) {
    return (
      <div>
        <p>Signed in as {session.user.email}</p>
        <button onClick={() => signOut()}>Sign out</button>
      </div>
    )
  }

  return (
    <div>
      <button onClick={() => signIn("google")}>Sign in with Google</button>
      <button onClick={() => signIn("facebook")}>Sign in with Facebook</button>
    </div>
  )
}
```

### Server-Side Session Check

```tsx
import { auth } from "@/lib/next-auth"

export default async function ProtectedPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  return <div>Welcome, {session.user.name}!</div>
}
```

---

## Need Help?

- [NextAuth.js Documentation](https://authjs.dev/)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login/)
