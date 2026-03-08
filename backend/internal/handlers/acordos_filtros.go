package handlers

import (
	"consorcios/internal/models"
	"context"
	"net/http"
	"strconv"
	"strings"
)

// GET /api/acordos/filtros
func (h *Handler) ListarAcordosComFiltros(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	status := q.Get("status")
	participante := q.Get("participante")
	valorMin := q.Get("valor_min")
	valorMax := q.Get("valor_max")
	periodoDe := q.Get("periodo_de")
	periodoAte := q.Get("periodo_ate")

	var filtros []string
	var args []interface{}
	idx := 1

	if status != "" {
		filtros = append(filtros, "status=$"+strconv.Itoa(idx))
		args = append(args, status)
		idx++
	}
	if participante != "" {
		filtros = append(filtros, "participante_id=$"+strconv.Itoa(idx))
		args = append(args, participante)
		idx++
	}
	if valorMin != "" {
		filtros = append(filtros, "total>=$"+strconv.Itoa(idx))
		args = append(args, valorMin)
		idx++
	}
	if valorMax != "" {
		filtros = append(filtros, "total<=$"+strconv.Itoa(idx))
		args = append(args, valorMax)
		idx++
	}
	if periodoDe != "" {
		filtros = append(filtros, "criado_em>=$"+strconv.Itoa(idx))
		args = append(args, periodoDe)
		idx++
	}
	if periodoAte != "" {
		filtros = append(filtros, "criado_em<=$"+strconv.Itoa(idx))
		args = append(args, periodoAte)
		idx++
	}

	query := "SELECT id, participante_id, valor_parcela, parcelas, total, status, observacao, criado_em, atualizado_em, quitado_em, cancelado_em, usuario_aprovador, usuario_cancelador FROM acordos"
	if len(filtros) > 0 {
		query += " WHERE " + strings.Join(filtros, " AND ")
	}
	query += " ORDER BY criado_em DESC"

	rows, err := h.db.Query(context.Background(), query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()
	var acordos []models.Acordo
	for rows.Next() {
		var a models.Acordo
		if err := rows.Scan(
			&a.ID, &a.ParticipanteID, &a.ValorParcela, &a.Parcelas, &a.Total, &a.Status, &a.Observacao,
			&a.CriadoEm, &a.AtualizadoEm, &a.QuitadoEm, &a.CanceladoEm, &a.UsuarioAprovador, &a.UsuarioCancelador,
		); err != nil {
			continue
		}
		acordos = append(acordos, a)
	}
	if acordos == nil {
		acordos = []models.Acordo{}
	}
	writeJSON(w, http.StatusOK, acordos)
}
