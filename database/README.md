# Banco de dados: PostgreSQL 16 (Docker)

## 1. Instalar o Docker (uma vez)

1. Baixe e instale o **Docker Desktop**: https://www.docker.com/products/docker-desktop/
2. Na instalação, deixe marcado **"Use WSL 2"** (se pedir, aceite instalar o WSL e reinicie o PC).
3. Abra o Docker Desktop e espere aparecer _"Engine running"_.

## 2. Subir o banco

```bash
cd database
cp .env.example .env        # no PowerShell: copy .env.example .env
# edite o .env e troque as senhas
docker compose up -d
docker compose logs -f db   # espere "database system is ready to accept connections"
```

Os scripts de `init/` rodam **sozinhos na primeira vez**, em ordem:

| Script             | O que faz                                                     |
| ------------------ | ------------------------------------------------------------- |
| `00_config.sql`    | fuso `America/Sao_Paulo`, pgcrypto, fecha permissões padrão   |
| `01_schema.sql`    | tabelas, constraints e índices                                |
| `02_funcoes.sql`   | contexto do usuário, login, triggers de regra de negócio      |
| `03_views.sql`     | views das telas (dashboard, plano do aluno, treino do dia...) |
| `04_auditoria.sql` | log de alterações                                             |
| `05_rls.sql`       | Row Level Security (quem vê o quê)                            |
| `06_roles.sh`      | cria o usuário `academia_app` da API                          |
| `07_seed.sh`       | dados de teste, se `LOAD_SEED=true`                           |

## 3. Conectar

| Para quê                            | Usuário          | String de conexão                                                 |
| ----------------------------------- | ---------------- | ----------------------------------------------------------------- |
| **Backend / API**                   | `academia_app`   | `postgresql://academia_app:SENHA_APP@localhost:5432/academia`     |
| Você (DBeaver, pgAdmin, migrations) | `academia_owner` | `postgresql://academia_owner:SENHA_OWNER@localhost:5432/academia` |

Terminal SQL direto: `docker exec -it academia-db psql -U academia_owner -d academia`

> A porta está ligada só em `127.0.0.1`: ninguém da rede (wifi da faculdade) acessa o banco.

### Logins de teste (senha de todos: `senha123`)

| Email                | Perfil    | Situação                     |
| -------------------- | --------- | ---------------------------- |
| admin@academia.com   | admin     |                              |
| carlos@academia.com  | professor | treinos da Ana e do Bruno    |
| juliana@academia.com | professor | treinos da Camila            |
| ana@email.com        | aluno     | plano mensal ativo           |
| bruno@email.com      | aluno     | trimestral ativo             |
| camila@email.com     | aluno     | anual ativo                  |
| diego@email.com      | aluno     | **vencido** (login é negado) |
| elisa@email.com      | aluno     | vence nos próximos dias      |

## 4. Comandos do dia a dia

```bash
docker compose stop              # para o banco (dados ficam salvos)
docker compose start             # liga de novo
docker compose down -v           # APAGA TUDO e recria do zero no próximo "up"
                                 # (necessário quando mudar algum script de init/)

# backup / restore
docker exec academia-db pg_dump -U academia_owner -d academia > backup.sql
docker exec -i academia-db psql -U academia_owner -d academia < backup.sql
```

## 5. Modelo

```
usuario (login de todos: admin / professor / aluno)
 ├── aluno      (1:1)
 └── professor  (1:1)

plano ──< matricula >── aluno
             └──< pagamento            (gerado automaticamente na matrícula)

aluno ──< checkin                      (1 por dia, só com matrícula válida)
aluno ──< treino >── professor         (ciclo sequencial A/B/C: bloqueia ao concluir no dia e avança no próximo)
             └──< treino_exercicio >── exercicio

auditoria                              (log de alterações, a API não acessa)
```

**Views para as telas:** `vw_dashboard`, `vw_alunos`, `vw_aluno_plano`, `vw_pagamentos`, `vw_treino_do_dia`, `vw_frequencia_mensal`.
Exemplos de todas as consultas para o backend estão em [`docs/consultas-api.sql`](docs/consultas-api.sql).

## 6. Segurança: o que o backend PRECISA fazer

1. **Conectar como `academia_app`**, nunca como `academia_owner`.
2. **Em toda rota autenticada**, abrir transação e informar o usuário do JWT:
   ```sql
   BEGIN;
   SELECT set_config('app.user_id', '42', true);
   -- consultas...
   COMMIT;
   ```
   Sem isso o banco devolve **zero linhas** (é o RLS protegendo).
3. **Queries parametrizadas** (`$1`, `?`), nunca concatenar texto.
4. **Senhas com bcrypt** no backend. O login usa `fn_login(email)`, que devolve o hash para comparar.

### O que o banco garante sozinho

| Proteção                                                          | Como                                          |
| ----------------------------------------------------------------- | --------------------------------------------- |
| Aluno só vê os próprios dados                                     | RLS em todas as tabelas                       |
| Professor não vê financeiro, adiciona alunos e cria/edita treinos | RLS                                           |
| Usuário desativado perde todo o acesso na hora                    | `app_user_id()` confere `ativo`               |
| API não cria/apaga tabelas, não apaga pagamento/aluno             | `academia_app` com menor privilégio           |
| Ninguém (nem a API) adultera o log                                | `auditoria` sem permissão para `academia_app` |
| Senha nunca aparece no log                                        | `senha_hash` removido na auditoria            |
| CPF completo só para admin (LGPD)                                 | `vw_alunos` mascara para professor            |
| Check-in duplicado / sem matrícula válida                         | `UNIQUE (aluno_id, data)` + trigger           |
| Horários certos                                                   | fuso `America/Sao_Paulo`                      |

### Limitações conhecidas (para mencionar no trabalho)

- O mascaramento de CPF fica na view. Um professor que consultasse a tabela `aluno` direto veria o CPF, então a API deve usar `vw_alunos`.
- Em produção, `academia_owner` não deveria ser superusuário. No Docker de desenvolvimento ele é, por simplicidade.
