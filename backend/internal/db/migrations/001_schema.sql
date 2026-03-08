-- ============================================================
-- Schema: Sistema de Gestão de Consórcios
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Consórcios
CREATE TABLE IF NOT EXISTS consorcios (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nome        VARCHAR(150) NOT NULL,
    valor_inicial_cota  NUMERIC(12,2) NOT NULL,
    taxa_aumento        NUMERIC(12,2) NOT NULL DEFAULT 0,
    taxa_administrativa NUMERIC(5,2)  NOT NULL DEFAULT 0, -- percentual ex: 10.00
    qtd_participantes   INTEGER       NOT NULL,
    data_inicio         DATE          NOT NULL,
    periodicidade       VARCHAR(10)   NOT NULL CHECK (periodicidade IN ('diario','semanal','quinzenal','mensal')),
    dia_semana          INTEGER       CHECK (dia_semana BETWEEN 0 AND 6), -- 0=domingo, 1=segunda, ... 6=sábado
    ativo               BOOLEAN       NOT NULL DEFAULT TRUE,
    criado_em           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Participantes
CREATE TABLE IF NOT EXISTS participantes (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nome          VARCHAR(150) NOT NULL,
    telefone      VARCHAR(20),
    criado_em     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Relação participante <-> consórcio
CREATE TABLE IF NOT EXISTS consorcio_participantes (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    consorcio_id    UUID        NOT NULL REFERENCES consorcios(id) ON DELETE CASCADE,
    participante_id UUID        NOT NULL REFERENCES participantes(id) ON DELETE CASCADE,
    data_entrada    DATE        NOT NULL DEFAULT CURRENT_DATE,
    status          VARCHAR(15) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inadimplente','quitado')),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(consorcio_id, participante_id)
);

-- Períodos gerados automaticamente por consórcio
CREATE TABLE IF NOT EXISTS periodos (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    consorcio_id    UUID        NOT NULL REFERENCES consorcios(id) ON DELETE CASCADE,
    numero          INTEGER     NOT NULL,           -- 1, 2, 3 ...
    data_referencia DATE        NOT NULL,
    valor_cota      NUMERIC(12,2) NOT NULL,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pagamentos registrados manualmente
CREATE TABLE IF NOT EXISTS pagamentos (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    consorcio_participante_id UUID      NOT NULL REFERENCES consorcio_participantes(id) ON DELETE CASCADE,
    periodo_id              UUID        NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
    data_pagamento          DATE        NOT NULL DEFAULT CURRENT_DATE,
    valor_pago              NUMERIC(12,2) NOT NULL,
    observacao              TEXT,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acordo_id                UUID        REFERENCES acordos(id)
);

-- Recebimento de cotas (contemplação)
CREATE TABLE IF NOT EXISTS recebimentos (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    consorcio_participante_id UUID      NOT NULL REFERENCES consorcio_participantes(id) ON DELETE CASCADE,
    periodo_id              UUID        NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
    data_recebimento        DATE        NOT NULL DEFAULT CURRENT_DATE,
    valor_bruto             NUMERIC(12,2) NOT NULL,
    taxa_administrativa     NUMERIC(12,2) NOT NULL,
    valor_liquido           NUMERIC(12,2) NOT NULL,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Acordos registrados
CREATE TABLE IF NOT EXISTS acordos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participante_id UUID NOT NULL REFERENCES participantes(id) ON DELETE CASCADE,
    valor_parcela NUMERIC(12,2) NOT NULL,
    parcelas INTEGER NOT NULL,
    total NUMERIC(12,2) NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(15) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','quitado','cancelado')),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    observacao TEXT,
    quitado_em TIMESTAMPTZ,
    cancelado_em TIMESTAMPTZ,
    usuario_aprovador UUID REFERENCES users(id),
    usuario_cancelador UUID REFERENCES users(id)
);

-- View: resumo financeiro por participante+consórcio
CREATE OR REPLACE VIEW vw_resumo_participante_consorcio AS
SELECT
    cp.id                           AS cp_id,
    cp.participante_id,
    p.nome                          AS participante_nome,
    p.telefone,
    cp.consorcio_id,
    c.nome                          AS consorcio_nome,
    c.periodicidade,
    cp.status,
    cp.data_entrada,
    -- total de períodos desde entrada
    COUNT(DISTINCT per.id)                                         AS total_periodos,
    -- total pago
    COALESCE(SUM(pg.valor_pago), 0)                               AS total_pago,
    -- total devido (soma cotas dos períodos sem pagamento)
    COALESCE(SUM(CASE WHEN pg.id IS NULL THEN per.valor_cota ELSE 0 END), 0) AS total_devido,
    -- parcelas pagas
    COUNT(DISTINCT pg.periodo_id)                                  AS parcelas_pagas,
    -- parcelas pendentes
    COUNT(DISTINCT CASE WHEN pg.id IS NULL THEN per.id END)       AS parcelas_pendentes
FROM consorcio_participantes cp
JOIN participantes p  ON p.id = cp.participante_id
JOIN consorcios    c  ON c.id = cp.consorcio_id
LEFT JOIN periodos per ON per.consorcio_id = cp.consorcio_id
    AND per.data_referencia >= cp.data_entrada
LEFT JOIN pagamentos pg ON pg.periodo_id = per.id
    AND pg.consorcio_participante_id = cp.id
GROUP BY cp.id, cp.participante_id, p.nome, p.telefone,
         cp.consorcio_id, c.nome, c.periodicidade, cp.status, cp.data_entrada;

-- View: consolidação financeira diária por participante
CREATE OR REPLACE VIEW vw_consolidacao_diaria AS
SELECT
    p.id                        AS participante_id,
    p.nome                      AS participante_nome,
    per.data_referencia         AS data,
    -- total a pagar no dia
    SUM(CASE WHEN cp.status = 'ativo' THEN per.valor_cota ELSE 0 END) AS total_a_pagar,
    -- total a receber no dia (contemplações)
    COALESCE(SUM(rec.valor_liquido), 0)                               AS total_a_receber
FROM participantes p
JOIN consorcio_participantes cp ON cp.participante_id = p.id
JOIN periodos per ON per.consorcio_id = cp.consorcio_id
    AND per.data_referencia >= cp.data_entrada
LEFT JOIN recebimentos rec ON rec.consorcio_participante_id = cp.id
    AND rec.periodo_id = per.id
GROUP BY p.id, p.nome, per.data_referencia;

-- Índices
CREATE INDEX IF NOT EXISTS idx_periodos_consorcio        ON periodos(consorcio_id);
CREATE INDEX IF NOT EXISTS idx_periodos_data             ON periodos(data_referencia);
CREATE INDEX IF NOT EXISTS idx_pagamentos_cp             ON pagamentos(consorcio_participante_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_periodo        ON pagamentos(periodo_id);
CREATE INDEX IF NOT EXISTS idx_recebimentos_cp           ON recebimentos(consorcio_participante_id);
CREATE INDEX IF NOT EXISTS idx_cp_consorcio              ON consorcio_participantes(consorcio_id);
CREATE INDEX IF NOT EXISTS idx_cp_participante           ON consorcio_participantes(participante_id);
