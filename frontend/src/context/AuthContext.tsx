import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import api from '../lib/api'

export interface AuthUser {
  id: string
  nome: string
  email: string
  role: 'admin' | 'operador' | 'visualizador'
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (email: string, senha: string) => Promise<void>
  logout: () => void
  isAdmin: boolean
  isOperador: boolean // true para admin e operador
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setLoading(false)
      return
    }
    // Valida o token no servidor e atualiza dados do usuário
    api
      .get<AuthUser>('/auth/me')
      .then(r => setUser(r.data))
      .catch(() => {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, senha: string) => {
    const { data } = await api.post<{ token: string; user: AuthUser }>('/auth/login', {
      email,
      senha,
    })
    localStorage.setItem('auth_token', data.token)
    localStorage.setItem('auth_user', JSON.stringify(data.user))
    setUser(data.user)
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAdmin: user?.role === 'admin',
        isOperador: user?.role === 'admin' || user?.role === 'operador',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
