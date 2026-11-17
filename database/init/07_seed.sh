#!/bin/bash
# =========================================================
# 07 - Dados de teste (só se LOAD_SEED=true no .env)
# =========================================================
set -e

if [ "${LOAD_SEED:-false}" = "true" ]; then
  echo ">> LOAD_SEED=true: carregando dados de teste"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f /seed/seed.sql
else
  echo ">> LOAD_SEED!=true: banco criado vazio (sem dados de teste)"
fi
