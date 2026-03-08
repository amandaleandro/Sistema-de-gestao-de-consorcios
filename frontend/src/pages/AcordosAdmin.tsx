import { useEffect, useState } from 'react'
import api from '../lib/api'
import { ResumoParticipante } from '../types'
import { formatBRL } from '../lib/utils'
import { Link } from 'react-router-dom'
import AcordosFiltros from '../components/AcordosFiltros'

export default function AcordosAdmin() {
  const [inadimplentes, setInadimplentes] = useState<ResumoParticipante[]>([])
  const [loading, setLoading] = useState(true)
  const [acordos, setAcordos] = useState<any[]>([])
  const [filtros, setFiltros] = useState<any>({})

  useEffect(() => {
    api.get<ResumoParticipante[]>('/participantes/inadimplentes').then(r => {
      setInadimplentes(r.data)
      setLoading(false)
    })
    // Carrega acordos ao abrir a página
    buscarAcordos({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const buscarAcordos = async (f: Record<string, string | number | undefined>) => {
    setLoading(true)
    const params = new URLSearchParams()
    Object.entries(f).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') params.append(k, String(v)) })
    const res = await api.get('/acordos/filtros?' + params.toString())
    setAcordos(res.data)
    setLoading(false)
  }

  return (
    <div className="p-8 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Acordos e Simulações de Inadimplentes</h2>
      <div className="flex justify-end mb-4">
        <a
          href="/api/acordos/export/csv"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
        >
          Exportar acordos (CSV)
        </a>
      </div>
      <AcordosFiltros onChange={f => { setFiltros(f); buscarAcordos(f) }} />

      {loading ? (
        <p className="text-gray-400">Carregando...</p>
      ) : acordos.length === 0 ? (
        <p className="text-gray-400">Nenhum acordo encontrado.</p>
      ) : (
        <div className="space-y-4">
          {acordos.map(a => (
            <div key={a.id} className="card border-l-4 border-blue-400">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-lg">Acordo {a.id}</span>
                  <span className="ml-2 text-xs text-gray-500">Status: {a.status}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Total</div>
                  <div className="font-bold text-blue-600">{formatBRL(a.total)}</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">Criado em: {new Date(a.criado_em).toLocaleDateString()}</div>
              <div className="mt-2">
                <Link to={`/acordos/${a.participante_id}`} className="btn-secondary ml-4">Detalhes</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
