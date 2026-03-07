package handlers

import (
	"context"
	"net/http"

	"consorcios/internal/models"
)

// Dashboard GET /api/dashboard
func (h *Handler) Dashboard(w http.ResponseWriter, r *http.Request) {
	var d models.Dashboard

	// total arrecadado
	_ = h.db.QueryRow(context.Background(),
		`SELECT COALESCE(SUM(valor_pago),0) FROM pagamentos`).Scan(&d.TotalArrecadado)

	// total dívidas
	_ = h.db.QueryRow(context.Background(),
		`SELECT COALESCE(SUM(total_devido),0) FROM vw_resumo_participante_consorcio`).Scan(&d.TotalDividas)

	// participantes ativos / inadimplentes por vínculo único
	_ = h.db.QueryRow(context.Background(),
		`SELECT
		  COUNT(DISTINCT participante_id) FILTER (WHERE status='ativo'),
		  COUNT(DISTINCT participante_id) FILTER (WHERE status='inadimplente')
		 FROM consorcio_participantes`).
		Scan(&d.ParticipantesAtivos, &d.ParticipantesInadimpl)

	// consórcios ativos
	_ = h.db.QueryRow(context.Background(),
		`SELECT COUNT(*) FROM consorcios WHERE ativo=true`).Scan(&d.ConsorciosAtivos)

	// resumo hoje
	_ = h.db.QueryRow(context.Background(),
		`SELECT COALESCE(SUM(total_a_pagar),0), COALESCE(SUM(total_a_receber),0)
		 FROM vw_consolidacao_diaria WHERE data=CURRENT_DATE`).
		Scan(&d.ResumoHoje.TotalPagar, &d.ResumoHoje.TotalReceber)

	// próximos recebimentos (recebimentos futuros registrados)
	rows, err := h.db.Query(context.Background(),
		`SELECT part.nome, c.nome, rec.data_recebimento::text, rec.valor_bruto, rec.valor_liquido
		 FROM recebimentos rec
		 JOIN consorcio_participantes cp ON cp.id = rec.consorcio_participante_id
		 JOIN participantes part ON part.id = cp.participante_id
		 JOIN consorcios c ON c.id = cp.consorcio_id
		 WHERE rec.data_recebimento >= CURRENT_DATE
		 ORDER BY rec.data_recebimento
		 LIMIT 10`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var p models.ProximoRecebimento
			if err := rows.Scan(&p.ParticipanteNome, &p.ConsorcioNome, &p.Data,
				&p.ValorBruto, &p.ValorLiquido); err == nil {
				d.ProximosRecebimentos = append(d.ProximosRecebimentos, p)
			}
		}
	}
	if d.ProximosRecebimentos == nil {
		d.ProximosRecebimentos = []models.ProximoRecebimento{}
	}

	writeJSON(w, http.StatusOK, d)
}
