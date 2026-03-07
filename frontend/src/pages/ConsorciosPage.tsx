import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { Consorcio } from '../types'
import { formatBRL, formatDate, periodicidadeLabel } from '../lib/utils'
import { Plus, Pencil, Trash2, ChevronRight, RefreshCw } from 'lucide-react'
import Modal from '../components/Modal'
import ConsorcioForm from '../components/ConsorcioForm'
import { useAuth } from '../context/AuthContext'

export default function ConsorciosPage() {
  const { isAdmin, isOperador } = useAuth()
  const [list, setList] = useState<Consorcio[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Consorcio | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    api.get<Consorcio[]>('/consorcios').then(r => {
      setList(r.data)
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este consórcio?')) return
    await api.delete(`/consorcios/${id}`)
    load()
  }

  const handleGerarPeriodos = async (id: string) => {
    setGenerating(id)
    try {
      await api.post(`/consorcios/${id}/gerar-periodos`)
      alert('Períodos gerados com sucesso!')
    } catch {
      alert('Erro ao gerar períodos.')
    } finally {
      setGenerating(null)
    }
  }

  const handleSaved = () => {
    setShowForm(false)
    setEditing(null)
    load()
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Consórcios</h2>
        {isOperador && (
          <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
            <Plus size={16} /> Novo Consórcio
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400">Carregando...</p>
      ) : (
        <div className="space-y-3">
          {list.length === 0 && <p className="text-gray-400">Nenhum consórcio cadastrado.</p>}
          {list.map(c => (
            <div key={c.id} className="card flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900 truncate">{c.nome}</h3>
                  <span className={c.ativo ? 'badge-ativo' : 'badge-quitado'}>
                    {c.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {periodicidadeLabel[c.periodicidade]}
                  </span>
                </div>
                <div className="flex gap-6 mt-1 text-sm text-gray-500 flex-wrap">
                  <span>Cota inicial: <strong>{formatBRL(c.valor_inicial_cota)}</strong></span>
                  <span>Aumento: <strong>{formatBRL(c.taxa_aumento)}</strong></span>
                  <span>Taxa adm: <strong>{c.taxa_administrativa}%</strong></span>
                  <span>Participantes: <strong>{c.qtd_participantes}</strong></span>
                  <span>Início: <strong>{formatDate(c.data_inicio)}</strong></span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isOperador && (
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => handleGerarPeriodos(c.id)}
                    disabled={generating === c.id}
                    title="Gerar/Regerar períodos"
                  >
                    <RefreshCw size={14} className={generating === c.id ? 'animate-spin' : ''} />
                    Períodos
                  </button>
                )}
                {isOperador && (
                  <button
                    className="btn-secondary"
                    onClick={() => { setEditing(c); setShowForm(true) }}
                  >
                    <Pencil size={14} />
                  </button>
                )}
                {isAdmin && (
                  <button
                    className="btn-danger"
                    onClick={() => handleDelete(c.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <Link to={`/consorcios/${c.id}`} className="btn-secondary">
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null) }}
        title={editing ? 'Editar Consórcio' : 'Novo Consórcio'}
      >
        <ConsorcioForm
          initial={editing}
          onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditing(null) }}
        />
      </Modal>
    </div>
  )
}
