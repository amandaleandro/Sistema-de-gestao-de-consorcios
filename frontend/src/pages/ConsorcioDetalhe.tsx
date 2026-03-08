import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'
import { Consorcio, ConsorcioParticipante, Participante, Periodo } from '../types'
import { formatBRL, formatDate, periodicidadeLabel } from '../lib/utils'
import { ArrowLeft, Plus, Trash2, UserCheck } from 'lucide-react'
import Modal from '../components/Modal'
import clsx from 'clsx'
import { useAuth } from '../context/AuthContext'

const statusColors: Record<string, string> = {
  ativo: 'badge-ativo',
  inadimplente: 'badge-inadimplente',
  quitado: 'badge-quitado',
}

export default function ConsorcioDetalhe() {
  const { isAdmin, isOperador } = useAuth()
  const { id } = useParams<{ id: string }>()
  const [consorcio, setConsorcio] = useState<Consorcio | null>(null)
  const [participantes, setParticipantes] = useState<(ConsorcioParticipante & { nome: string; telefone: string })[]>([])
  const [todos, setTodos] = useState<Participante[]>([])
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [selectedP, setSelectedP] = useState('')
  const [dataEntrada, setDataEntrada] = useState('')

  const load = async () => {
    const [c, per] = await Promise.all([
      api.get<Consorcio>(`/consorcios/${id}`),
      api.get<Periodo[]>(`/consorcios/${id}/periodos`),
    ])
    setConsorcio(c.data)
    setPeriodos(per.data)

    // buscar participantes do consórcio via query
    const ps = await api.get<Participante[]>('/participantes')
    setTodos(ps.data)

    // buscar vínculos
    const cp = await api.get<ConsorcioParticipante[]>(`/consorcios/${id}/participantes`).catch(() => ({ data: [] }))
    // join com nomes
    const enriched = (cp.data as ConsorcioParticipante[]).map(v => {
      const found = ps.data.find(p => p.id === v.participante_id)
      return { ...v, nome: found?.nome ?? '', telefone: found?.telefone ?? '' }
    })
    setParticipantes(enriched)
  }

  useEffect(() => { load() }, [id])

  const handleAdd = async () => {
    if (!selectedP) return
    await api.post(`/consorcios/${id}/participantes`, {
      participante_id: selectedP,
      data_entrada: dataEntrada || new Date().toISOString().slice(0, 10),
    })
    setShowAdd(false)
    setSelectedP('')
    setDataEntrada('')
    load()
  }

  const handleRemove = async (pid: string) => {
    if (!confirm('Remover participante deste consórcio?')) return
    await api.delete(`/consorcios/${id}/participantes/${pid}`)
    load()
  }

  const handleStatus = async (pid: string, status: string) => {
    await api.patch(`/consorcios/${id}/participantes/${pid}/status`, { status })
    load()
  }

  if (!consorcio) return <div className="p-8 text-gray-400">Carregando...</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/consorcios" className="btn-secondary p-2">
          <ArrowLeft size={16} />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">{consorcio.nome}</h2>
        <span className={consorcio.ativo ? 'badge-ativo' : 'badge-quitado'}>
          {consorcio.ativo ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      {/* Info */}
      <div className="card grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          ['Cota Inicial', formatBRL(consorcio.valor_inicial_cota)],
          ['Aumento', formatBRL(consorcio.taxa_aumento)],
          ['Taxa Adm.', `${consorcio.taxa_administrativa}%`],
          ['Periodicidade', periodicidadeLabel[consorcio.periodicidade]],
          ['Início', formatDate(consorcio.data_inicio)],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{k}</p>
            <p className="text-base font-semibold text-gray-800 mt-0.5">{v}</p>
          </div>
        ))}
      </div>

      {/* Participantes */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Participantes</h3>
          {isOperador && (
            <button className="btn-primary text-sm" onClick={() => setShowAdd(true)}>
              <Plus size={14} /> Adicionar
            </button>
          )}
        </div>
        {participantes.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum participante vinculado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-400 text-xs uppercase tracking-wide">
                <th className="pb-2 font-medium">Nome</th>
                <th className="pb-2 font-medium">Telefone</th>
                <th className="pb-2 font-medium">Entrada</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {participantes.map(p => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 font-medium">
                    <Link to={`/participantes/${p.participante_id}`} className="hover:text-brand-600">
                      {p.nome}
                    </Link>
                  </td>
                  <td className="py-2 text-gray-500">{p.telefone || '-'}</td>
                  <td className="py-2 text-gray-500">{formatDate(p.data_entrada)}</td>
                  <td className="py-2">
                    {isOperador ? (
                      <select
                        className="text-xs border rounded px-1.5 py-0.5"
                        value={p.status}
                        onChange={e => handleStatus(p.participante_id, e.target.value)}
                      >
                        <option value="ativo">Ativo</option>
                        <option value="inadimplente">Inadimplente</option>
                        <option value="quitado">Quitado</option>
                      </select>
                    ) : (
                      <span className={clsx('badge', statusColors[p.status])}>{p.status}</span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    {isAdmin && (
                      <button className="text-red-500 hover:text-red-700" onClick={() => handleRemove(p.participante_id)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Períodos */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">Períodos ({periodos.length})</h3>
        {periodos.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum período gerado. Use o botão "Períodos" na listagem.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-400 text-xs uppercase tracking-wide">
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 font-medium text-right">Valor da Cota</th>
                </tr>
              </thead>
              <tbody>
                {periodos.map(p => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-1.5 text-gray-500">{p.numero}</td>
                    <td className="py-1.5">{formatDate(p.data_referencia)}</td>
                    <td className="py-1.5 text-right font-semibold">{formatBRL(p.valor_cota)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal adicionar participante */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Adicionar Participante">
        <div className="space-y-4">
          <div>
            <label className="label">Participante</label>
            <select className="input" value={selectedP} onChange={e => setSelectedP(e.target.value)}>
              <option value="">Selecione...</option>
              {todos.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Data de Entrada</label>
            <input
              className="input"
              type="date"
              value={dataEntrada}
              onChange={e => setDataEntrada(e.target.value)}
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleAdd}>
              <UserCheck size={14} /> Adicionar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
