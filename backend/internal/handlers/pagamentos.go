package handlers

import (
	"context"
	"net/http"

	"consorcios/internal/models"

	"github.com/go-chi/chi/v5"
)

// ListPagamentos GET /api/pagamentos?consorcio_id=&participante_id=
func (h *Handler) ListPagamentos(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	cid := q.Get("consorcio_id")
	pid := q.Get("participante_id")

	rows, err := h.db.Query(context.Background(),
		`SELECT pg.id, pg.consorcio_participante_id, pg.periodo_id,
		        pg.data_pagamento::text, pg.valor_pago, COALESCE(pg.observacao,''), pg.criado_em,
		        p.nome, c.nome, per.numero, per.data_referencia::text
		 FROM pagamentos pg
		 JOIN consorcio_participantes cp ON cp.id = pg.consorcio_participante_id
		 JOIN participantes p ON p.id = cp.participante_id
		 JOIN consorcios c ON c.id = cp.consorcio_id
		 JOIN periodos per ON per.id = pg.periodo_id
		 WHERE ($1='' OR cp.consorcio_id::text=$1)
		   AND ($2='' OR cp.participante_id::text=$2)
		 ORDER BY pg.data_pagamento DESC`, cid, pid)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()
	var list []models.Pagamento
	for rows.Next() {
		var p models.Pagamento
		if err := rows.Scan(&p.ID, &p.ConsorcioPart, &p.PeriodoID, &p.DataPagamento,
			&p.ValorPago, &p.Observacao, &p.CriadoEm,
			&p.ParticipanteNome, &p.ConsorcioNome, &p.PeriodoNumero, &p.DataReferencia); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		list = append(list, p)
	}
	if list == nil {
		list = []models.Pagamento{}
	}
	writeJSON(w, http.StatusOK, list)
}

// CreatePagamento POST /api/pagamentos
func (h *Handler) CreatePagamento(w http.ResponseWriter, r *http.Request) {
	var in models.CreatePagamentoInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "dados inválidos")
		return
	}
	if in.ConsorcioParticipanteID == "" || in.PeriodoID == "" || in.ValorPago <= 0 {
		writeError(w, http.StatusBadRequest, "consorcio_participante_id, periodo_id e valor_pago são obrigatórios")
		return
	}
	if in.DataPagamento == "" {
		in.DataPagamento = "today"
	}
	var p models.Pagamento
	err := h.db.QueryRow(context.Background(),
		`INSERT INTO pagamentos (consorcio_participante_id, periodo_id, data_pagamento, valor_pago, observacao)
		 VALUES ($1,$2,$3::date,$4,$5)
		 RETURNING id, consorcio_participante_id, periodo_id, data_pagamento::text, valor_pago,
		           COALESCE(observacao,''), criado_em`,
		in.ConsorcioParticipanteID, in.PeriodoID, in.DataPagamento, in.ValorPago, in.Observacao).
		Scan(&p.ID, &p.ConsorcioPart, &p.PeriodoID, &p.DataPagamento, &p.ValorPago, &p.Observacao, &p.CriadoEm)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

// DeletePagamento DELETE /api/pagamentos/{id}
func (h *Handler) DeletePagamento(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	cmd, err := h.db.Exec(context.Background(), `DELETE FROM pagamentos WHERE id=$1`, id)
	if err != nil || cmd.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "pagamento não encontrado")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ListRecebimentos GET /api/recebimentos
func (h *Handler) ListRecebimentos(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(context.Background(),
		`SELECT rec.id, rec.consorcio_participante_id, rec.periodo_id,
		        rec.data_recebimento::text, rec.valor_bruto, rec.taxa_administrativa,
		        rec.valor_liquido, rec.criado_em,
		        part.nome, c.nome
		 FROM recebimentos rec
		 JOIN consorcio_participantes cp ON cp.id = rec.consorcio_participante_id
		 JOIN participantes part ON part.id = cp.participante_id
		 JOIN consorcios c ON c.id = cp.consorcio_id
		 ORDER BY rec.data_recebimento DESC`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()
	var list []models.Recebimento
	for rows.Next() {
		var rec models.Recebimento
		if err := rows.Scan(&rec.ID, &rec.ConsorcioPartID, &rec.PeriodoID,
			&rec.DataRecebimento, &rec.ValorBruto, &rec.TaxaAdministrativa,
			&rec.ValorLiquido, &rec.CriadoEm,
			&rec.ParticipanteNome, &rec.ConsorcioNome); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		list = append(list, rec)
	}
	if list == nil {
		list = []models.Recebimento{}
	}
	writeJSON(w, http.StatusOK, list)
}

// CreateRecebimento POST /api/recebimentos
// Calcula automaticamente a taxa administrativa e o valor líquido
func (h *Handler) CreateRecebimento(w http.ResponseWriter, r *http.Request) {
	var in models.CreateRecebimentoInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "dados inválidos")
		return
	}
	if in.ConsorcioParticipanteID == "" || in.PeriodoID == "" || in.ValorBruto <= 0 {
		writeError(w, http.StatusBadRequest, "consorcio_participante_id, periodo_id e valor_bruto são obrigatórios")
		return
	}
	if in.DataRecebimento == "" {
		in.DataRecebimento = "today"
	}

	// buscar taxa administrativa do consórcio
	var taxa float64
	err := h.db.QueryRow(context.Background(),
		`SELECT c.taxa_administrativa FROM consorcios c
		 JOIN consorcio_participantes cp ON cp.consorcio_id = c.id
		 WHERE cp.id=$1`, in.ConsorcioParticipanteID).Scan(&taxa)
	if err != nil {
		writeError(w, http.StatusBadRequest, "vínculo não encontrado")
		return
	}

	taxaValor := in.ValorBruto * taxa / 100
	liquido := in.ValorBruto - taxaValor

	var rec models.Recebimento
	err = h.db.QueryRow(context.Background(),
		`INSERT INTO recebimentos (consorcio_participante_id, periodo_id, data_recebimento,
		  valor_bruto, taxa_administrativa, valor_liquido)
		 VALUES ($1,$2,$3::date,$4,$5,$6)
		 RETURNING id, consorcio_participante_id, periodo_id, data_recebimento::text,
		           valor_bruto, taxa_administrativa, valor_liquido, criado_em`,
		in.ConsorcioParticipanteID, in.PeriodoID, in.DataRecebimento,
		in.ValorBruto, taxaValor, liquido).
		Scan(&rec.ID, &rec.ConsorcioPartID, &rec.PeriodoID, &rec.DataRecebimento,
			&rec.ValorBruto, &rec.TaxaAdministrativa, &rec.ValorLiquido, &rec.CriadoEm)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, rec)
}

// DeleteRecebimento DELETE /api/recebimentos/{id}
func (h *Handler) DeleteRecebimento(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	cmd, err := h.db.Exec(context.Background(), `DELETE FROM recebimentos WHERE id=$1`, id)
	if err != nil || cmd.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "recebimento não encontrado")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
