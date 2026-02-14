# Case Allocation API

This document describes the new API endpoints for case allocation.

## 1. Allocate Case

Assigns a pending case to the current user. If the user already has an assigned case, it returns that case.

**Endpoint:** `POST /api/studies/allocate-case`
**Auth Required:** Yes

**Response (Success - New Case Allocated):**

```json
{
  "success": true,
  "message": "Case allocated successfully",
  "case": {
    "id": "...",
    "title": "...",
    "assignedTo": "userId",
    "lockedAt": "2023-10-27T10:00:00.000Z",
    ...
  }
}
```

**Response (Success - Already Assigned):**

```json
{
  "success": true,
  "message": "You are already working on a case",
  "case": {
    "id": "...",
    ...
  }
}
```

**Response (Error - No Cases Available):**

```json
{
  "success": false,
  "message": "No available cases at the moment."
}
```

## 2. Release Case

Releases a case currently assigned to the user.

**Endpoint:** `POST /api/studies/release-case/:id`
**Auth Required:** Yes

**Response (Success):**

```json
{
  "success": true,
  "message": "Case released successfully"
}
```

**Response (Error - Not Assigned to User):**

```json
{
  "success": false,
  "message": "You are not assigned to this case"
}
```
