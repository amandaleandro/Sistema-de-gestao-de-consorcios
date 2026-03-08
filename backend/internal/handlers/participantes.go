
package handlers

// ListInadimplentes GET /api/participantes/inadimplentes
func (h *Handler) ListInadimplentes(w http.ResponseWriter, r *http.Request) {
       rows, err := h.db.Query(context.Background(),
	       `SELECT p.id, p.nome, COALESCE(p.telefone, '')
		FROM participantes p
		JOIN consorcio_participantes cp ON cp.participante_id = p.id
		WHERE cp.status = 'inadimplente'
		GROUP BY p.id, p.nome, p.telefone`)
       if err != nil {
	       writeError(w, http.StatusInternalServerError, err.Error())
	       return
       }
       defer rows.Close()
       var list []models.ResumoParticipante
       for rows.Next() {
	       var p models.ResumoParticipante
	       if err := rows.Scan(&p.ParticipanteID, &p.Nome, &p.Telefone); err != nil {
		       continue
	       }
	       list = append(list, p)
       }
       if list == nil {
	       list = []models.ResumoParticipante{}
       }
       writeJSON(w, http.StatusOK, list)
}

import (
	"context"
	"net/http"

	"consorcios/internal/models"

	"github.com/go-chi/chi/v5"
)

// ListParticipantes GET /api/participantes
func (h *Handler) ListParticipantes(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(context.Background(),
		`SELECT id, nome, COALESCE(telefone,''), criado_em, atualizado_em
		 FROM participantes ORDER BY nome`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()
	var list []models.Participante
	for rows.Next() {
		var p models.Participante
		if err := rows.Scan(&p.ID, &p.Nome, &p.Telefone, &p.CriadoEm, &p.AtualizadoEm); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		list = append(list, p)
	}
	if list == nil {
		list = []models.Participante{}
	}
	writeJSON(w, http.StatusOK, list)
}

// GetParticipante GET /api/participantes/{id}
func (h *Handler) GetParticipante(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var p models.Participante
	err := h.db.QueryRow(context.Background(),
		`SELECT id, nome, COALESCE(telefone,''), criado_em, atualizado_em
		 FROM participantes WHERE id=$1`, id).
		Scan(&p.ID, &p.Nome, &p.Telefone, &p.CriadoEm, &p.AtualizadoEm)
	if err != nil {
		writeError(w, http.StatusNotFound, "participante não encontrado")
		return
	}
	writeJSON(w, http.StatusOK, p)
}

// CreateParticipante POST /api/participantes
func (h *Handler) CreateParticipante(w http.ResponseWriter, r *http.Request) {
	var in models.CreateParticipanteInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "dados inválidos")
		return
	}
	if in.Nome == "" {
		writeError(w, http.StatusBadRequest, "nome é obrigatório")
		return
	}
	var p models.Participante
	err := h.db.QueryRow(context.Background(),
		`INSERT INTO participantes (nome, telefone) VALUES ($1,$2)
		 RETURNING id, nome, COALESCE(telefone,''), criado_em, atualizado_em`,
		in.Nome, in.Telefone).
		Scan(&p.ID, &p.Nome, &p.Telefone, &p.CriadoEm, &p.AtualizadoEm)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

// UpdateParticipante PUT /api/participantes/{id}
func (h *Handler) UpdateParticipante(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var in models.CreateParticipanteInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "dados inválidos")
		return
	}
	var p models.Participante
	err := h.db.QueryRow(context.Background(),
		`UPDATE participantes SET nome=$1, telefone=$2, atualizado_em=NOW()
		 WHERE id=$3
		 RETURNING id, nome, COALESCE(telefone,''), criado_em, atualizado_em`,
		in.Nome, in.Telefone, id).
		Scan(&p.ID, &p.Nome, &p.Telefone, &p.CriadoEm, &p.AtualizadoEm)
	if err != nil {
		writeError(w, http.StatusNotFound, "participante não encontrado")
		return
	}
	writeJSON(w, http.StatusOK, p)
}

// DeleteParticipante DELETE /api/participantes/{id}
func (h *Handler) DeleteParticipante(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	cmd, err := h.db.Exec(context.Background(), `DELETE FROM participantes WHERE id=$1`, id)
	if err != nil || cmd.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "participante não encontrado")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ListConsorcioParticipantes GET /api/consorcios/{id}/participantes
func (h *Handler) ListConsorcioParticipantes(w http.ResponseWriter, r *http.Request) {
	cid := chi.URLParam(r, "id")
	rows, err := h.db.Query(context.Background(),
		`SELECT id, consorcio_id, participante_id, data_entrada::text, status, criado_em
		 FROM consorcio_participantes WHERE consorcio_id=$1 ORDER BY criado_em`, cid)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()
	var list []models.ConsorcioParticipante
	for rows.Next() {
		var cp models.ConsorcioParticipante
		if err := rows.Scan(&cp.ID, &cp.ConsorcioID, &cp.ParticipanteID, &cp.DataEntrada, &cp.Status, &cp.CriadoEm); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		list = append(list, cp)
	}
	if list == nil {
		list = []models.ConsorcioParticipante{}
	}
	writeJSON(w, http.StatusOK, list)
}

// AddParticipante POST /api/consorcios/{id}/participantes
func (h *Handler) AddParticipante(w http.ResponseWriter, r *http.Request) {
	cid := chi.URLParam(r, "id")
	var in models.AddParticipanteInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "dados inválidos")
		return
	}
	if in.DataEntrada == "" {
		in.DataEntrada = "now()"
	}
	var cp models.ConsorcioParticipante
	err := h.db.QueryRow(context.Background(),
		`INSERT INTO consorcio_participantes (consorcio_id, participante_id, data_entrada)
		 VALUES ($1,$2,$3)
		 RETURNING id, consorcio_id, participante_id, data_entrada::text, status, criado_em`,
		cid, in.ParticipanteID, in.DataEntrada).
		Scan(&cp.ID, &cp.ConsorcioID, &cp.ParticipanteID, &cp.DataEntrada, &cp.Status, &cp.CriadoEm)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, cp)
}

// UpdateStatusParticipante PATCH /api/consorcios/{cid}/participantes/{pid}/status
func (h *Handler) UpdateStatusParticipante(w http.ResponseWriter, r *http.Request) {
	cid := chi.URLParam(r, "cid")
	pid := chi.URLParam(r, "pid")
	var body struct {
		Status string `json:"status"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "dados inválidos")
		return
	}
	valid := map[string]bool{"ativo": true, "inadimplente": true, "quitado": true}
	if !valid[body.Status] {
		writeError(w, http.StatusBadRequest, "status deve ser ativo, inadimplente ou quitado")
		return
	}
	cmd, err := h.db.Exec(context.Background(),
		`UPDATE consorcio_participantes SET status=$1, atualizado_em=NOW()
		 WHERE consorcio_id=$2 AND participante_id=$3`,
		body.Status, cid, pid)
	if err != nil || cmd.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "vínculo não encontrado")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// RemoveParticipante DELETE /api/consorcios/{cid}/participantes/{pid}
func (h *Handler) RemoveParticipante(w http.ResponseWriter, r *http.Request) {
	cid := chi.URLParam(r, "cid")
	pid := chi.URLParam(r, "pid")
	cmd, err := h.db.Exec(context.Background(),
		`DELETE FROM consorcio_participantes WHERE consorcio_id=$1 AND participante_id=$2`,
		cid, pid)
	if err != nil || cmd.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "vínculo não encontrado")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ResumoParticipante GET /api/participantes/{id}/resumo
func (h *Handler) ResumoParticipante(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var p models.Participante
	err := h.db.QueryRow(context.Background(),
		`SELECT id, nome, COALESCE(telefone,'') FROM participantes WHERE id=$1`, id).
		Scan(&p.ID, &p.Nome, &p.Telefone)
	if err != nil {
		writeError(w, http.StatusNotFound, "participante não encontrado")
		return
	}

	rows, err := h.db.Query(context.Background(),
		`SELECT cp_id, consorcio_id, consorcio_nome, periodicidade, status, data_entrada,
		        total_periodos, total_pago, total_devido, parcelas_pagas, parcelas_pendentes
		 FROM vw_resumo_participante_consorcio
		 WHERE participante_id=$1`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	resumo := models.ResumoParticipante{
		ParticipanteID: p.ID,
		Nome:           p.Nome,
		Telefone:       p.Telefone,
		Consorcios:     []models.ResumoConsorcio{},
	}
	for rows.Next() {
		var rc models.ResumoConsorcio
		if err := rows.Scan(&rc.CpID, &rc.ConsorcioID, &rc.ConsorcioNome, &rc.Periodicidade,
			&rc.Status, &rc.DataEntrada, &rc.TotalPeriodos, &rc.TotalPago,
			&rc.TotalDevido, &rc.ParcelasPagas, &rc.ParcelasPendentes); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		resumo.Consorcios = append(resumo.Consorcios, rc)
		resumo.TotalPago += rc.TotalPago
		resumo.TotalDevido += rc.TotalDevido
		resumo.TotalPendentes += rc.ParcelasPendentes
	}
	writeJSON(w, http.StatusOK, resumo)
}

// ConsolidacaoParticipante GET /api/participantes/{id}/consolidacao?data=YYYY-MM-DD
func (h *Handler) ConsolidacaoParticipante(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	data := r.URL.Query().Get("data")
	if data == "" {
		data = "today"
	}

	var c models.ConsolidacaoDia
	err := h.db.QueryRow(context.Background(),
		`SELECT data::text, COALESCE(SUM(total_a_pagar),0), COALESCE(SUM(total_a_receber),0)
		 FROM vw_consolidacao_diaria
		 WHERE participante_id=$1 AND data=$2::date
		 GROUP BY data`, id, data).
		Scan(&c.Data, &c.TotalPagar, &c.TotalReceber)
	if err != nil {
		// sem dados para esse dia
		c.Data = data
		c.TotalPagar = 0
		c.TotalReceber = 0
	}
	writeJSON(w, http.StatusOK, c)
}
