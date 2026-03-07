package handlers

import (
	"context"
	"net/http"

	authmw "consorcios/internal/middleware"
	"consorcios/internal/models"

	"github.com/go-chi/chi/v5"
	"golang.org/x/crypto/bcrypt"
)

// ListUsers GET /api/users  (admin)
func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(context.Background(),
		`SELECT id, nome, email, role, ativo, criado_em FROM users ORDER BY nome`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()
	var list []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Nome, &u.Email, &u.Role, &u.Ativo, &u.CriadoEm); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		list = append(list, u)
	}
	if list == nil {
		list = []models.User{}
	}
	writeJSON(w, http.StatusOK, list)
}

// CreateUser POST /api/users  (admin)
func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var in models.CreateUserInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "dados inválidos")
		return
	}
	if in.Nome == "" || in.Email == "" || in.Senha == "" {
		writeError(w, http.StatusBadRequest, "nome, email e senha são obrigatórios")
		return
	}
	if len(in.Senha) < 6 {
		writeError(w, http.StatusBadRequest, "senha deve ter no mínimo 6 caracteres")
		return
	}
	validRoles := map[string]bool{"admin": true, "operador": true, "visualizador": true}
	if !validRoles[in.Role] {
		in.Role = "operador"
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.Senha), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "erro ao processar senha")
		return
	}

	var u models.User
	err = h.db.QueryRow(context.Background(),
		`INSERT INTO users (nome, email, senha_hash, role)
		 VALUES ($1,$2,$3,$4)
		 RETURNING id, nome, email, role, ativo, criado_em`,
		in.Nome, in.Email, string(hash), in.Role).
		Scan(&u.ID, &u.Nome, &u.Email, &u.Role, &u.Ativo, &u.CriadoEm)
	if err != nil {
		writeError(w, http.StatusBadRequest, "e-mail já cadastrado ou erro ao criar usuário")
		return
	}
	writeJSON(w, http.StatusCreated, u)
}

// UpdateUser PUT /api/users/{id}  (admin)
func (h *Handler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var in struct {
		Nome  string `json:"nome"`
		Email string `json:"email"`
		Role  string `json:"role"`
		Ativo *bool  `json:"ativo"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "dados inválidos")
		return
	}
	validRoles := map[string]bool{"admin": true, "operador": true, "visualizador": true}
	if !validRoles[in.Role] {
		writeError(w, http.StatusBadRequest, "role inválido")
		return
	}
	ativo := true
	if in.Ativo != nil {
		ativo = *in.Ativo
	}
	var u models.User
	err := h.db.QueryRow(context.Background(),
		`UPDATE users SET nome=$1, email=$2, role=$3, ativo=$4, atualizado_em=NOW()
		 WHERE id=$5
		 RETURNING id, nome, email, role, ativo, criado_em`,
		in.Nome, in.Email, in.Role, ativo, id).
		Scan(&u.ID, &u.Nome, &u.Email, &u.Role, &u.Ativo, &u.CriadoEm)
	if err != nil {
		writeError(w, http.StatusNotFound, "usuário não encontrado")
		return
	}
	writeJSON(w, http.StatusOK, u)
}

// DeleteUser DELETE /api/users/{id}  (admin)
func (h *Handler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	claims := authmw.GetClaims(r)
	if claims != nil && claims.UserID == id {
		writeError(w, http.StatusBadRequest, "não é possível excluir o próprio usuário")
		return
	}
	cmd, err := h.db.Exec(context.Background(), `DELETE FROM users WHERE id=$1`, id)
	if err != nil || cmd.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "usuário não encontrado")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// AlterarSenha PATCH /api/users/{id}/senha  (próprio usuário ou admin)
func (h *Handler) AlterarSenha(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	claims := authmw.GetClaims(r)
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "não autenticado")
		return
	}
	if claims.Role != "admin" && claims.UserID != id {
		writeError(w, http.StatusForbidden, "acesso negado")
		return
	}

	var in struct {
		SenhaAtual string `json:"senha_atual"`
		NovaSenha  string `json:"nova_senha"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "dados inválidos")
		return
	}
	if len(in.NovaSenha) < 6 {
		writeError(w, http.StatusBadRequest, "nova senha deve ter no mínimo 6 caracteres")
		return
	}

	// Não-admin deve confirmar a senha atual
	if claims.Role != "admin" {
		var hash string
		_ = h.db.QueryRow(context.Background(),
			`SELECT senha_hash FROM users WHERE id=$1`, id).Scan(&hash)
		if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(in.SenhaAtual)); err != nil {
			writeError(w, http.StatusUnauthorized, "senha atual incorreta")
			return
		}
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(in.NovaSenha), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "erro ao processar senha")
		return
	}
	_, err = h.db.Exec(context.Background(),
		`UPDATE users SET senha_hash=$1, atualizado_em=NOW() WHERE id=$2`, string(newHash), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "erro ao alterar senha")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
