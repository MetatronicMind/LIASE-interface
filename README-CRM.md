# Milestone 9 & 10 Implementation Guide

This document outlines the changes made for Milestone 9 (Optimization) and Milestone 10 (CRM Separation) and how to run the new system.

## 1. System Architecture Changes

The monolithic frontend has been split into two separate applications:

1.  **Client Interface (`frontend/`)**:
    - **Target Audience**: Standard Users, Auditors, Medical Examiners.
    - **Purpose**: Daily operations (Review, Triage, QC).
    - **Changes**: Removed "heavy" administrative settings (Organization Management, Role Management, etc.) to improve load times and simplify the UX.
    - **New Feature**: `DrugConfigTab` for managing drug search parameters.

2.  **CRM / Super Admin Portal (`crm-frontend/`)**:
    - **Target Audience**: Super Admins, System Administrators.
    - **Purpose**: Organization management, Onboarding, Global Configuration, System Health.
    - **Location**: `/crm-frontend` directory.
    - **New Features**:
      - Dedicated Login Portal (Redbranded).
      - Organization Onboarding Wizard (Auto-generate Tenant IDs/Admins).
      - Full Suite of Admin Tools (moved from the client interface).

3.  **Backend Optimization (`backend/`)**:
    - **Redis Caching**: Implemented for high-traffic endpoints (`/studies`, `/studies/stats/summary`).
    - **New Routes**: `/api/organizations` endpoint for CRM onboarding.

## 2. Setup & Installation

### Backend (Redis Required)

The backend now requires a Redis instance for caching.

1.  **Install Redis**: Ensure Redis is installed and running locally (default port 6379) or update `.env` with `REDIS_URL`.
2.  **Install Dependencies**:
    ```bash
    cd backend
    npm install
    ```
3.  **Run Server**:
    ```bash
    npm run dev
    ```

### CRM Frontend (New App)

1.  **Install Dependencies**:
    ```bash
    cd crm-frontend
    npm install
    ```
2.  **Run CRM**:
    ```bash
    npm run dev
    ```
    _Note: The CRM will likely run on port 3001 if 3000 is taken by the client frontend._

### Client Frontend (Updated)

1.  **Install Dependencies** (if new):
    ```bash
    cd frontend
    npm install
    ```
2.  **Run Client**:
    ```bash
    npm run dev
    ```

## 3. New Features Guide

### CRM: Onboarding a New Organization

1.  Log in to the **CRM** as a Super Admin.
2.  Navigate to **Settings > Organizations** (or the new dedicated Organizations tab).
3.  Click **"Onboard New Organization"**.
4.  Fill in the details:
    - **Organization Name**: E.g., "PharmaCorp".
    - **Admin Email**: The initial super user for that tenant.
    - **Tenant ID**: Auto-generated (e.g., `pharmacorp-8293`).
5.  Click **"Create Organization"**.
    - The backend creates the Tenant record in Cosmos DB.
    - An initial Admin user is created.
    - Credentials (if auto-generated) are displayed.

### Client: Simplified Settings

1.  Log in to the **Client Interface**.
2.  Navigate to **Settings**.
3.  Notice the reduced tab set:
    - **Workflow**: For configuring status movements.
    - **Triage**: For configuring search keywords.
    - **Drug Configuration**: New tab for setting search frequency and drug lists.
    - _Admin/Roles/Org tabs are gone._

## 4. Troubleshooting

- **Redis Errors**: If you see `Redis connection error`, ensure your Redis server is running. The app will gracefully degrade (caching disabled) if Redis is unreachable, but logs will show errors.
- **Port Conflicts**: If running both frontends locally, check the console output for the port number (usually 3000 and 3001).
