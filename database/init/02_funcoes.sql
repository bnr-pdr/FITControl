-- =========================================================
-- 02 - Funções de contexto, login e regras de negócio
-- =========================================================

-- ---------- Contexto do usuário logado ----------
-- A API, em cada transação, executa:
--   SELECT set_config('app.user_id', '<id do JWT>', true);
-- e o banco descobre sozinho o tipo (admin/professor/aluno).

-- SECURITY DEFINER: lê a tabela usuario sem passar pelo RLS
-- (evita recursão nas políticas). Usuário inativo = NULL = sem acesso nenhum.
CREATE FUNCTION app_user_id() RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM usuario
  WHERE id = NULLIF(current_setting('app.user_id', true), '')::INT AND ativo
$$;

CREATE FUNCTION app_user_tipo() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tipo FROM usuario
  WHERE id = NULLIF(current_setting('app.user_id', true), '')::INT AND ativo
$$;

CREATE FUNCTION is_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$ SELECT COALESCE(app_user_tipo() = 'admin', false) $$;

CREATE FUNCTION is_staff() RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$ SELECT COALESCE(app_user_tipo() IN ('admin','professor'), false) $$;

-- ---------- Login ----------
-- Antes do login não há app.user_id, então o RLS bloquearia a busca.
-- Esta função devolve só o necessário para a API comparar o bcrypt.
CREATE FUNCTION fn_login(p_email TEXT)
RETURNS TABLE (id INT, nome VARCHAR, tipo VARCHAR, senha_hash VARCHAR)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.nome, u.tipo, u.senha_hash
  FROM usuario u
  WHERE u.email = lower(trim(p_email)) AND u.ativo
$$;

-- Usuário logado troca a própria senha (a API manda o hash novo já em bcrypt)
CREATE FUNCTION fn_alterar_senha(p_novo_hash TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF app_user_id() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  UPDATE usuario SET senha_hash = p_novo_hash WHERE id = app_user_id() AND ativo;
END $$;

-- ---------- Regras de negócio (triggers) ----------

-- aluno.id precisa ser um usuario do tipo 'aluno' (idem professor)
CREATE FUNCTION fn_valida_tipo_usuario() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM usuario WHERE id = NEW.id AND tipo = TG_ARGV[0]) THEN
    RAISE EXCEPTION 'Usuário % não é do tipo %', NEW.id, TG_ARGV[0];
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_aluno_tipo BEFORE INSERT OR UPDATE OF id ON aluno
  FOR EACH ROW EXECUTE FUNCTION fn_valida_tipo_usuario('aluno');
CREATE TRIGGER trg_professor_tipo BEFORE INSERT OR UPDATE OF id ON professor
  FOR EACH ROW EXECUTE FUNCTION fn_valida_tipo_usuario('professor');

-- Matrícula sem vencimento: calcula pela duração do plano
CREATE FUNCTION fn_matricula_vencimento() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.data_vencimento IS NULL THEN
    SELECT (NEW.data_inicio + make_interval(months => p.duracao_meses))::DATE
      INTO NEW.data_vencimento
    FROM plano p WHERE p.id = NEW.plano_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_matricula_vencimento BEFORE INSERT ON matricula
  FOR EACH ROW EXECUTE FUNCTION fn_matricula_vencimento();

-- Nova matrícula: gera automaticamente o pagamento pendente
CREATE FUNCTION fn_matricula_gera_pagamento() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO pagamento (matricula_id, valor, data_vencimento)
  SELECT NEW.id, p.valor, NEW.data_inicio FROM plano p WHERE p.id = NEW.plano_id;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_matricula_pagamento AFTER INSERT ON matricula
  FOR EACH ROW EXECUTE FUNCTION fn_matricula_gera_pagamento();

-- Check-in só com matrícula ativa e dentro da validade
CREATE FUNCTION fn_checkin_valida() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM matricula m
    WHERE m.aluno_id = NEW.aluno_id
      AND m.status = 'ativa'
      AND NEW.data BETWEEN m.data_inicio AND m.data_vencimento
  ) THEN
    RAISE EXCEPTION 'Check-in negado: aluno sem matrícula ativa em %', NEW.data
      USING ERRCODE = 'P0001', HINT = 'MATRICULA_INATIVA';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_checkin_valida BEFORE INSERT ON checkin
  FOR EACH ROW EXECUTE FUNCTION fn_checkin_valida();
