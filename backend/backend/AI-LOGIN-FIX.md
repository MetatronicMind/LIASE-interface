# Login Fix for Sandbox/Cross-Environment Access

## Problem

The Admin user exists in the primary database (e.g., `LIASE-Database`) but not in the Sandbox database (e.g., `LIASE-Database-Sandbox`).
This prevented the Admin from logging into the CRM when it was connected to the Sandbox environment, making it impossible to onboard users or manage the Sandbox.

## Solution

Modified `backend/src/services/cosmosService.js` to implement a database fallback mechanism for user authentication.

1.  **Dual Database Connection**: The service now initializes a connection to the "Master" database (defaulting to `LIASE-Database`) if the current environment database is different.
2.  **Authentication Fallback**: `getUserByEmail` and `getUserByUsernameGlobal` now check the Master database if the user is not found in the current environment's database.

## Workflow

1.  Admin logs in to Sandbox environment.
2.  System checks Sandbox DB for user -> Not found.
3.  System checks Master DB for user -> Found!
4.  Admin is logged in (using Master credentials/permissions).
5.  Admin creates a new user via CRM.
6.  System saves new user to Sandbox DB (current context).
7.  New user can now log in to Sandbox directly.

## Configuration

- `COSMOS_DB_DATABASE_ID`: The current environment database (e.g. `LIASE-Database-Sandbox`).
- `COSMOS_DB_MASTER_DATABASE_ID`: (Optional) The master database to check for users. Defaults to `LIASE-Database`.
