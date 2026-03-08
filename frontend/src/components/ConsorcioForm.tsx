import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import api from '../lib/api';
import { Consorcio } from '../types';

interface FormData {
  nome: string;
  valor_inicial_cota: number;
  taxa_aumento: number;
  taxa_administrativa: number;
  qtd_participantes: number;
  data_inicio: string;
  periodicidade: 'diario' | 'semanal' | 'quinzenal' | 'mensal';
  dia_semana?: number | null;
}

interface Props {
  initial: Consorcio | null;
  onSaved: () => void;
  onCancel: () => void;
}

export default function ConsorcioForm({ initial, onSaved, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    setError,
    control,
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
          dia_semana: initial.dia_semana ?? null,
        }
      : {
          nome: '',
          valor_inicial_cota: 0,
          taxa_aumento: 0,
          taxa_administrativa: 0,
          qtd_participantes: 1,
          periodicidade: 'mensal',
          data_inicio: new Date().toISOString().slice(0, 10),
          dia_semana: null,
        },
  });

  const periodicidade = watch('periodicidade');

  useEffect(() => {
    if (periodicidade !== 'semanal' && periodicidade !== 'quinzenal') {
      setValue('dia_semana', null);
    }
  }, [periodicidade, setValue]);

  const onSubmit = async (data: FormData) => {
    const payload: FormData = {
      ...data,
      dia_semana:
        data.periodicidade === 'semanal' || data.periodicidade === 'quinzenal'
          ? data.dia_semana ?? null
          : null,
    };

    try {
      if (initial) {
        await api.put(`/consorcios/${initial.id}`, payload);
      } else {
        await api.post('/consorcios', payload);
      }
      onSaved();
    } catch (e: any) {
      setError('root', { message: e.response?.data?.error ?? 'Erro ao salvar' });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {errors.root && <p className="text-sm text-red-500">{errors.root.message}</p>}

      <div>
        <label className="label">Nome *</label>
        <input className="input" {...register('nome', { required: 'Obrigatório' })} />
        {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome.message}</p>}
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
        <div>
          <label className="label">Valor Inicial da Cota *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="input"
            {...register('valor_inicial_cota', { required: 'Obrigatório', valueAsNumber: true })}
          />
          {errors.valor_inicial_cota && (
            <p className="text-xs text-red-500 mt-1">{errors.valor_inicial_cota.message}</p>
          )}
        </div>
        <div>
          <label className="label">Taxa de Aumento (R$)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="input"
            {...register('taxa_aumento', { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
        <div>
          <label className="label">Taxa Administrativa (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            className="input"
            {...register('taxa_administrativa', { valueAsNumber: true })}
          />
        </div>
        <div>
          <label className="label">Qtd. de Participantes *</label>
          <input
            type="number"
            min="1"
            className="input"
            {...register('qtd_participantes', { required: 'Obrigatório', valueAsNumber: true })}
          />
          {errors.qtd_participantes && (
            <p className="text-xs text-red-500 mt-1">{errors.qtd_participantes.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
        <div>
          <label className="label">Data de Início *</label>
          <input type="date" className="input" {...register('data_inicio', { required: 'Obrigatório' })} />
        </div>
        <div>
          <label className="label">Periodicidade *</label>
          <select className="input" {...register('periodicidade', { required: 'Obrigatório' })}>
            <option value="diario">Diário</option>
            <option value="semanal">Semanal</option>
            <option value="quinzenal">Quinzenal</option>
            <option value="mensal">Mensal</option>
          </select>
        </div>
      </div>

      {(periodicidade === 'semanal' || periodicidade === 'quinzenal') && (
        <Controller
          control={control}
          name="dia_semana"
          rules={{ required: 'Selecione o dia da semana' }}
          render={({ field }) => (
            <div>
              <label className="label">Dia da Semana *</label>
              <select
                className="input"
                value={field.value ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  field.onChange(value === '' ? null : Number(value));
                }}
              >
                <option value="">Selecione o dia</option>
                <option value={0}>Domingo</option>
                <option value={1}>Segunda-feira</option>
                <option value={2}>Terça-feira</option>
                <option value={3}>Quarta-feira</option>
                <option value={4}>Quinta-feira</option>
                <option value={5}>Sexta-feira</option>
                <option value={6}>Sábado</option>
              </select>
              {errors.dia_semana && (
                <p className="text-xs text-red-500 mt-1">{errors.dia_semana.message}</p>
              )}
            </div>
          )}
        />
      )}

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : initial ? 'Salvar' : 'Criar Consórcio'}
        </button>
      </div>
    </form>
  );
}