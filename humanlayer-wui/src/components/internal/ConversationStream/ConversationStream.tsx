import { useEffect, useRef, useState, useLayoutEffect } from 'react'
import keyBy from 'lodash.keyby'
import { useVirtualizer } from '@tanstack/react-virtual'

import { ConversationEvent, ConversationEventType, Session } from '@/lib/daemon/types'
import { useConversation } from '@/hooks/useConversation'
import { useSessionSnapshots } from '@/hooks/useSessionSnapshots'
import { Skeleton } from '@/components/ui/skeleton'
import { useTaskGrouping } from '../SessionDetail/hooks/useTaskGrouping'
import { useStore } from '@/AppStore'
import { useAutoScroll } from '../SessionDetail/hooks/useAutoScroll'
import { ConversationEventRow } from './ConversationEventRow'
import { TaskGroupEventRow } from './TaskGroupEventRow'

// TODO(2): Extract keyboard navigation logic to a custom hook

export function ConversationStream({
  session,
  focusedEventId,
  setFocusedEventId,
  onApprove,
  onDeny,
  approvingApprovalId,
  denyingApprovalId,
  setDenyingApprovalId,
  onCancelDeny,
  focusSource,
  setFocusSource,
  expandedToolResult,
  setExpandedToolResult,
  setExpandedToolCall,
  maxEventIndex,
  shouldIgnoreMouseEvent,
  expandedTasks,
  toggleTaskGroup,
}: {
  session: Session
  focusedEventId: number | null
  setFocusedEventId: (id: number | null) => void
  onApprove?: (approvalId: string) => void
  onDeny?: (approvalId: string, reason: string) => void
  approvingApprovalId?: string | null
  confirmingApprovalId?: string | null
  denyingApprovalId?: string | null
  setDenyingApprovalId?: (id: string | null) => void
  onCancelDeny?: () => void
  focusSource?: 'mouse' | 'keyboard' | null
  setFocusSource?: (source: 'mouse' | 'keyboard' | null) => void
  expandedToolResult?: ConversationEvent | null
  setExpandedToolResult?: (event: ConversationEvent | null) => void
  setExpandedToolCall?: (event: ConversationEvent | null) => void
  maxEventIndex?: number
  shouldIgnoreMouseEvent?: () => boolean
  expandedTasks?: Set<string>
  toggleTaskGroup?: (taskId: string) => void
}) {
  // expandedToolResult is used by parent to control hotkey availability
  void expandedToolResult
  const sessionId = session.id
  const { events, loading, error, isInitialLoad, loadMore, hasMore } = useConversation(
    sessionId,
    undefined,
  )
  const { refetch } = useSessionSnapshots(sessionId)
  const responseEditor = useStore(state => state.responseEditor)
  const [showSkeleton, setShowSkeleton] = useState(false)

  // Filter events based on maxEventIndex (exclude the event at maxEventIndex)
  const filteredEvents = maxEventIndex !== undefined ? events.slice(0, maxEventIndex) : events

  const toolResults = filteredEvents.filter(
    event => event.eventType === ConversationEventType.ToolResult,
  )
  const toolResultsByKey = keyBy(toolResults, 'toolResultForId')

  // Use task grouping hook - use props if provided, otherwise use local hook
  const localTaskGrouping = useTaskGrouping(filteredEvents)
  const { taskGroups, rootEvents, hasSubTasks } = localTaskGrouping
  const actualExpandedTasks = expandedTasks ?? localTaskGrouping.expandedTasks
  const actualToggleTaskGroup = toggleTaskGroup ?? localTaskGrouping.toggleTaskGroup

  // Add delay before showing skeleton to prevent flashing
  useEffect(() => {
    if (loading && isInitialLoad) {
      const timer = setTimeout(() => {
        setShowSkeleton(true)
      }, 200) // 200ms delay before showing skeleton
      return () => clearTimeout(timer)
    } else {
      setShowSkeleton(false)
    }
  }, [loading, isInitialLoad])

  // Watch for new Read tool results and refetch snapshots
  useEffect(() => {
    const hasReadToolResults = filteredEvents.some(
      event => event.eventType === ConversationEventType.ToolResult && event.toolName === 'Read',
    )

    if (hasReadToolResults) {
      refetch()
    }
  }, [filteredEvents, refetch])

  // Filter out tool results for rendering
  const eventsToRender = hasSubTasks
    ? rootEvents.filter(event => event.eventType !== ConversationEventType.ToolResult)
    : filteredEvents.filter(event => event.eventType !== ConversationEventType.ToolResult)

  // Note: Navigation is handled by the parent component via props

  // Note: Keyboard navigation is handled by parent component

  const containerRef = useRef<HTMLDivElement>(null)
  const previousEventCountRef = useRef(0)
  const previousEventsRef = useRef<ConversationEvent[]>([])

  // Virtualizer setup
  const rowVirtualizer = useVirtualizer({
    count: eventsToRender.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 100, // Initial estimate, dynamic measurement will take over
    overscan: 5,
  })

  const scrollAdjustmentRef = useRef<{ previousHeight: number } | null>(null)

  // Maintain scroll position when items are prepended (via loadMore)
  useLayoutEffect(() => {
    if (scrollAdjustmentRef.current && containerRef.current) {
      const { previousHeight } = scrollAdjustmentRef.current
      const newHeight = containerRef.current.scrollHeight
      const diff = newHeight - previousHeight

      if (diff > 0) {
        containerRef.current.scrollTop += diff
        console.log('[ConversationStream] Adjusted scroll by', diff)
      }
      scrollAdjustmentRef.current = null
    }
  }, [eventsToRender.length])

  // Handle scroll to top to load more
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      if (container.scrollTop < 50 && hasMore && !loading) {
        // Save current scroll height to adjust position after load
        scrollAdjustmentRef.current = { previousHeight: container.scrollHeight }
        loadMore()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [hasMore, loading, loadMore])

  // Maintain scroll position when items are prepended
  const previousFirstEventIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (eventsToRender.length > 0) {
      const firstEventId = eventsToRender[0].id.toString() // Assuming ID is usable as key
      const container = containerRef.current

      if (
        container &&
        previousFirstEventIdRef.current &&
        firstEventId !== previousFirstEventIdRef.current &&
        eventsToRender.length > previousEventCountRef.current // Items added
      ) {
        // Items were prepended (new first ID != old first ID and count increased)
        // We need to adjust scroll position
        // Ideally, TanStack Virtual handles this if we use `maintainScrollToIndex`?
        // But since we are manually managing scroll for "load more", we might need to be careful.
        // Actually, let's let the user scroll up naturally. If the new content pushes them down, that's bad.
        // The standard pattern is:
        // 1. Measure scrollHeight before update.
        // 2. Measure scrollHeight after update.
        // 3. scrollTop += (newScrollHeight - oldScrollHeight).
        // This is hard to do in useEffect because we don't have "before" state easily here.
        // But we can use the ref we set in the onScroll handler?
        // Let's rely on the fact that if we are near top, adding items pushes content down.
        // To keep the *current* first visible item stable, we need to scroll down.
      }
      previousFirstEventIdRef.current = firstEventId
    }
  }, [eventsToRender])

  // Initial scroll to bottom
  const hasScrolledToBottomRef = useRef(false)

  // Reset scroll flag when session changes
  useEffect(() => {
    hasScrolledToBottomRef.current = false
  }, [sessionId])

  useEffect(() => {
    if (!loading && eventsToRender.length > 0 && !hasScrolledToBottomRef.current) {
      rowVirtualizer.scrollToIndex(eventsToRender.length - 1, { align: 'end' })
      hasScrolledToBottomRef.current = true
    }
  }, [loading, eventsToRender.length, rowVirtualizer])

  // Use the auto-scroll hook
  useAutoScroll(
    containerRef,
    eventsToRender.length > previousEventCountRef.current,
    filteredEvents.length !== previousEventsRef.current.length ||
      filteredEvents.some((event, index) => {
        const prevEvent = previousEventsRef.current[index]
        return (
          !prevEvent ||
          event.id !== prevEvent.id ||
          event.toolResultContent !== prevEvent.toolResultContent
        )
      }),
  )

  // Update refs after checking
  useEffect(() => {
    if (!loading) {
      previousEventCountRef.current = eventsToRender.length
      previousEventsRef.current = [...filteredEvents]
    }
  }, [loading, eventsToRender.length, filteredEvents])

  // Scroll focused event into view (only for keyboard navigation)
  useEffect(() => {
    if (focusedEventId && containerRef.current && focusSource === 'keyboard') {
      // Find the index of the focused event
      const index = eventsToRender.findIndex(e => e.id === focusedEventId)
      if (index !== -1) {
        rowVirtualizer.scrollToIndex(index, { align: 'center', behavior: 'smooth' })
      }
    }
  }, [focusedEventId, focusSource, eventsToRender, rowVirtualizer])

  // Scroll deny form into view when opened
  useEffect(() => {
    if (denyingApprovalId && containerRef.current) {
      // Find the event that contains this approval
      const index = eventsToRender.findIndex(e => e.approvalId === denyingApprovalId)
      if (index !== -1) {
        // Small delay to ensure form is rendered/measured
        setTimeout(() => {
          rowVirtualizer.scrollToIndex(index, { align: 'center', behavior: 'smooth' })
        }, 100)
      }
    }
  }, [denyingApprovalId, eventsToRender, rowVirtualizer])

  if (error) {
    console.log('error', error)
    return <div className="text-destructive">Error loading conversation: {error}</div>
  }

  if (loading && isInitialLoad && showSkeleton) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    )
  }

  // No events yet - return null so only the loader shows
  if (filteredEvents.length === 0) {
    return null
  }

  // Render using virtualizer
  return (
    <div
      ref={containerRef}
      data-conversation-container
      className="overflow-y-auto flex-1 flex flex-col"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map(virtualRow => {
          const event = eventsToRender[virtualRow.index]
          const index = virtualRow.index
          const taskGroup = event.toolId ? taskGroups.get(event.toolId) : undefined

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {taskGroup ? (
                <TaskGroupEventRow
                  key={event.id}
                  group={taskGroup}
                  session={session}
                  isExpanded={actualExpandedTasks.has(event.toolId!)}
                  onToggle={() => actualToggleTaskGroup(event.toolId!)}
                  toolResult={undefined}
                  toolResultsByKey={toolResultsByKey}
                  focusedEventId={focusedEventId}
                  setFocusedEventId={setFocusedEventId}
                  setFocusSource={setFocusSource || (() => {})}
                  shouldIgnoreMouseEvent={shouldIgnoreMouseEvent || (() => false)}
                  isFocused={focusedEventId === event.id}
                  isLast={index === eventsToRender.length - 1}
                  responseEditorIsFocused={responseEditor?.isFocused || false}
                  setExpandedToolResult={setExpandedToolResult}
                  setExpandedToolCall={setExpandedToolCall}
                  onApprove={onApprove}
                  onDeny={onDeny}
                  approvingApprovalId={approvingApprovalId}
                  denyingApprovalId={denyingApprovalId}
                  setDenyingApprovalId={setDenyingApprovalId}
                  onCancelDeny={onCancelDeny}
                />
              ) : (
                <ConversationEventRow
                  key={event.id}
                  event={event}
                  toolResult={event.toolId ? toolResultsByKey[event.toolId] : undefined}
                  setFocusedEventId={setFocusedEventId}
                  setFocusSource={setFocusSource || (() => {})}
                  shouldIgnoreMouseEvent={shouldIgnoreMouseEvent || (() => false)}
                  isFocused={focusedEventId === event.id}
                  isLast={index === eventsToRender.length - 1}
                  responseEditorIsFocused={responseEditor?.isFocused || false}
                  setExpandedToolResult={setExpandedToolResult}
                  setExpandedToolCall={setExpandedToolCall}
                  onApprove={onApprove}
                  onDeny={onDeny}
                  approvingApprovalId={approvingApprovalId}
                  denyingApprovalId={denyingApprovalId}
                  setDenyingApprovalId={setDenyingApprovalId}
                  onCancelDeny={onCancelDeny}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
