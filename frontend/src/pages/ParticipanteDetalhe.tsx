import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'
import { ResumoParticipante, ConsolidacaoDia } from '../types'
import { formatBRL, formatDate, statusLabel } from '../lib/utils'
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, Calendar } from 'lucide-react'
import { SimuladorAcordoAdmin, AcordoSimulado } from './SimuladorAcordo'
import AcordosHistorico from '../components/AcordosHistorico'

export default function ParticipanteDetalhe() {
  const { id } = useParams<{ id: string }>()
  const [resumo, setResumo] = useState<ResumoParticipante | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [consolidacao, setConsolidacao] = useState<ConsolidacaoDia | null>(null)
  const [dataConsol, setDataConsol] = useState(new Date().toISOString().slice(0, 10))
  const [acordo, setAcordo] = useState<AcordoSimulado | null>(null)
  const [registrando, setRegistrando] = useState(false)

  const loadConsolidacao = (data: string) => {
    api.get<ConsolidacaoDia>(`/participantes/${id}/consolidacao?data=${data}`)
      .then(r => setConsolidacao(r.data))
  }


  useEffect(() => {
    setErro(null)
    api.get<ResumoParticipante>(`/participantes/${id}/resumo`)
      .then(r => setResumo(r.data))
      .catch(err => {
        if (err.response?.status === 404) {
          setErro('Participante não encontrado.')
        } else {
          setErro('Erro ao carregar participante.')
        }
      })
    loadConsolidacao(dataConsol)
  }, [id])

  if (erro) return <div className="p-8 text-red-500">{erro}</div>
  if (!resumo) return <div className="p-8 text-gray-400">Carregando...</div>

  const total_pendentes = resumo.consorcios.reduce((s, c) => s + c.parcelas_pendentes, 0)

  const registrarAcordo = async (acordo: AcordoSimulado) => {
    setRegistrando(true)
    await api.post(`/acordos`, {
      participante_id: id,
      valor_parcela: acordo.valorParcela,
      parcelas: acordo.parcelas,
      total: acordo.total
    })
    setAcordo(acordo)
    setRegistrando(false)
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/participantes" className="btn-secondary p-2">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{resumo.nome}</h2>
          <p className="text-sm text-gray-500">{resumo.telefone || 'Sem telefone'}</p>
        </div>
      </div>

      {/* Resumo geral */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Total Pago</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatBRL(resumo.total_pago)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Total Devido</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{formatBRL(resumo.total_devido)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Parcelas Pendentes</p>
          <p className="text-2xl font-bold text-yellow-500 mt-1">{total_pendentes}</p>
        </div>
      </div>

      {/* Consolidação do dia */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar size={18} /> Consolidação Financeira do Dia
        </h3>
        <div className="flex items-center gap-3 mb-4">
          <input
            type="date"
            className="input w-auto"
            value={dataConsol}
            onChange={e => {
              setDataConsol(e.target.value)
              loadConsolidacao(e.target.value)
            }}
          />
        </div>
        {consolidacao && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-orange-50 rounded-lg p-4 flex items-center gap-3">
              <ArrowUpCircle className="text-orange-500 shrink-0" size={24} />
              <div>
                <p className="text-xs text-gray-500">Total a Pagar</p>
                <p className="text-lg font-bold text-orange-600">{formatBRL(consolidacao.total_a_pagar)}</p>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 flex items-center gap-3">
              <ArrowDownCircle className="text-green-500 shrink-0" size={24} />
              <div>
                <p className="text-xs text-gray-500">Total a Receber</p>
                <p className="text-lg font-bold text-green-600">{formatBRL(consolidacao.total_a_receber)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Simulador de acordo para inadimplentes */}
      {resumo.total_devido > 0 && (
        <div className="card bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">Simule um acordo para quitar sua dívida</h3>
          <SimuladorAcordoAdmin totalDevido={resumo.total_devido} onSimular={registrarAcordo} />
          {acordo && (
            <div className="mt-2 text-green-700 font-medium">Acordo registrado: {acordo.parcelas}x de {formatBRL(acordo.valorParcela)}</div>
          )}
        </div>
      )}

      {/* Histórico de acordos */}
      <AcordosHistorico participanteId={id!} />

      {/* Consórcios */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">Consórcios Participantes</h3>
        {resumo.consorcios.length === 0 ? (
          <p className="text-sm text-gray-400">Sem consórcios.</p>
        ) : (
          <div className="space-y-4">
            {resumo.consorcios.map(c => (
              <div key={c.cp_id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <Link to={`/consorcios/${c.consorcio_id}`} className="font-semibold hover:text-brand-600">
                      {c.consorcio_nome}
                    </Link>
                    <span className={`ml-2 badge-${c.status}`}>{statusLabel[c.status]}</span>
                  </div>
                  <span className="text-xs text-gray-400">Entrada: {formatDate(c.data_entrada)}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3 text-sm">
                  {[
                    ['Períodos', String(c.total_periodos)],
                    ['Pagas', String(c.parcelas_pagas)],
                    ['Pendentes', String(c.parcelas_pendentes)],
                    ['Total Pago', formatBRL(c.total_pago)],
                    ['Total Devido', formatBRL(c.total_devido)],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-gray-50 rounded p-2">
                      <p className="text-xs text-gray-400">{k}</p>
                      <p className="font-semibold text-gray-800">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
