# Login Fix Instructions

## The Problem

You are attempting to log in to the **Sandbox** environment, but:

1.  The Admin user (`test_admin_10_01_2026`) exists in the **Production** database.
2.  The User is MISSING from the **Sandbox** database.
3.  Your Frontend (running on port 3001) is configured to hit the **Remote Sandbox Backend** (hosted on Azure), which doesn't have the user.
4.  My code fixes are on your **Local Machine**, not on Azure.

## The Fix

You have two options: a temporary local fix or a permanent data fix.

### Option 1: Run Backend Locally (Recommended for Development)

This allows my code fix (Database Fallback) to work immediately.

1.  Stop any running backend terminals.
2.  Open `c:\Users\nicus\Desktop\Final Tech Resources fore pivot\LIASE-interface\crm-frontend\.env.local`.
3.  Change:
    ```
    NEXT_PUBLIC_API_URL=http://localhost:8000/api
    ```
    (Ensure this line is NOT commented out).
4.  Restart your Frontend:
    ```bash
    cd crm-frontend
    npm run dev
    ```
5.  Start your Backend:
    ```bash
    cd backend
    npm run dev
    ```
6.  **Login again.** It should now work because the local backend has the fix.

### Option 2: Fix the Sandbox Data (Permanent Fix)

If you want to keep using the remote Azure backend, you must copy the Admin user to it.

1.  Open a PowerShell terminal.
2.  Run the replication script I created. You MUST provide the keys for the **Sandbox** environment (get them from your Azure Portal or `.env.production` if you have it).

    ```powershell
    $env:COSMOS_DB_ENDPOINT="https://liase-sandbox-account.documents.azure.com:443/"
    $env:COSMOS_DB_KEY="YOUR_SANDBOX_PRIMARY_KEY"
    $env:COSMOS_DB_DATABASE_ID="LIASE-Database-Sandbox"

    node backend/scripts/replicate-superadmin-to-env.js
    ```

3.  Once the script says "SUCCESS", you can log in using the remote backend without checking any code.

## Automatic Bootstrap

I have also added code to `backend/src/app.js` that will **automatically create** the Super Admin user if it's missing on startup.

- If you run the **Local Backend** connected to the Sandbox DB, it will fix itself automatically.
- If you **Deploy** this code to Azure, it will fix itself automatically upon deployment.
