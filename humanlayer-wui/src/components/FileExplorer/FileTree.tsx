import React, { useState } from 'react'
import { FileIcon, FolderIcon, FolderOpenIcon, ChevronRight, ChevronDown } from 'lucide-react'
import { useFileTree, FileTreeNode } from '@/hooks/useFileTree'
import { cn } from '@/lib/utils'

interface FileTreeItemProps {
  node: FileTreeNode
  level: number
  onSelect?: (node: FileTreeNode) => void
}

const FileTreeItem = ({ node, level, onSelect }: FileTreeItemProps) => {
  const [isOpen, setIsOpen] = useState(false)
  // Only fetch children if this node is a directory and is open
  // This gives us "lazy loading" for free
  const { contents, isLoading } = useFileTree(isOpen && node.isDirectory ? node.path : '')

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (node.isDirectory) {
      setIsOpen(!isOpen)
    }
    onSelect?.(node)
  }

  return (
    <div>
      <div
        className={cn(
          "flex items-center py-1 px-2 cursor-pointer hover:bg-accent/50 text-sm select-none truncate",
          isLoading && "opacity-70"
        )}
        style={{ paddingLeft: `${level * 12 + 4}px` }}
        onClick={handleClick}
      >
        <span className="mr-1 opacity-70">
           {node.isDirectory ? (
             isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
           ) : <span className="w-3" />} 
        </span>
        
        <span className="mr-2 text-muted-foreground">
          {node.isDirectory ? (
            isOpen ? <FolderOpenIcon className="h-4 w-4 text-blue-400" /> : <FolderIcon className="h-4 w-4 text-blue-400" />
          ) : (
            <FileIcon className="h-4 w-4" />
          )}
        </span>
        
        <span className="truncate">{node.name}</span>
      </div>

      {isOpen && node.isDirectory && (
        <div>
          {contents.map((child) => (
            <FileTreeItem key={child.path} node={child} level={level + 1} onSelect={onSelect} />
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

interface FileTreeProps {
  path: string
  onSelect?: (node: FileTreeNode) => void
}

export function FileTree({ path, onSelect }: FileTreeProps) {
  const { contents, isLoading, error } = useFileTree(path)

  if (error) {
    return <div className="p-4 text-red-500 text-sm">Error: {error}</div>
  }

  if (isLoading && contents.length === 0) {
     return <div className="p-4 text-muted-foreground text-sm">Loading...</div>
  }

  return (
    <div className="overflow-auto h-full pb-4">
      {contents.map((node) => (
        <FileTreeItem key={node.path} node={node} level={0} onSelect={onSelect} />
      ))}
    </div>
  )
}
