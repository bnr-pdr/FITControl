-- =========================================================
-- 03 - Views usadas pelas telas
-- security_invoker = true -> a view respeita o RLS de quem consulta
-- =========================================================

-- Dashboard (admin)
CREATE VIEW vw_dashboard WITH (security_invoker = true) AS
SELECT
  (SELECT COUNT(*) FROM aluno a JOIN usuario u ON u.id = a.id WHERE u.ativo)                AS total_alunos,
  (SELECT COUNT(*) FROM professor p JOIN usuario u ON u.id = p.id WHERE u.ativo)            AS total_professores,
  (SELECT COUNT(*) FROM matricula WHERE status = 'ativa' AND data_vencimento >= CURRENT_DATE) AS matriculas_ativas,
  (SELECT COUNT(*) FROM matricula WHERE status = 'ativa' AND data_vencimento <  CURRENT_DATE) AS matriculas_vencidas,
  (SELECT COUNT(*) FROM matricula WHERE status = 'ativa'
      AND data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + 7)                         AS vencem_7_dias,
  (SELECT COUNT(*) FROM pagamento WHERE status = 'pendente' AND data_vencimento < CURRENT_DATE) AS pagamentos_atrasados,
  (SELECT COALESCE(SUM(valor), 0) FROM pagamento
      WHERE status = 'pago'
        AND date_trunc('month', data_pagamento) = date_trunc('month', CURRENT_DATE))         AS receita_mes,
  (SELECT COUNT(*) FROM checkin WHERE data = CURRENT_DATE)                                   AS checkins_hoje;

-- Listagem de alunos (web). CPF completo só para admin (LGPD)
CREATE VIEW vw_alunos WITH (security_invoker = true) AS
SELECT u.id, u.nome, u.email, u.ativo,
       CASE WHEN is_admin()
            THEN a.cpf
            ELSE '***.' || substr(a.cpf, 4, 3) || '.' || substr(a.cpf, 7, 3) || '-**'
       END AS cpf,
       a.telefone, a.data_nascimento, a.objetivo,
       p.nome AS plano, m.data_vencimento,
       CASE WHEN m.id IS NULL                    THEN 'sem_matricula'
            WHEN m.data_vencimento < CURRENT_DATE THEN 'vencida'
            ELSE 'ativa' END AS situacao
FROM aluno a
JOIN usuario u        ON u.id = a.id
LEFT JOIN matricula m ON m.aluno_id = a.id AND m.status = 'ativa'
LEFT JOIN plano p     ON p.id = m.plano_id;

-- Tela do aluno (mobile): plano e vencimento
CREATE VIEW vw_aluno_plano WITH (security_invoker = true) AS
SELECT a.id AS aluno_id, u.nome,
       p.nome AS plano, p.valor,
       m.data_inicio, m.data_vencimento,
       (m.data_vencimento - CURRENT_DATE) AS dias_restantes,
       CASE WHEN m.id IS NULL                    THEN 'sem_matricula'
            WHEN m.data_vencimento < CURRENT_DATE THEN 'vencida'
            ELSE 'ativa' END AS situacao
FROM aluno a
JOIN usuario u        ON u.id = a.id
LEFT JOIN matricula m ON m.aluno_id = a.id AND m.status = 'ativa'
LEFT JOIN plano p     ON p.id = m.plano_id;

-- Pagamentos com situação calculada (atrasado = pendente e vencido)
CREATE VIEW vw_pagamentos WITH (security_invoker = true) AS
SELECT pg.id, pg.matricula_id, m.aluno_id, u.nome AS aluno, pl.nome AS plano,
       pg.valor, pg.data_vencimento, pg.data_pagamento, pg.forma_pagamento,
       CASE WHEN pg.status = 'pendente' AND pg.data_vencimento < CURRENT_DATE
            THEN 'atrasado' ELSE pg.status END AS situacao
FROM pagamento pg
JOIN matricula m ON m.id = pg.matricula_id
JOIN usuario u   ON u.id = m.aluno_id
JOIN plano pl    ON pl.id = m.plano_id;

-- Treino do dia (pelo dia da semana de hoje)
CREATE VIEW vw_treino_do_dia WITH (security_invoker = true) AS
SELECT t.aluno_id, t.id AS treino_id, t.nome AS treino, t.observacao,
       up.nome AS professor,
       te.ordem, e.nome AS exercicio, e.grupo_muscular,
       te.series, te.repeticoes, te.carga_kg, te.descanso_seg
FROM treino t
JOIN treino_exercicio te ON te.treino_id = t.id
JOIN exercicio e         ON e.id = te.exercicio_id
LEFT JOIN usuario up     ON up.id = t.professor_id
WHERE t.ativo AND t.dia_semana = EXTRACT(DOW FROM CURRENT_DATE);

-- Frequência por mês
CREATE VIEW vw_frequencia_mensal WITH (security_invoker = true) AS
SELECT aluno_id,
       date_trunc('month', data)::DATE AS mes,
       COUNT(*)                        AS total_checkins
FROM checkin
GROUP BY aluno_id, date_trunc('month', data);
