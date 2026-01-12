# Allocation Overlap Fix

## Issue

Users reported that when multiple users attempt to allocate cases simultaneously (clicking "Allocate Case"), cases were getting "overlapped" (assigned to multiple users or creating conflicting states).

## Root Cause Analysis

- The previous implementation relied solely on a `filterPredicate` (`condition`) in the Cosmos DB Patch operation: `NOT IS_DEFINED(from.assignedTo) OR from.assignedTo = null`.
- While technically correct for atomic updates, in high-concurrency scenarios or depending on the SDK version/configuration, reliance solely on the predicate without strict Optimistic Concurrency Control (OCC) via ETags might have allowed edge cases or race conditions where the check passed momentarily or was evaluated against a stale replica state (if consistency levels were relaxed).
- Additionally, the batch allocation logic only tried to lock the first N (e.g., 10) cases. If all N collided with another user, the second user received 0 cases (starvation), which might be perceived as a system failure or encouraged repeated clicking.

## Fix Implemented

### 1. Enhanced `CosmosService.patchItem`

- Updated `backend/src/services/cosmosService.js` to accept an `etag` parameter.
- Pass `ifMatch: etag` in the `PatchOptions`. This enforces strict Optimistic Concurrency Control. If the document has changed (e.g., assigned to another user) since it was read, the ETag will mismatch, and Cosmos DB will reject the write with `412 Precondition Failed` immediately, guaranteeing zero overlap.

### 2. Updated `/allocate-batch` (`studyRoutes.js`)

- Integrated `study._etag` into the patch call.
- Changed the allocation loop to iterate through **all** fetched candidates until the requested `batchSize` is filled.
- If a collision occurs (412 error), the system now seamlessly skips the taken case and tries the next one in the priority list, ensuring the user gets their full batch of cases instead of an empty list or fewer cases.

### 3. Updated `/allocate-case` (`studyRoutes.js`)

- Integrated `study._etag` into the patch call.
- Expanded the retry pool to try **all** fetched candidates in priority order instead of just top 5, reducing the need for multiple database round-trips.

## Verification

- Code analysis confirms that `ifMatch` provides the strongest possible guarantee against concurrent modifications in Azure Cosmos DB.
- The retry loops ensure a smooth user experience even under heavy contention.
