package handlers

import (
	"consorcios/internal/models"
	"context"
	"encoding/csv"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
)

type AcordoInput struct {
	ParticipanteID string  `json:"participante_id"`
	ValorParcela   float64 `json:"valor_parcela"`
	Parcelas       int     `json:"parcelas"`
	Total          float64 `json:"total"`
}

// POST /api/acordos
func (h *Handler) CriarAcordo(w http.ResponseWriter, r *http.Request) {
	var in AcordoInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "dados inválidos")
		return
	}
	_, err := h.db.Exec(context.Background(),
		`INSERT INTO acordos (participante_id, valor_parcela, parcelas, total) VALUES ($1, $2, $3, $4)`,
		in.ParticipanteID, in.ValorParcela, in.Parcelas, in.Total)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusCreated)
}

// GET /api/participantes/{id}/acordos
func (h *Handler) ListarAcordosParticipante(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	rows, err := h.db.Query(context.Background(),
		`SELECT id, participante_id, valor_parcela, parcelas, total, criado_em FROM acordos WHERE participante_id=$1 ORDER BY criado_em DESC`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()
	var acordos []models.Acordo
	for rows.Next() {
		var a models.Acordo
		if err := rows.Scan(&a.ID, &a.ParticipanteID, &a.ValorParcela, &a.Parcelas, &a.Total, &a.CriadoEm); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		acordos = append(acordos, a)
	}
	if acordos == nil {
		acordos = []models.Acordo{}
	}
	writeJSON(w, http.StatusOK, acordos)
}

// GET /api/acordos
func (h *Handler) ListarAcordos(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(context.Background(),
		`SELECT id, participante_id, valor_parcela, parcelas, total, status, observacao, criado_em, atualizado_em, quitado_em, cancelado_em, usuario_aprovador, usuario_cancelador FROM acordos ORDER BY criado_em DESC`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()
	var acordos []models.Acordo
	for rows.Next() {
		var a models.Acordo
		if err := rows.Scan(&a.ID, &a.ParticipanteID, &a.ValorParcela, &a.Parcelas, &a.Total, &a.Status, &a.Observacao, &a.CriadoEm, &a.AtualizadoEm, &a.QuitadoEm, &a.CanceladoEm, &a.UsuarioAprovador, &a.UsuarioCancelador); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		acordos = append(acordos, a)
	}
	if acordos == nil {
		acordos = []models.Acordo{}
	}
	writeJSON(w, http.StatusOK, acordos)
}

// GET /api/acordos/{id}/pagamentos
func (h *Handler) ListarPagamentosAcordo(w http.ResponseWriter, r *http.Request) {
	acordoID := chi.URLParam(r, "id")
	rows, err := h.db.Query(context.Background(),
		`SELECT pg.id, pg.consorcio_participante_id, pg.periodo_id, pg.data_pagamento::text, pg.valor_pago, COALESCE(pg.observacao,''), pg.criado_em,
			p.nome, c.nome, per.numero, per.data_referencia::text
		 FROM pagamentos pg
		 JOIN consorcio_participantes cp ON cp.id = pg.consorcio_participante_id
		 JOIN participantes p ON p.id = cp.participante_id
		 JOIN consorcios c ON c.id = cp.consorcio_id
		 JOIN periodos per ON per.id = pg.periodo_id
		 WHERE pg.acordo_id = $1
		 ORDER BY pg.data_pagamento DESC`, acordoID)
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

// GET /api/acordos/export/csv
func (h *Handler) ExportarAcordosCSV(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(context.Background(),
		`SELECT id, participante_id, valor_parcela, parcelas, total, status, criado_em, atualizado_em, quitado_em, cancelado_em FROM acordos ORDER BY criado_em DESC`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment;filename=acordos.csv")
	writer := csv.NewWriter(w)
	writer.Write([]string{"ID", "ParticipanteID", "ValorParcela", "Parcelas", "Total", "Status", "CriadoEm", "AtualizadoEm", "QuitadoEm", "CanceladoEm"})
	for rows.Next() {
		var id, participanteID, status string
		var valorParcela, total float64
		var parcelas int
		var criadoEm, atualizadoEm, quitadoEm, canceladoEm string
		if err := rows.Scan(&id, &participanteID, &valorParcela, &parcelas, &total, &status, &criadoEm, &atualizadoEm, &quitadoEm, &canceladoEm); err != nil {
			continue
		}
		writer.Write([]string{
			id, participanteID, strconv.FormatFloat(valorParcela, 'f', 2, 64), strconv.Itoa(parcelas), strconv.FormatFloat(total, 'f', 2, 64),
			status, criadoEm, atualizadoEm, quitadoEm, canceladoEm,
		})
	}
	writer.Flush()
}

// PATCH /api/acordos/{id}/status
func (h *Handler) AtualizarStatusAcordo(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	type StatusInput struct {
		Status     string `json:"status"`
		Observacao string `json:"observacao"`
	}
	var in StatusInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "dados inválidos")
		return
	}
	var query string
	switch in.Status {
	case "quitado":
		query = `UPDATE acordos SET status='quitado', quitado_em=NOW(), atualizado_em=NOW(), observacao=$1 WHERE id=$2`
	case "cancelado":
		query = `UPDATE acordos SET status='cancelado', cancelado_em=NOW(), atualizado_em=NOW(), observacao=$1 WHERE id=$2`
	case "ativo":
		query = `UPDATE acordos SET status='ativo', atualizado_em=NOW(), observacao=$1 WHERE id=$2`
	default:
		writeError(w, http.StatusBadRequest, "status inválido")
		return
	}
	_, err := h.db.Exec(context.Background(), query, in.Observacao, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
