import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  CircleDollarSign,
  CreditCard,
  Gift,
  ShieldCheck,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ConsorciosPage from './pages/ConsorciosPage'
import ConsorcioDetal from './pages/ConsorcioDetalhe'
import ParticipantesPage from './pages/ParticipantesPage'
import ParticipanteDetalhe from './pages/ParticipanteDetalhe'
import PagamentosPage from './pages/PagamentosPage'
import RecebimentosPage from './pages/RecebimentosPage'
import UsuariosPage from './pages/UsuariosPage'
import AcordosAdmin from './pages/AcordosAdmin'
import AcordoDetalheAdmin from './pages/AcordoDetalheAdmin'

const roleColors: Record<string, string> = {
  admin: 'bg-red-500/20 text-red-200',
  operador: 'bg-blue-500/20 text-blue-200',
  visualizador: 'bg-white/10 text-white/70',
}
const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  operador: 'Operador',
  visualizador: 'Visualizador',
}

function AppLayout() {
  const { user, logout, isAdmin } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const nav = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/consorcios', label: 'Consórcios', icon: CircleDollarSign },
    { to: '/participantes', label: 'Participantes', icon: Users },
    { to: '/pagamentos', label: 'Pagamentos', icon: CreditCard },
    { to: '/recebimentos', label: 'Recebimentos', icon: Gift },
    ...(isAdmin ? [
      { to: '/usuarios', label: 'Usuários', icon: ShieldCheck },
      { to: '/acordos', label: 'Acordos', icon: CreditCard },
      { to: '/acordos/:id', label: 'Detalhe de Acordo', icon: CreditCard },
    ] : []),
  ]

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-brand-900 flex flex-col shrink-0">
        <div className="px-6 py-5 border-b border-brand-700">
          <h1 className="text-white font-bold text-lg leading-tight">
            Gestão de<br />Consórcios
          </h1>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-brand-100 hover:bg-brand-700 hover:text-white',
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        {user && (
          <div className="border-t border-brand-700 p-3">
            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-brand-700 transition-colors text-left"
              onClick={() => setUserMenuOpen(o => !o)}
            >
              <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {user.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{user.nome}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${roleColors[user.role]}`}>
                  {roleLabels[user.role]}
                </span>
              </div>
              <ChevronDown
                size={14}
                className={clsx('text-brand-300 transition-transform', userMenuOpen && 'rotate-180')}
              />
            </button>

            {userMenuOpen && (
              <div className="mt-1 mx-1">
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-300 hover:bg-red-900/30 rounded-lg transition-colors"
                  onClick={logout}
                >
                  <LogOut size={15} />
                  Sair
                </button>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/consorcios" element={<ProtectedRoute><ConsorciosPage /></ProtectedRoute>} />
          <Route path="/consorcios/:id" element={<ProtectedRoute><ConsorcioDetal /></ProtectedRoute>} />
          <Route path="/participantes" element={<ProtectedRoute><ParticipantesPage /></ProtectedRoute>} />
          <Route path="/participantes/:id" element={<ProtectedRoute><ParticipanteDetalhe /></ProtectedRoute>} />
          <Route path="/pagamentos" element={<ProtectedRoute><PagamentosPage /></ProtectedRoute>} />
          <Route path="/recebimentos" element={<ProtectedRoute><RecebimentosPage /></ProtectedRoute>} />
          <Route path="/usuarios" element={<ProtectedRoute requiredRole="admin"><UsuariosPage /></ProtectedRoute>} />
          <Route path="/acordos" element={<ProtectedRoute requiredRole="admin"><AcordosAdmin /></ProtectedRoute>} />
          <Route path="/acordos/:id" element={<ProtectedRoute requiredRole="admin"><AcordoDetalheAdmin /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

