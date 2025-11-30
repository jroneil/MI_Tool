const TOKEN_KEY = 'accessToken'

let tokenCache: string | null = null
let initialized = false
const listeners = new Set<(token: string | null) => void>()

const isBrowser = typeof window !== 'undefined'

function notify(token: string | null) {
  listeners.forEach((listener) => listener(token))
}

function loadInitialToken() {
  if (initialized) return
  initialized = true
  if (!isBrowser) {
    tokenCache = null
    return
  }
  tokenCache = window.localStorage.getItem(TOKEN_KEY)
}

export function getToken() {
  loadInitialToken()
  return tokenCache
}

export function storeToken(token: string) {
  tokenCache = token
  if (isBrowser) {
    window.localStorage.setItem(TOKEN_KEY, token)
  }
  notify(token)
}

export function clearToken() {
  tokenCache = null
  if (isBrowser) {
    window.localStorage.removeItem(TOKEN_KEY)
  }
  notify(null)
}

export function subscribe(listener: (token: string | null) => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
