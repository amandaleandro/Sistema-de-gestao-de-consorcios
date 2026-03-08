export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatDate(date: string): string {
  if (!date) return '-'
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('pt-BR')
}

export const periodicidadeLabel: Record<string, string> = {
  diario: 'Diário',
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
}

export const statusLabel: Record<string, string> = {
  ativo: 'Ativo',
  inadimplente: 'Inadimplente',
  quitado: 'Quitado',
}
