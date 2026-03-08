import { useState } from 'react'
import api from '../lib/api'

export default function AcordoStatusActions({ acordoId, statusAtual, onStatusChange }: { acordoId: string, statusAtual: string, onStatusChange: (status: string) => void }) {
  const [loading, setLoading] = useState(false)
  const [obs, setObs] = useState('')

  const atualizar = async (status: string) => {
    setLoading(true)
    await api.patch(`/acordos/${acordoId}/status`, { status, observacao: obs })
    setLoading(false)
    onStatusChange(status)
  }

  return (
    <div className="flex flex-col gap-2 mt-2">
      <textarea className="input" placeholder="Observação (opcional)" value={obs} onChange={e => setObs(e.target.value)} />
      <div className="flex gap-2">
        <button className="btn-primary" disabled={loading || statusAtual==='ativo'} onClick={() => atualizar('ativo')}>Ativar</button>
        <button className="btn-success" disabled={loading || statusAtual==='quitado'} onClick={() => atualizar('quitado')}>Quitar</button>
        <button className="btn-danger" disabled={loading || statusAtual==='cancelado'} onClick={() => atualizar('cancelado')}>Cancelar</button>
      </div>
    </div>
  )
}
