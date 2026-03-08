package models

import (
	"time"
)

// ---- Consórcio ----

type Consorcio struct {
	ID                 string    `json:"id"`
	Nome               string    `json:"nome"`
	ValorInicialCota   float64   `json:"valor_inicial_cota"`
	TaxaAumento        float64   `json:"taxa_aumento"`
	TaxaAdministrativa float64   `json:"taxa_administrativa"`
	QtdParticipantes   int       `json:"qtd_participantes"`
	DataInicio         string    `json:"data_inicio"`
	Periodicidade      string    `json:"periodicidade"`
	DiaSemana          *int      `json:"dia_semana,omitempty"`
	Ativo              bool      `json:"ativo"`
	CriadoEm           time.Time `json:"criado_em"`
	AtualizadoEm       time.Time `json:"atualizado_em"`
}

type CreateConsorcioInput struct {
	Nome               string  `json:"nome"`
	ValorInicialCota   float64 `json:"valor_inicial_cota"`
	TaxaAumento        float64 `json:"taxa_aumento"`
	TaxaAdministrativa float64 `json:"taxa_administrativa"`
	QtdParticipantes   int     `json:"qtd_participantes"`
	DataInicio         string  `json:"data_inicio"`
	Periodicidade      string  `json:"periodicidade"`
	DiaSemana          *int    `json:"dia_semana,omitempty"`
}

// ---- Participante ----

type Participante struct {
	ID           string    `json:"id"`
	Nome         string    `json:"nome"`
	Telefone     string    `json:"telefone"`
	CriadoEm     time.Time `json:"criado_em"`
	AtualizadoEm time.Time `json:"atualizado_em"`
}

type CreateParticipanteInput struct {
	Nome     string `json:"nome"`
	Telefone string `json:"telefone"`
}

// ---- Consórcio-Participante ----

type ConsorcioParticipante struct {
	ID             string    `json:"id"`
	ConsorcioID    string    `json:"consorcio_id"`
	ParticipanteID string    `json:"participante_id"`
	DataEntrada    string    `json:"data_entrada"`
	Status         string    `json:"status"`
	CriadoEm       time.Time `json:"criado_em"`
}

type AddParticipanteInput struct {
	ParticipanteID string `json:"participante_id"`
	DataEntrada    string `json:"data_entrada"`
}

// ---- Período ----

type Periodo struct {
	ID             string    `json:"id"`
	ConsorcioID    string    `json:"consorcio_id"`
	Numero         int       `json:"numero"`
	DataReferencia string    `json:"data_referencia"`
	ValorCota      float64   `json:"valor_cota"`
	CriadoEm       time.Time `json:"criado_em"`
}

// ---- Pagamento ----

type Pagamento struct {
	ID            string    `json:"id"`
	ConsorcioPart string    `json:"consorcio_participante_id"`
	PeriodoID     string    `json:"periodo_id"`
	DataPagamento string    `json:"data_pagamento"`
	ValorPago     float64   `json:"valor_pago"`
	Observacao    string    `json:"observacao"`
	CriadoEm      time.Time `json:"criado_em"`
	// campos expandidos
	ParticipanteNome string `json:"participante_nome,omitempty"`
	ConsorcioNome    string `json:"consorcio_nome,omitempty"`
	PeriodoNumero    int    `json:"periodo_numero,omitempty"`
	DataReferencia   string `json:"data_referencia,omitempty"`
}

type CreatePagamentoInput struct {
	ConsorcioParticipanteID string  `json:"consorcio_participante_id"`
	PeriodoID               string  `json:"periodo_id"`
	DataPagamento           string  `json:"data_pagamento"`
	ValorPago               float64 `json:"valor_pago"`
	Observacao              string  `json:"observacao"`
}

// ---- Recebimento ----

type Recebimento struct {
	ID                 string    `json:"id"`
	ConsorcioPartID    string    `json:"consorcio_participante_id"`
	PeriodoID          string    `json:"periodo_id"`
	DataRecebimento    string    `json:"data_recebimento"`
	ValorBruto         float64   `json:"valor_bruto"`
	TaxaAdministrativa float64   `json:"taxa_administrativa"`
	ValorLiquido       float64   `json:"valor_liquido"`
	CriadoEm           time.Time `json:"criado_em"`
	// campos expandidos
	ParticipanteNome string `json:"participante_nome,omitempty"`
	ConsorcioNome    string `json:"consorcio_nome,omitempty"`
}

type CreateRecebimentoInput struct {
	ConsorcioParticipanteID string  `json:"consorcio_participante_id"`
	PeriodoID               string  `json:"periodo_id"`
	DataRecebimento         string  `json:"data_recebimento"`
	ValorBruto              float64 `json:"valor_bruto"`
}

// ---- Resumo Participante ----

type ResumoConsorcio struct {
	CpID              string  `json:"cp_id"`
	ConsorcioID       string  `json:"consorcio_id"`
	ConsorcioNome     string  `json:"consorcio_nome"`
	Periodicidade     string  `json:"periodicidade"`
	Status            string  `json:"status"`
	DataEntrada       string  `json:"data_entrada"`
	TotalPeriodos     int     `json:"total_periodos"`
	TotalPago         float64 `json:"total_pago"`
	TotalDevido       float64 `json:"total_devido"`
	ParcelasPagas     int     `json:"parcelas_pagas"`
	ParcelasPendentes int     `json:"parcelas_pendentes"`
}

type ResumoParticipante struct {
	ParticipanteID string            `json:"participante_id"`
	Nome           string            `json:"nome"`
	Telefone       string            `json:"telefone"`
	Consorcios     []ResumoConsorcio `json:"consorcios"`
	TotalPago      float64           `json:"total_pago"`
	TotalDevido    float64           `json:"total_devido"`
	TotalPendentes int               `json:"total_pendentes"`
}

// ---- Consolidação Diária ----

type ConsolidacaoDia struct {
	Data         string  `json:"data"`
	TotalPagar   float64 `json:"total_a_pagar"`
	TotalReceber float64 `json:"total_a_receber"`
}

// ---- Usuário do Sistema ----

type User struct {
	ID           string    `json:"id"`
	Nome         string    `json:"nome"`
	Email        string    `json:"email"`
	SenhaHash    string    `json:"-"` // nunca serializado
	Role         string    `json:"role"`
	Ativo        bool      `json:"ativo"`
	CriadoEm     time.Time `json:"criado_em"`
	AtualizadoEm time.Time `json:"atualizado_em,omitempty"`
}

type CreateUserInput struct {
	Nome  string `json:"nome"`
	Email string `json:"email"`
	Senha string `json:"senha"`
	Role  string `json:"role"`
}

// ---- Dashboard ----

type Dashboard struct {
	TotalArrecadado       float64 `json:"total_arrecadado"`
	TotalDividas          float64 `json:"total_dividas"`
	ParticipantesAtivos   int     `json:"participantes_ativos"`
	ParticipantesInadimpl int     `json:"participantes_inadimplentes"`
	ConsorciosAtivos      int     `json:"consorcios_ativos"`
	ResumoHoje            struct {
		TotalPagar   float64 `json:"total_a_pagar"`
		TotalReceber float64 `json:"total_a_receber"`
	} `json:"resumo_hoje"`
	ProximosRecebimentos []ProximoRecebimento `json:"proximos_recebimentos"`
}

type ProximoRecebimento struct {
	ParticipanteNome string  `json:"participante_nome"`
	ConsorcioNome    string  `json:"consorcio_nome"`
	Data             string  `json:"data"`
	ValorBruto       float64 `json:"valor_bruto"`
	ValorLiquido     float64 `json:"valor_liquido"`
}

// ---- Acordo ----

type Acordo struct {
	ID                string     `json:"id"`
	ParticipanteID    string     `json:"participante_id"`
	ValorParcela      float64    `json:"valor_parcela"`
	Parcelas          int        `json:"parcelas"`
	Total             float64    `json:"total"`
	Status            string     `json:"status"`
	Observacao        string     `json:"observacao"`
	CriadoEm          time.Time  `json:"criado_em"`
	AtualizadoEm      time.Time  `json:"atualizado_em"`
	QuitadoEm         *time.Time `json:"quitado_em,omitempty"`
	CanceladoEm       *time.Time `json:"cancelado_em,omitempty"`
	UsuarioAprovador  *string    `json:"usuario_aprovador,omitempty"`
	UsuarioCancelador *string    `json:"usuario_cancelador,omitempty"`
}
