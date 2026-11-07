import { useEffect, useRef } from 'react'
import type { Project, SolverMode } from './models'

/** Batch synchronous storage writes, flushing committed edits before leaving. */
export function useProjectPersistence(
  project: Project,
  storageKey: string,
  onStatus: (ok: boolean) => void,
) {
  const latest = useRef(project)
  const dirtyModes = useRef(new Map<SolverMode, Project>())
  const saved = useRef<Project | null>(null)
  const flushRef = useRef<() => void>(() => {})
  latest.current = project
  flushRef.current = () => {
    const current = latest.current
    if (!dirtyModes.current.size && saved.current === current) return
    dirtyModes.current.set(current.mode ?? 'linear', current)
    try {
      let currentJson = ''
      for (const [mode, draft] of dirtyModes.current) {
        const json = JSON.stringify(draft)
        localStorage.setItem(`${storageKey}-${mode}`, json)
        if (draft === current) currentJson = json
      }
      localStorage.setItem(storageKey, currentJson)
      dirtyModes.current.clear()
      saved.current = current
      onStatus(true)
    } catch {
      onStatus(false)
    }
  }
  useEffect(() => {
    dirtyModes.current.set(project.mode ?? 'linear', project)
    const timer = setTimeout(() => flushRef.current(), 300)
    return () => clearTimeout(timer)
  }, [project])
  useEffect(() => {
    const flush = () => flushRef.current()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', onVisibility)
      flush()
    }
  }, [storageKey])
}
