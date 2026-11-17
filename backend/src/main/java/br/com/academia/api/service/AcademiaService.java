package br.com.academia.api.service;

import br.com.academia.api.security.RlsQueryExecutor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class AcademiaService {

    private final RlsQueryExecutor rlsExecutor;
    private final PasswordEncoder passwordEncoder;

    public AcademiaService(
            RlsQueryExecutor rlsExecutor,
            PasswordEncoder passwordEncoder
    ) {
        this.rlsExecutor = rlsExecutor;
        this.passwordEncoder = passwordEncoder;
    }

    // ==================== HELPERS ====================

    private String textoOuNulo(Object valor) {
        if (valor == null) return null;
        String texto = valor.toString().trim();
        return texto.isEmpty() ? null : texto;
    }

    private String somenteDigitos(Object valor) {
        if (valor == null) return null;
        String digitos = valor.toString().replaceAll("\\D", "");
        return digitos.isEmpty() ? null : digitos;
    }

    private boolean lerBooleano(Object valor, boolean padrao) {
        if (valor == null) return padrao;
        if (valor instanceof Boolean b) return b;
        String s = valor.toString().trim().toLowerCase();
        if (s.equals("false") || s.equals("0") || s.equals("inativo")) return false;
        if (s.equals("true") || s.equals("1") || s.equals("ativo")) return true;
        return padrao;
    }

    private Long lerLongOpcional(Object valor) {
        if (valor == null) return null;
        if (valor instanceof Number n) return n.longValue();
        String s = valor.toString().trim();
        if (s.isEmpty()) return null;
        return Long.parseLong(s);
    }

    private int lerInt(Object valor, int padrao) {
        if (valor == null) return padrao;
        if (valor instanceof Number n) return n.intValue();
        String s = valor.toString().trim();
        if (s.isEmpty()) return padrao;
        return Integer.parseInt(s);
    }

    private BigDecimal lerDecimal(Object valor, String campo) {
        if (valor == null) {
            throw new IllegalArgumentException("Campo obrigatório: " + campo + ".");
        }
        if (valor instanceof BigDecimal bd) return bd;
        if (valor instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        String s = valor.toString().trim().replace("R$", "").trim();
        if (s.contains(",") && s.contains(".")) {
            s = s.replace(".", "").replace(",", ".");
        } else if (s.contains(",")) {
            s = s.replace(",", ".");
        }
        try {
            return new BigDecimal(s);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Valor numérico inválido para " + campo + ".");
        }
    }

    // ==================== DASHBOARD (WEB) ====================

    public Map<String, Object> buscarDashboard(Long userId) {
        return rlsExecutor.executeAsUser(userId, jdbc -> {
            jdbc.execute("SELECT fn_sincronizar_alunos_vencidos()");
            return jdbc.queryForMap("SELECT * FROM vw_dashboard");
        });
    }

    // ==================== ALUNOS (WEB) ====================

    public List<?> listarAlunos(Long userId) {
        return rlsExecutor.executeAsUser(userId, jdbc -> {
            jdbc.execute("SELECT fn_sincronizar_alunos_vencidos()");
            return jdbc.queryForList("""
                    SELECT v.id, v.nome, v.email, v.ativo, v.cpf, v.telefone,
                           v.data_nascimento, v.objetivo, v.plano, m.plano_id,
                           v.data_vencimento, v.situacao
                    FROM vw_alunos v
                    LEFT JOIN matricula m ON m.aluno_id = v.id AND m.status = 'ativa'
                    ORDER BY v.nome
                    """);
        });
    }

    public Map<String, Object> cadastrarAluno(Long userId, Map<String, Object> dados) {
        String nome = textoOuNulo(dados.get("nome"));
        String email = textoOuNulo(dados.get("email"));
        String senha = textoOuNulo(dados.get("senha"));
        String cpf = somenteDigitos(dados.get("cpf"));

        if (nome == null || email == null || senha == null || cpf == null) {
            throw new IllegalArgumentException("Campos obrigatórios: nome, email, senha e cpf.");
        }
        if (cpf.length() != 11) {
            throw new IllegalArgumentException("O CPF deve conter exatamente 11 dígitos numéricos.");
        }
        if (senha.length() < 6) {
            throw new IllegalArgumentException("A senha deve ter pelo menos 6 caracteres.");
        }

        String telefone = somenteDigitos(dados.get("telefone"));
        String dataNascimento = textoOuNulo(dados.get("data_nascimento"));
        String objetivo = textoOuNulo(dados.get("objetivo"));
        String senhaHash = passwordEncoder.encode(senha);

        return rlsExecutor.executeAsUser(userId, jdbc -> {
            Long novoUsuarioId = jdbc.queryForObject(
                    "INSERT INTO usuario (nome, email, senha_hash, tipo, ativo) VALUES (?, ?, ?, 'aluno', true) RETURNING id",
                    Long.class,
                    nome,
                    email.toLowerCase(),
                    senhaHash
            );

            Long novoAlunoId = jdbc.queryForObject(
                    "INSERT INTO aluno (id, cpf, data_nascimento, telefone, objetivo) VALUES (?, ?, ?::date, ?, ?) RETURNING id",
                    Long.class,
                    novoUsuarioId,
                    cpf,
                    dataNascimento,
                    telefone,
                    objetivo
            );

            return Map.of(
                    "usuarioId", novoUsuarioId,
                    "alunoId", novoAlunoId,
                    "mensagem", "Aluno cadastrado com sucesso."
            );
        });
    }

    public Map<String, Object> atualizarAluno(Long userId, Long alunoId, Map<String, Object> dados) {
        String nome = textoOuNulo(dados.get("nome"));
        String email = textoOuNulo(dados.get("email"));
        String cpf = somenteDigitos(dados.get("cpf"));

        if (nome == null || email == null || cpf == null) {
            throw new IllegalArgumentException("Campos obrigatórios: nome, email e cpf.");
        }
        if (cpf.length() != 11) {
            throw new IllegalArgumentException("O CPF deve conter exatamente 11 dígitos numéricos.");
        }

        String senha = textoOuNulo(dados.get("senha"));
        if (senha != null && senha.length() < 6) {
            throw new IllegalArgumentException("A nova senha deve ter pelo menos 6 caracteres.");
        }

        String telefone = somenteDigitos(dados.get("telefone"));
        String dataNascimento = textoOuNulo(dados.get("data_nascimento"));
        String objetivo = textoOuNulo(dados.get("objetivo"));
        boolean ativo = lerBooleano(dados.get("ativo"), true);
        Long novoPlanoId = lerLongOpcional(dados.get("plano_id"));

        return rlsExecutor.executeAsUser(userId, jdbc -> {
            int atualizados;
            if (senha != null) {
                atualizados = jdbc.update(
                        "UPDATE usuario SET nome = ?, email = ?, senha_hash = ?, ativo = ? WHERE id = ? AND tipo = 'aluno'",
                        nome,
                        email.toLowerCase(),
                        passwordEncoder.encode(senha),
                        ativo,
                        alunoId
                );
            } else {
                atualizados = jdbc.update(
                        "UPDATE usuario SET nome = ?, email = ?, ativo = ? WHERE id = ? AND tipo = 'aluno'",
                        nome,
                        email.toLowerCase(),
                        ativo,
                        alunoId
                );
            }

            if (atualizados == 0) {
                throw new IllegalArgumentException("Aluno não encontrado ou sem permissão para editar.");
            }

            jdbc.update(
                    "UPDATE aluno SET cpf = ?, telefone = ?, data_nascimento = COALESCE(?::date, data_nascimento), objetivo = COALESCE(?, objetivo) WHERE id = ?",
                    cpf,
                    telefone,
                    dataNascimento,
                    objetivo,
                    alunoId
            );

            if (!ativo) {
                jdbc.update(
                        "UPDATE matricula SET status = 'cancelada' WHERE aluno_id = ? AND status = 'ativa'",
                        alunoId
                );
            } else if (novoPlanoId != null && novoPlanoId > 0) {
                List<Long> planosValidos = jdbc.queryForList(
                        "SELECT plano_id FROM matricula WHERE aluno_id = ? AND status = 'ativa' AND data_vencimento >= CURRENT_DATE",
                        Long.class,
                        alunoId
                );
                Long planoAtual = planosValidos.isEmpty() ? null : planosValidos.get(0);
                if (planoAtual == null || !planoAtual.equals(novoPlanoId)) {
                    jdbc.update(
                            "UPDATE matricula SET status = 'cancelada' WHERE aluno_id = ? AND status = 'ativa'",
                            alunoId
                    );
                    jdbc.update(
                            "INSERT INTO matricula (aluno_id, plano_id, data_inicio) VALUES (?, ?, CURRENT_DATE)",
                            alunoId,
                            novoPlanoId
                    );
                }
            }

            return Map.of(
                    "alunoId", alunoId,
                    "mensagem", "Aluno atualizado com sucesso."
            );
        });
    }

    public Map<String, Object> desativarAluno(Long userId, Long alunoId) {
        return rlsExecutor.executeAsUser(userId, jdbc -> {
            int atualizados = jdbc.update(
                    "UPDATE usuario SET ativo = false WHERE id = ? AND tipo = 'aluno'",
                    alunoId
            );
            if (atualizados == 0) {
                throw new IllegalArgumentException("Aluno não encontrado ou sem permissão para excluir.");
            }
            jdbc.update(
                    "UPDATE matricula SET status = 'cancelada' WHERE aluno_id = ? AND status = 'ativa'",
                    alunoId
            );
            return Map.of(
                    "alunoId", alunoId,
                    "mensagem", "Aluno desativado com sucesso."
            );
        });
    }

    // ==================== PLANOS (WEB) ====================

    public List<?> listarPlanos(Long userId) {
        return rlsExecutor.executeAsUser(userId, jdbc ->
                jdbc.queryForList("SELECT * FROM plano WHERE ativo ORDER BY valor")
        );
    }

    public Map<String, Object> cadastrarPlano(Long userId, Map<String, Object> dados) {
        String nome = textoOuNulo(dados.get("nome"));
        if (nome == null) {
            throw new IllegalArgumentException("Campo obrigatório: nome do plano.");
        }
        BigDecimal valor = lerDecimal(dados.get("valor"), "valor");
        if (valor.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("O valor do plano não pode ser negativo.");
        }
        int duracaoMeses = lerInt(dados.get("duracao_meses"), 1);
        if (duracaoMeses <= 0) {
            throw new IllegalArgumentException("A duração em meses deve ser maior que zero.");
        }
        String descricao = textoOuNulo(dados.get("descricao"));
        boolean ativo = lerBooleano(dados.get("ativo"), true);

        return rlsExecutor.executeAsUser(userId, jdbc -> {
            Long planoId = jdbc.queryForObject(
                    "INSERT INTO plano (nome, descricao, valor, duracao_meses, ativo) VALUES (?, ?, ?, ?, ?) RETURNING id",
                    Long.class,
                    nome,
                    descricao,
                    valor,
                    duracaoMeses,
                    ativo
            );
            return Map.of(
                    "planoId", planoId,
                    "mensagem", "Plano cadastrado com sucesso."
            );
        });
    }

    public Map<String, Object> atualizarPlano(Long userId, Long planoId, Map<String, Object> dados) {
        String nome = textoOuNulo(dados.get("nome"));
        if (nome == null) {
            throw new IllegalArgumentException("Campo obrigatório: nome do plano.");
        }
        BigDecimal valor = lerDecimal(dados.get("valor"), "valor");
        if (valor.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("O valor do plano não pode ser negativo.");
        }
        int duracaoMeses = lerInt(dados.get("duracao_meses"), 1);
        if (duracaoMeses <= 0) {
            throw new IllegalArgumentException("A duração em meses deve ser maior que zero.");
        }
        String descricao = textoOuNulo(dados.get("descricao"));
        boolean ativo = lerBooleano(dados.get("ativo"), true);

        return rlsExecutor.executeAsUser(userId, jdbc -> {
            int atualizados = jdbc.update(
                    "UPDATE plano SET nome = ?, descricao = ?, valor = ?, duracao_meses = ?, ativo = ? WHERE id = ?",
                    nome,
                    descricao,
                    valor,
                    duracaoMeses,
                    ativo,
                    planoId
            );
            if (atualizados == 0) {
                throw new IllegalArgumentException("Plano não encontrado ou sem permissão para editar.");
            }
            return Map.of(
                    "planoId", planoId,
                    "mensagem", "Plano atualizado com sucesso."
            );
        });
    }

    public Map<String, Object> desativarPlano(Long userId, Long planoId) {
        return rlsExecutor.executeAsUser(userId, jdbc -> {
            int atualizados = jdbc.update(
                    "UPDATE plano SET ativo = false WHERE id = ?",
                    planoId
            );
            if (atualizados == 0) {
                throw new IllegalArgumentException("Plano não encontrado ou sem permissão para excluir.");
            }
            return Map.of(
                    "planoId", planoId,
                    "mensagem", "Plano desativado com sucesso."
            );
        });
    }

    // ==================== PROFESSORES (WEB) ====================

    public List<?> listarProfessores(Long userId) {
        return rlsExecutor.executeAsUser(userId, jdbc ->
                jdbc.queryForList("""
                        SELECT u.id, u.nome, u.email, u.ativo, p.cref, p.especialidade, p.telefone
                        FROM professor p
                        JOIN usuario u ON u.id = p.id
                        WHERE u.ativo
                        ORDER BY u.nome
                        """)
        );
    }

    public Map<String, Object> cadastrarProfessor(Long userId, Map<String, Object> dados) {
        String nome = textoOuNulo(dados.get("nome"));
        String email = textoOuNulo(dados.get("email"));
        String senha = textoOuNulo(dados.get("senha"));

        if (nome == null || email == null || senha == null) {
            throw new IllegalArgumentException("Campos obrigatórios: nome, email e senha.");
        }
        if (senha.length() < 6) {
            throw new IllegalArgumentException("A senha do professor deve ter pelo menos 6 caracteres.");
        }

        String cref = textoOuNulo(dados.get("cref"));
        String especialidade = textoOuNulo(dados.get("especialidade"));
        String telefone = somenteDigitos(dados.get("telefone"));
        boolean ativo = lerBooleano(dados.get("ativo"), true);
        String senhaHash = passwordEncoder.encode(senha);

        return rlsExecutor.executeAsUser(userId, jdbc -> {
            Long novoUsuarioId = jdbc.queryForObject(
                    "INSERT INTO usuario (nome, email, senha_hash, tipo, ativo) VALUES (?, ?, ?, 'professor', ?) RETURNING id",
                    Long.class,
                    nome,
                    email.toLowerCase(),
                    senhaHash,
                    ativo
            );

            jdbc.update(
                    "INSERT INTO professor (id, cref, especialidade, telefone) VALUES (?, ?, ?, ?)",
                    novoUsuarioId,
                    cref,
                    especialidade,
                    telefone
            );

            return Map.of(
                    "professorId", novoUsuarioId,
                    "mensagem", "Professor cadastrado com sucesso."
            );
        });
    }

    public Map<String, Object> atualizarProfessor(Long userId, Long professorId, Map<String, Object> dados) {
        String nome = textoOuNulo(dados.get("nome"));
        String email = textoOuNulo(dados.get("email"));

        if (nome == null || email == null) {
            throw new IllegalArgumentException("Campos obrigatórios: nome e email.");
        }

        String senha = textoOuNulo(dados.get("senha"));
        if (senha != null && senha.length() < 6) {
            throw new IllegalArgumentException("A nova senha deve ter pelo menos 6 caracteres.");
        }

        String cref = textoOuNulo(dados.get("cref"));
        String especialidade = textoOuNulo(dados.get("especialidade"));
        String telefone = somenteDigitos(dados.get("telefone"));
        boolean ativo = lerBooleano(dados.get("ativo"), true);

        return rlsExecutor.executeAsUser(userId, jdbc -> {
            int atualizados;
            if (senha != null) {
                atualizados = jdbc.update(
                        "UPDATE usuario SET nome = ?, email = ?, senha_hash = ?, ativo = ? WHERE id = ? AND tipo = 'professor'",
                        nome,
                        email.toLowerCase(),
                        passwordEncoder.encode(senha),
                        ativo,
                        professorId
                );
            } else {
                atualizados = jdbc.update(
                        "UPDATE usuario SET nome = ?, email = ?, ativo = ? WHERE id = ? AND tipo = 'professor'",
                        nome,
                        email.toLowerCase(),
                        ativo,
                        professorId
                );
            }

            if (atualizados == 0) {
                throw new IllegalArgumentException("Professor não encontrado ou sem permissão para editar.");
            }

            jdbc.update(
                    "UPDATE professor SET cref = ?, especialidade = ?, telefone = ? WHERE id = ?",
                    cref,
                    especialidade,
                    telefone,
                    professorId
            );

            return Map.of(
                    "professorId", professorId,
                    "mensagem", "Professor atualizado com sucesso."
            );
        });
    }

    public Map<String, Object> desativarProfessor(Long userId, Long professorId) {
        return rlsExecutor.executeAsUser(userId, jdbc -> {
            int atualizados = jdbc.update(
                    "UPDATE usuario SET ativo = false WHERE id = ? AND tipo = 'professor'",
                    professorId
            );
            if (atualizados == 0) {
                throw new IllegalArgumentException("Professor não encontrado ou sem permissão para excluir.");
            }
            return Map.of(
                    "professorId", professorId,
                    "mensagem", "Professor desativado com sucesso."
            );
        });
    }

    // ==================== MATRÍCULAS E PAGAMENTOS (WEB) ====================

    public Map<String, Object> criarMatricula(Long userId, Map<String, Object> dados) {
        Long alunoId = lerLongOpcional(dados.get("aluno_id"));
        Long planoId = lerLongOpcional(dados.get("plano_id"));
        if (alunoId == null || planoId == null) {
            throw new IllegalArgumentException("Campos obrigatórios: aluno_id e plano_id.");
        }

        return rlsExecutor.executeAsUser(userId, jdbc -> {
            Long matriculaId = jdbc.queryForObject(
                    "INSERT INTO matricula (aluno_id, plano_id, data_inicio) VALUES (?, ?, CURRENT_DATE) RETURNING id",
                    Long.class,
                    alunoId,
                    planoId
            );
            return Map.of(
                    "matriculaId", matriculaId,
                    "mensagem", "Matrícula criada e pagamento gerado automaticamente."
            );
        });
    }

    public List<?> listarPagamentos(Long userId) {
        return rlsExecutor.executeAsUser(userId, jdbc ->
                jdbc.queryForList("SELECT * FROM vw_pagamentos ORDER BY data_vencimento DESC")
        );
    }

    public Map<String, Object> confirmarPagamento(Long userId, Long pagamentoId, String formaPagamento) {
        return rlsExecutor.executeAsUser(userId, jdbc -> {
            int atualizados = jdbc.update(
                    "UPDATE pagamento SET status = 'pago', data_pagamento = CURRENT_DATE, forma_pagamento = ? WHERE id = ?",
                    formaPagamento,
                    pagamentoId
            );
            if (atualizados == 0) {
                throw new IllegalArgumentException("Pagamento não encontrado ou sem permissão.");
            }
            return Map.of("pagamentoId", pagamentoId, "status", "pago");
        });
    }

    // ==================== TREINOS E EXERCÍCIOS (PROFESSOR / ADMIN) ====================

    private Long resolverProfessorId(JdbcTemplate jdbc, Long userId, Object professorIdInformado) {
        Long informado = lerLongOpcional(professorIdInformado);
        if (informado != null) {
            return informado;
        }
        List<Long> ids = jdbc.queryForList(
                "SELECT id FROM professor WHERE id = ?",
                Long.class,
                userId
        );
        return ids.isEmpty() ? null : ids.get(0);
    }

    private Long buscarOuCriarExercicio(JdbcTemplate jdbc, Long exercicioIdInformado, String nomeExercicio, String grupoMuscular) {
        if (exercicioIdInformado != null && nomeExercicio == null) {
            List<Long> existentes = jdbc.queryForList(
                    "SELECT id FROM exercicio WHERE id = ?",
                    Long.class,
                    exercicioIdInformado
            );
            if (existentes.isEmpty()) {
                throw new IllegalArgumentException("Exercício informado não encontrado.");
            }
            if (grupoMuscular != null) {
                jdbc.update("UPDATE exercicio SET grupo_muscular = ? WHERE id = ?", grupoMuscular, exercicioIdInformado);
            }
            return exercicioIdInformado;
        }

        if (nomeExercicio == null) {
            throw new IllegalArgumentException("Informe o nome do exercício.");
        }

        List<Long> porNome = jdbc.queryForList(
                "SELECT id FROM exercicio WHERE lower(trim(nome)) = lower(trim(?))",
                Long.class,
                nomeExercicio
        );

        if (!porNome.isEmpty()) {
            Long idExistente = porNome.get(0);
            if (grupoMuscular != null) {
                jdbc.update("UPDATE exercicio SET grupo_muscular = ? WHERE id = ?", grupoMuscular, idExistente);
            }
            return idExistente;
        }

        String grupoFinal = (grupoMuscular != null) ? grupoMuscular : "geral";
        return jdbc.queryForObject(
                "INSERT INTO exercicio (nome, grupo_muscular) VALUES (?, ?) RETURNING id",
                Long.class,
                nomeExercicio,
                grupoFinal
        );
    }

    private List<Long> buscarIdsTreinosIrmaos(JdbcTemplate jdbc, Long treinoId) {
        var alvo = jdbc.queryForList(
                "SELECT aluno_id, nome FROM treino WHERE id = ? AND ativo",
                treinoId
        );
        if (alvo.isEmpty()) {
            throw new IllegalArgumentException("Ficha de treino não encontrada.");
        }
        Long alunoId = ((Number) alvo.get(0).get("aluno_id")).longValue();
        String nomeTreino = alvo.get(0).get("nome").toString();

        return jdbc.queryForList(
                "SELECT id FROM treino WHERE aluno_id = ? AND lower(trim(nome)) = lower(trim(?)) AND ativo ORDER BY id",
                Long.class,
                alunoId,
                nomeTreino
        );
    }

    private void reordenarExerciciosTreino(JdbcTemplate jdbc, Long treinoId) {
        List<Long> itemIds = jdbc.queryForList(
                "SELECT id FROM treino_exercicio WHERE treino_id = ? ORDER BY ordem ASC, id ASC",
                Long.class,
                treinoId
        );
        for (int i = 0; i < itemIds.size(); i++) {
            jdbc.update("UPDATE treino_exercicio SET ordem = ? WHERE id = ?", -(i + 1), itemIds.get(i));
        }
        for (int i = 0; i < itemIds.size(); i++) {
            jdbc.update("UPDATE treino_exercicio SET ordem = ? WHERE id = ?", i + 1, itemIds.get(i));
        }
    }

    public List<?> listarExercicios(Long userId) {
        return rlsExecutor.executeAsUser(userId, jdbc ->
                jdbc.queryForList("SELECT * FROM exercicio ORDER BY grupo_muscular, nome")
        );
    }

    public List<?> listarTreinosResumoAlunos(Long userId) {
        return rlsExecutor.executeAsUser(userId, jdbc ->
                jdbc.queryForList("""
                        SELECT a.id AS aluno_id,
                               u.nome AS aluno_nome,
                               u.email AS aluno_email,
                               a.objetivo,
                               COALESCE(
                                   (SELECT string_agg(sub.nome, ', ' ORDER BY sub.nome)
                                    FROM (
                                        SELECT DISTINCT ON (lower(trim(t.nome))) t.nome
                                        FROM treino t
                                        WHERE t.aluno_id = a.id AND t.ativo
                                        ORDER BY lower(trim(t.nome)), t.id DESC
                                    ) sub),
                                   ''
                               ) AS treinos_resumo,
                               (SELECT COUNT(DISTINCT lower(trim(t.nome)))
                                FROM treino t
                                WHERE t.aluno_id = a.id AND t.ativo) AS total_treinos,
                               (SELECT up.nome
                                FROM treino t
                                JOIN usuario up ON up.id = t.professor_id
                                WHERE t.aluno_id = a.id AND t.ativo AND t.professor_id IS NOT NULL
                                ORDER BY t.id DESC
                                LIMIT 1) AS professor_responsavel
                        FROM aluno a
                        JOIN usuario u ON u.id = a.id
                        WHERE u.ativo
                        ORDER BY u.nome
                        """)
        );
    }

    public Map<String, Object> buscarTreinosPorAluno(Long userId, Long alunoId) {
        return rlsExecutor.executeAsUser(userId, jdbc -> {
            var alunos = jdbc.queryForList(
                    """
                    SELECT a.id, u.nome, u.email, a.objetivo
                    FROM aluno a
                    JOIN usuario u ON u.id = a.id
                    WHERE a.id = ?
                    """,
                    alunoId
            );
            if (alunos.isEmpty()) {
                throw new IllegalArgumentException("Aluno não encontrado.");
            }

            var linhas = jdbc.queryForList(
                    """
                    WITH treinos_unicos AS (
                        SELECT DISTINCT ON (lower(trim(t.nome)))
                               t.id, t.aluno_id, t.professor_id, t.nome, t.dia_semana, t.observacao, t.criado_em
                        FROM treino t
                        WHERE t.aluno_id = ? AND t.ativo
                        ORDER BY lower(trim(t.nome)), t.id DESC
                    )
                    SELECT t.id AS treino_id,
                           t.nome AS treino_nome,
                           t.dia_semana,
                           t.observacao,
                           t.criado_em,
                           t.professor_id,
                           up.nome AS professor_nome,
                           te.id AS item_id,
                           te.exercicio_id,
                           te.ordem,
                           e.nome AS exercicio,
                           e.grupo_muscular,
                           te.series,
                           te.repeticoes,
                           te.descanso_seg
                    FROM treinos_unicos t
                    LEFT JOIN treino_exercicio te ON te.treino_id = t.id
                    LEFT JOIN exercicio e         ON e.id = te.exercicio_id
                    LEFT JOIN usuario up          ON up.id = t.professor_id
                    ORDER BY t.nome, te.ordem, te.id
                    """,
                    alunoId
            );

            var treinosMap = new LinkedHashMap<Long, Map<String, Object>>();
            for (var l : linhas) {
                Long tId = ((Number) l.get("treino_id")).longValue();
                var treinoObj = treinosMap.computeIfAbsent(tId, id -> {
                    var m = new LinkedHashMap<String, Object>();
                    m.put("id", tId);
                    m.put("nome", l.get("treino_nome"));
                    m.put("dia_semana", l.get("dia_semana"));
                    m.put("observacao", l.get("observacao"));
                    m.put("criado_em", l.get("criado_em") != null ? l.get("criado_em").toString() : null);
                    m.put("professor_id", l.get("professor_id"));
                    m.put("professor_nome", l.get("professor_nome"));
                    m.put("exercicios", new ArrayList<>());
                    return m;
                });

                if (l.get("item_id") != null) {
                    @SuppressWarnings("unchecked")
                    var listaEx = (List<Object>) treinoObj.get("exercicios");
                    var ex = new LinkedHashMap<String, Object>();
                    ex.put("id", ((Number) l.get("item_id")).longValue());
                    ex.put("exercicio_id", ((Number) l.get("exercicio_id")).longValue());
                    ex.put("ordem", l.get("ordem"));
                    ex.put("exercicio", l.get("exercicio"));
                    ex.put("grupo_muscular", l.get("grupo_muscular"));
                    ex.put("series", l.get("series"));
                    ex.put("repeticoes", l.get("repeticoes"));
                    ex.put("descanso_seg", l.get("descanso_seg"));
                    listaEx.add(ex);
                }
            }

            var resposta = new LinkedHashMap<String, Object>();
            resposta.put("aluno", alunos.get(0));
            resposta.put("treinos", new ArrayList<>(treinosMap.values()));
            return resposta;
        });
    }

    public List<?> listarTreinos(Long userId) {
        return rlsExecutor.executeAsUser(userId, jdbc ->
                jdbc.queryForList("""
                        SELECT t.id, t.aluno_id, u.nome AS aluno_nome, t.professor_id,
                               t.dia_semana, t.nome AS treino_nome, t.observacao, t.ativo
                        FROM treino t
                        JOIN aluno a ON a.id = t.aluno_id
                        JOIN usuario u ON u.id = a.id
                        WHERE t.ativo
                        ORDER BY u.nome, t.nome, t.dia_semana
                        """)
        );
    }

    public Map<String, Object> criarTreinoParaAluno(Long userId, Long alunoId, Map<String, Object> dados) {
        String nome = textoOuNulo(dados.get("nome"));
        if (nome == null) {
            throw new IllegalArgumentException("Informe o nome do treino (ex.: Treino A, Treino B, Treino C).");
        }
        String observacao = textoOuNulo(dados.get("observacao"));

        return rlsExecutor.executeAsUser(userId, jdbc -> {
            Integer jaExiste = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM treino WHERE aluno_id = ? AND lower(trim(nome)) = lower(trim(?)) AND ativo",
                    Integer.class,
                    alunoId,
                    nome
            );
            if (jaExiste != null && jaExiste > 0) {
                throw new IllegalArgumentException("Este aluno já possui o " + nome + " cadastrado.");
            }

            // Aloca automaticamente um dia da semana livre a partir da data de hoje (0 = Domingo ... 6 = Sábado)
            List<Integer> diasOcupadosList = jdbc.queryForList(
                    "SELECT dia_semana FROM treino WHERE aluno_id = ? AND ativo",
                    Integer.class,
                    alunoId
            );
            Set<Integer> diasOcupados = new HashSet<>(diasOcupadosList);
            int hojeDow = LocalDate.now().getDayOfWeek().getValue() % 7;

            Integer diaSemana = (dados.get("dia_semana") != null)
                    ? lerInt(dados.get("dia_semana"), hojeDow)
                    : null;

            if (diaSemana == null || diasOcupados.contains(diaSemana)) {
                diaSemana = null;
                for (int offset = 0; offset < 7; offset++) {
                    int candidato = (hojeDow + offset) % 7;
                    if (!diasOcupados.contains(candidato)) {
                        diaSemana = candidato;
                        break;
                    }
                }
            }

            if (diaSemana == null) {
                throw new IllegalArgumentException("O aluno já atingiu o limite máximo de fichas ativas.");
            }

            Long professorId = resolverProfessorId(jdbc, userId, dados.get("professor_id"));

            Long treinoId = jdbc.queryForObject(
                    "INSERT INTO treino (aluno_id, professor_id, dia_semana, nome, observacao, ativo) VALUES (?, ?, ?, ?, ?, true) RETURNING id",
                    Long.class,
                    alunoId,
                    professorId,
                    diaSemana,
                    nome,
                    observacao
            );

            // Se vier uma lista inicial de exercícios no payload, já insere na ficha criada
            Object listaBruta = dados.get("exercicios");
            if (listaBruta instanceof List<?> listaExercicios) {
                int ordem = 1;
                for (Object itemObj : listaExercicios) {
                    if (itemObj instanceof Map<?, ?> itemMap) {
                        String nomeEx = textoOuNulo(itemMap.get("exercicio"));
                        if (nomeEx == null) nomeEx = textoOuNulo(itemMap.get("nome"));
                        String grupo = textoOuNulo(itemMap.get("grupo_muscular"));
                        Long exId = buscarOuCriarExercicio(jdbc, lerLongOpcional(itemMap.get("exercicio_id")), nomeEx, grupo);
                        int series = lerInt(itemMap.get("series"), 3);
                        String reps = textoOuNulo(itemMap.get("repeticoes"));
                        if (reps == null) reps = "12";
                        int descanso = lerInt(itemMap.get("descanso_seg"), 60);

                        jdbc.update(
                                """
                                INSERT INTO treino_exercicio (treino_id, exercicio_id, series, repeticoes, carga_kg, descanso_seg, ordem)
                                VALUES (?, ?, ?, ?, NULL, ?, ?)
                                """,
                                treinoId,
                                exId,
                                series,
                                reps,
                                descanso,
                                ordem++
                        );
                    }
                }
            }

            return Map.of(
                    "treinoId", treinoId,
                    "nome", nome,
                    "dia_semana", diaSemana,
                    "mensagem", nome + " criado com sucesso."
            );
        });
    }

    public Map<String, Object> criarTreino(Long userId, Map<String, Object> dados) {
        Long alunoId = lerLongOpcional(dados.get("aluno_id"));
        if (alunoId == null) {
            throw new IllegalArgumentException("Campo obrigatório: aluno_id.");
        }
        return criarTreinoParaAluno(userId, alunoId, dados);
    }

    public Map<String, Object> atualizarTreino(Long userId, Long treinoId, Map<String, Object> dados) {
        return rlsExecutor.executeAsUser(userId, jdbc -> {
            List<Long> irmaos = buscarIdsTreinosIrmaos(jdbc, treinoId);
            String novoNome = textoOuNulo(dados.get("nome"));
            String observacao = dados.containsKey("observacao") ? textoOuNulo(dados.get("observacao")) : null;
            Long professorId = resolverProfessorId(jdbc, userId, dados.get("professor_id"));

            for (Long idAtual : irmaos) {
                if (novoNome != null) {
                    jdbc.update(
                            "UPDATE treino SET nome = ?, observacao = COALESCE(?, observacao), professor_id = COALESCE(?, professor_id) WHERE id = ?",
                            novoNome,
                            observacao,
                            professorId,
                            idAtual
                    );
                } else {
                    jdbc.update(
                            "UPDATE treino SET observacao = ?, professor_id = COALESCE(?, professor_id) WHERE id = ?",
                            observacao,
                            professorId,
                            idAtual
                    );
                }
            }

            return Map.of(
                    "treinoId", treinoId,
                    "mensagem", "Ficha de treino atualizada com sucesso."
            );
        });
    }

    public Map<String, Object> excluirTreino(Long userId, Long treinoId) {
        return rlsExecutor.executeAsUser(userId, jdbc -> {
            List<Long> irmaos = buscarIdsTreinosIrmaos(jdbc, treinoId);
            for (Long idAtual : irmaos) {
                jdbc.update("UPDATE treino SET ativo = false WHERE id = ?", idAtual);
            }
            return Map.of(
                    "treinoId", treinoId,
                    "mensagem", "Ficha de treino removida com sucesso."
            );
        });
    }

    public Map<String, Object> adicionarExercicioTreino(Long userId, Long treinoId, Map<String, Object> dados) {
        String nomeExercicio = textoOuNulo(dados.get("exercicio"));
        if (nomeExercicio == null) {
            nomeExercicio = textoOuNulo(dados.get("nome"));
        }
        Long exercicioIdInformado = lerLongOpcional(dados.get("exercicio_id"));
        String grupoMuscular = textoOuNulo(dados.get("grupo_muscular"));
        String repeticoes = textoOuNulo(dados.get("repeticoes"));
        int series = lerInt(dados.get("series"), 3);
        int descansoSeg = lerInt(dados.get("descanso_seg"), 60);

        if ((exercicioIdInformado == null && nomeExercicio == null) || repeticoes == null) {
            throw new IllegalArgumentException("Campos obrigatórios: exercício e repetições.");
        }
        if (series <= 0) {
            throw new IllegalArgumentException("O número de séries deve ser maior que zero.");
        }
        if (descansoSeg < 0) {
            throw new IllegalArgumentException("O tempo de descanso não pode ser negativo.");
        }

        final String nomeExFinal = nomeExercicio;
        return rlsExecutor.executeAsUser(userId, jdbc -> {
            List<Long> irmaos = buscarIdsTreinosIrmaos(jdbc, treinoId);
            Long exercicioId = buscarOuCriarExercicio(jdbc, exercicioIdInformado, nomeExFinal, grupoMuscular);
            Long professorId = resolverProfessorId(jdbc, userId, null);

            Long itemPrincipalId = null;
            for (Long idAtual : irmaos) {
                Integer maxOrdem = jdbc.queryForObject(
                        "SELECT COALESCE(MAX(ordem), 0) FROM treino_exercicio WHERE treino_id = ?",
                        Integer.class,
                        idAtual
                );
                int proximaOrdem = (dados.get("ordem") != null)
                        ? lerInt(dados.get("ordem"), (maxOrdem != null ? maxOrdem + 1 : 1))
                        : (maxOrdem != null ? maxOrdem + 1 : 1);

                Long novoItemId = jdbc.queryForObject(
                        """
                        INSERT INTO treino_exercicio (treino_id, exercicio_id, series, repeticoes, carga_kg, descanso_seg, ordem)
                        VALUES (?, ?, ?, ?, NULL, ?, ?) RETURNING id
                        """,
                        Long.class,
                        idAtual,
                        exercicioId,
                        series,
                        repeticoes,
                        descansoSeg,
                        proximaOrdem
                );
                reordenarExerciciosTreino(jdbc, idAtual);

                if (professorId != null) {
                    jdbc.update("UPDATE treino SET professor_id = ? WHERE id = ?", professorId, idAtual);
                }
                if (idAtual.equals(treinoId)) {
                    itemPrincipalId = novoItemId;
                }
            }

            return Map.of(
                    "treinoExercicioId", itemPrincipalId != null ? itemPrincipalId : 0L,
                    "mensagem", "Exercício adicionado ao treino."
            );
        });
    }

    public Map<String, Object> atualizarExercicioTreino(Long userId, Long treinoId, Long itemId, Map<String, Object> dados) {
        String nomeExercicio = textoOuNulo(dados.get("exercicio"));
        if (nomeExercicio == null) {
            nomeExercicio = textoOuNulo(dados.get("nome"));
        }
        Long exercicioIdInformado = lerLongOpcional(dados.get("exercicio_id"));
        String grupoMuscular = textoOuNulo(dados.get("grupo_muscular"));
        String repeticoes = textoOuNulo(dados.get("repeticoes"));
        int series = lerInt(dados.get("series"), 3);
        int descansoSeg = lerInt(dados.get("descanso_seg"), 60);

        if ((exercicioIdInformado == null && nomeExercicio == null) || repeticoes == null) {
            throw new IllegalArgumentException("Campos obrigatórios: exercício e repetições.");
        }
        if (series <= 0) {
            throw new IllegalArgumentException("O número de séries deve ser maior que zero.");
        }
        if (descansoSeg < 0) {
            throw new IllegalArgumentException("O tempo de descanso não pode ser negativo.");
        }

        final String nomeExFinal = nomeExercicio;
        return rlsExecutor.executeAsUser(userId, jdbc -> {
            var itemAlvo = jdbc.queryForList(
                    "SELECT ordem FROM treino_exercicio WHERE id = ? AND treino_id = ?",
                    itemId,
                    treinoId
            );
            if (itemAlvo.isEmpty()) {
                throw new IllegalArgumentException("Exercício não encontrado nesta ficha de treino.");
            }
            int ordemAlvo = ((Number) itemAlvo.get(0).get("ordem")).intValue();

            List<Long> irmaos = buscarIdsTreinosIrmaos(jdbc, treinoId);
            Long novoExercicioId = buscarOuCriarExercicio(jdbc, exercicioIdInformado, nomeExFinal, grupoMuscular);
            Long professorId = resolverProfessorId(jdbc, userId, null);

            for (Long idAtual : irmaos) {
                if (idAtual.equals(treinoId)) {
                    jdbc.update(
                            """
                            UPDATE treino_exercicio
                            SET exercicio_id = ?, series = ?, repeticoes = ?, carga_kg = NULL, descanso_seg = ?
                            WHERE id = ? AND treino_id = ?
                            """,
                            novoExercicioId,
                            series,
                            repeticoes,
                            descansoSeg,
                            itemId,
                            idAtual
                    );
                } else {
                    jdbc.update(
                            """
                            UPDATE treino_exercicio
                            SET exercicio_id = ?, series = ?, repeticoes = ?, carga_kg = NULL, descanso_seg = ?
                            WHERE treino_id = ? AND ordem = ?
                            """,
                            novoExercicioId,
                            series,
                            repeticoes,
                            descansoSeg,
                            idAtual,
                            ordemAlvo
                    );
                }

                if (professorId != null) {
                    jdbc.update("UPDATE treino SET professor_id = ? WHERE id = ?", professorId, idAtual);
                }
            }

            return Map.of(
                    "treinoExercicioId", itemId,
                    "mensagem", "Exercício atualizado com sucesso."
            );
        });
    }

    public Map<String, Object> removerExercicioTreino(Long userId, Long treinoId, Long itemId) {
        return rlsExecutor.executeAsUser(userId, jdbc -> {
            var itemAlvo = jdbc.queryForList(
                    "SELECT ordem FROM treino_exercicio WHERE id = ? AND treino_id = ?",
                    itemId,
                    treinoId
            );
            if (itemAlvo.isEmpty()) {
                throw new IllegalArgumentException("Exercício não encontrado nesta ficha de treino.");
            }
            int ordemAlvo = ((Number) itemAlvo.get(0).get("ordem")).intValue();

            List<Long> irmaos = buscarIdsTreinosIrmaos(jdbc, treinoId);
            Long professorId = resolverProfessorId(jdbc, userId, null);

            for (Long idAtual : irmaos) {
                if (idAtual.equals(treinoId)) {
                    jdbc.update("DELETE FROM treino_exercicio WHERE id = ? AND treino_id = ?", itemId, idAtual);
                } else {
                    jdbc.update("DELETE FROM treino_exercicio WHERE treino_id = ? AND ordem = ?", idAtual, ordemAlvo);
                }
                reordenarExerciciosTreino(jdbc, idAtual);

                if (professorId != null) {
                    jdbc.update("UPDATE treino SET professor_id = ? WHERE id = ?", professorId, idAtual);
                }
            }

            return Map.of(
                    "treinoExercicioId", itemId,
                    "mensagem", "Exercício removido do treino."
            );
        });
    }

    // ==================== TELAS MOBILE (ALUNO) ====================

    public Map<String, Object> buscarMeuPlano(Long userId) {
        return rlsExecutor.executeAsUser(userId, jdbc ->
                jdbc.queryForMap("SELECT * FROM vw_aluno_plano")
        );
    }

    public List<?> buscarTreinoDoDia(Long userId) {
        return rlsExecutor.executeAsUser(userId, jdbc ->
                jdbc.queryForList("SELECT * FROM vw_treino_do_dia ORDER BY ordem")
        );
    }

    public List<?> buscarMeusTreinos(Long userId) {
        return rlsExecutor.executeAsUser(userId, jdbc ->
                jdbc.queryForList("""
                        WITH treinos_unicos AS (
                            SELECT DISTINCT ON (lower(trim(t.nome)))
                                   t.id, t.aluno_id, t.professor_id, t.nome, t.dia_semana, t.observacao
                            FROM treino t
                            WHERE t.ativo
                            ORDER BY lower(trim(t.nome)), t.id DESC
                        )
                        SELECT t.aluno_id,
                               t.id AS treino_id,
                               t.nome AS treino,
                               t.dia_semana,
                               t.observacao,
                               up.nome AS professor,
                               te.ordem,
                               e.nome AS exercicio,
                               e.grupo_muscular,
                               te.series,
                               te.repeticoes,
                               te.carga_kg,
                               te.descanso_seg
                        FROM treinos_unicos t
                        LEFT JOIN treino_exercicio te ON te.treino_id = t.id
                        LEFT JOIN exercicio e         ON e.id = te.exercicio_id
                        LEFT JOIN usuario up          ON up.id = t.professor_id
                        ORDER BY t.nome, te.ordem
                        """)
        );
    }

    public List<?> buscarFrequenciaMensal(Long userId) {
        return rlsExecutor.executeAsUser(userId, jdbc ->
                jdbc.queryForList("SELECT * FROM vw_frequencia_mensal ORDER BY mes DESC")
        );
    }

    public Map<String, Object> verificarCheckinHoje(Long userId, LocalDate data) {
        LocalDate dataConsulta = (data != null) ? data : LocalDate.now();
        return rlsExecutor.executeAsUser(userId, jdbc -> {
            Boolean feito = jdbc.queryForObject(
                    "SELECT EXISTS (SELECT 1 FROM checkin WHERE data = ?)",
                    Boolean.class,
                    Date.valueOf(dataConsulta)
            );
            return Map.of("feitoHoje", Boolean.TRUE.equals(feito));
        });
    }

    public Map<String, Object> realizarCheckin(Long userId, LocalDate data) {
        
        LocalDate dataCheckin = (data != null) ? data : LocalDate.now();

        return rlsExecutor.executeAsUser(userId, jdbc -> {
            Long alunoId = jdbc.queryForObject(
                    "SELECT id FROM aluno WHERE id = ?",
                    Long.class,
                    userId
            );

            jdbc.update(
                    "INSERT INTO checkin (aluno_id, data, metodo) VALUES (?, ?, ?)",
                    alunoId,
                    Date.valueOf(dataCheckin),
                    "mobile"
            );
            return Map.of("mensagem", "Check-in realizado com sucesso!");
        });
    }
}