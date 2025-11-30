'use client'

import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react'
import { clearToken, getToken, storeToken, subscribe } from './auth-store'

type AuthContextValue = {
  token: string | null
  setToken: (token: string) => void
  clearToken: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null)

  useEffect(() => {
    setTokenState(getToken())
    return subscribe(setTokenState)
  }, [])

  const setToken = useCallback((value: string) => {
    storeToken(value)
  }, [])

  const resetToken = useCallback(() => {
    clearToken()
  }, [])

  return <AuthContext.Provider value={{ token, setToken, clearToken: resetToken }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
