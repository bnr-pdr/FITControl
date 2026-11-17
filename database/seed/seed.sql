-- =========================================================
-- DADOS DE TESTE - SOMENTE DESENVOLVIMENTO
-- Senha de todos os usuários: senha123
-- =========================================================

-- ---------- Usuários ----------
INSERT INTO usuario (nome, email, senha_hash, tipo)
SELECT v.nome, v.email, crypt('senha123', gen_salt('bf', 10)), v.tipo
FROM (VALUES
  ('Administrador',   'admin@academia.com',   'admin'),
  ('Carlos Mendes',   'carlos@academia.com',  'professor'),
  ('Juliana Rocha',   'juliana@academia.com', 'professor'),
  ('Ana Souza',       'ana@email.com',        'aluno'),
  ('Bruno Lima',      'bruno@email.com',      'aluno'),
  ('Camila Alves',    'camila@email.com',     'aluno'),
  ('Diego Martins',   'diego@email.com',      'aluno'),
  ('Elisa Ferreira',  'elisa@email.com',      'aluno')
) AS v(nome, email, tipo);

INSERT INTO professor (id, cref, especialidade, telefone)
SELECT u.id, v.cref, v.esp, v.tel
FROM (VALUES
  ('carlos@academia.com',  '123456-G/SP', 'Musculação',        '11980000001'),
  ('juliana@academia.com', '654321-G/SP', 'Funcional e HIIT',  '11980000002')
) AS v(email, cref, esp, tel)
JOIN usuario u ON u.email = v.email;

INSERT INTO aluno (id, cpf, data_nascimento, telefone, objetivo)
SELECT u.id, v.cpf, v.nasc::DATE, v.tel, v.obj
FROM (VALUES
  ('ana@email.com',    '11122233344', '2000-05-10', '11990000001', 'Hipertrofia'),
  ('bruno@email.com',  '22233344455', '1998-11-22', '11990000002', 'Emagrecimento'),
  ('camila@email.com', '33344455566', '2002-02-14', '11990000003', 'Condicionamento'),
  ('diego@email.com',  '44455566677', '1995-07-30', '11990000004', 'Hipertrofia'),
  ('elisa@email.com',  '55566677788', '2001-09-05', '11990000005', 'Saúde')
) AS v(email, cpf, nasc, tel, obj)
JOIN usuario u ON u.email = v.email;

-- ---------- Planos ----------
INSERT INTO plano (nome, descricao, valor, duracao_meses) VALUES
  ('Mensal',     'Acesso livre por 1 mês',   99.90,  1),
  ('Trimestral', 'Acesso livre por 3 meses', 269.90, 3),
  ('Semestral',  'Acesso livre por 6 meses', 499.90, 6),
  ('Anual',      'Acesso livre por 12 meses', 899.90, 12);

-- ---------- Matrículas (vencimento e pagamento gerados pelos triggers) ----------
INSERT INTO matricula (aluno_id, plano_id, data_inicio)
SELECT u.id, p.id, CURRENT_DATE - v.dias_atras
FROM (VALUES
  ('ana@email.com',    'Mensal',     10),   -- ativa, vence em ~20 dias
  ('bruno@email.com',  'Trimestral', 60),   -- ativa
  ('camila@email.com', 'Anual',     200),   -- ativa
  ('diego@email.com',  'Mensal',     40),   -- VENCIDA
  ('elisa@email.com',  'Mensal',     27)    -- vence nos próximos dias
) AS v(email, plano, dias_atras)
JOIN usuario u ON u.email = v.email
JOIN plano p   ON p.nome  = v.plano;

-- Todos pagaram, menos o Diego (fica atrasado)
UPDATE pagamento pg
SET status = 'pago',
    data_pagamento = pg.data_vencimento,
    forma_pagamento = (ARRAY['pix','cartao','dinheiro'])[1 + pg.id % 3]
FROM matricula m JOIN usuario u ON u.id = m.aluno_id
WHERE m.id = pg.matricula_id AND u.email <> 'diego@email.com';

-- ---------- Exercícios ----------
INSERT INTO exercicio (nome, grupo_muscular) VALUES
  ('Supino reto',          'peito'),
  ('Supino inclinado',     'peito'),
  ('Crucifixo',            'peito'),
  ('Tríceps corda',        'tríceps'),
  ('Puxada frontal',       'costas'),
  ('Remada baixa',         'costas'),
  ('Rosca direta',         'bíceps'),
  ('Rosca martelo',        'bíceps'),
  ('Agachamento livre',    'pernas'),
  ('Leg press 45',         'pernas'),
  ('Cadeira extensora',    'pernas'),
  ('Elevação pélvica',     'glúteos');

-- ---------- Treinos: A/B/C em todos os dias da semana (para sempre ter "treino do dia") ----------
INSERT INTO treino (aluno_id, professor_id, nome, dia_semana)
SELECT a.id, prof.id, 'Treino ' || chr(65 + d % 3), d
FROM (VALUES
  ('ana@email.com',    'carlos@academia.com'),
  ('bruno@email.com',  'carlos@academia.com'),
  ('camila@email.com', 'juliana@academia.com')
) AS v(aluno_email, prof_email)
JOIN usuario a    ON a.email = v.aluno_email
JOIN usuario prof ON prof.email = v.prof_email
CROSS JOIN generate_series(0, 6) AS d;

INSERT INTO treino_exercicio (treino_id, exercicio_id, ordem, series, repeticoes, carga_kg, descanso_seg)
SELECT t.id, e.id, x.ordem, x.series, x.reps, x.carga, x.descanso
FROM treino t
JOIN (VALUES
  ('Treino A', 'Supino reto',       1, 4, '10',    40.0, 90),
  ('Treino A', 'Supino inclinado',  2, 3, '12',    30.0, 60),
  ('Treino A', 'Crucifixo',         3, 3, '12',    12.0, 60),
  ('Treino A', 'Tríceps corda',     4, 3, '15',    20.0, 45),
  ('Treino B', 'Puxada frontal',    1, 4, '10',    45.0, 90),
  ('Treino B', 'Remada baixa',      2, 3, '12',    40.0, 60),
  ('Treino B', 'Rosca direta',      3, 3, '10-12', 12.0, 60),
  ('Treino B', 'Rosca martelo',     4, 3, '12',    10.0, 45),
  ('Treino C', 'Agachamento livre', 1, 4, '8-10',  60.0, 120),
  ('Treino C', 'Leg press 45',      2, 4, '12',   120.0, 90),
  ('Treino C', 'Cadeira extensora', 3, 3, '15',    35.0, 60),
  ('Treino C', 'Elevação pélvica',  4, 3, '12',    50.0, 60)
) AS x(treino, exercicio, ordem, series, reps, carga, descanso) ON x.treino = t.nome
JOIN exercicio e ON e.nome = x.exercicio;

-- ---------- Check-ins dos últimos 30 dias (dentro da validade da matrícula) ----------
INSERT INTO checkin (aluno_id, data, hora, metodo)
SELECT m.aluno_id,
       d::DATE,
       TIME '06:30' + (m.aluno_id * INTERVAL '47 minutes'),
       CASE WHEN (EXTRACT(DOY FROM d)::INT + m.aluno_id) % 2 = 0 THEN 'qrcode' ELSE 'botao' END
FROM matricula m
CROSS JOIN generate_series(CURRENT_DATE - 30, CURRENT_DATE - 1, INTERVAL '1 day') AS d
WHERE m.status = 'ativa'
  AND d::DATE BETWEEN m.data_inicio AND m.data_vencimento
  AND (EXTRACT(DOY FROM d)::INT + m.aluno_id) % 3 <> 0;
