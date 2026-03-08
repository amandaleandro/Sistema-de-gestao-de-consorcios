import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../lib/api'
import { ResumoParticipante } from '../types'
import { formatBRL } from '../lib/utils'
import { SimuladorAcordoAdmin, AcordoSimulado } from './SimuladorAcordo'
import AcordosHistorico from '../components/AcordosHistorico'

export default function AcordoDetalheAdmin() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [resumo, setResumo] = useState<ResumoParticipante | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aprovado, setAprovado] = useState(false)
  const [acordo, setAcordo] = useState<AcordoSimulado | null>(null)
  const [registrando, setRegistrando] = useState(false)

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
  }, [id])

  if (erro) return <div className="p-8 text-red-500">{erro}</div>

  const registrarAcordo = async (acordo: AcordoSimulado) => {
    setRegistrando(true)
    await api.post(`/acordos`, {
      participante_id: id,
      valor_parcela: acordo.valorParcela,
      parcelas: acordo.parcelas,
      total: acordo.total
    })
    setAcordo(acordo)
    setAprovado(true)
    setRegistrando(false)
    setTimeout(() => navigate('/acordos'), 1500)
  }

  if (!resumo) return <div className="p-8 text-gray-400">Carregando...</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Link to="/acordos" className="btn-secondary p-2">Voltar</Link>
        <h2 className="text-2xl font-bold text-gray-900">Acordo para {resumo.nome}</h2>
      </div>
      <div className="card border-l-4 border-blue-400">
        <div className="mb-2 text-gray-600">Total devido: <span className="font-bold text-red-600">{formatBRL(resumo.total_devido)}</span></div>
        <SimuladorAcordoAdmin totalDevido={resumo.total_devido} onSimular={registrarAcordo} />
        {acordo && (
          <div className="mt-2 text-green-700 font-medium">Acordo registrado: {acordo.parcelas}x de {formatBRL(acordo.valorParcela)}</div>
        )}
        <button className="btn-primary mt-4" onClick={() => setAprovado(true)} disabled={aprovado || registrando}>
          {aprovado ? 'Acordo aprovado!' : registrando ? 'Registrando...' : 'Aprovar acordo'}
        </button>
      </div>
      {/* Histórico de acordos */}
      <AcordosHistorico participanteId={id!} />
    </div>
  )
}
