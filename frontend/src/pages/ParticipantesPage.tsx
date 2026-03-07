import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { Participante } from '../types'
import { Plus, Pencil, Trash2, ChevronRight } from 'lucide-react'
import Modal from '../components/Modal'
import ParticipanteForm from '../components/ParticipanteForm'
import { useAuth } from '../context/AuthContext'

export default function ParticipantesPage() {
  const { isAdmin, isOperador } = useAuth()
  const [list, setList] = useState<Participante[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Participante | null>(null)

  const load = () => {
    setLoading(true)
    api.get<Participante[]>('/participantes').then(r => {
      setList(r.data)
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este participante?')) return
    await api.delete(`/participantes/${id}`)
    load()
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Participantes</h2>
        {isOperador && (
          <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
            <Plus size={16} /> Novo Participante
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400">Carregando...</p>
      ) : (
        <div className="card overflow-x-auto">
          {list.length === 0 ? (
            <p className="text-gray-400 text-sm">Nenhum participante cadastrado.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-400 text-xs uppercase tracking-wide">
                  <th className="pb-2 font-medium">Nome</th>
                  <th className="pb-2 font-medium">Telefone</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {list.map(p => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 font-medium">{p.nome}</td>
                    <td className="py-2 text-gray-500">{p.telefone || '-'}</td>
                    <td className="py-2">
                      <div className="flex justify-end gap-2">
                        {isOperador && (
                          <button className="btn-secondary p-1.5" onClick={() => { setEditing(p); setShowForm(true) }}>
                            <Pencil size={13} />
                          </button>
                        )}
                        {isAdmin && (
                          <button className="btn-danger p-1.5" onClick={() => handleDelete(p.id)}>
                            <Trash2 size={13} />
                          </button>
                        )}
                        <Link to={`/participantes/${p.id}`} className="btn-secondary p-1.5">
                          <ChevronRight size={13} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null) }}
        title={editing ? 'Editar Participante' : 'Novo Participante'}
      >
        <ParticipanteForm
          initial={editing}
          onSaved={() => { setShowForm(false); setEditing(null); load() }}
          onCancel={() => { setShowForm(false); setEditing(null) }}
        />
      </Modal>
    </div>
  )
}
