import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Props {
  children: React.ReactNode
  requiredRole?: 'admin' | 'operador'
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole === 'admin' && user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
        <div className="text-5xl">🔒</div>
        <h2 className="text-xl font-bold text-gray-800">Acesso Negado</h2>
        <p className="text-gray-500 text-sm">Apenas administradores podem acessar esta página.</p>
      </div>
    )
  }

  if (requiredRole === 'operador' && user.role === 'visualizador') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
        <div className="text-5xl">🔒</div>
        <h2 className="text-xl font-bold text-gray-800">Acesso Negado</h2>
        <p className="text-gray-500 text-sm">Você não tem permissão para acessar esta página.</p>
      </div>
    )
  }

  return <>{children}</>
}
