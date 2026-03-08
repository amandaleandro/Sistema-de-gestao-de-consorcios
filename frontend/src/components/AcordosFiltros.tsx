import { useState } from 'react'

export default function AcordosFiltros({ onChange }: { onChange: (filtros: any) => void }) {
  const [status, setStatus] = useState('')
  const [participante, setParticipante] = useState('')
  const [valorMin, setValorMin] = useState('')
  const [valorMax, setValorMax] = useState('')
  const [periodoDe, setPeriodoDe] = useState('')
  const [periodoAte, setPeriodoAte] = useState('')

  const aplicar = () => {
    onChange({ status, participante, valor_min: valorMin, valor_max: valorMax, periodo_de: periodoDe, periodo_ate: periodoAte })
  }

  return (
    <form className="flex flex-wrap gap-2 items-end mb-4" onSubmit={e => { e.preventDefault(); aplicar() }}>
      <div>
        <label className="block text-xs text-gray-600">Status</label>
        <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="ativo">Ativo</option>
          <option value="quitado">Quitado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-600">Participante (ID)</label>
        <input className="input" value={participante} onChange={e => setParticipante(e.target.value)} placeholder="ID ou parte do nome" />
      </div>
      <div>
        <label className="block text-xs text-gray-600">Valor mínimo</label>
        <input className="input" type="number" value={valorMin} onChange={e => setValorMin(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs text-gray-600">Valor máximo</label>
        <input className="input" type="number" value={valorMax} onChange={e => setValorMax(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs text-gray-600">De</label>
        <input className="input" type="date" value={periodoDe} onChange={e => setPeriodoDe(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs text-gray-600">Até</label>
        <input className="input" type="date" value={periodoAte} onChange={e => setPeriodoAte(e.target.value)} />
      </div>
      <button className="btn-primary" type="submit">Filtrar</button>
    </form>
  )
}
