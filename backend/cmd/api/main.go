package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"consorcios/internal/db"
	"consorcios/internal/handlers"
	authmw "consorcios/internal/middleware"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	_ = godotenv.Load()

	dsn := getenv("DATABASE_URL", "postgres://consorcios:consorcios123@localhost:5432/consorcios?sslmode=disable")
	port := getenv("PORT", "8080")

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	log.Println("conectando ao banco de dados...")
	pool, err := db.Connect(ctx, dsn)
	if err != nil {
		log.Fatalf("falha ao conectar no banco: %v", err)
	}
	defer pool.Close()
	log.Println("banco conectado")

	if err := db.RunMigrations(ctx, pool); err != nil {
		log.Fatalf("falha ao executar migrations: %v", err)
	}
	log.Println("migrations executadas com sucesso")

	seedAdminUser(context.Background(), pool)

	h := handlers.New(pool)

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   parseOrigins(getenv("CORS_ALLOWED_ORIGINS", "*")),
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Get("/api/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	r.Route("/api", func(r chi.Router) {
		r.Post("/auth/login", h.Login)
		r.Get("/participantes/inadimplentes", h.ListInadimplentes)

		r.Group(func(r chi.Router) {
			r.Use(authmw.Authenticator)

			r.Get("/auth/me", h.Me)
			r.Get("/dashboard", h.Dashboard)

			r.Get("/consorcios", h.ListConsorcios)
			r.Get("/consorcios/{id}", h.GetConsorcio)
			r.Get("/consorcios/{id}/periodos", h.ListPeriodos)
			r.Get("/consorcios/{id}/participantes", h.ListConsorcioParticipantes)

			r.With(authmw.RequireRole("admin", "operador")).Post("/consorcios", h.CreateConsorcio)
			r.With(authmw.RequireRole("admin", "operador")).Put("/consorcios/{id}", h.UpdateConsorcio)
			r.With(authmw.RequireRole("admin", "operador")).Post("/consorcios/{id}/gerar-periodos", h.GerarPeriodos)
			r.With(authmw.RequireRole("admin", "operador")).Post("/consorcios/{id}/participantes", h.AddParticipante)
			r.With(authmw.RequireRole("admin", "operador")).Patch("/consorcios/{cid}/participantes/{pid}/status", h.UpdateStatusParticipante)
			r.With(authmw.RequireRole("admin")).Delete("/consorcios/{id}", h.DeleteConsorcio)
			r.With(authmw.RequireRole("admin")).Delete("/consorcios/{cid}/participantes/{pid}", h.RemoveParticipante)

			r.Get("/participantes", h.ListParticipantes)
			r.Get("/participantes/{id}", h.GetParticipante)
			r.Get("/participantes/{id}/resumo", h.ResumoParticipante)
			r.Get("/participantes/{id}/consolidacao", h.ConsolidacaoParticipante)

			r.With(authmw.RequireRole("admin", "operador")).Post("/participantes", h.CreateParticipante)
			r.With(authmw.RequireRole("admin", "operador")).Put("/participantes/{id}", h.UpdateParticipante)
			r.With(authmw.RequireRole("admin")).Delete("/participantes/{id}", h.DeleteParticipante)

			r.Get("/pagamentos", h.ListPagamentos)
			r.With(authmw.RequireRole("admin", "operador")).Post("/pagamentos", h.CreatePagamento)
			r.With(authmw.RequireRole("admin")).Delete("/pagamentos/{id}", h.DeletePagamento)

			r.Get("/recebimentos", h.ListRecebimentos)
			r.With(authmw.RequireRole("admin", "operador")).Post("/recebimentos", h.CreateRecebimento)
			r.With(authmw.RequireRole("admin")).Delete("/recebimentos/{id}", h.DeleteRecebimento)

			r.With(authmw.RequireRole("admin")).Get("/users", h.ListUsers)
			r.With(authmw.RequireRole("admin")).Post("/users", h.CreateUser)
			r.With(authmw.RequireRole("admin")).Put("/users/{id}", h.UpdateUser)
			r.With(authmw.RequireRole("admin")).Delete("/users/{id}", h.DeleteUser)
			r.Patch("/users/{id}/senha", h.AlterarSenha)

			r.With(authmw.RequireRole("admin", "operador")).Post("/acordos", h.CriarAcordo)
			r.With(authmw.RequireRole("admin", "operador")).Patch("/acordos/{id}/status", h.AtualizarStatusAcordo)
			r.With(authmw.RequireRole("admin", "operador")).Get("/acordos", h.ListarAcordos)
			r.With(authmw.RequireRole("admin", "operador")).Get("/acordos/{id}/pagamentos", h.ListarPagamentosAcordo)
			r.With(authmw.RequireRole("admin", "operador")).Get("/acordos/export/csv", h.ExportarAcordosCSV)
			r.With(authmw.RequireRole("admin", "operador")).Get("/acordos/filtros", h.ListarAcordosComFiltros)
			r.With(authmw.RequireRole("admin", "operador")).Get("/participantes/{id}/acordos", h.ListarAcordosParticipante)
		})
	})

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Printf("servidor rodando em :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("erro no servidor: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("encerrando servidor...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("erro no shutdown gracioso: %v", err)
	}
}

func seedAdminUser(ctx context.Context, pool *pgxpool.Pool) {
	var count int
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&count); err != nil {
		log.Printf("seed: erro ao verificar usuários: %v", err)
		return
	}
	if count > 0 {
		return
	}

	adminEmail := getenv("ADMIN_EMAIL", "admin@consorcios.com")
	adminPassword := getenv("ADMIN_PASSWORD", "admin123")

	hash, err := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("seed: erro ao gerar hash: %v", err)
		return
	}

	_, err = pool.Exec(ctx,
		`INSERT INTO users (nome, email, senha_hash, role) VALUES ($1,$2,$3,$4)`,
		"Administrador", adminEmail, string(hash), "admin")
	if err != nil {
		log.Printf("seed: erro ao criar admin: %v", err)
		return
	}

	if os.Getenv("ADMIN_PASSWORD") == "" {
		log.Println("[seed] Usuário admin criado com senha padrão. Defina ADMIN_PASSWORD em produção.")
	}
	log.Printf("[seed] Usuário admin criado -> %s", adminEmail)
}

func getenv(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func parseOrigins(value string) []string {
	parts := strings.Split(value, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	if len(origins) == 0 {
		return []string{"*"}
	}
	return origins
}
