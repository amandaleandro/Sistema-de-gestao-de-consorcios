import { useEffect, useState } from 'react'
import api from '../lib/api'
import { Pagamento, ConsorcioParticipante, Periodo, Consorcio, Participante } from '../types'
import { formatBRL, formatDate } from '../lib/utils'
import { Plus, Trash2 } from 'lucide-react'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'

interface CPEnriched extends ConsorcioParticipante {
  participante_nome: string
  consorcio_nome: string
}

export default function PagamentosPage() {
  const { isAdmin, isOperador } = useAuth()
  const [list, setList] = useState<Pagamento[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [cpList, setCpList] = useState<CPEnriched[]>([])
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [form, setForm] = useState({
    consorcio_participante_id: '',
    periodo_id: '',
    data_pagamento: new Date().toISOString().slice(0, 10),
    valor_pago: '',
    observacao: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    api.get<Pagamento[]>('/pagamentos').then(r => {
      setList(r.data)
      setLoading(false)
    })
  }

  const loadCPs = async () => {
    const [consorcios, participantes] = await Promise.all([
      api.get<Consorcio[]>('/consorcios'),
      api.get<Participante[]>('/participantes'),
    ])
    // buscar todos os vínculos de forma simples
    const cpAll: CPEnriched[] = []
    for (const c of consorcios.data) {
      try {
        const r = await api.get<ConsorcioParticipante[]>(`/consorcios/${c.id}/participantes`)
        for (const cp of r.data) {
          const part = participantes.data.find(p => p.id === cp.participante_id)
          cpAll.push({ ...cp, participante_nome: part?.nome ?? '', consorcio_nome: c.nome })
        }
      } catch { /* sem participantes */ }
    }
    setCpList(cpAll)
  }

  useEffect(() => { load() }, [])

  const handleOpenForm = async () => {
    await loadCPs()
    setShowForm(true)
  }

  const handleCPChange = async (cpId: string) => {
    setForm(f => ({ ...f, consorcio_participante_id: cpId, periodo_id: '' }))
    if (!cpId) { setPeriodos([]); return }
    const cp = cpList.find(c => c.id === cpId)
    if (!cp) return
    const r = await api.get<Periodo[]>(`/consorcios/${cp.consorcio_id}/periodos`)
    setPeriodos(r.data)
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.consorcio_participante_id || !form.periodo_id || !form.valor_pago) {
      setError('Preencha todos os campos obrigatórios.')
      return
    }
    setSaving(true)
    try {
      await api.post('/pagamentos', { ...form, valor_pago: Number(form.valor_pago) })
      setShowForm(false)
      setForm({ consorcio_participante_id: '', periodo_id: '', data_pagamento: new Date().toISOString().slice(0, 10), valor_pago: '', observacao: '' })
      load()
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir pagamento?')) return
    await api.delete(`/pagamentos/${id}`)
    load()
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Pagamentos</h2>
        {isOperador && (
          <button className="btn-primary" onClick={handleOpenForm}>
            <Plus size={16} /> Registrar Pagamento
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400">Carregando...</p>
      ) : (
        <div className="card overflow-x-auto">
          {list.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum pagamento registrado.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-400 text-xs uppercase tracking-wide">
                  <th className="pb-2 font-medium">Participante</th>
                  <th className="pb-2 font-medium">Consórcio</th>
                  <th className="pb-2 font-medium">Período</th>
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 font-medium text-right">Valor</th>
                  <th className="pb-2 font-medium">Obs.</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {list.map(p => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 font-medium">{p.participante_nome}</td>
                    <td className="py-2 text-gray-600">{p.consorcio_nome}</td>
                    <td className="py-2 text-gray-500">#{p.periodo_numero} · {formatDate(p.data_referencia ?? '')}</td>
                    <td className="py-2 text-gray-500">{formatDate(p.data_pagamento)}</td>
                    <td className="py-2 text-right font-semibold text-green-600">{formatBRL(p.valor_pago)}</td>
                    <td className="py-2 text-gray-400 text-xs max-w-xs truncate">{p.observacao}</td>
                    <td className="py-2 text-right">
                      {isAdmin && (
                        <button className="text-red-400 hover:text-red-600" onClick={() => handleDelete(p.id)}>
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
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Registrar Pagamento">
        <div className="space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div>
            <label className="label">Participante / Consórcio *</label>
            <select className="input" value={form.consorcio_participante_id}
              onChange={e => handleCPChange(e.target.value)}>
              <option value="">Selecione...</option>
              {cpList.map(cp => (
                <option key={cp.id} value={cp.id}>
                  {cp.participante_nome} — {cp.consorcio_nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Período *</label>
            <select className="input" value={form.periodo_id}
              onChange={e => setForm(f => ({ ...f, periodo_id: e.target.value }))}>
              <option value="">Selecione...</option>
              {periodos.map(p => (
                <option key={p.id} value={p.id}>
                  #{p.numero} · {formatDate(p.data_referencia)} · {formatBRL(p.valor_cota)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Data do Pagamento</label>
              <input type="date" className="input" value={form.data_pagamento}
                onChange={e => setForm(f => ({ ...f, data_pagamento: e.target.value }))} />
            </div>
            <div>
              <label className="label">Valor Pago *</label>
              <input type="number" min="0" step="0.01" className="input" placeholder="0,00"
                value={form.valor_pago}
                onChange={e => setForm(f => ({ ...f, valor_pago: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Observação</label>
            <input className="input" placeholder="Opcional" value={form.observacao}
              onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Salvando...' : 'Registrar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
