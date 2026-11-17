-- =========================================================
-- CONSULTAS PARA O BACKEND
-- Conectar SEMPRE como academia_app. Parâmetros: $1, $2... (nunca concatenar string!)
-- =========================================================

-- ---------------------------------------------------------
-- REGRA DE OURO: toda requisição autenticada roda numa transação
-- que informa ao banco quem é o usuário (id vindo do JWT):
--
--   BEGIN;
--   SELECT set_config('app.user_id', $1, true);   -- $1 = id do JWT, como texto
--   ... consultas da rota ...
--   COMMIT;
--
-- O "true" faz valer só nesta transação (seguro com pool de conexões).
-- Sem isso o RLS devolve ZERO linhas (não é bug, é a proteção).
-- ---------------------------------------------------------

-- ===== LOGIN (sem set_config) =====
SELECT id, nome, tipo, senha_hash FROM fn_login($1);   -- $1 = email
-- -> backend: bcrypt.compare(senha, senha_hash); se ok, gera JWT { id, tipo }

-- Trocar a própria senha (hash gerado no backend com bcrypt)
SELECT fn_alterar_senha($1);

-- ===== ADMIN (web) =====
SELECT * FROM vw_dashboard;

-- Listagem de alunos (CPF completo só para admin)
SELECT * FROM vw_alunos WHERE ativo ORDER BY nome;

-- Cadastro de aluno (2 inserts na mesma transação)
INSERT INTO usuario (nome, email, senha_hash, tipo)
VALUES ($1, lower($2), $3, 'aluno') RETURNING id;
INSERT INTO aluno (id, cpf, data_nascimento, telefone, objetivo)
VALUES ($1, $2, $3, $4, $5);

-- Desativar aluno (não existe DELETE)
UPDATE usuario SET ativo = false WHERE id = $1;

-- Planos
SELECT * FROM plano WHERE ativo ORDER BY valor;
INSERT INTO plano (nome, descricao, valor, duracao_meses) VALUES ($1, $2, $3, $4);

-- Matrícula: vencimento e pagamento pendente são gerados automaticamente
INSERT INTO matricula (aluno_id, plano_id) VALUES ($1, $2) RETURNING *;

-- Renovar: cancela a atual e cria uma nova (mesma transação)
UPDATE matricula SET status = 'cancelada' WHERE aluno_id = $1 AND status = 'ativa';
INSERT INTO matricula (aluno_id, plano_id) VALUES ($1, $2) RETURNING *;

-- Pagamentos (situacao: pendente | pago | atrasado | cancelado)
SELECT * FROM vw_pagamentos ORDER BY data_vencimento DESC;
SELECT * FROM vw_pagamentos WHERE situacao = 'atrasado';

-- Registrar pagamento
UPDATE pagamento
SET status = 'pago', data_pagamento = CURRENT_DATE, forma_pagamento = $2
WHERE id = $1 AND status = 'pendente';

-- ===== PROFESSOR (web) =====
SELECT * FROM vw_alunos WHERE ativo ORDER BY nome;            -- CPF vem mascarado

-- Treinos de um aluno
SELECT t.*, te.ordem, e.nome AS exercicio, te.series, te.repeticoes, te.carga_kg
FROM treino t
LEFT JOIN treino_exercicio te ON te.treino_id = t.id
LEFT JOIN exercicio e         ON e.id = te.exercicio_id
WHERE t.aluno_id = $1 AND t.ativo
ORDER BY t.dia_semana, te.ordem;

-- Criar treino (professor_id TEM que ser o próprio professor, o RLS confere)
INSERT INTO treino (aluno_id, professor_id, nome, dia_semana, observacao)
VALUES ($1, $2, $3, $4, $5) RETURNING id;
INSERT INTO treino_exercicio (treino_id, exercicio_id, ordem, series, repeticoes, carga_kg, descanso_seg)
VALUES ($1, $2, $3, $4, $5, $6, $7);

SELECT * FROM exercicio ORDER BY grupo_muscular, nome;

-- Frequência de um aluno
SELECT data, hora, metodo FROM checkin WHERE aluno_id = $1 ORDER BY data DESC;

-- ===== ALUNO (mobile) =====
SELECT * FROM vw_aluno_plano;                    -- o RLS já filtra: só o próprio aluno
SELECT * FROM vw_treino_do_dia ORDER BY ordem;
SELECT data, hora, metodo FROM checkin ORDER BY data DESC LIMIT 60;
SELECT * FROM vw_frequencia_mensal ORDER BY mes DESC;
SELECT * FROM vw_pagamentos ORDER BY data_vencimento DESC;

-- Check-in (botão ou QR). Para QR: a API valida o token ANTES deste insert.
INSERT INTO checkin (aluno_id, metodo) VALUES ($1, $2)       -- $2 = 'botao' | 'qrcode'
ON CONFLICT (aluno_id, data) DO NOTHING
RETURNING id;
-- 0 linhas retornadas  -> já fez check-in hoje
-- erro com hint 'MATRICULA_INATIVA' -> matrícula vencida/cancelada
