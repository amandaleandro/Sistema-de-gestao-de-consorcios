import { useEffect, useState } from 'react'
import api from '../lib/api'
import { Recebimento, ConsorcioParticipante, Periodo, Consorcio, Participante } from '../types'
import { formatBRL, formatDate } from '../lib/utils'
import { Plus, Trash2 } from 'lucide-react'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'

interface CPEnriched extends ConsorcioParticipante {
  participante_nome: string
  consorcio_nome: string
  consorcio_id: string
}

export default function RecebimentosPage() {
  const { isAdmin, isOperador } = useAuth()
  const [list, setList] = useState<Recebimento[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [cpList, setCpList] = useState<CPEnriched[]>([])
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [form, setForm] = useState({
    consorcio_participante_id: '',
    periodo_id: '',
    data_recebimento: new Date().toISOString().slice(0, 10),
    valor_bruto: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [taxaPreview, setTaxaPreview] = useState<{ taxa: number; liquido: number } | null>(null)

  const load = () => {
    setLoading(true)
    api.get<Recebimento[]>('/recebimentos').then(r => {
      setList(r.data)
      setLoading(false)
    })
  }

  const loadCPs = async () => {
    const [consorcios, participantes] = await Promise.all([
      api.get<Consorcio[]>('/consorcios'),
      api.get<Participante[]>('/participantes'),
    ])
    const cpAll: CPEnriched[] = []
    for (const c of consorcios.data) {
      try {
        const r = await api.get<ConsorcioParticipante[]>(`/consorcios/${c.id}/participantes`)
        for (const cp of r.data) {
          const part = participantes.data.find(p => p.id === cp.participante_id)
          cpAll.push({ ...cp, participante_nome: part?.nome ?? '', consorcio_nome: c.nome, consorcio_id: c.id })
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
    setTaxaPreview(null)
    if (!cpId) { setPeriodos([]); return }
    const cp = cpList.find(c => c.id === cpId)
    if (!cp) return
    const r = await api.get<Periodo[]>(`/consorcios/${cp.consorcio_id}/periodos`)
    setPeriodos(r.data)
  }

  const calcPreview = (bruto: number, cpId: string) => {
    const cp = cpList.find(c => c.id === cpId)
    if (!cp || !bruto) { setTaxaPreview(null); return }
    // buscar taxa do consórcio
    api.get<Consorcio>(`/consorcios/${cp.consorcio_id}`).then(r => {
      const taxa = r.data.taxa_administrativa
      const taxaV = bruto * taxa / 100
      setTaxaPreview({ taxa: taxaV, liquido: bruto - taxaV })
    })
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.consorcio_participante_id || !form.periodo_id || !form.valor_bruto) {
      setError('Preencha todos os campos obrigatórios.')
      return
    }
    setSaving(true)
    try {
      await api.post('/recebimentos', { ...form, valor_bruto: Number(form.valor_bruto) })
      setShowForm(false)
      setForm({ consorcio_participante_id: '', periodo_id: '', data_recebimento: new Date().toISOString().slice(0, 10), valor_bruto: '' })
      setTaxaPreview(null)
      load()
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este recebimento?')) return
    await api.delete(`/recebimentos/${id}`)
    load()
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Recebimentos (Contemplações)</h2>
        {isOperador && (
          <button className="btn-primary" onClick={handleOpenForm}>
            <Plus size={16} /> Registrar Recebimento
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400">Carregando...</p>
      ) : (
        <div className="card overflow-x-auto">
          {list.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum recebimento registrado.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-400 text-xs uppercase tracking-wide">
                  <th className="pb-2 font-medium">Participante</th>
                  <th className="pb-2 font-medium">Consórcio</th>
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 font-medium text-right">Bruto</th>
                  <th className="pb-2 font-medium text-right">Taxa Adm.</th>
                  <th className="pb-2 font-medium text-right">Líquido</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {list.map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 font-medium">{r.participante_nome}</td>
                    <td className="py-2 text-gray-600">{r.consorcio_nome}</td>
                    <td className="py-2 text-gray-500">{formatDate(r.data_recebimento)}</td>
                    <td className="py-2 text-right">{formatBRL(r.valor_bruto)}</td>
                    <td className="py-2 text-right text-red-500">- {formatBRL(r.taxa_administrativa)}</td>
                    <td className="py-2 text-right font-bold text-green-600">{formatBRL(r.valor_liquido)}</td>
                    <td className="py-2 text-right">
                      {isAdmin && (
                        <button className="text-red-400 hover:text-red-600" onClick={() => handleDelete(r.id)}>
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

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Registrar Recebimento">
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
              <label className="label">Data do Recebimento</label>
              <input type="date" className="input" value={form.data_recebimento}
                onChange={e => setForm(f => ({ ...f, data_recebimento: e.target.value }))} />
            </div>
            <div>
              <label className="label">Valor Bruto *</label>
              <input type="number" min="0" step="0.01" className="input" placeholder="0,00"
                value={form.valor_bruto}
                onChange={e => {
                  setForm(f => ({ ...f, valor_bruto: e.target.value }))
                  calcPreview(Number(e.target.value), form.consorcio_participante_id)
                }} />
            </div>
          </div>
          {taxaPreview && (
            <div className="bg-blue-50 rounded-lg p-3 text-sm space-y-1">
              <p className="text-gray-500">Taxa administrativa: <strong className="text-red-500">- {formatBRL(taxaPreview.taxa)}</strong></p>
              <p className="text-gray-700 font-semibold">Valor líquido: <strong className="text-green-600">{formatBRL(taxaPreview.liquido)}</strong></p>
            </div>
          )}
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
