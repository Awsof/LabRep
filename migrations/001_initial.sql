-- ══════════════════════════════════════════════════════════════════
-- LabRep — Schema v1.1
-- Especificação Tiamat v1.0 + Adendo v1.1 (Hierarquia + Mobile-First)
-- ══════════════════════════════════════════════════════════════════

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ──────────────────────────────────────────────────────────────────
-- Apoios (laboratórios parceiros — tabela de referência)
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS apoios (
  id              TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  nome            TEXT    NOT NULL,
  uf              TEXT    NOT NULL,
  lab_principal   TEXT,
  gestor_user_id  TEXT,
  created_at      DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- ──────────────────────────────────────────────────────────────────
-- Users (espelho do Clerk — gerenciado via webhook)
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                   TEXT    PRIMARY KEY,                    -- Clerk user_id
  email                TEXT    NOT NULL UNIQUE,
  nome                 TEXT    NOT NULL,
  plano                TEXT    NOT NULL DEFAULT 'free'
                               CHECK(plano IN ('free','pro','pro_plus','b2b')),
  plano_expira_em      DATETIME,
  stripe_cust_id       TEXT,
  apoio_id             TEXT    REFERENCES apoios(id),
  alerta_dias_sem_contato INTEGER NOT NULL DEFAULT 15,         -- configurável por rep
  created_at           DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- ──────────────────────────────────────────────────────────────────
-- Grupos (Redes, Grupos Econômicos, Associações)
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grupos (
  id           TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  rep_id       TEXT    NOT NULL REFERENCES users(id),
  nome         TEXT    NOT NULL,
  tipo         TEXT    NOT NULL CHECK(tipo IN (
                 'rede_laboratorial',
                 'rede_hospitalar',
                 'grupo_economico',
                 'associacao',
                 'outros'
               )),
  descricao    TEXT,
  contato_nome TEXT,
  whatsapp     TEXT,
  email        TEXT,
  created_at   DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_grupos_rep ON grupos(rep_id);

-- ──────────────────────────────────────────────────────────────────
-- Clientes (Matrizes e Postos de Coleta)
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id                   TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  rep_id               TEXT    NOT NULL REFERENCES users(id),

  -- Hierarquia (RN-07, RN-08)
  tipo_unidade         TEXT    NOT NULL DEFAULT 'matriz'
                               CHECK(tipo_unidade IN ('matriz', 'posto_coleta')),
  matriz_id            TEXT    REFERENCES clientes(id),        -- NULL = é uma matriz
  grupo_id             TEXT    REFERENCES grupos(id),          -- NULL = sem grupo

  -- Identificação
  cnpj                 TEXT,                                   -- NULL permitido para posto sem CNPJ próprio
  cnpj_proprio         INTEGER NOT NULL DEFAULT 1,             -- 0 = compartilha CNPJ da matriz
  razao_social         TEXT    NOT NULL,
  nome_fantasia        TEXT,
  cnae_principal       TEXT,

  -- Classificação
  tipo                 TEXT    NOT NULL CHECK(tipo IN (
                         'clinica', 'consultorio', 'hospital',
                         'lab_parceiro', 'posto_coleta', 'outros'
                       )),
  status               TEXT    NOT NULL DEFAULT 'ativo'
                               CHECK(status IN ('ativo','inativo','prospecto','em_negociacao')),
  apoio_atual_id       TEXT    REFERENCES apoios(id),

  -- Localização
  logradouro           TEXT,
  municipio            TEXT,
  uf                   TEXT,
  cep                  TEXT,
  latitude             REAL,
  longitude            REAL,

  -- Contato
  whatsapp             TEXT,
  email                TEXT,
  contato_nome         TEXT,

  -- Potencial e controle
  potencial_mensal     REAL,
  tags                 TEXT    DEFAULT '[]',                   -- JSON array
  ultima_interacao_em  DATETIME,
  created_at           DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- RN-03: CNPJ único apenas para matrizes com CNPJ próprio
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_cnpj_matriz
  ON clientes(rep_id, cnpj)
  WHERE matriz_id IS NULL AND cnpj IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clientes_rep_status
  ON clientes(rep_id, status);

CREATE INDEX IF NOT EXISTS idx_clientes_matriz
  ON clientes(matriz_id)
  WHERE matriz_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clientes_grupo
  ON clientes(grupo_id)
  WHERE grupo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clientes_ultima
  ON clientes(rep_id, ultima_interacao_em);

-- ──────────────────────────────────────────────────────────────────
-- Histórico de Interações (RN-04: soft delete apenas)
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interacoes (
  id               TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  rep_id           TEXT    NOT NULL REFERENCES users(id),
  cliente_id       TEXT    NOT NULL REFERENCES clientes(id),
  tipo             TEXT    NOT NULL CHECK(tipo IN (
                     'visita', 'whatsapp', 'ligacao', 'email', 'proposta', 'outro'
                   )),
  descricao        TEXT,
  resultado        TEXT    CHECK(resultado IN (
                     'positivo', 'neutro', 'negativo', 'sem_resposta'
                   )),
  proximo_followup DATETIME,
  arquivada        INTEGER NOT NULL DEFAULT 0,                 -- soft delete (RN-04)
  realizada_em     DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inter_cliente
  ON interacoes(cliente_id, realizada_em DESC);

CREATE INDEX IF NOT EXISTS idx_inter_followup
  ON interacoes(rep_id, proximo_followup)
  WHERE proximo_followup IS NOT NULL AND arquivada = 0;

-- ──────────────────────────────────────────────────────────────────
-- Pipeline de Vendas (RN-10: cliente_id OU grupo_id, nunca ambos)
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline (
  id              TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  rep_id          TEXT    NOT NULL REFERENCES users(id),
  cliente_id      TEXT    REFERENCES clientes(id),
  grupo_id        TEXT    REFERENCES grupos(id),
  estagio         TEXT    NOT NULL DEFAULT 'prospecto'
                          CHECK(estagio IN (
                            'prospecto', 'contato', 'proposta', 'fechado', 'perdido'
                          )),
  valor_estimado  REAL,
  motivo_perda    TEXT,
  descricao       TEXT,
  updated_at      DATETIME NOT NULL DEFAULT (datetime('now')),
  created_at      DATETIME NOT NULL DEFAULT (datetime('now')),

  -- RN-10: exatamente um dos dois, nunca ambos, nunca nenhum
  CHECK (
    (cliente_id IS NOT NULL AND grupo_id IS NULL) OR
    (cliente_id IS NULL     AND grupo_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_pipeline_rep
  ON pipeline(rep_id, estagio);

-- ──────────────────────────────────────────────────────────────────
-- Alertas e Notificações
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alertas (
  id          TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  rep_id      TEXT    NOT NULL REFERENCES users(id),
  cliente_id  TEXT    REFERENCES clientes(id),
  tipo        TEXT    NOT NULL CHECK(tipo IN (
                'followup_vencido', 'sem_contato', 'agenda'
              )),
  titulo      TEXT    NOT NULL,
  dispara_em  DATETIME NOT NULL,
  lido        INTEGER NOT NULL DEFAULT 0,
  canal       TEXT    NOT NULL DEFAULT 'push'
                      CHECK(canal IN ('push', 'email', 'ambos')),
  created_at  DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_alertas_rep_lido
  ON alertas(rep_id, lido, dispara_em);

-- ──────────────────────────────────────────────────────────────────
-- Views (sem custo — SQLite)
-- ──────────────────────────────────────────────────────────────────
CREATE VIEW IF NOT EXISTS v_grupos_potencial AS
SELECT
  g.id,
  g.rep_id,
  g.nome,
  g.tipo,
  COUNT(c.id)                                                    AS total_unidades,
  SUM(CASE WHEN c.tipo_unidade = 'matriz'       THEN 1 ELSE 0 END) AS total_matrizes,
  SUM(CASE WHEN c.tipo_unidade = 'posto_coleta' THEN 1 ELSE 0 END) AS total_postos,
  SUM(c.potencial_mensal)                                        AS potencial_total_mensal,
  MAX(c.ultima_interacao_em)                                     AS ultima_interacao_rede,
  SUM(CASE WHEN c.status = 'ativo'              THEN 1 ELSE 0 END) AS unidades_ativas
FROM grupos g
LEFT JOIN clientes c ON c.grupo_id = g.id AND c.rep_id = g.rep_id
GROUP BY g.id, g.rep_id, g.nome, g.tipo;

CREATE VIEW IF NOT EXISTS v_clientes_completo AS
SELECT
  c.*,
  m.razao_social                                                  AS matriz_nome,
  m.municipio                                                     AS matriz_municipio,
  g.nome                                                          AS grupo_nome,
  g.tipo                                                          AS grupo_tipo,
  CAST(julianday('now') - julianday(c.ultima_interacao_em) AS INTEGER) AS dias_sem_contato
FROM clientes c
LEFT JOIN clientes m ON m.id = c.matriz_id
LEFT JOIN grupos   g ON g.id = c.grupo_id;
