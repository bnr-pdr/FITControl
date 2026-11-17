# 💻 Fit Control — Painel Web de Gestão

Interface web administrativa desenvolvida com **HTML5, CSS3 e JavaScript (Vanilla JS)**, estruturada como aplicação web Java (`WEB-INF/web.xml` + Maven) para operação completa da academia por gestores e recepção.

---

## 📂 Estrutura do Módulo

```text
web/src/main/webapp/
├── WEB-INF/
│   └── web.xml           # Descritor de implantação da aplicação web
├── login/                # Tela e fluxo de autenticação do gestor
├── alunos/               # CRUD e consulta de alunos matriculados
├── professores/          # Cadastro e gestão do corpo docente
├── planos/               # Configuração de planos e mensalidades
├── treinos/              # Montagem e vínculo de fichas de treino
├── index.html            # Página inicial / entrada da aplicação
├── dashboard.html        # Visão geral e indicadores da academia
├── api.js                # Cliente HTTP centralizado (Fetch + Header JWT)
├── auth.js               # Controle de sessão, armazenamento de token e proteção de rotas
├── script.js             # Utilitários globais de interface
└── style.css / inicio.css
```

---

## 🔌 Integração com o Back-end

- **`api.js`:** Centraliza a URL base da API Spring Boot e injeta automaticamente o token JWT armazenado nas requisições autenticadas.
- **`auth.js`:** Verifica a validade da sessão ativa e redireciona usuários não autenticados para `login/login.html`.

---

## 🚀 Como Executar

1. Certifique-se de que o **Banco de Dados** e o **Back-end** estejam em execução.
2. Verifique a URL base da API configurada em `src/main/webapp/api.js`.
3. Sirva a pasta `src/main/webapp` através de um servidor de aplicações compatível (ex: Apache Tomcat) ou servidor HTTP local durante o desenvolvimento.
