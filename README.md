# Academia App

Sistema de gestão de academia, projeto da faculdade.

- **Web (PC):** administrador e professor: dashboard, cadastro de alunos, planos, matrículas, pagamentos e treinos
- **Mobile:** aluno: login, plano e vencimento, check-in (botão ou QR Code), histórico de frequência e treino do dia

## Estrutura

| Pasta | Conteúdo |
|---|---|
| [`database/`](database/) | PostgreSQL: schema, roles, RLS, auditoria, seed |
| [`backend/`](backend/) | API (única parte que acessa o banco) |
| [`web/`](web/) | App web do admin e do professor |
| [`mobile/`](mobile/) | App mobile do aluno |

## Arquitetura

```
Mobile (aluno) ─┐
                ├──► API (backend) ──► PostgreSQL (Docker)
Web (prof/adm) ─┘
```

Os apps **nunca** se conectam direto ao banco.

## Regras do repositório

- Nunca commite `.env` nem senhas. Use o `.env.example` como modelo.
- Trabalhe em uma branch (`feature/nome-da-tarefa`) e abra um Pull Request para a `main`.
