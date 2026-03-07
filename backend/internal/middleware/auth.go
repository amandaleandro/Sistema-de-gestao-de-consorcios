package middleware

import (
	"context"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserKey contextKey = "user"

// Claims são os dados que ficam dentro do JWT.
type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Nome   string `json:"nome"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// JWTSecret retorna a chave secreta do JWT.
func JWTSecret() []byte {
	s := os.Getenv("JWT_SECRET")
	if s == "" {
		s = "consorcios-secret-troque-em-producao"
	}
	return []byte(s)
}

// Authenticator valida o token JWT presente no header Authorization.
func Authenticator(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			w.Header().Set("Content-Type", "application/json")
			http.Error(w, `{"error":"não autenticado"}`, http.StatusUnauthorized)
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		claims := &Claims{}

		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return JWTSecret(), nil
		})
		if err != nil || !token.Valid {
			w.Header().Set("Content-Type", "application/json")
			http.Error(w, `{"error":"token inválido ou expirado"}`, http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), UserKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetClaims extrai as claims do contexto da requisição.
func GetClaims(r *http.Request) *Claims {
	if c, ok := r.Context().Value(UserKey).(*Claims); ok {
		return c
	}
	return nil
}

// RequireRole retorna um middleware que exige que o usuário tenha um dos roles informados.
func RequireRole(roles ...string) func(http.Handler) http.Handler {
	roleSet := make(map[string]bool, len(roles))
	for _, role := range roles {
		roleSet[role] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := GetClaims(r)
			if claims == nil || !roleSet[claims.Role] {
				w.Header().Set("Content-Type", "application/json")
				http.Error(w, `{"error":"acesso negado: permissão insuficiente"}`, http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
