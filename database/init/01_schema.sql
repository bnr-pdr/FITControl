-- =========================================================
-- 01 - Tabelas
-- =========================================================

-- ---------- USUÁRIOS / LOGIN (admin, professor, aluno) ----------
CREATE TABLE usuario (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome        VARCHAR(120) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE CHECK (email = lower(email)),
    senha_hash  VARCHAR(255) NOT NULL,              -- bcrypt, nunca senha pura
    tipo        VARCHAR(10)  NOT NULL CHECK (tipo IN ('admin','professor','aluno')),
    ativo       BOOLEAN      NOT NULL DEFAULT TRUE, -- soft delete
    criado_em   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE aluno (
    id               INT PRIMARY KEY REFERENCES usuario(id),
    cpf              CHAR(11) NOT NULL UNIQUE CHECK (cpf ~ '^[0-9]{11}$'),
    data_nascimento  DATE,
    telefone         VARCHAR(20),
    objetivo         VARCHAR(100)
);

CREATE TABLE professor (
    id             INT PRIMARY KEY REFERENCES usuario(id),
    cref           VARCHAR(20) UNIQUE,
    especialidade  VARCHAR(100),
    telefone       VARCHAR(20)
);

-- ---------- PLANOS ----------
CREATE TABLE plano (
    id             INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome           VARCHAR(60)   NOT NULL UNIQUE,
    descricao      TEXT,
    valor          NUMERIC(10,2) NOT NULL CHECK (valor >= 0),
    duracao_meses  SMALLINT      NOT NULL CHECK (duracao_meses > 0),
    ativo          BOOLEAN       NOT NULL DEFAULT TRUE
);

-- ---------- MATRÍCULA ----------
CREATE TABLE matricula (
    id               INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    aluno_id         INT  NOT NULL REFERENCES aluno(id),
    plano_id         INT  NOT NULL REFERENCES plano(id),
    data_inicio      DATE NOT NULL DEFAULT CURRENT_DATE,
    data_vencimento  DATE NOT NULL,                 -- preenchida pelo trigger se vier vazia
    status           VARCHAR(10) NOT NULL DEFAULT 'ativa'
                     CHECK (status IN ('ativa','trancada','cancelada')),
    criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (data_vencimento > data_inicio)
);
-- Só 1 matrícula ativa por aluno
CREATE UNIQUE INDEX uq_matricula_ativa ON matricula(aluno_id) WHERE status = 'ativa';
CREATE INDEX idx_matricula_plano ON matricula(plano_id);

-- ---------- PAGAMENTOS ----------
CREATE TABLE pagamento (
    id               INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    matricula_id     INT NOT NULL REFERENCES matricula(id),
    valor            NUMERIC(10,2) NOT NULL CHECK (valor >= 0),
    data_vencimento  DATE NOT NULL,
    data_pagamento   DATE,
    forma_pagamento  VARCHAR(15) CHECK (forma_pagamento IN ('pix','cartao','dinheiro','boleto')),
    status           VARCHAR(10) NOT NULL DEFAULT 'pendente'
                     CHECK (status IN ('pendente','pago','cancelado')),
    -- pago <=> tem data de pagamento e forma
    CHECK ((status = 'pago') = (data_pagamento IS NOT NULL)),
    CHECK (status <> 'pago' OR forma_pagamento IS NOT NULL)
);
CREATE INDEX idx_pagamento_matricula ON pagamento(matricula_id);
CREATE INDEX idx_pagamento_status    ON pagamento(status, data_vencimento);

-- ---------- CHECK-IN / FREQUÊNCIA ----------
CREATE TABLE checkin (
    id        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    aluno_id  INT  NOT NULL REFERENCES aluno(id),
    data      DATE NOT NULL DEFAULT CURRENT_DATE,
    hora      TIME NOT NULL DEFAULT LOCALTIME,
    metodo    VARCHAR(10) NOT NULL CHECK (metodo IN ('botao','qrcode')),
    UNIQUE (aluno_id, data)                         -- 1 check-in por dia
);

-- ---------- TREINOS ----------
CREATE TABLE exercicio (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome            VARCHAR(100) NOT NULL UNIQUE,
    grupo_muscular  VARCHAR(50)  NOT NULL
);

CREATE TABLE treino (
    id            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    aluno_id      INT NOT NULL REFERENCES aluno(id),
    professor_id  INT REFERENCES professor(id),
    nome          VARCHAR(60) NOT NULL,             -- Treino A, B, C...
    dia_semana    SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0 = domingo
    observacao    TEXT,
    ativo         BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- 1 treino ativo por aluno por dia da semana
CREATE UNIQUE INDEX uq_treino_dia ON treino(aluno_id, dia_semana) WHERE ativo;
CREATE INDEX idx_treino_professor ON treino(professor_id);

CREATE TABLE treino_exercicio (
    id            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    treino_id     INT NOT NULL REFERENCES treino(id) ON DELETE CASCADE,
    exercicio_id  INT NOT NULL REFERENCES exercicio(id),
    ordem         SMALLINT NOT NULL,
    series        SMALLINT NOT NULL CHECK (series > 0),
    repeticoes    VARCHAR(10) NOT NULL,             -- '12' ou '8-12'
    carga_kg      NUMERIC(5,1) CHECK (carga_kg >= 0),
    descanso_seg  SMALLINT DEFAULT 60,
    UNIQUE (treino_id, ordem)
);
CREATE INDEX idx_treino_exercicio_exercicio ON treino_exercicio(exercicio_id);
