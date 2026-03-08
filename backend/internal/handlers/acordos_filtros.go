package handlers

import (
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

	query := "SELECT id, participante_id, valor_parcela, parcelas, total, status, criado_em FROM acordos"
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
	var acordos []map[string]interface{}
	for rows.Next() {
		var id, participante_id, status, criado_em string
		var valor_parcela, total float64
		var parcelas int
		if err := rows.Scan(&id, &participante_id, &valor_parcela, &parcelas, &total, &status, &criado_em); err != nil {
			continue
		}
		acordos = append(acordos, map[string]interface{}{
			"id": id, "participante_id": participante_id, "valor_parcela": valor_parcela, "parcelas": parcelas, "total": total, "status": status, "criado_em": criado_em,
		})
	}
	if acordos == nil {
		acordos = []map[string]interface{}{}
	}
	writeJSON(w, http.StatusOK, acordos)
}
