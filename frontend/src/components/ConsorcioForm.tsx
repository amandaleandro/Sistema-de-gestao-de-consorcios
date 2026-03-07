import { useForm } from 'react-hook-form'
import api from '../lib/api'
import { Consorcio } from '../types'

interface FormData {
  nome: string
  valor_inicial_cota: number
  taxa_aumento: number
  taxa_administrativa: number
  qtd_participantes: number
  data_inicio: string
  periodicidade: 'diario' | 'semanal' | 'mensal'
}

interface Props {
  initial: Consorcio | null
  onSaved: () => void
  onCancel: () => void
}

export default function ConsorcioForm({ initial, onSaved, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    defaultValues: initial
      ? {
          nome: initial.nome,
          valor_inicial_cota: initial.valor_inicial_cota,
          taxa_aumento: initial.taxa_aumento,
          taxa_administrativa: initial.taxa_administrativa,
          qtd_participantes: initial.qtd_participantes,
          data_inicio: initial.data_inicio,
          periodicidade: initial.periodicidade,
        }
      : {
          periodicidade: 'mensal',
          data_inicio: new Date().toISOString().slice(0, 10),
          taxa_aumento: 0,
          taxa_administrativa: 0,
        },
  })

  const onSubmit = async (data: FormData) => {
    try {
      if (initial) {
        await api.put(`/consorcios/${initial.id}`, data)
      } else {
        await api.post('/consorcios', data)
      }
      onSaved()
    } catch (e: any) {
      setError('root', { message: e.response?.data?.error ?? 'Erro ao salvar' })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {errors.root && <p className="text-sm text-red-500">{errors.root.message}</p>}

      <div>
        <label className="label">Nome *</label>
        <input className="input" {...register('nome', { required: 'Obrigatório' })} />
        {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Valor Inicial da Cota *</label>
          <input type="number" min="0" step="0.01" className="input"
            {...register('valor_inicial_cota', { required: 'Obrigatório', valueAsNumber: true })} />
          {errors.valor_inicial_cota && <p className="text-xs text-red-500 mt-1">{errors.valor_inicial_cota.message}</p>}
        </div>
        <div>
          <label className="label">Taxa de Aumento (R$)</label>
          <input type="number" min="0" step="0.01" className="input"
            {...register('taxa_aumento', { valueAsNumber: true })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Taxa Administrativa (%)</label>
          <input type="number" min="0" max="100" step="0.01" className="input"
            {...register('taxa_administrativa', { valueAsNumber: true })} />
        </div>
        <div>
          <label className="label">Qtd. de Participantes *</label>
          <input type="number" min="1" className="input"
            {...register('qtd_participantes', { required: 'Obrigatório', valueAsNumber: true })} />
          {errors.qtd_participantes && <p className="text-xs text-red-500 mt-1">{errors.qtd_participantes.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Data de Início *</label>
          <input type="date" className="input" {...register('data_inicio', { required: 'Obrigatório' })} />
        </div>
        <div>
          <label className="label">Periodicidade *</label>
          <select className="input" {...register('periodicidade', { required: 'Obrigatório' })}>
            <option value="diario">Diário</option>
            <option value="semanal">Semanal</option>
            <option value="mensal">Mensal</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : initial ? 'Salvar' : 'Criar Consórcio'}
        </button>
      </div>
    </form>
  )
}
