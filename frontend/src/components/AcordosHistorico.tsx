import { useEffect, useState } from 'react'
import api from '../lib/api'
import { formatBRL } from '../lib/utils'
import AcordoStatusActions from './AcordoStatusActions'
import AcordoPagamentosProgresso from './AcordoPagamentosProgresso'

interface Acordo {
  id: string
  valor_parcela: number
  parcelas: number
  total: number
  criado_em: string
  status?: string
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
          <li key={a.id} className="bg-gray-50 rounded p-3 border flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              <span className="font-medium">{a.parcelas}x</span> de <span className="font-medium">{formatBRL(a.valor_parcela)}</span> (Total: {formatBRL(a.total)})
            </span>
            <span className="text-xs text-gray-500 mt-1 sm:mt-0">{new Date(a.criado_em).toLocaleDateString()}</span>
            {a.status && (
              <span className={`ml-2 badge badge-${a.status}`}>{a.status}</span>
            )}
            {a.id && (
              <AcordoStatusActions acordoId={a.id} statusAtual={a.status || 'ativo'} onStatusChange={() => {}} />
            )}
            {a.id && a.total && (
              <AcordoPagamentosProgresso acordoId={a.id} total={a.total} />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
