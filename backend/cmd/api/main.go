package main

import (
	"context"
	"log"
	"net/http"
	"os"
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

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://consorcios:consorcios123@localhost:5432/consorcios?sslmode=disable"
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Conecta ao banco ANTES de iniciar o servidor
	log.Println("conectando ao banco de dados...")
	pool, err := db.Connect(context.Background(), dsn)
	if err != nil {
		log.Fatalf("falha ao conectar no banco: %v", err)
	}
	log.Println("banco conectado")

	// Roda migrations
	if err := db.RunMigrations(context.Background(), pool); err != nil {
		log.Fatalf("falha ao executar migrations: %v", err)
	}
	log.Println("migrations executadas com sucesso")

	// Cria usuário admin se necessário
	seedAdminUser(context.Background(), pool)

	// Inicializa handlers
	h := handlers.New(pool)

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// Health check
	r.Get("/api/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Rotas da API
	r.Route("/api", func(r chi.Router) {
		// Auth (público)
		r.Post("/auth/login", h.Login)

		// Rotas protegidas
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

			// Acordos
			r.With(authmw.RequireRole("admin", "operador")).Get("/participantes/{id}/acordos", h.ListarAcordosParticipante)
		})
	})

	log.Printf("servidor rodando em :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}

// seedAdminUser cria o usuário admin padrão se a tabela de usuários estiver vazia.
func seedAdminUser(ctx context.Context, pool *pgxpool.Pool) {
	var count int
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&count); err != nil {
		log.Printf("seed: erro ao verificar usuários: %v", err)
		return
	}
	if count > 0 {
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("seed: erro ao gerar hash: %v", err)
		return
	}
	_, err = pool.Exec(ctx,
		`INSERT INTO users (nome, email, senha_hash, role) VALUES ($1,$2,$3,$4)`,
		"Administrador", "admin@consorcios.com", string(hash), "admin")
	if err != nil {
		log.Printf("seed: erro ao criar admin: %v", err)
		return
	}
	log.Println("[seed] Usuário admin criado → admin@consorcios.com / admin123  (troque a senha!)")
}
