-- ============================================================
-- Tabela de Usuários do Sistema
-- ============================================================

CREATE TABLE users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nome          VARCHAR(150) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    senha_hash    TEXT         NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'operador'
                  CHECK (role IN ('admin', 'operador', 'visualizador')),
    ativo         BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- O usuário admin padrão é criado pelo Go na inicialização da aplicação.
-- Credenciais iniciais: admin@consorcios.com / admin123
-- Troque a senha após o primeiro login!
