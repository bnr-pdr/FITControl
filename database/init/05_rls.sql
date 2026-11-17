-- =========================================================
-- 05 - Row Level Security
-- Mesmo que a API tenha um bug, o banco não deixa um aluno ver dados de outro.
--
--   admin     -> tudo
--   professor -> vê alunos, matrículas, check-ins e treinos; edita só os SEUS treinos
--   aluno     -> só os próprios dados; só faz check-in para si mesmo
--   sem login -> nada (exceto fn_login)
-- =========================================================

ALTER TABLE usuario          ENABLE ROW LEVEL SECURITY;
ALTER TABLE aluno            ENABLE ROW LEVEL SECURITY;
ALTER TABLE professor        ENABLE ROW LEVEL SECURITY;
ALTER TABLE plano            ENABLE ROW LEVEL SECURITY;
ALTER TABLE matricula        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamento        ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin          ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercicio        ENABLE ROW LEVEL SECURITY;
ALTER TABLE treino           ENABLE ROW LEVEL SECURITY;
ALTER TABLE treino_exercicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria        ENABLE ROW LEVEL SECURITY;  -- sem políticas = ninguém (exceto dono)

-- ---------- Admin pode tudo em todas as tabelas de negócio ----------
CREATE POLICY admin_all ON usuario          FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY admin_all ON aluno            FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY admin_all ON professor        FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY admin_all ON plano            FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY admin_all ON matricula        FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY admin_all ON pagamento        FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY admin_all ON checkin          FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY admin_all ON exercicio        FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY admin_all ON treino           FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY admin_all ON treino_exercicio FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ---------- usuario ----------
-- staff vê todos; aluno vê a si mesmo e os professores (nome no treino)
CREATE POLICY usuario_select ON usuario FOR SELECT
  USING (is_staff() OR id = app_user_id() OR (tipo = 'professor' AND app_user_id() IS NOT NULL));

-- ---------- aluno ----------
CREATE POLICY aluno_select ON aluno FOR SELECT
  USING (is_staff() OR id = app_user_id());

-- ---------- professor ----------
CREATE POLICY professor_select ON professor FOR SELECT
  USING (app_user_id() IS NOT NULL);

-- ---------- plano (catálogo: qualquer logado vê) ----------
CREATE POLICY plano_select ON plano FOR SELECT
  USING (app_user_id() IS NOT NULL);

-- ---------- matricula ----------
CREATE POLICY matricula_select ON matricula FOR SELECT
  USING (is_staff() OR aluno_id = app_user_id());

-- ---------- pagamento (professor NÃO vê financeiro) ----------
CREATE POLICY pagamento_select_aluno ON pagamento FOR SELECT
  USING (EXISTS (SELECT 1 FROM matricula m
                 WHERE m.id = pagamento.matricula_id AND m.aluno_id = app_user_id()));

-- ---------- checkin ----------
CREATE POLICY checkin_select ON checkin FOR SELECT
  USING (is_staff() OR aluno_id = app_user_id());

CREATE POLICY checkin_insert_aluno ON checkin FOR INSERT
  WITH CHECK (aluno_id = app_user_id() AND app_user_tipo() = 'aluno');

-- ---------- exercicio ----------
CREATE POLICY exercicio_select ON exercicio FOR SELECT
  USING (app_user_id() IS NOT NULL);

CREATE POLICY exercicio_write_prof ON exercicio FOR INSERT
  WITH CHECK (is_staff());
CREATE POLICY exercicio_update_prof ON exercicio FOR UPDATE
  USING (is_staff()) WITH CHECK (is_staff());

-- ---------- treino ----------
CREATE POLICY treino_select ON treino FOR SELECT
  USING (is_staff() OR aluno_id = app_user_id());

-- professor cria/edita/apaga só treinos em que ele é o professor
CREATE POLICY treino_write_prof ON treino FOR ALL
  USING      (app_user_tipo() = 'professor' AND professor_id = app_user_id())
  WITH CHECK (app_user_tipo() = 'professor' AND professor_id = app_user_id());

-- ---------- treino_exercicio (segue o treino) ----------
CREATE POLICY treino_exercicio_select ON treino_exercicio FOR SELECT
  USING (EXISTS (SELECT 1 FROM treino t WHERE t.id = treino_exercicio.treino_id));

CREATE POLICY treino_exercicio_write_prof ON treino_exercicio FOR ALL
  USING (EXISTS (SELECT 1 FROM treino t
                 WHERE t.id = treino_exercicio.treino_id
                   AND app_user_tipo() = 'professor' AND t.professor_id = app_user_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM treino t
                 WHERE t.id = treino_exercicio.treino_id
                   AND app_user_tipo() = 'professor' AND t.professor_id = app_user_id()));
