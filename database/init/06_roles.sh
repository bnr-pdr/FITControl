#!/bin/bash
# =========================================================
# 06 - Usuário da API (menor privilégio)
# A senha vem do .env (APP_DB_PASSWORD), por isso é .sh e não .sql
# =========================================================
set -e

psql -v ON_ERROR_STOP=1 \
     --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
     -v app_pass="$APP_DB_PASSWORD" -v db="$POSTGRES_DB" <<'EOSQL'

CREATE ROLE academia_app LOGIN PASSWORD :'app_pass'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS
  CONNECTION LIMIT 20;

GRANT CONNECT ON DATABASE :"db" TO academia_app;
GRANT USAGE   ON SCHEMA public TO academia_app;

-- Sem DELETE: aluno/usuário é desativado (ativo=false), pagamento é cancelado.
GRANT SELECT, INSERT, UPDATE ON
  usuario, aluno, professor, plano, matricula, pagamento, checkin, exercicio
TO academia_app;

-- Treinos podem ser apagados pelo professor
GRANT SELECT, INSERT, UPDATE, DELETE ON treino, treino_exercicio TO academia_app;

GRANT SELECT ON
  vw_dashboard, vw_alunos, vw_aluno_plano, vw_pagamentos, vw_treino_do_dia, vw_frequencia_mensal
TO academia_app;

-- auditoria: nenhuma permissão (a API não lê nem apaga o log)

-- Funções: só as que a API precisa
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
  app_user_id(), app_user_tipo(), is_admin(), is_staff(),
  fn_login(TEXT), fn_alterar_senha(TEXT)
TO academia_app;

EOSQL

echo ">> Role academia_app criada"
