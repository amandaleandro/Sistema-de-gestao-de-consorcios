import { useState } from 'react'
import { formatBRL } from '../lib/utils'

export interface AcordoSimulado {
  valorParcela: number
  parcelas: number
  total: number
}

export default function SimuladorAcordo({ totalDevido }: { totalDevido: number }) {
  const [valorMensal, setValorMensal] = useState('')
  const [parcelas, setParcelas] = useState(3)

  // Calcula parcelas baseado no valor mensal sugerido
  const valor = Number(valorMensal.replace(/[^0-9,]/g, '').replace(',', '.'))
  const parcelasCalculadas = valor > 0 ? Math.ceil(totalDevido / valor) : parcelas
  const valorParcela = valor > 0 ? valor : totalDevido / parcelas

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Quanto pode pagar por mês?</label>
          <input
            type="text"
            className="input w-32"
            placeholder="Ex: 200,00"
            value={valorMensal}
            onChange={e => setValorMensal(e.target.value)}
          />
        </div>
        <div className="text-gray-500 text-xs">ou</div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Parcelas desejadas</label>
          <input
            type="number"
            className="input w-20"
            min={1}
            max={36}
            value={parcelas}
            onChange={e => setParcelas(Number(e.target.value))}
            disabled={valorMensal !== ''}
          />
        </div>
      </div>
      <div className="bg-white rounded p-3 border text-sm">
        <p>
          <span className="font-medium">Simulação:</span> Quitar sua dívida de <span className="font-semibold text-red-600">{formatBRL(totalDevido)}</span><br />
          {valorMensal !== '' && Number(valorMensal.replace(/[^0-9,]/g, '').replace(',', '.')) > 0 ? (
            <>
              Pagando <span className="font-semibold text-blue-700">{formatBRL(valorParcela)}</span> por mês, você quita em <span className="font-semibold text-blue-700">{parcelasCalculadas} meses</span>.
            </>
          ) : (
            <>
              Em <span className="font-semibold text-blue-700">{parcelas}x</span> de <span className="font-semibold text-blue-700">{formatBRL(valorParcela)}</span>.
            </>
          )}
        </p>
        <p className="mt-2 text-xs text-gray-500">* Sem juros ou taxas extras. Ajuste o valor conforme sua realidade.</p>
      </div>
    </div>
  )
}

// Adiciona callback para enviar simulação
export function useSimuladorAcordo(totalDevido: number) {
  const [valorMensal, setValorMensal] = useState('')
  const [parcelas, setParcelas] = useState(3)
  const valor = Number(valorMensal.replace(/[^0-9,]/g, '').replace(',', '.'))
  const parcelasCalculadas = valor > 0 ? Math.ceil(totalDevido / valor) : parcelas
  const valorParcela = valor > 0 ? valor : totalDevido / parcelas
  return {
    valorMensal, setValorMensal, parcelas, setParcelas, valorParcela, parcelasCalculadas
  }
}

export function SimuladorAcordoAdmin({ totalDevido, onSimular }: { totalDevido: number, onSimular: (acordo: AcordoSimulado) => void }) {
  const { valorMensal, setValorMensal, parcelas, setParcelas, valorParcela, parcelasCalculadas } = useSimuladorAcordo(totalDevido)
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Quanto pode pagar por mês?</label>
          <input
            type="text"
            className="input w-32"
            placeholder="Ex: 200,00"
            value={valorMensal}
            onChange={e => setValorMensal(e.target.value)}
          />
        </div>
        <div className="text-gray-500 text-xs">ou</div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Parcelas desejadas</label>
          <input
            type="number"
            className="input w-20"
            min={1}
            max={36}
            value={parcelas}
            onChange={e => setParcelas(Number(e.target.value))}
            disabled={valorMensal !== ''}
          />
        </div>
      </div>
      <div className="bg-white rounded p-3 border text-sm">
        <p>
          <span className="font-medium">Simulação:</span> Quitar sua dívida de <span className="font-semibold text-red-600">{formatBRL(totalDevido)}</span><br />
          {valorMensal !== '' && Number(valorMensal.replace(/[^0-9,]/g, '').replace(',', '.')) > 0 ? (
            <>
              Pagando <span className="font-semibold text-blue-700">{formatBRL(valorParcela)}</span> por mês, você quita em <span className="font-semibold text-blue-700">{parcelasCalculadas} meses</span>.
            </>
          ) : (
            <>
              Em <span className="font-semibold text-blue-700">{parcelas}x</span> de <span className="font-semibold text-blue-700">{formatBRL(valorParcela)}</span>.
            </>
          )}
        </p>
        <button className="btn-primary mt-2" onClick={() => onSimular({ valorParcela, parcelas: parcelasCalculadas, total: totalDevido })}>
          Registrar acordo
        </button>
        <p className="mt-2 text-xs text-gray-500">* Sem juros ou taxas extras. Ajuste o valor conforme a negociação.</p>
      </div>
    </div>
  )
}
