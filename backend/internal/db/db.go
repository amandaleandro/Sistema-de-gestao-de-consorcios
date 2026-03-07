package db

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect tenta conectar ao banco com retry exponencial.
// Útil quando o container do postgres ainda está inicializando.
func Connect(ctx context.Context, dsn string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, err
	}

	const maxAttempts = 10
	wait := 2 * time.Second

	for i := 1; i <= maxAttempts; i++ {
		pool, err := pgxpool.NewWithConfig(ctx, cfg)
		if err == nil {
			if pingErr := pool.Ping(ctx); pingErr == nil {
				return pool, nil
			} else {
				pool.Close()
				err = pingErr
			}
		}
		if i == maxAttempts {
			return nil, err
		}
		log.Printf("banco não disponível (tentativa %d/%d), aguardando %v...", i, maxAttempts, wait)
		select {
		case <-time.After(wait):
		case <-ctx.Done():
			return nil, ctx.Err()
		}
		if wait < 30*time.Second {
			wait *= 2
		}
	}
	return nil, nil // unreachable
}
