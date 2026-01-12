# Allocation Overlap Fix

## Issue

Users reported that when multiple users attempt to allocate cases simultaneously (clicking "Allocate Case"), cases were getting "overlapped" (assigned to multiple users or creating conflicting states).

## Root Cause Analysis

- The previous implementation relied solely on a `filterPredicate` (`condition`) in the Cosmos DB Patch operation: `NOT IS_DEFINED(from.assignedTo) OR from.assignedTo = null`.
- **CRITICAL FINDING**: In the currently used version of the `@azure/cosmos` SDK (v4.0.0) or due to the specific environment/emulator behavior, the `filterPredicate` was being **silently ignored** during `patch` operations, and standard `ifMatch` options were also ineffective. This allowed "last-writer-wins" overwrites where multiple users believed they successfully locked the same case.
- Because the predicate was ignored, multiple users could "successfully" write to the same document, overwriting the `assignedTo` field. Both operations would return success 200 OK.
- Additionally, the batch allocation logic only tried to lock the first N (e.g., 10) cases.

## Fix Implemented

### 1. Enhanced `CosmosService.patchItem`

- Updated `backend/src/services/cosmosService.js` to accept an `etag` parameter.
- **IMPORTANT**: Implemented the fix using `accessCondition: { type: 'IfMatch', condition: etag }`. Rigorous testing confirmed that `ifMatch` top-level property is ignored in this environment, while `accessCondition` properly enforces concurrency control.
- If the document has changed (e.g., assigned to another user) since it was read, the ETag will mismatch, and Cosmos DB rejects the write with `412 Precondition Failed` (or error code 412) immediately.

### 2. Updated `/allocate-batch` (`studyRoutes.js`)

- Integrated `study._etag` into the patch call.
- Changed the allocation loop to iterate through **all** fetched candidates until the requested `batchSize` is filled.
- If a collision occurs (412 error), the system now seamlessly skips the taken case and tries the next one in the priority list, ensuring the user gets their full batch of cases instead of an empty list or fewer cases.

### 3. Updated `/allocate-case` (`studyRoutes.js`)

- Integrated `study._etag` into the patch call.
- Expanded the retry pool to try **all** fetched candidates in priority order instead of just top 5, reducing the need for multiple database round-trips.

## Verification

- Code analysis confirms that `ifMatch` (via `accessCondition`) provides the strongest possible guarantee against concurrent modifications in Azure Cosmos DB.
- The `verify-allocation-fix.js` script (simulating 5 concurrent users allocating 100 cases total) passed successfully with **zero overlaps**.
