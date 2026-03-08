package handlers

import (
	"context"
	"net/http"
	"time"

	"consorcios/internal/models"

	"github.com/go-chi/chi/v5"
)

// ListConsorcios GET /api/consorcios
func (h *Handler) ListConsorcios(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(context.Background(),
		`SELECT id, nome, valor_inicial_cota, taxa_aumento, taxa_administrativa,
		        qtd_participantes, data_inicio::text, periodicidade, ativo, criado_em, atualizado_em
		 FROM consorcios ORDER BY criado_em DESC`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	var list []models.Consorcio
	for rows.Next() {
		var c models.Consorcio
		if err := rows.Scan(&c.ID, &c.Nome, &c.ValorInicialCota, &c.TaxaAumento,
			&c.TaxaAdministrativa, &c.QtdParticipantes, &c.DataInicio,
			&c.Periodicidade, &c.Ativo, &c.CriadoEm, &c.AtualizadoEm); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		list = append(list, c)
	}
	if list == nil {
		list = []models.Consorcio{}
	}
	writeJSON(w, http.StatusOK, list)
}

// GetConsorcio GET /api/consorcios/{id}
func (h *Handler) GetConsorcio(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var c models.Consorcio
	err := h.db.QueryRow(context.Background(),
		`SELECT id, nome, valor_inicial_cota, taxa_aumento, taxa_administrativa,
		        qtd_participantes, data_inicio::text, periodicidade, ativo, criado_em, atualizado_em
		 FROM consorcios WHERE id=$1`, id).
		Scan(&c.ID, &c.Nome, &c.ValorInicialCota, &c.TaxaAumento,
			&c.TaxaAdministrativa, &c.QtdParticipantes, &c.DataInicio,
			&c.Periodicidade, &c.Ativo, &c.CriadoEm, &c.AtualizadoEm)
	if err != nil {
		writeError(w, http.StatusNotFound, "consórcio não encontrado")
		return
	}
	writeJSON(w, http.StatusOK, c)
}

// CreateConsorcio POST /api/consorcios
func (h *Handler) CreateConsorcio(w http.ResponseWriter, r *http.Request) {
	var in models.CreateConsorcioInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "dados inválidos")
		return
	}
	if in.Nome == "" || in.ValorInicialCota <= 0 || in.QtdParticipantes <= 0 {
		writeError(w, http.StatusBadRequest, "nome, valor_inicial_cota e qtd_participantes são obrigatórios")
		return
	}
	valid := map[string]bool{"diario": true, "semanal": true, "quinzenal": true, "mensal": true}
	if !valid[in.Periodicidade] {
		writeError(w, http.StatusBadRequest, "periodicidade deve ser diario, semanal, quinzenal ou mensal")
		return
	}

	var c models.Consorcio
	err := h.db.QueryRow(context.Background(),
		`INSERT INTO consorcios (nome, valor_inicial_cota, taxa_aumento, taxa_administrativa,
			 qtd_participantes, data_inicio, periodicidade, dia_semana)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
			RETURNING id, nome, valor_inicial_cota, taxa_aumento, taxa_administrativa,
				  qtd_participantes, data_inicio::text, periodicidade, dia_semana, ativo, criado_em, atualizado_em`,
		in.Nome, in.ValorInicialCota, in.TaxaAumento, in.TaxaAdministrativa,
		in.QtdParticipantes, in.DataInicio, in.Periodicidade, in.DiaSemana).
		Scan(&c.ID, &c.Nome, &c.ValorInicialCota, &c.TaxaAumento,
			&c.TaxaAdministrativa, &c.QtdParticipantes, &c.DataInicio,
			&c.Periodicidade, &c.DiaSemana, &c.Ativo, &c.CriadoEm, &c.AtualizadoEm)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, c)
}

// UpdateConsorcio PUT /api/consorcios/{id}
func (h *Handler) UpdateConsorcio(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var in models.CreateConsorcioInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "dados inválidos")
		return
	}
	var c models.Consorcio
	err := h.db.QueryRow(context.Background(),
		`UPDATE consorcios SET nome=$1, valor_inicial_cota=$2, taxa_aumento=$3,
			 taxa_administrativa=$4, qtd_participantes=$5, data_inicio=$6, periodicidade=$7, dia_semana=$8,
			 atualizado_em=NOW()
			WHERE id=$9
			RETURNING id, nome, valor_inicial_cota, taxa_aumento, taxa_administrativa,
				  qtd_participantes, data_inicio::text, periodicidade, dia_semana, ativo, criado_em, atualizado_em`,
		in.Nome, in.ValorInicialCota, in.TaxaAumento, in.TaxaAdministrativa,
		in.QtdParticipantes, in.DataInicio, in.Periodicidade, in.DiaSemana, id).
		Scan(&c.ID, &c.Nome, &c.ValorInicialCota, &c.TaxaAumento,
			&c.TaxaAdministrativa, &c.QtdParticipantes, &c.DataInicio,
			&c.Periodicidade, &c.DiaSemana, &c.Ativo, &c.CriadoEm, &c.AtualizadoEm)
	if err != nil {
		writeError(w, http.StatusNotFound, "consórcio não encontrado")
		return
	}
	writeJSON(w, http.StatusOK, c)
}

// DeleteConsorcio DELETE /api/consorcios/{id}
func (h *Handler) DeleteConsorcio(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	cmd, err := h.db.Exec(context.Background(), `DELETE FROM consorcios WHERE id=$1`, id)
	if err != nil || cmd.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "consórcio não encontrado")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ListPeriodos GET /api/consorcios/{id}/periodos
func (h *Handler) ListPeriodos(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	rows, err := h.db.Query(context.Background(),
		`SELECT id, consorcio_id, numero, data_referencia::text, valor_cota, criado_em
		 FROM periodos WHERE consorcio_id=$1 ORDER BY numero`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()
	var list []models.Periodo
	for rows.Next() {
		var p models.Periodo
		if err := rows.Scan(&p.ID, &p.ConsorcioID, &p.Numero, &p.DataReferencia, &p.ValorCota, &p.CriadoEm); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		list = append(list, p)
	}
	if list == nil {
		list = []models.Periodo{}
	}
	writeJSON(w, http.StatusOK, list)
}

// GerarPeriodos POST /api/consorcios/{id}/gerar-periodos
// Gera períodos automáticos para o consórcio baseado na periodicidade e qtd de participantes
func (h *Handler) GerarPeriodos(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var c models.Consorcio
	err := h.db.QueryRow(context.Background(),
		`SELECT id, valor_inicial_cota, taxa_aumento, qtd_participantes, data_inicio::text, periodicidade
		 FROM consorcios WHERE id=$1`, id).
		Scan(&c.ID, &c.ValorInicialCota, &c.TaxaAumento, &c.QtdParticipantes, &c.DataInicio, &c.Periodicidade)
	if err != nil {
		writeError(w, http.StatusNotFound, "consórcio não encontrado")
		return
	}

	// Apaga períodos existentes
	_, _ = h.db.Exec(context.Background(), `DELETE FROM periodos WHERE consorcio_id=$1`, id)

	dataInicio, err := time.Parse("2006-01-02", c.DataInicio)
	if err != nil {
		writeError(w, http.StatusBadRequest, "data_inicio inválida")
		return
	}

	periodos := make([]models.Periodo, 0, c.QtdParticipantes)
	for i := 0; i < c.QtdParticipantes; i++ {
		var dataRef time.Time
		switch c.Periodicidade {
		case "diario":
			dataRef = dataInicio.AddDate(0, 0, i)
		case "semanal":
			dataRef = dataInicio.AddDate(0, 0, i*7)
		case "quinzenal":
			dataRef = dataInicio.AddDate(0, 0, i*15)
		case "mensal":
			dataRef = dataInicio.AddDate(0, i, 0)
		}
		valor := c.ValorInicialCota + float64(i)*c.TaxaAumento

		var p models.Periodo
		err := h.db.QueryRow(context.Background(),
			`INSERT INTO periodos (consorcio_id, numero, data_referencia, valor_cota)
			 VALUES ($1,$2,$3,$4)
			 RETURNING id, consorcio_id, numero, data_referencia::text, valor_cota, criado_em`,
			id, i+1, dataRef.Format("2006-01-02"), valor).
			Scan(&p.ID, &p.ConsorcioID, &p.Numero, &p.DataReferencia, &p.ValorCota, &p.CriadoEm)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		periodos = append(periodos, p)
	}
	writeJSON(w, http.StatusCreated, periodos)
}
