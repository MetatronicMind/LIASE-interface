# Environment Provisioning Guide

This guide explains how to use the new "Environment Provisioning" feature in the CRM backend to onboard new database environments (e.g., Sandbox, Client Production) instantly.

## 1. Register a New Environment

First, add the environment's connection details to the CRM's `crm-environments` registry.

**Endpoint:** `POST /api/environments`
**Auth:** Requires Admin Token

**Body:**

```json
{
  "name": "Client X Sandbox",
  "endpoint": "https://client-x.documents.azure.com:443/",
  "key": "THE_PRIMARY_KEY",
  "databaseId": "LIASE-Client-X",
  "type": "sandbox"
}
```

**Response:**

```json
{
    "id": "env_...",
    "status": "registered"
    ...
}
```

## 2. Provision (Bootstrap) the Environment

This triggers the "Replication Logic" directly from the backend. It will:

1. Connect to the remote Database provided above.
2. Create the Database and Containers (if missing).
3. Seed the Organization (Enterprise Plan).
4. Seed the SuperAdmin Role (Full Permissions).
5. Seed the SuperAdmin User.

**Endpoint:** `POST /api/environments/{ENV_ID}/provision`
**Auth:** Requires Admin Token

**Body:**

```json
{
  "username": "client_admin",
  "email": "admin@clientx.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Environment Client X Sandbox fully provisioned."
}
```

## Use Case

You can build a UI in the CRM "Super Admin" settings to:

1. "Add Request for New Environment"
2. On click "Deploy", call these APIs.
3. The backend handles all the seeding complexity.
