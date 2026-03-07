package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"sync"
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

var (
	appHandler *handlers.Handler
	dbReady    = make(chan struct{})
	once       sync.Once
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

	// Health check responde imediatamente
	r.Get("/api/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Middleware que espera o banco estar pronto antes de processar requests
	waitForDB := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			<-dbReady // bloqueia até o banco estar pronto
			next.ServeHTTP(w, r)
		})
	}

	// Registra TODAS as rotas imediatamente (mas elas esperam o banco via middleware)
	r.Route("/api", func(r chi.Router) {
		r.Use(waitForDB)

		// Auth routes (públicas)
		r.Post("/auth/login", func(w http.ResponseWriter, r *http.Request) {
			appHandler.Login(w, r)
		})

		r.Group(func(r chi.Router) {
			r.Use(authmw.Authenticator)

			r.Get("/auth/me", func(w http.ResponseWriter, r *http.Request) { appHandler.Me(w, r) })
			r.Get("/dashboard", func(w http.ResponseWriter, r *http.Request) { appHandler.Dashboard(w, r) })

			r.Get("/consorcios", func(w http.ResponseWriter, r *http.Request) { appHandler.ListConsorcios(w, r) })
			r.Get("/consorcios/{id}", func(w http.ResponseWriter, r *http.Request) { appHandler.GetConsorcio(w, r) })
			r.Get("/consorcios/{id}/periodos", func(w http.ResponseWriter, r *http.Request) { appHandler.ListPeriodos(w, r) })
			r.Get("/consorcios/{id}/participantes", func(w http.ResponseWriter, r *http.Request) { appHandler.ListConsorcioParticipantes(w, r) })

			r.With(authmw.RequireRole("admin", "operador")).Post("/consorcios", func(w http.ResponseWriter, r *http.Request) { appHandler.CreateConsorcio(w, r) })
			r.With(authmw.RequireRole("admin", "operador")).Put("/consorcios/{id}", func(w http.ResponseWriter, r *http.Request) { appHandler.UpdateConsorcio(w, r) })
			r.With(authmw.RequireRole("admin", "operador")).Post("/consorcios/{id}/gerar-periodos", func(w http.ResponseWriter, r *http.Request) { appHandler.GerarPeriodos(w, r) })
			r.With(authmw.RequireRole("admin", "operador")).Post("/consorcios/{id}/participantes", func(w http.ResponseWriter, r *http.Request) { appHandler.AddParticipante(w, r) })
			r.With(authmw.RequireRole("admin", "operador")).Patch("/consorcios/{cid}/participantes/{pid}/status", func(w http.ResponseWriter, r *http.Request) { appHandler.UpdateStatusParticipante(w, r) })
			r.With(authmw.RequireRole("admin")).Delete("/consorcios/{id}", func(w http.ResponseWriter, r *http.Request) { appHandler.DeleteConsorcio(w, r) })
			r.With(authmw.RequireRole("admin")).Delete("/consorcios/{cid}/participantes/{pid}", func(w http.ResponseWriter, r *http.Request) { appHandler.RemoveParticipante(w, r) })

			r.Get("/participantes", func(w http.ResponseWriter, r *http.Request) { appHandler.ListParticipantes(w, r) })
			r.Get("/participantes/{id}", func(w http.ResponseWriter, r *http.Request) { appHandler.GetParticipante(w, r) })
			r.Get("/participantes/{id}/resumo", func(w http.ResponseWriter, r *http.Request) { appHandler.ResumoParticipante(w, r) })
			r.Get("/participantes/{id}/consolidacao", func(w http.ResponseWriter, r *http.Request) { appHandler.ConsolidacaoParticipante(w, r) })

			r.With(authmw.RequireRole("admin", "operador")).Post("/participantes", func(w http.ResponseWriter, r *http.Request) { appHandler.CreateParticipante(w, r) })
			r.With(authmw.RequireRole("admin", "operador")).Put("/participantes/{id}", func(w http.ResponseWriter, r *http.Request) { appHandler.UpdateParticipante(w, r) })
			r.With(authmw.RequireRole("admin")).Delete("/participantes/{id}", func(w http.ResponseWriter, r *http.Request) { appHandler.DeleteParticipante(w, r) })

			r.Get("/pagamentos", func(w http.ResponseWriter, r *http.Request) { appHandler.ListPagamentos(w, r) })
			r.With(authmw.RequireRole("admin", "operador")).Post("/pagamentos", func(w http.ResponseWriter, r *http.Request) { appHandler.CreatePagamento(w, r) })
			r.With(authmw.RequireRole("admin")).Delete("/pagamentos/{id}", func(w http.ResponseWriter, r *http.Request) { appHandler.DeletePagamento(w, r) })

			r.Get("/recebimentos", func(w http.ResponseWriter, r *http.Request) { appHandler.ListRecebimentos(w, r) })
			r.With(authmw.RequireRole("admin", "operador")).Post("/recebimentos", func(w http.ResponseWriter, r *http.Request) { appHandler.CreateRecebimento(w, r) })
			r.With(authmw.RequireRole("admin")).Delete("/recebimentos/{id}", func(w http.ResponseWriter, r *http.Request) { appHandler.DeleteRecebimento(w, r) })

			r.With(authmw.RequireRole("admin")).Get("/users", func(w http.ResponseWriter, r *http.Request) { appHandler.ListUsers(w, r) })
			r.With(authmw.RequireRole("admin")).Post("/users", func(w http.ResponseWriter, r *http.Request) { appHandler.CreateUser(w, r) })
			r.With(authmw.RequireRole("admin")).Put("/users/{id}", func(w http.ResponseWriter, r *http.Request) { appHandler.UpdateUser(w, r) })
			r.With(authmw.RequireRole("admin")).Delete("/users/{id}", func(w http.ResponseWriter, r *http.Request) { appHandler.DeleteUser(w, r) })
			r.Patch("/users/{id}/senha", func(w http.ResponseWriter, r *http.Request) { appHandler.AlterarSenha(w, r) })
		})
	})

	// Conecta ao banco em background e sinaliza quando estiver pronto
	go func() {
		pool, err := db.Connect(context.Background(), dsn)
		if err != nil {
			log.Fatalf("falha ao conectar no banco: %v", err)
		}

		if err := db.RunMigrations(context.Background(), pool); err != nil {
			log.Fatalf("falha ao executar migrations: %v", err)
		}
		log.Println("migrations executadas com sucesso")

		seedAdminUser(context.Background(), pool)

		appHandler = handlers.New(pool)
		
		once.Do(func() {
			close(dbReady) // sinaliza que o banco está pronto
			log.Println("banco de dados pronto, rotas liberadas")
		})
	}()

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
