package handlers

import (
	"context"
	"net/http"
	"time"

	authmw "consorcios/internal/middleware"
	"consorcios/internal/models"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// Login POST /api/auth/login
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email string `json:"email"`
		Senha string `json:"senha"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "dados inválidos")
		return
	}
	if in.Email == "" || in.Senha == "" {
		writeError(w, http.StatusBadRequest, "email e senha são obrigatórios")
		return
	}

	var u models.User
	err := h.db.QueryRow(context.Background(),
		`SELECT id, nome, email, senha_hash, role, ativo FROM users WHERE email=$1`,
		in.Email).
		Scan(&u.ID, &u.Nome, &u.Email, &u.SenhaHash, &u.Role, &u.Ativo)
	if err != nil {
		// Resposta genérica para não vazar se o e-mail existe
		writeError(w, http.StatusUnauthorized, "credenciais inválidas")
		return
	}
	if !u.Ativo {
		writeError(w, http.StatusUnauthorized, "usuário inativo. Contate o administrador.")
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.SenhaHash), []byte(in.Senha)); err != nil {
		writeError(w, http.StatusUnauthorized, "credenciais inválidas")
		return
	}

	claims := &authmw.Claims{
		UserID: u.ID,
		Email:  u.Email,
		Nome:   u.Nome,
		Role:   u.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(authmw.JWTSecret())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "erro ao gerar token")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"token": token,
		"user": map[string]any{
			"id":    u.ID,
			"nome":  u.Nome,
			"email": u.Email,
			"role":  u.Role,
		},
	})
}

// Me GET /api/auth/me
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	claims := authmw.GetClaims(r)
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "não autenticado")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id":    claims.UserID,
		"nome":  claims.Nome,
		"email": claims.Email,
		"role":  claims.Role,
	})
}
