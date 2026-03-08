import { useEffect, useState } from 'react'
import api from '../lib/api'
import { formatBRL } from '../lib/utils'

interface Acordo {
  id: string
  valor_parcela: number
  parcelas: number
  total: number
  criado_em: string
}

export default function AcordosHistorico({ participanteId }: { participanteId: string }) {
  const [acordos, setAcordos] = useState<Acordo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Acordo[]>(`/participantes/${participanteId}/acordos`).then(r => {
      setAcordos(r.data)
      setLoading(false)
    })
  }, [participanteId])

  if (loading) return <div className="text-gray-400">Carregando acordos...</div>
  if (acordos.length === 0) return <div className="text-gray-400">Nenhum acordo registrado.</div>

  return (
    <div className="mt-4">
      <h4 className="font-semibold text-gray-700 mb-2">Histórico de Acordos</h4>
      <ul className="space-y-2">
        {acordos.map(a => (
          <li key={a.id} className="bg-gray-50 rounded p-3 border flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <span>
              <span className="font-medium">{a.parcelas}x</span> de <span className="font-medium">{formatBRL(a.valor_parcela)}</span> (Total: {formatBRL(a.total)})
            </span>
            <span className="text-xs text-gray-500 mt-1 sm:mt-0">{new Date(a.criado_em).toLocaleDateString()}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
