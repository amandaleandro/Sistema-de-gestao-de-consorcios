import { useEffect, useState } from 'react'
import api from '../lib/api'
import { ResumoParticipante } from '../types'
import { formatBRL } from '../lib/utils'
import { Link } from 'react-router-dom'

export default function AcordosAdmin() {
  const [inadimplentes, setInadimplentes] = useState<ResumoParticipante[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<ResumoParticipante[]>('/participantes/inadimplentes').then(r => {
      setInadimplentes(r.data)
      setLoading(false)
    })
  }, [])

  return (
    <div className="p-8 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Acordos e Simulações de Inadimplentes</h2>
      {loading ? (
        <p className="text-gray-400">Carregando...</p>
      ) : inadimplentes.length === 0 ? (
        <p className="text-gray-400">Nenhum inadimplente no momento.</p>
      ) : (
        <div className="space-y-4">
          {inadimplentes.map(p => (
            <div key={p.participante_id} className="card border-l-4 border-red-400">
              <div className="flex items-center justify-between">
                <div>
                  <Link to={`/participantes/${p.participante_id}`} className="font-semibold text-lg hover:text-brand-600">{p.nome}</Link>
                  <span className="ml-2 text-xs text-gray-500">{p.telefone}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Total Devido</div>
                  <div className="font-bold text-red-600">{formatBRL(p.total_devido)}</div>
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xs text-gray-500">Sugestão de acordo:</span>
                <span className="ml-2 font-medium text-blue-700">{formatBRL(Math.ceil(p.total_devido/6))} x 6 meses</span>
                <span className="ml-2 text-xs text-gray-400">(ou personalize na tela do participante)</span>
              </div>
              <div className="mt-4">
                <Link to={`/acordos/${p.participante_id}`} className="btn-secondary ml-4">Simular/Aprovar acordo</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
