export interface Consorcio {
  dia_semana: number | null
  id: string
  nome: string
  valor_inicial_cota: number
  taxa_aumento: number
  taxa_administrativa: number
  qtd_participantes: number
  data_inicio: string
  periodicidade: 'diario' | 'semanal' | 'quinzenal' | 'mensal'
  ativo: boolean
  criado_em: string
}

export interface Participante {
  id: string
  nome: string
  telefone: string
  criado_em: string
}

export interface ConsorcioParticipante {
  id: string
  consorcio_id: string
  participante_id: string
  data_entrada: string
  status: 'ativo' | 'inadimplente' | 'quitado'
}

export interface Periodo {
  id: string
  consorcio_id: string
  numero: number
  data_referencia: string
  valor_cota: number
}

export interface Pagamento {
  id: string
  consorcio_participante_id: string
  periodo_id: string
  data_pagamento: string
  valor_pago: number
  observacao: string
  participante_nome?: string
  consorcio_nome?: string
  periodo_numero?: number
  data_referencia?: string
}

export interface Recebimento {
  id: string
  consorcio_participante_id: string
  periodo_id: string
  data_recebimento: string
  valor_bruto: number
  taxa_administrativa: number
  valor_liquido: number
  participante_nome?: string
  consorcio_nome?: string
}

export interface ResumoConsorcio {
  cp_id: string
  consorcio_id: string
  consorcio_nome: string
  periodicidade: string
  status: string
  data_entrada: string
  total_periodos: number
  total_pago: number
  total_devido: number
  parcelas_pagas: number
  parcelas_pendentes: number
}

export interface ResumoParticipante {
  participante_id: string
  nome: string
  telefone: string
  consorcios: ResumoConsorcio[]
  total_pago: number
  total_devido: number
  total_pendentes: number
}

export interface ConsolidacaoDia {
  data: string
  total_a_pagar: number
  total_a_receber: number
}

export interface Dashboard {
  total_arrecadado: number
  total_dividas: number
  participantes_ativos: number
  participantes_inadimplentes: number
  consorcios_ativos: number
  resumo_hoje: { total_a_pagar: number; total_a_receber: number }
  proximos_recebimentos: {
    participante_nome: string
    consorcio_nome: string
    data: string
    valor_bruto: number
    valor_liquido: number
  }[]
}
