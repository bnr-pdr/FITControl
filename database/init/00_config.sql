-- =========================================================
-- 00 - Configuração do banco
-- =========================================================

-- Fuso horário de Brasília (senão check-in das 22h vira "amanhã" em UTC)
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'America/Sao_Paulo');
  -- Ninguém conecta no banco sem permissão explícita
  EXECUTE format('REVOKE ALL ON DATABASE %I FROM PUBLIC', current_database());
END $$;

SET timezone TO 'America/Sao_Paulo';

-- bcrypt dentro do banco (usado só no seed)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ninguém cria objetos no schema public além do dono
REVOKE ALL ON SCHEMA public FROM PUBLIC;
