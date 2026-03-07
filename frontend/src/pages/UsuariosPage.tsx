import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Plus, Pencil, Trash2, KeyRound, ShieldCheck } from 'lucide-react'
import Modal from '../components/Modal'

interface User {
  id: string
  nome: string
  email: string
  role: 'admin' | 'operador' | 'visualizador'
  ativo: boolean
  criado_em: string
}

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-800',
  operador: 'bg-blue-100 text-blue-800',
  visualizador: 'bg-gray-100 text-gray-600',
}
const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  operador: 'Operador',
  visualizador: 'Visualizador',
}

const emptyForm = { nome: '', email: '', senha: '', role: 'operador' as User['role'], ativo: true }

export default function UsuariosPage() {
  const { user: me } = useAuth()
  const [list, setList] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [showSenha, setShowSenha] = useState(false)
  const [senhaForm, setSenhaForm] = useState({ novaSenha: '', confirmar: '' })
  const [targetUser, setTargetUser] = useState<User | null>(null)
  const [savingSenha, setSavingSenha] = useState(false)
  const [erroSenha, setErroSenha] = useState('')

  const load = () => {
    setLoading(true)
    api.get<User[]>('/users').then(r => {
      setList(r.data)
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setShowForm(true)
  }

  const openEdit = (u: User) => {
    setEditing(u)
    setForm({ nome: u.nome, email: u.email, senha: '', role: u.role, ativo: u.ativo })
    setError('')
    setShowForm(true)
  }

  const handleSave = async () => {
    setError('')
    if (!form.nome || !form.email) {
      setError('Nome e e-mail são obrigatórios.')
      return
    }
    if (!editing && (!form.senha || form.senha.length < 6)) {
      setError('Senha deve ter no mínimo 6 caracteres.')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/users/${editing.id}`, { nome: form.nome, email: form.email, role: form.role, ativo: form.ativo })
      } else {
        await api.post('/users', { nome: form.nome, email: form.email, senha: form.senha, role: form.role })
      }
      setShowForm(false)
      load()
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Erro ao salvar usuário.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (u: User) => {
    if (!confirm(`Excluir o usuário "${u.nome}"? Esta ação não pode ser desfeita.`)) return
    await api.delete(`/users/${u.id}`)
    load()
  }

  const openSenha = (u: User) => {
    setTargetUser(u)
    setSenhaForm({ novaSenha: '', confirmar: '' })
    setErroSenha('')
    setShowSenha(true)
  }

  const handleAlterarSenha = async () => {
    setErroSenha('')
    if (!senhaForm.novaSenha || senhaForm.novaSenha.length < 6) {
      setErroSenha('Senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (senhaForm.novaSenha !== senhaForm.confirmar) {
      setErroSenha('As senhas não coincidem.')
      return
    }
    setSavingSenha(true)
    try {
      await api.patch(`/users/${targetUser!.id}/senha`, { nova_senha: senhaForm.novaSenha })
      setShowSenha(false)
    } catch (e: any) {
      setErroSenha(e.response?.data?.error ?? 'Erro ao alterar senha.')
    } finally {
      setSavingSenha(false)
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Usuários do Sistema</h2>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie os acessos e permissões.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Novo Usuário
        </button>
      </div>

      {/* Legenda de roles */}
      <div className="flex gap-4 flex-wrap">
        {Object.entries(roleLabels).map(([role, label]) => (
          <div key={role} className="flex items-center gap-1.5 text-sm">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[role]}`}>
              {label}
            </span>
            <span className="text-gray-500">
              {role === 'admin' && '— CRUD completo + gerência de usuários'}
              {role === 'operador' && '— Leitura + criar/editar registros'}
              {role === 'visualizador' && '— Somente leitura'}
            </span>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400">Carregando...</p>
      ) : (
        <div className="card overflow-x-auto">
          {list.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum usuário cadastrado.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-400 text-xs uppercase tracking-wide">
                  <th className="pb-2 font-medium">Nome</th>
                  <th className="pb-2 font-medium">E-mail</th>
                  <th className="pb-2 font-medium">Nível</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {list.map(u => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2.5 font-medium text-gray-900">
                      {u.nome}
                      {u.id === me?.id && (
                        <span className="ml-2 text-xs text-brand-600 font-normal">(você)</span>
                      )}
                    </td>
                    <td className="py-2.5 text-gray-500">{u.email}</td>
                    <td className="py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role]}`}>
                        {roleLabels[u.role]}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className={u.ativo ? 'badge-ativo' : 'badge-inadimplente'}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <div className="flex justify-end gap-2">
                        <button
                          className="btn-secondary p-1.5"
                          onClick={() => openSenha(u)}
                          title="Alterar senha"
                        >
                          <KeyRound size={13} />
                        </button>
                        <button
                          className="btn-secondary p-1.5"
                          onClick={() => openEdit(u)}
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        {u.id !== me?.id && (
                          <button
                            className="btn-danger p-1.5"
                            onClick={() => handleDelete(u)}
                            title="Excluir"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal criar/editar */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Editar Usuário' : 'Novo Usuário'}
      >
        <div className="space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>}
          <div>
            <label className="label">Nome *</label>
            <input className="input" value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
          </div>
          <div>
            <label className="label">E-mail *</label>
            <input type="email" className="input" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          {!editing && (
            <div>
              <label className="label">Senha * (mín. 6 caracteres)</label>
              <input type="password" className="input" value={form.senha}
                onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} />
            </div>
          )}
          <div>
            <label className="label">Nível de Acesso</label>
            <select className="input" value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value as User['role'] }))}>
              <option value="admin">Administrador</option>
              <option value="operador">Operador</option>
              <option value="visualizador">Visualizador</option>
            </select>
          </div>
          {editing && (
            <div className="flex items-center gap-3">
              <label className="label mb-0">Ativo</label>
              <input type="checkbox" checked={form.ativo}
                onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
                className="w-4 h-4 accent-brand-600" />
            </div>
          )}

          {/* Descrição do role */}
          <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
            <ShieldCheck size={12} className="inline mr-1" />
            {form.role === 'admin' && 'Acesso total: CRUD em tudo + gerência de usuários.'}
            {form.role === 'operador' && 'Pode criar e editar registros. Não pode excluir nem gerenciar usuários.'}
            {form.role === 'visualizador' && 'Acesso somente leitura. Não pode criar, editar ou excluir.'}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar Usuário'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal alterar senha */}
      <Modal
        open={showSenha}
        onClose={() => setShowSenha(false)}
        title={`Alterar senha — ${targetUser?.nome}`}
      >
        <div className="space-y-4">
          {erroSenha && <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{erroSenha}</p>}
          <div>
            <label className="label">Nova Senha *</label>
            <input type="password" className="input" placeholder="Mínimo 6 caracteres"
              value={senhaForm.novaSenha}
              onChange={e => setSenhaForm(f => ({ ...f, novaSenha: e.target.value }))} />
          </div>
          <div>
            <label className="label">Confirmar Nova Senha *</label>
            <input type="password" className="input"
              value={senhaForm.confirmar}
              onChange={e => setSenhaForm(f => ({ ...f, confirmar: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button className="btn-secondary" onClick={() => setShowSenha(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleAlterarSenha} disabled={savingSenha}>
              {savingSenha ? 'Salvando...' : 'Alterar Senha'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
