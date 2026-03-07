import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CircleDollarSign, Lock, Mail, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname || '/'

  const [form, setForm] = useState({ email: '', senha: '' })
  const [showSenha, setShowSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Se já está logado, redireciona
  if (user) {
    navigate(from, { replace: true })
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.email || !form.senha) {
      setError('Preencha e-mail e senha.')
      return
    }
    setLoading(true)
    try {
      await login(form.email, form.senha)
      navigate(from, { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Erro ao fazer login. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4 backdrop-blur">
            <CircleDollarSign size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Gestão de Consórcios</h1>
          <p className="text-brand-100 text-sm mt-1">Acesse sua conta para continuar</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Entrar</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label className="label">E-mail</label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="email"
                  className="input pl-9"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type={showSenha ? 'text' : 'password'}
                  className="input pl-9 pr-10"
                  placeholder="••••••"
                  autoComplete="current-password"
                  value={form.senha}
                  onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowSenha(s => !s)}
                  tabIndex={-1}
                >
                  {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full justify-center py-2.5 text-base"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6">
            Acesso restrito. Entre em contato com o administrador para obter suas credenciais.
          </p>
        </div>
      </div>
    </div>
  )
}
