import { useForm } from 'react-hook-form'
import api from '../lib/api'
import { Participante } from '../types'

interface FormData {
  nome: string
  telefone: string
}

interface Props {
  initial: Participante | null
  onSaved: () => void
  onCancel: () => void
}

export default function ParticipanteForm({ initial, onSaved, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    defaultValues: initial
      ? { nome: initial.nome, telefone: initial.telefone }
      : { nome: '', telefone: '' },
  })

  const onSubmit = async (data: FormData) => {
    try {
      if (initial) {
        await api.put(`/participantes/${initial.id}`, data)
      } else {
        await api.post('/participantes', data)
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
        <input className="input" placeholder="Nome completo"
          {...register('nome', { required: 'Nome é obrigatório' })} />
        {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome.message}</p>}
      </div>

      <div>
        <label className="label">Telefone / WhatsApp</label>
        <input className="input" placeholder="(11) 99999-9999"
          {...register('telefone')} />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end pt-2">
        <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn-primary w-full sm:w-auto" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : initial ? 'Salvar' : 'Criar Participante'}
        </button>
      </div>
    </form>
  )
}
