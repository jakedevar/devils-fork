# Session Detail View: Virtualization Start-at-Bottom

## Overview

The user requests that the session detail view shows the **most recent 30 messages** when entering, instead of the beginning. While they also mentioned "loading older messages as you scroll up", our research confirms the backend does not support pagination. Therefore, the "loading" is purely visual: we continue to fetch the full conversation but ensure the *initial scroll position* is at the bottom.

With the recently added `@tanstack/react-virtual`, simply setting `scrollTop` might be unreliable if the sizes are dynamic. We need to explicitly tell the virtualizer to scroll to the last index on mount.

## Current Behavior

-   `useAutoScroll` attempts to scroll to the bottom if `autoScrollEnabled` is true.
-   However, `ConversationStream` initializes with default virtualization settings (start at 0).
-   `useAutoScroll` relies on `container.scrollTop = container.scrollHeight`. With virtualization, `scrollHeight` is an estimate (`totalSize`). This *should* work, but might be timing-dependent or inaccurate until items are measured.

## Implementation Approach

1.  **Force Bottom on Mount:**
    -   In `ConversationStream.tsx`, use `useEffect` to call `rowVirtualizer.scrollToIndex(count - 1)` once on mount (or when data first loads).
    -   This is more robust than `scrollTop = scrollHeight` for virtual lists.

2.  **Addressing "Load as you scroll":**
    -   Since we have all data, "loading" is instant.
    -   The user experience will be: Open session -> Immediately see bottom 30 messages -> Scroll up -> Older messages appear instantly.
    -   We will explicitily *not* implement network pagination as it requires backend changes.

3.  **Interaction with `useAutoScroll`:**
    -   We need to ensure `useAutoScroll` doesn't fight with our initial scroll.
    -   Actually, `useAutoScroll` is designed for *new* content.
    -   For the *initial* load, we want to force the bottom view.

## Changes Required

### 1. Update `ConversationStream.tsx`

**File:** `humanlayer-wui/src/components/internal/ConversationStream/ConversationStream.tsx`

-   Add a `useEffect` that triggers when `eventsToRender` is populated for the first time.
-   Call `rowVirtualizer.scrollToIndex(eventsToRender.length - 1, { align: 'end' })`.

```typescript
  // Initial scroll to bottom
  useEffect(() => {
    if (!loading && eventsToRender.length > 0 && isInitialLoad) {
       rowVirtualizer.scrollToIndex(eventsToRender.length - 1, { align: 'end' })
    }
  }, [loading, eventsToRender.length, isInitialLoad, rowVirtualizer])
```

*Wait*, `isInitialLoad` becomes false after the first fetch. The component might remount.
Better logic:
-   If we just loaded data and haven't scrolled yet, scroll to bottom.

### Success Criteria

#### Manual Verification
-   [ ] Open a session.
-   [ ] View should immediately show the *last* messages (bottom).
-   [ ] Scroll up to see older messages.
