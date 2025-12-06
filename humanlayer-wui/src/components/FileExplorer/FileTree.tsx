import React, { useState, createContext, useContext, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { FileIcon, FolderIcon, FolderOpenIcon, ChevronRight, ChevronDown } from 'lucide-react'
import { useFileTree, FileTreeNode } from '@/hooks/useFileTree'
import { cn } from '@/lib/utils'
import { useHotkeys } from 'react-hotkeys-hook'

// --- Context ---

interface FileTreeContextType {
  expandedPaths: Set<string>
  toggleNode: (path: string) => void
  focusedPath: string | null
  setFocusedPath: (path: string | null) => void
  onSelect?: (node: FileTreeNode) => void
}

const FileTreeContext = createContext<FileTreeContextType | null>(null)

// --- FileTreeItem ---

interface FileTreeItemProps {
  node: FileTreeNode
  level: number
  parentPath?: string
}

const FileTreeItem = ({ node, level, parentPath }: FileTreeItemProps) => {
  const { expandedPaths, toggleNode, focusedPath, setFocusedPath, onSelect } = useContext(FileTreeContext)!
  const isOpen = expandedPaths.has(node.path)
  const isFocused = focusedPath === node.path
  const elementRef = useRef<HTMLDivElement>(null)

  // Only fetch children if this node is a directory and is open
  const { contents, isLoading } = useFileTree(isOpen && node.isDirectory ? node.path : '')

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFocusedPath(node.path)
    if (node.isDirectory) {
      toggleNode(node.path)
    }
    onSelect?.(node)
  }

  // Auto-scroll into view when focused
  useEffect(() => {
    if (isFocused && elementRef.current) {
      elementRef.current.scrollIntoView({ block: 'nearest' })
    }
  }, [isFocused])

  return (
    <div>
      <div
        ref={elementRef}
        tabIndex={-1} // Allow programmatic focus but not keyboard navigation (managed by container)
        data-file-path={node.path}
        data-parent-path={parentPath}
        data-is-dir={node.isDirectory}
        data-is-expanded={isOpen}
        className={cn(
          "flex items-center py-1 px-2 cursor-pointer text-sm select-none truncate border-l-2 border-transparent outline-none",
          // Hover state
          "hover:bg-accent/50",
          // Loading state
          isLoading && "opacity-70",
          // Focused state (active cursor)
          isFocused && "bg-accent text-accent-foreground border-l-primary"
        )}
        style={{ paddingLeft: `${level * 12 + 4}px` }}
        onClick={handleClick}
        onFocus={(e) => {
            // If the item itself receives focus (e.g. via click), ensure the container knows it's active
            // but we don't want the item to "steal" the focus from the container's keyboard management
            // Ideally, we redirect focus to the container or just let the container handle the visual state.
            // Since we use isTreeFocused for hotkeys, bubbling focus events are fine.
        }}
      >
        <span className="mr-1 opacity-70">
           {node.isDirectory ? (
             isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
           ) : <span className="w-3" />} 
        </span>
        
        <span className="mr-2 text-muted-foreground">
          {node.isDirectory ? (
            isOpen ? <FolderOpenIcon className={cn("h-4 w-4 text-blue-400", isFocused && "text-blue-300")} /> 
            : <FolderIcon className={cn("h-4 w-4 text-blue-400", isFocused && "text-blue-300")} />
          ) : (
            <FileIcon className="h-4 w-4" />
          )}
        </span>
        
        <span className="truncate">{node.name}</span>
      </div>

      {isOpen && node.isDirectory && (
        <div>
          {contents.map((child) => (
            <FileTreeItem key={child.path} node={child} level={level + 1} parentPath={node.path} />
          ))}
          {contents.length === 0 && !isLoading && (
             <div style={{ paddingLeft: `${(level + 1) * 12 + 20}px` }} className="py-1 text-xs text-muted-foreground italic">
               Empty
             </div>
          )}
        </div>
      )}
    </div>
  )
}

// --- FileTree (Root) ---

interface FileTreeProps {
  path: string
  onSelect?: (node: FileTreeNode) => void
}

export const FileTree = forwardRef<HTMLDivElement, FileTreeProps>(({ path, onSelect }, ref) => {
  const { contents, isLoading, error } = useFileTree(path)
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [focusedPath, setFocusedPath] = useState<string | null>(null)
  const [isTreeFocused, setIsTreeFocused] = useState(false)
  const internalRef = useRef<HTMLDivElement>(null)
  
  // Combine refs
  useImperativeHandle(ref, () => internalRef.current!, [])

  const toggleNode = useCallback((nodePath: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev)
      if (next.has(nodePath)) {
        next.delete(nodePath)
      } else {
        next.add(nodePath)
      }
      return next
    })
  }, [])

  // --- Keyboard Navigation ---

  const moveFocus = useCallback((direction: 'next' | 'prev') => {
    if (!internalRef.current) return

    const items = Array.from(internalRef.current.querySelectorAll('[data-file-path]'))
    if (items.length === 0) return

    // If nothing focused, focus first item
    if (!focusedPath) {
      const first = items[0].getAttribute('data-file-path')
      if (first) setFocusedPath(first)
      return
    }

    const currentIndex = items.findIndex(el => el.getAttribute('data-file-path') === focusedPath)
    
    let nextIndex = 0
    if (currentIndex !== -1) {
      nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1
    }
    
    // Clamp
    if (nextIndex < 0) nextIndex = 0
    if (nextIndex >= items.length) nextIndex = items.length - 1
    
    const nextPath = items[nextIndex].getAttribute('data-file-path')
    if (nextPath) setFocusedPath(nextPath)
  }, [focusedPath])

  const handleRight = useCallback(() => {
    if (!focusedPath || !internalRef.current) return
    const el = internalRef.current.querySelector(`[data-file-path="${focusedPath}"]`)
    if (!el) return

    const isDir = el.getAttribute('data-is-dir') === 'true'
    const isExpanded = el.getAttribute('data-is-expanded') === 'true'

    if (isDir) {
      if (!isExpanded) {
        toggleNode(focusedPath)
      } else {
        moveFocus('next') // Move to first child
      }
    }
  }, [focusedPath, toggleNode, moveFocus])

  const handleLeft = useCallback(() => {
    if (!focusedPath || !internalRef.current) return
    const el = internalRef.current.querySelector(`[data-file-path="${focusedPath}"]`)
    if (!el) return

    const isDir = el.getAttribute('data-is-dir') === 'true'
    const isExpanded = el.getAttribute('data-is-expanded') === 'true'
    const parentPath = el.getAttribute('data-parent-path')

    if (isDir && isExpanded) {
      toggleNode(focusedPath) // Close
    } else if (parentPath) {
      setFocusedPath(parentPath) // Jump to parent
    }
  }, [focusedPath, toggleNode])

  const handleEnter = useCallback(() => {
     // Enter behaves like Right for directories
     handleRight()
     // For files, we might want to trigger onSelect or open file in future
     if (focusedPath && onSelect) {
         // We need to reconstruct the node object or pass it differently. 
         // For now, let's just use the toggle logic.
         // Real "open file" logic would go here.
     }
  }, [handleRight, focusedPath, onSelect])

  // Register hotkeys - Only enabled when tree is focused
  useHotkeys(['down', 'j'], (e) => { e.preventDefault(); e.stopPropagation(); moveFocus('next') }, { enabled: isTreeFocused }, [moveFocus, isTreeFocused])
  useHotkeys(['up', 'k'], (e) => { e.preventDefault(); e.stopPropagation(); moveFocus('prev') }, { enabled: isTreeFocused }, [moveFocus, isTreeFocused])
  useHotkeys(['right', 'l'], (e) => { e.preventDefault(); e.stopPropagation(); handleRight() }, { enabled: isTreeFocused }, [handleRight, isTreeFocused])
  useHotkeys(['left', 'h'], (e) => { e.preventDefault(); e.stopPropagation(); handleLeft() }, { enabled: isTreeFocused }, [handleLeft, isTreeFocused])
  useHotkeys(['enter'], (e) => { e.preventDefault(); e.stopPropagation(); handleEnter() }, { enabled: isTreeFocused }, [handleEnter, isTreeFocused])

  // Initialize focus on first load if needed
  useEffect(() => {
      if (!focusedPath && contents.length > 0) {
          // Optional: Auto-focus first item? 
          // Maybe better to wait for user interaction to avoid stealing focus visually
      }
  }, [contents, focusedPath])

  if (error) {
    return <div className="p-4 text-red-500 text-sm">Error: {error}</div>
  }

  if (isLoading && contents.length === 0) {
     return <div className="p-4 text-muted-foreground text-sm">Loading...</div>
  }

  return (
    <FileTreeContext.Provider value={{ expandedPaths, toggleNode, focusedPath, setFocusedPath, onSelect }}>
      <div 
        ref={internalRef} 
        className="overflow-auto h-full pb-4 outline-none focus:ring-1 focus:ring-accent" 
        tabIndex={0}
        onFocus={() => { console.log('[FileTree] onFocus fired'); setIsTreeFocused(true) }}
        onBlur={() => { console.log('[FileTree] onBlur fired'); setIsTreeFocused(false) }}
      >
        {contents.map((node) => (
          <FileTreeItem key={node.path} node={node} level={0} />
        ))}
      </div>
    </FileTreeContext.Provider>
  )
})
FileTree.displayName = 'FileTree'
