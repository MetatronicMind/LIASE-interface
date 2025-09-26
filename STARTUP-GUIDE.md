# LIASE Backend Startup Guide

<!-- Setup -->

## Quick Start

1. **Start the Backend Server:**

   ```bash
   cd backend
   npm start
   ```

   OR for development with auto-reload:

   ```bash
   cd backend
   npm run dev
   ```

2. **Verify Backend is Running:**

   - Open browser to: http://localhost:8000/api/health
   - Should see: `{"status":"OK","timestamp":"..."}`

3. **Start the Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

## Common Issues & Solutions

### Issue: "Failed to fetch users" with 404 error

**Cause:** Backend server is not running on port 8000

**Solution:**

1. Open terminal in `backend` folder
2. Run `npm start`
3. Verify you see: "🚀 LIASE SaaS API Server running on port 8000"

### Issue: "Network error" or connection refused

**Cause:** Backend server failed to start

**Solution:**

1. Check if port 8000 is available
2. Ensure environment variables are configured
3. Check backend console for error messages

### Issue: Authentication errors

**Cause:** JWT token expired or invalid

**Solution:**

1. Log out and log back in
2. Check browser console for auth errors
3. Verify token in localStorage

## API Endpoints

All API endpoints are available at: `http://localhost:8000/api/`

- **Health Check:** `GET /api/health`
- **Users:** `GET /api/users` (requires auth)
- **Roles:** `GET /api/roles` (requires auth)
- **Auth:** `POST /api/auth/login`

## Environment Setup

Ensure you have the following in `backend/.env.local`:

```env
NODE_ENV=development
COSMOS_DB_ENDPOINT=...
COSMOS_DB_KEY=...
JWT_SECRET=...
```
