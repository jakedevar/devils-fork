---
date: 2025-11-30 17:24:55 PST
researcher: jakes-branch
git_commit: a9a2c9bb7636a9178c038fcf4389fac1ad07e5b0
branch: jakes-branch
repository: humanlayer
topic: "Session Detail View Frontend Performance"
tags: [research, frontend, performance, streaming, polling]
status: complete
last_updated: 2025-11-30
last_updated_by: jakes-branch
---

# Research: Session Detail View Frontend Performance

**Date**: 2025-11-30 17:24:55 PST
**Researcher**: jakes-branch
**Git Commit**: a9a2c9bb7636a9178c038fcf4389fac1ad07e5b0
**Branch**: jakes-branch
**Repository**: humanlayer

## Research Question
Is the frontend code in the session detail view optimal? Meaning if we are getting a stream of messages back from an ai agent is it setup in a way that is efficient?

## Summary
The current implementation of the session detail view is **not optimal** for efficiently handling a stream of messages, particularly for long-running sessions. The system relies on **polling** the entire conversation history every second rather than using a streaming connection for message updates. Additionally, the rendering logic renders the entire list of messages without virtualization, which will lead to performance degradation as the conversation grows.

## Detailed Findings

### Data Fetching Mechanism (Polling)
- **Implementation:** The `useConversation` hook uses `setInterval` to poll the backend every 1000ms (default).
- **Inefficiency:** On every poll, it fetches the *entire* conversation history (`daemonClient.getConversation`). This is an O(N) operation where N is the number of messages. As the conversation grows, the bandwidth usage and parsing time increase linearly.
- **Latency:** New messages appear with a latency of up to 1 second (the poll interval), rather than appearing instantly as they are generated.
- **Code Reference:** `humanlayer-wui/src/hooks/useConversation.ts`

### Real-time Subscriptions
- **Existing Subscriptions:** There is a `useSessionSubscriptions` hook, but it is limited to:
    - `session_status_changed`
    - `new_approval`
    - `approval_resolved`
    - `session_settings_changed`
- **Missing Subscriptions:** There is **no subscription for message content updates** (e.g., `conversation_updated` or `message_stream`). This confirms that the polling mechanism is the primary way message content is updated.
- **Code Reference:** `humanlayer-wui/src/hooks/useSubscriptions.ts`

### Rendering Performance
- **List Rendering:** The `ConversationStream` component renders the list of messages by mapping over the `eventsToRender` array.
- **No Virtualization:** There is no implementation of list virtualization (windowing). This means that for a conversation with hundreds of messages, the browser creates DOM nodes for all of them, which consumes significant memory and CPU, especially during re-renders.
- **Re-renders:** Since the entire conversation array is replaced in the store on every poll, the component tree likely re-renders frequently, even if most messages haven't changed.
- **Code Reference:** `humanlayer-wui/src/components/internal/ConversationStream/ConversationStream.tsx`

### Component Hierarchy
- `SessionDetailRouter` -> `ActiveSession` -> `ConversationStream` -> `ConversationEventRow`
- `ActiveSession` orchestrates the view but relies on `useConversation` for data.

## Code References
- `humanlayer-wui/src/hooks/useConversation.ts`: Implements the polling logic.
  ```typescript
  const interval = setInterval(() => {
    fetchConversationRef.current()
  }, pollInterval)
  ```
- `humanlayer-wui/src/components/internal/ConversationStream/ConversationStream.tsx`: Implements the rendering logic.
  ```typescript
  // TODO(3): Add virtual scrolling for very long conversations
  ```
- `humanlayer-wui/src/hooks/useSubscriptions.ts`: Shows limited event subscriptions.

## Architecture Documentation
The current architecture follows a "poll-and-replace" pattern for conversation data.
1.  **Poll:** Frontend requests full conversation state every 1s.
2.  **Replace:** Store updates with new array.
3.  **Render:** React reconciles the full list.

## Open Questions
- Is there a backend endpoint available that supports streaming message updates (e.g., SSE or WebSocket)?
- What is the average expected length of a session? If sessions are short (<50 messages), the current approach might be acceptable, but for long sessions, it will degrade.
