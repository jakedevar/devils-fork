import { useState, useEffect, useCallback } from 'react'
import { readDir, DirEntry } from '@tauri-apps/plugin-fs'

export interface FileTreeNode extends DirEntry {
  path: string
  children?: FileTreeNode[]
}

export function useFileTree(path: string) {
  const [contents, setContents] = useState<FileTreeNode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchContents = useCallback(async () => {
    if (!path) return

    setIsLoading(true)
    setError(null)
    try {
      // Basic readDir
      const entries = await readDir(path)
      
      // Sort: Folders first, then files. Alphabetical within groups.
      const sorted = entries.sort((a, b) => {
        if (a.isDirectory === b.isDirectory) {
          return (a.name || '').localeCompare(b.name || '')
        }
        return a.isDirectory ? -1 : 1
      })

      // Map to FileTreeNode
      const nodes: FileTreeNode[] = sorted.map(entry => ({
        ...entry,
        path: `${path}/${entry.name}`, // Simple concatenation, might need safer join
      }))

      setContents(nodes)
    } catch (err) {
      console.error('Error reading directory:', path, err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [path])

  useEffect(() => {
    fetchContents()
  }, [fetchContents])

  return { contents, isLoading, error, refresh: fetchContents }
}
