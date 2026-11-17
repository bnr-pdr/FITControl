# 📱 Fit Control — Aplicativo Mobile (Aluno)

Aplicativo mobile multiplataforma desenvolvido em **Flutter (Dart)** para que os alunos da academia acompanhem seus treinos, visualizem seus dados cadastrais e realizem check-in por botão.

---

## 📂 Estrutura do Código (`lib/`)

```text
mobile/lib/
├── main.dart                     # Ponto de entrada, rotas e configuração de tema
├── models/
│   ├── perfil.dart               # Modelo de dados do perfil do aluno
│   └── treino.dart               # Modelo de fichas, exercícios, séries e repetições
├── screens/
│   ├── login_screen.dart         # Autenticação do aluno
│   ├── treinos_screen.dart       # Visualização interativa das fichas de treino e botão de check-in
│   └── perfil_screen.dart        # Dados cadastrais, plano ativo e ações do aluno
├── services/
│   └── api_service.dart          # Comunicação REST com o back-end Spring Boot
└── theme/
    └── app_theme.dart            # Paleta de cores, tipografia e identidade visual
```

---

## 🚀 Como Executar

1. **Instale as dependências:**

   ```bash
   flutter pub get
   ```

2. **Configure o endereço da API:**
   Em `lib/services/api_service.dart`, ajuste a URL base de acordo com o ambiente de teste:
   - **Emulador Android:** `http://10.0.2.2:<PORTA_API>`
   - **Dispositivo físico na mesma rede Wi-Fi:** `http://<IP_LOCAL_DA_MAQUINA>:<PORTA_API>`

3. **Inicie o aplicativo:**
   ```bash
   flutter run
   ```
