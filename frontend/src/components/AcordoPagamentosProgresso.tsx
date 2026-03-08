import { useEffect, useState } from 'react'
import api from '../lib/api'
import { formatBRL } from '../lib/utils'

interface Pagamento {
  id: string
  valor_pago: number
  data_pagamento: string
}

export default function AcordoPagamentosProgresso({ acordoId, total }: { acordoId: string, total: number }) {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Pagamento[]>(`/acordos/${acordoId}/pagamentos`).then(r => {
      setPagamentos(r.data)
      setLoading(false)
    })
  }, [acordoId])

  const totalPago = pagamentos.reduce((s, p) => s + p.valor_pago, 0)
  const progresso = Math.min(100, Math.round((totalPago / total) * 100))

  if (loading) return <div className="text-gray-400">Carregando pagamentos...</div>

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <div className="w-full bg-gray-200 rounded h-3 overflow-hidden">
          <div className="bg-green-500 h-3" style={{ width: progresso + '%' }} />
        </div>
        <span className="text-xs text-gray-600">{progresso}%</span>
      </div>
      <div className="text-xs text-gray-500 mt-1">Pago: {formatBRL(totalPago)} / {formatBRL(total)}</div>
      {pagamentos.length > 0 && (
        <ul className="mt-1 text-xs text-gray-700 space-y-1">
          {pagamentos.map(p => (
            <li key={p.id}>• {formatBRL(p.valor_pago)} em {new Date(p.data_pagamento).toLocaleDateString()}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
