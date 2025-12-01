import { useState, useEffect, useCallback, useRef } from 'react'
import { daemonClient, ConversationEvent } from '@/lib/daemon'
import { formatError } from '@/utils/errors'
import { useStore } from '@/AppStore'

interface UseConversationReturn {
  events: ConversationEvent[]
  loading: boolean
  error: string | null
  isInitialLoad: boolean
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
}

export function useConversation(sessionId?: string, claudeSessionId?: string): UseConversationReturn {
  const activeSessionDetail = useStore(state => state.activeSessionDetail)
  const updateActiveSessionConversation = useStore(state => state.updateActiveSessionConversation)
  const sessionStatus = activeSessionDetail?.session.status
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorCount, setErrorCount] = useState(0)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const PAGE_SIZE = 50

  // Add abort controller for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null)

  // Get events from store if this is the active session
  const events = (
    activeSessionDetail?.session.id === sessionId ? activeSessionDetail?.conversation : []
  ) as ConversationEvent[]

  const fetchConversation = useCallback(
    async (isLoadMore = false) => {
      if (errorCount > 3) {
        return
      }

      if (!sessionId && !claudeSessionId) {
        setError('Either sessionId or claudeSessionId must be provided')
        setLoading(false)
        return
      }

      // Create new abort controller for this request
      const controller = new AbortController()
      if (!isLoadMore) {
        // Cancel any in-flight request if it's a fresh load
        if (abortControllerRef.current) {
          try {
            abortControllerRef.current.abort()
          } catch (err) {
            console.log('[useConversation] Error aborting request:', err)
          }
        }
        abortControllerRef.current = controller
      }

      try {
        setLoading(true)
        setError(null)

        const currentOffset = isLoadMore ? offset : 0
        const limit = PAGE_SIZE

        const response = await daemonClient.getConversation(
          {
            session_id: sessionId,
            claude_session_id: claudeSessionId,
            limit,
            offset: currentOffset,
          },
          { signal: controller.signal },
        )

        // Update the store if this is the active session
        if (activeSessionDetail?.session.id === sessionId) {
          if (isLoadMore) {
            // Prepend older messages
            // Check for duplicates just in case
            const existingIds = new Set(events.map(e => e.id))
            const newEvents = response.filter(e => !existingIds.has(e.id))
            updateActiveSessionConversation([...newEvents, ...events])
            setOffset(prev => prev + newEvents.length)
          } else {
            // Initial load or refresh
            updateActiveSessionConversation(response)
            setOffset(response.length)
          }

          // If we got fewer items than requested, we've reached the end
          if (response.length < limit) {
            setHasMore(false)
          } else {
            setHasMore(true)
          }
        }

        setErrorCount(0)
        setIsInitialLoad(false)
      } catch (err: any) {
        if (controller.signal.aborted || err?.cause?.name === 'AbortError') {
          console.log('[useConversation] Ignoring abort error')
          return
        }

        console.log(
          '[useConversation] Error fetching conversation:',
          err,
          'sessionStatus:',
          sessionStatus,
        )

        setError(await formatError(err))
        setErrorCount(prev => prev + 1)
      } finally {
        setLoading(false)
      }
    },
    [
      sessionId,
      claudeSessionId,
      errorCount,
      activeSessionDetail,
      updateActiveSessionConversation,
      offset,
      events,
    ],
  )

  // Store the latest fetchConversation function in a ref
  const fetchConversationRef = useRef(fetchConversation)
  fetchConversationRef.current = fetchConversation

  useEffect(() => {
    // Don't subscribe if sessionId is undefined (e.g., for draft sessions)
    if (!sessionId) {
      return
    }

    // Only subscribe if this is the active session
    if (activeSessionDetail?.session.id !== sessionId) {
      return
    }

    // Initial fetch
    // Reset state for new session
    setOffset(0)
    setHasMore(true)
    setIsInitialLoad(true)
    fetchConversationRef.current(false)

    const handle = daemonClient.subscribeToEvents({
      session_id: sessionId,
      event_types: ['conversation_updated'],
      onEvent: event => {
        if (event.type === 'conversation_updated') {
          const state = useStore.getState()
          if (state.activeSessionDetail?.session.id === sessionId) {
            const currentEvents = state.activeSessionDetail.conversation as ConversationEvent[]
            const newEvent = event.data as ConversationEvent

            // Prevent duplicates
            if (!currentEvents.some(e => e.id === newEvent.id)) {
              updateActiveSessionConversation([...currentEvents, newEvent])
              // Increment offset so we don't fetch this one again if we reload
              setOffset(prev => prev + 1)
            }
          }
        }
      },
    })

    return () => {
      handle.unsubscribe()
      // Cancel any pending request on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [sessionId, activeSessionDetail?.session.id, updateActiveSessionConversation])

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await fetchConversation(true)
    }
  }, [loading, hasMore, fetchConversation])

  return {
    events,
    loading,
    error,
    refresh: () => fetchConversation(false),
    loadMore,
    hasMore,
    isInitialLoad,
  }
}

// Formatted conversation for display
export interface FormattedMessage {
  id: number
  type: 'message' | 'tool_call' | 'tool_result' | 'approval'
  role?: string
  content: string
  timestamp: Date
  metadata?: {
    toolName?: string
    toolId?: string
    approvalStatus?: string
    approvalId?: string
  }
}

export function useFormattedConversation(
  sessionId?: string,
  claudeSessionId?: string,
): UseConversationReturn & { formattedEvents: FormattedMessage[] } {
  const base = useConversation(sessionId, claudeSessionId)

  const formattedEvents: FormattedMessage[] = base.events
    .filter(event => event.id !== undefined)
    .map(event => {
      let content = event.content || ''
      let type: FormattedMessage['type'] = 'message'

      if (event.eventType === 'tool_call') {
        type = 'tool_call'
        content = `Calling ${event.toolName || 'tool'}`
        if (event.toolInputJson) {
          try {
            const input = JSON.parse(event.toolInputJson)
            content += `: ${JSON.stringify(input, null, 2)}`
          } catch {
            content += `: ${event.toolInputJson}`
          }
        }
      } else if (event.eventType === 'tool_result') {
        type = 'tool_result'
        content = event.toolResultContent || 'Tool completed'
      } else if (event.approvalStatus) {
        type = 'approval'
        content = `Approval ${event.approvalStatus}`
      }

      return {
        id: event.id!,
        type,
        role: event.role,
        content,
        timestamp: new Date(event.createdAt || new Date()),
        metadata: {
          toolName: event.toolName,
          toolId: event.toolId,
          approvalStatus: event.approvalStatus || undefined,
          approvalId: event.approvalId,
        },
      }
    })

  return {
    ...base,
    formattedEvents,
  }
}
