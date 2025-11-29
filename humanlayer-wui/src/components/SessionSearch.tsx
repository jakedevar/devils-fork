import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { daemonClient, Session } from '@/lib/daemon'
import { fuzzySearch } from '@/lib/fuzzy-search'
import { getSessionNotificationText } from '@/utils/formatting'

interface SessionSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SessionSearch({ open, onOpenChange }: SessionSearchProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [sessions, setSessions] = useState<Session[]>([])

  // Fetch sessions when the dialog opens
  useEffect(() => {
    if (open) {
      // Fetch all sessions (active, archived, drafts)
      // We don't pass a filter to get everything
      daemonClient
        .getSessionLeaves()
        .then(({ sessions }) => {
          setSessions(sessions)
        })
        .catch(err => {
          console.error('Failed to fetch sessions for search:', err)
        })
    }
  }, [open])

  // Filter and group sessions
  const filteredSessions = useMemo(() => {
    if (!query) return sessions

    // Use the fuzzy search utility
    // We search across title, summary, and query
    const results = fuzzySearch(sessions, query, {
      keys: ['title', 'summary', 'query'],
      threshold: 0.2, // Slightly more lenient threshold
    })

    return results.map(result => result.item)
  }, [sessions, query])

  // Group by status (Active/Draft vs Archived)
  const groups = useMemo(() => {
    const active: Session[] = []
    const archived: Session[] = []
    const drafts: Session[] = []

    filteredSessions.forEach(session => {
      if (session.archived) {
        archived.push(session)
      } else if (session.status === 'draft') {
        drafts.push(session)
      } else {
        active.push(session)
      }
    })

    return { active, archived, drafts }
  }, [filteredSessions])

  const handleSelect = (sessionId: string) => {
    onOpenChange(false)
    navigate(`/sessions/${sessionId}`)
  }

  // Helper to render a session item
  const renderSessionItem = (session: Session) => {
    const displayText =
      session.title || session.summary || session.query || getSessionNotificationText(session)
    // Use lastActivityAt or createdAt
    const date = session.lastActivityAt || session.createdAt
    const timeAgo = new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })

    return (
      <CommandItem
        key={session.id}
        value={`${displayText} ${session.id}`} // Include ID in value to ensure uniqueness
        onSelect={() => handleSelect(session.id)}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <FileText className="h-4 w-4 shrink-0 opacity-50" />
          <span className="truncate">{displayText}</span>
        </div>
        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{timeAgo}</span>
      </CommandItem>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>Session Search</DialogTitle>
        <DialogDescription>Search for a session...</DialogDescription>
      </DialogHeader>
      <DialogContent className="overflow-hidden p-0">
        <Command
          shouldFilter={false}
          className="[&_[cmdk-group-heading]]:text-muted-foreground **:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
        >
          <CommandInput placeholder="Search sessions..." value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            {/* Active Sessions */}
            {groups.active.length > 0 && (
              <CommandGroup heading="Active Sessions">
                {groups.active.map(renderSessionItem)}
              </CommandGroup>
            )}

            {/* Drafts */}
            {groups.drafts.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Drafts">
                  {groups.drafts.map(renderSessionItem)}
                </CommandGroup>
              </>
            )}

            {/* Archived Sessions */}
            {groups.archived.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Archived">
                  {groups.archived.map(renderSessionItem)}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}