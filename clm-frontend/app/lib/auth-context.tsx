'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { authAPI, tokenManager } from './api'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = tokenManager.getAccessToken()
    setIsAuthenticated(!!token)
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setError(null)
      const response = await authAPI.login(email, password)
      tokenManager.setTokens(response.access, response.refresh)
      setIsAuthenticated(true)
    } catch (err: any) {
      const errorMessage = err?.message || err?.detail || 'Login failed'
      setError(errorMessage)
      throw err
    }
  }

  const logout = () => {
    tokenManager.clearTokens()
    setIsAuthenticated(false)
    setError(null)
  }

  const clearError = () => {
    setError(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, error, login, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
