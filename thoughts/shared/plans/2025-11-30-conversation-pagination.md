# Plan: Implement Pagination for Conversation Messages

## Overview

Implement cursor-based pagination for the `GetSessionConversation` API endpoint. This will allow the frontend to fetch the most recent N messages initially and then load older messages as the user scrolls up, significantly improving performance and reducing bandwidth for long sessions.

## Current State

-   **Frontend:** Fetches the full conversation (array of `ConversationEvent`). Virtualization is used to render efficiently, but the full dataset is still transferred and stored in memory.
-   **Backend:** `GetSessionConversation` fetches all events for a session (and its parents) in one go.
-   **Database:** SQLite `conversation_events` table has `id` (int, auto-increment) and `created_at`, suitable for ordering.

## Desired End State

-   **API:** `GET /sessions/{sessionId}/conversation` accepts `limit` (int) and `before_id` (int, cursor).
-   **Backend:** Efficiently queries the database to return only the requested slice of messages, respecting the parent-child session traversal (or handling it appropriately).
-   **Frontend:** `useConversation` hook handles "load more" logic.

## Challenges

-   **Parent Session Traversal:** The current `GetSessionConversation` implementation recursively fetches parent sessions. Pagination across multiple sessions is complex.
    -   *Strategy:* For V1, we will simplify: Pagination will likely apply to the *aggregated* view. However, doing this efficiently in SQL across multiple tables/files (if they were separate) is hard. Since it's one `conversation_events` table with `session_id`, we can query with `WHERE session_id IN (list_of_recursive_parent_ids)`?
    -   *Alternative:* If the store creates the unified list in memory, we can just slice it there. This doesn't save DB work but saves bandwidth.
    -   *Better Strategy:* The `SQLiteStore` likely queries by `session_id`. If `GetSessionConversation` does multiple queries and merges them, true SQL pagination is hard.
    -   *Decision:* Let's check `hld/store/sqlite.go` implementation first.

## Implementation Phases

## Phase 1: Analyze & Design (Backend)

### Overview
Verify how `GetSessionConversation` handles parent sessions and design the pagination strategy.

### Tasks
1.  Read `hld/store/sqlite.go` deeply.
2.  If it merges arrays in memory: We can implement "Pagination in Memory" (fetch all, slice, return) as a first step to save bandwidth.
3.  If it can be done in SQL: We implement `WHERE session_id IN (...) AND id < cursor ORDER BY id DESC LIMIT N`.

## Phase 2: Update Backend API

### Overview
Update the OpenAPI spec and regenerate the server code.

### Changes Required:

#### 1. Update OpenAPI Spec
**File:** `hld/api/openapi.yaml`
**Changes:**
-   Add query parameters to `/sessions/{sessionId}/conversation`:
    -   `limit` (integer, default 100)
    -   `before_id` (integer, optional) - acts as a cursor for "older than this event".

#### 2. Regenerate Code
**Command:** `make -C hld generate`

#### 3. Update Store Interface
**File:** `hld/store/store.go`
**Changes:**
-   Update `GetSessionConversation` to accept `PaginationOptions` struct.

#### 4. Update Store Implementation
**File:** `hld/store/sqlite.go`
**Changes:**
-   Implement the pagination logic.

#### 5. Update API Handler
**File:** `hld/api/handlers/sessions.go`
**Changes:**
-   Parse query params.
-   Pass them to the store.

### Success Criteria
-   `curl` with `?limit=5` returns only 5 items.

## Phase 3: Update Frontend Client & Hook

### Overview
Update the `daemonClient` and `useConversation` to support pagination.

### Changes Required:

#### 1. Update `daemonClient`
**File:** `humanlayer-wui/src/lib/daemon/http-client.ts`
**Changes:**
-   Update `getConversation` to accept pagination params.

#### 2. Update `useConversation`
**File:** `humanlayer-wui/src/hooks/useConversation.ts`
**Changes:**
-   Implement `loadMore` function.
-   Manage `hasMore` state.
-   On initial load, fetch `limit=30` (or 50).
-   Expose `loadMore` to the component.

#### 3. Update `ConversationStream`
**File:** `humanlayer-wui/src/components/internal/ConversationStream/ConversationStream.tsx`
**Changes:**
-   Detect scroll-to-top (or near top) using `useVirtualizer` or `onScroll`.
-   Trigger `loadMore`.
-   Maintain scroll position when new items are prepended (this is tricky with virtualization).

### Success Criteria
-   Opening session loads only recent messages.
-   Scrolling up loads older messages.

## Phase 4: Final Polish

-   Ensure "streaming updates" (SSE) still work. (They should append to the end, which is fine).
