const WORKSPACE_KEY = 'workspaceId'

let workspaceCache: number | null = null
let initialized = false
const listeners = new Set<(workspaceId: number | null) => void>()

const isBrowser = typeof window !== 'undefined'

function notify(workspaceId: number | null) {
  listeners.forEach((listener) => listener(workspaceId))
}

function loadInitialWorkspace() {
  if (initialized) return
  initialized = true
  if (!isBrowser) {
    workspaceCache = null
    return
  }
  const stored = window.localStorage.getItem(WORKSPACE_KEY)
  if (stored) {
    const parsed = Number(stored)
    workspaceCache = Number.isFinite(parsed) && parsed > 0 ? parsed : null
  } else {
    workspaceCache = null
  }
}

export function getWorkspaceId(): number | null {
  loadInitialWorkspace()
  return workspaceCache
}

export function storeWorkspaceId(workspaceId: number) {
  const normalized = Number.isFinite(workspaceId) && workspaceId > 0 ? workspaceId : null
  if (!normalized) {
    clearWorkspaceId()
    return
  }
  workspaceCache = normalized
  if (isBrowser) {
    window.localStorage.setItem(WORKSPACE_KEY, String(normalized))
  }
  notify(normalized)
}

export function clearWorkspaceId() {
  workspaceCache = null
  if (isBrowser) {
    window.localStorage.removeItem(WORKSPACE_KEY)
  }
  notify(null)
}

export function subscribe(listener: (workspaceId: number | null) => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
