# ⚙️ Fit Control — Back-end (API REST)

API RESTful desenvolvida em **Java com Spring Boot**, responsável pelas regras de negócio, autenticação via **JWT**, registro de **check-in** e integração com **Row-Level Security (RLS)** no PostgreSQL.

---

## 📂 Estrutura de Pacotes (`br.com.academia.api`)

```text
src/main/java/br/com/academia/api/
├── config/
│   ├── CorsConfig.java               # Configuração de políticas CORS para Web e Mobile
│   └── GlobalExceptionHandler.java   # Padronização global de respostas de erro HTTP
├── controller/
│   ├── AuthController.java           # Endpoints de login e emissão de tokens
│   ├── MobileAlunoController.java    # Endpoints exclusivos do aplicativo do aluno (treinos, perfil e check-in)
│   └── WebGestaoController.java      # Endpoints administrativos (alunos, professores, planos, treinos)
├── dto/
│   ├── CheckinRequest.java           # Payload de registro de check-in
│   ├── LoginRequest.java             # Credenciais de autenticação
│   └── LoginResponse.java            # Retorno de token JWT e perfil do usuário
├── security/
│   ├── JwtAuthFilter.java            # Filtro de interceptação e validação do Bearer Token
│   ├── JwtService.java               # Geração, assinatura e extração de claims JWT
│   ├── RlsQueryExecutor.java         # Injeção do contexto do usuário autenticado na sessão SQL (RLS)
│   ├── SecurityConfig.java           # Cadeia de filtros e permissões de rotas Spring Security
│   └── UsuarioAutenticado.java       # Representação do principal autenticado no contexto
└── service/
    ├── AcademiaService.java          # Regras de negócio centrais de gestão da academia e check-in
    └── AuthService.java              # Validação de credenciais e fluxo de autenticação
```

---

## 🔐 Segurança e Arquitetura

- **Stateless JWT:** Toda requisição autenticada trafega com `Authorization: Bearer <token>`, validado pelo `JwtAuthFilter`.
- **Integração com RLS (`RlsQueryExecutor`):** Antes da execução das consultas, o contexto do usuário autenticado é repassado ao PostgreSQL para que as políticas definidas em `database/init/05_rls.sql` apliquem o isolamento de registros no nível do banco.
- **Tratamento Centralizado de Exceções:** O `GlobalExceptionHandler` intercepta falhas de validação, autenticação e regras de negócio, devolvendo payloads JSON consistentes.

---

## ⚙️ Configuração e Execução

1. **Configure as variáveis de ambiente:**

   ```bash
   cp .env.example .env
   ```

   Preencha as credenciais de conexão com o banco PostgreSQL e a chave secreta do JWT conforme o arquivo `.env.example`.

2. **Execute a aplicação via Maven Wrapper:**

   ```bash
   ./mvnw spring-boot:run
   ```

3. **Execute os testes:**
   ```bash
   ./mvnw test
   ```
