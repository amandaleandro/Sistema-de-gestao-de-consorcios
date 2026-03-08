import { useEffect, useState } from 'react'
import api from '../lib/api'
import { Dashboard } from '../types'
import { formatBRL, formatDate } from '../lib/utils'
import {
  TrendingUp,
  Users,
  AlertCircle,
  CircleDollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
} from 'lucide-react'

function StatCard({
  label,
  value,
  icon: Icon,
  color = 'blue',
}: {
  label: string
  value: string
  icon: React.ElementType
  color?: string
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Dashboard>('/dashboard').then(r => {
      setData(r.data)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="p-8 text-gray-400">Carregando...</div>
  if (!data) return null

  return (
    <div className="p-8 space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>

      {/* Stats grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total Arrecadado" value={formatBRL(data.total_arrecadado)} icon={TrendingUp} color="green" />
        <StatCard label="Total Dívidas" value={formatBRL(data.total_dividas)} icon={AlertCircle} color="red" />
        <StatCard label="Consórcios Ativos" value={String(data.consorcios_ativos)} icon={CircleDollarSign} color="blue" />
        <StatCard label="Participantes Ativos" value={String(data.participantes_ativos)} icon={Users} color="purple" />
        <StatCard label="Inadimplentes" value={String(data.participantes_inadimplentes)} icon={AlertCircle} color="yellow" />
      </div>

      {/* Resumo hoje */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar size={18} /> Resumo de Hoje
        </h3>
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
          <div className="bg-orange-50 rounded-lg p-4 flex items-center gap-3">
            <ArrowUpCircle className="text-orange-500" size={24} />
            <div>
              <p className="text-xs text-gray-500">Total a Pagar Hoje</p>
              <p className="text-lg font-bold text-orange-600">{formatBRL(data.resumo_hoje.total_a_pagar)}</p>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 flex items-center gap-3">
            <ArrowDownCircle className="text-green-500" size={24} />
            <div>
              <p className="text-xs text-gray-500">Total a Receber Hoje</p>
              <p className="text-lg font-bold text-green-600">{formatBRL(data.resumo_hoje.total_a_receber)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Próximos recebimentos */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">Próximos Recebimentos</h3>
        {data.proximos_recebimentos.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum recebimento agendado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="pb-2 font-medium">Participante</th>
                <th className="pb-2 font-medium">Consórcio</th>
                <th className="pb-2 font-medium">Data</th>
                <th className="pb-2 font-medium text-right">Bruto</th>
                <th className="pb-2 font-medium text-right">Líquido</th>
              </tr>
            </thead>
            <tbody>
              {data.proximos_recebimentos.map((r, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 font-medium">{r.participante_nome}</td>
                  <td className="py-2 text-gray-600">{r.consorcio_nome}</td>
                  <td className="py-2 text-gray-500">{formatDate(r.data)}</td>
                  <td className="py-2 text-right">{formatBRL(r.valor_bruto)}</td>
                  <td className="py-2 text-right font-semibold text-green-600">{formatBRL(r.valor_liquido)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
