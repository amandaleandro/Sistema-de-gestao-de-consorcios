package db

import (
	"context"
	_ "embed"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/001_schema.sql
var migration001 string

//go:embed migrations/002_users.sql
var migration002 string

// RunMigrations executa todas as migrations em ordem.
// As queries usam CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE, então é idempotente.
func RunMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	migrations := []struct {
		name string
		sql  string
	}{
		{"001_schema", migration001},
		{"002_users", migration002},
	}

	for _, m := range migrations {
		if _, err := pool.Exec(ctx, m.sql); err != nil {
			return fmt.Errorf("migration %s: %w", m.name, err)
		}
	}
	return nil
}
