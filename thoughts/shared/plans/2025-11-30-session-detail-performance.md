# Session Detail View Performance Optimization Plan

## Overview

The session detail view currently suffers from performance issues due to inefficient data fetching (polling) and rendering (no virtualization). This plan addresses these issues by switching to a streaming architecture using Server-Sent Events (SSE) and implementing list virtualization for the conversation view.

## Current State Analysis

-   **Data Fetching:** `useConversation` hook polls the entire conversation history every 1 second using `setInterval`. This is inefficient and causes unnecessary network load and re-renders.
-   **Rendering:** `ConversationStream` renders all messages in the conversation at once. For long sessions, this creates a large number of DOM nodes, leading to slow rendering and scrolling performance.
-   **Backend:** The backend already supports SSE via `subscribeToEvents` and emits `conversation_updated` events with delta payloads (new messages only).

## Desired End State

-   **Data Fetching:** The conversation is fetched once on load. Subsequent updates are received via real-time SSE subscriptions.
-   **Rendering:** The conversation list uses virtualization (windowing) to render only the visible messages, maintaining high performance regardless of session length.
-   **Performance:** Zero polling. Instant message updates. Constant memory usage for the DOM.

### Key Discoveries:
-   `daemonClient.subscribeToEvents` is already implemented but unused for conversation updates.
-   `conversation_updated` event sends a delta (single event), not the full history.
-   No virtualization library is currently installed in `humanlayer-wui`.

## What We're NOT Doing

-   We are not changing the backend API or event structure.
-   We are not modifying the `ConversationEventRow` component itself, only how it's rendered in the list.

## Implementation Approach

1.  **Stop Polling:** Replace `setInterval` in `useConversation` with `daemonClient.subscribeToEvents`.
2.  **Handle Deltas:** Update the `useConversation` state reducer/setter to append new events from the SSE stream to the existing list.
3.  **Virtualize:** Install `@tanstack/react-virtual` and wrap the message list in `ConversationStream`.

## Phase 1: Switch to Streaming Updates

### Overview
Replace the polling mechanism in `useConversation` with an initial fetch followed by an SSE subscription.

### Changes Required:

#### 1. Update `useConversation` Hook
**File**: `humanlayer-wui/src/hooks/useConversation.ts`
**Changes**:
-   Remove `setInterval` loop.
-   Add `daemonClient.subscribeToEvents` call in a `useEffect`.
-   Subscribe to `conversation_updated` event type.
-   Implement a handler to append the new event from the `conversation_updated` payload to the local state.
-   Keep the initial `fetchConversation` call on mount.

```typescript
// Conceptual change
useEffect(() => {
  // 1. Initial Fetch
  fetchConversation();

  // 2. Subscribe
  const handle = daemonClient.subscribeToEvents({
    session_id: sessionId,
    event_types: ['conversation_updated'],
    onEvent: (event) => {
      if (event.type === 'conversation_updated') {
        // Append event.data (which is the new message) to state
        setConversation(prev => [...prev, event.data as ConversationEvent]);
      }
    }
  });

  return () => handle.unsubscribe();
}, [sessionId]);
```

### Success Criteria:

#### Automated Verification:

- [x] `humanlayer-wui` type checks pass: `npm run typecheck` (or equivalent)

- [x] Lints pass: `npm run lint`

#### Manual Verification:

- [x] Open a session. Messages should appear.

- [x] Send a new message. It should appear instantly without waiting for a poll cycle.

- [x] Check network tab: No repeated `getConversation` calls every second.

- [x] Check network tab: One persistent SSE connection receiving events.

---

## Phase 2: Implement List Virtualization

### Overview
Install and implement `@tanstack/react-virtual` to efficiently render long conversation lists.

### Changes Required:

#### 1. Install Dependency
**Command**: `cd humanlayer-wui && npm install @tanstack/react-virtual` (or `bun add`)

#### 2. Virtualize `ConversationStream`
**File**: `humanlayer-wui/src/components/internal/ConversationStream/ConversationStream.tsx`
**Changes**:
-   Import `useVirtualizer` from `@tanstack/react-virtual`.
-   Create a scroll container ref and a virtualizer instance.
-   Replace the simple `.map()` with the virtualizer's `getVirtualItems().map()`.
-   Ensure dynamic height measurement is enabled (default in TanStack Virtual).
-   Handle "stick to bottom" behavior (auto-scroll) when new messages arrive.

### Success Criteria:

#### Automated Verification:

- [x] `humanlayer-wui` builds successfully.

#### Manual Verification:
-   [ ] Open a long session (simulate or find one).
-   [ ] Scroll performance should be smooth.
-   [ ] Inspect DOM: Only ~10-20 message nodes should be present at a time, updating as you scroll.
-   [ ] Auto-scroll to bottom should still work when new messages arrive.

---

## Testing Strategy

### Manual Testing Steps:
1.  **Streaming:**
    -   Launch a task that generates streaming output (e.g., "Write a long poem").
    -   Verify tokens appear one by one (or chunk by chunk) smoothly.
    -   Ensure no duplicate messages.
2.  **Virtualization:**
    -   Scroll up in a long history.
    -   Verify rendering is correct (no blank spaces, jumping).
    -   Verify context is maintained.
3.  **Edge Cases:**
    -   Network disconnect/reconnect (DaemonClient handles this, but verify UI recovers).
    -   Empty session.
    -   Switching between sessions.

## References
-   Research: `thoughts/shared/research/2025-11-30-session-detail-view-performance.md`
-   TanStack Virtual Docs: https://tanstack.com/virtual/latest
