import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('bo_token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      api.get('/backoffice/auth/me')
        .then(res => setUser(res.data))
        .catch(() => {
          setToken(null)
          localStorage.removeItem('bo_token')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  const login = async (email, password) => {
    const res = await api.post('/backoffice/auth/login', { email, password })
    const { token: t, superAdmin } = res.data
    localStorage.setItem('bo_token', t)
    api.defaults.headers.common['Authorization'] = `Bearer ${t}`
    setToken(t)
    setUser(superAdmin)
    return res.data
  }

  const initSuperAdmin = async (data) => {
    const res = await api.post('/backoffice/auth/init', data)
    const { token: t, superAdmin } = res.data
    localStorage.setItem('bo_token', t)
    api.defaults.headers.common['Authorization'] = `Bearer ${t}`
    setToken(t)
    setUser(superAdmin)
    return res.data
  }

  const logout = () => {
    localStorage.removeItem('bo_token')
    delete api.defaults.headers.common['Authorization']
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout, initSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
