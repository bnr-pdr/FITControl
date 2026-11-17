-- =========================================================
-- 04 - Auditoria: quem alterou o quê (a API não lê nem altera esta tabela)
-- =========================================================

CREATE TABLE auditoria (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tabela         TEXT        NOT NULL,
    operacao       TEXT        NOT NULL,          -- INSERT / UPDATE / DELETE
    registro_id    INT,
    usuario_id     INT,                           -- quem fez (NULL = sistema/seed)
    dados_antigos  JSONB,
    dados_novos    JSONB,
    em             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_auditoria_tabela ON auditoria(tabela, registro_id);

CREATE FUNCTION fn_auditar() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old JSONB;
  v_new JSONB;
BEGIN
  -- senha_hash nunca vai para o log
  IF TG_OP <> 'INSERT' THEN v_old := to_jsonb(OLD) - 'senha_hash'; END IF;
  IF TG_OP <> 'DELETE' THEN v_new := to_jsonb(NEW) - 'senha_hash'; END IF;

  INSERT INTO auditoria (tabela, operacao, registro_id, usuario_id, dados_antigos, dados_novos)
  VALUES (TG_TABLE_NAME, TG_OP,
          COALESCE(v_new->>'id', v_old->>'id')::INT,
          NULLIF(current_setting('app.user_id', true), '')::INT, v_old, v_new);

  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_audit_usuario   AFTER INSERT OR UPDATE OR DELETE ON usuario   FOR EACH ROW EXECUTE FUNCTION fn_auditar();
CREATE TRIGGER trg_audit_aluno     AFTER INSERT OR UPDATE OR DELETE ON aluno     FOR EACH ROW EXECUTE FUNCTION fn_auditar();
CREATE TRIGGER trg_audit_plano     AFTER INSERT OR UPDATE OR DELETE ON plano     FOR EACH ROW EXECUTE FUNCTION fn_auditar();
CREATE TRIGGER trg_audit_matricula AFTER INSERT OR UPDATE OR DELETE ON matricula FOR EACH ROW EXECUTE FUNCTION fn_auditar();
CREATE TRIGGER trg_audit_pagamento AFTER INSERT OR UPDATE OR DELETE ON pagamento FOR EACH ROW EXECUTE FUNCTION fn_auditar();
