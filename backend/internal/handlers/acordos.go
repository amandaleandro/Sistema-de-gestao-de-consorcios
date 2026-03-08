package handlers

import (
	"consorcios/internal/models"
	"context"
	"net/http"

	"github.com/go-chi/chi"
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
