import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import type { UserRecord, UserRole } from '@/types/database'

interface AuthContextType {
  user: UserRecord | null
  role: UserRole | null
  isLoading: boolean
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isLoading: true,
  logout: () => {},
  refreshUser: async () => {},
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserRecord | null>(
    (pb.authStore.record as unknown as UserRecord) || null,
  )
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = async () => {
    try {
      if (pb.authStore.isValid && pb.authStore.record?.id) {
        const fresh = await pb.collection('users').getOne<UserRecord>(pb.authStore.record.id)
        setUser(fresh)
      } else {
        setUser(null)
      }
    } catch (err) {
      console.error('Falha ao atualizar sessão:', err)
      pb.authStore.clear()
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const unsub = pb.authStore.onChange((_token, model) => {
      setUser((model as unknown as UserRecord) || null)
    })

    refreshUser()

    return () => {
      unsub()
    }
  }, [])

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
  }

  const role: UserRole | null = useMemo(() => {
    if (!user) return null
    return (user.role as UserRole) || 'CLIENTE'
  }, [user])

  return (
    <AuthContext.Provider value={{ user, role, isLoading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
