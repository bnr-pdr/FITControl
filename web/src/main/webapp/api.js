(function () {
  "use strict";

  const API_BASE_URL = "http://localhost:8080/api";
  const TOKEN_KEY = "fitcontrolToken";

  function token() {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  function sair() {
    [
      TOKEN_KEY,
      "fitcontrolLogado",
      "fitcontrolNome",
      "fitcontrolPerfil",
      "fitcontrolUsuarioId",
    ].forEach((chave) => sessionStorage.removeItem(chave));
  }

  function autenticado() {
    return Boolean(token());
  }

  async function requisitar(caminho, opcoes = {}) {
    const cabecalhos = { Accept: "application/json", ...opcoes.headers };
    const estaEnviandoDados = opcoes.body !== undefined;
    if (estaEnviandoDados) cabecalhos["Content-Type"] = "application/json";
    if (token()) cabecalhos.Authorization = `Bearer ${token()}`;

    let resposta;
    try {
      resposta = await fetch(`${API_BASE_URL}/${caminho.replace(/^\//, "")}`, {
        ...opcoes,
        headers: cabecalhos,
        body: estaEnviandoDados ? JSON.stringify(opcoes.body) : undefined,
      });
    } catch (erro) {
      throw new Error(
        "Não foi possível conectar à API. Confira se o Spring Boot está executando na porta 8080 e se o PostgreSQL está ligado.",
      );
    }

    const texto = await resposta.text();
    let dados = null;
    if (texto) {
      try {
        dados = JSON.parse(texto);
      } catch (_) {
        dados = texto;
      }
    }

    if (!resposta.ok) {
      const mensagem =
        typeof dados === "object" && dados
          ? dados.erro || dados.message || dados.error
          : null;
      const erro = new Error(
        mensagem || `Erro HTTP ${resposta.status} ao acessar a API.`,
      );
      erro.status = resposta.status;
      if (resposta.status === 401 && caminho !== "auth/login") {
        sair();
        alert("Sua sessão expirou ou não foi autorizada. Entre novamente.");
        const scriptApi = document.querySelector('script[src$="api.js"]');
        const baseHref = scriptApi ? scriptApi.src : window.location.href;
        window.location.replace(new URL("login/login.html", baseHref).href);
      }
      throw erro;
    }
    return dados;
  }

  async function entrar(email, senha) {
    const dados = await requisitar("auth/login", {
      method: "POST",
      body: { email, senha },
    });
    if (!dados || !dados.token) {
      throw new Error("A API não devolveu o token de autenticação.");
    }
    const perfil = String(dados.perfil || "").toLowerCase();
    if (!["admin", "professor"].includes(perfil)) {
      throw new Error(
        "Este acesso é exclusivo dos administradores e professores.",
      );
    }
    sessionStorage.setItem(TOKEN_KEY, dados.token);
    sessionStorage.setItem("fitcontrolLogado", "true");
    sessionStorage.setItem("fitcontrolNome", dados.nome || "Funcionário");
    sessionStorage.setItem("fitcontrolPerfil", perfil);
    sessionStorage.setItem(
      "fitcontrolUsuarioId",
      String(dados.usuarioId || ""),
    );
    return dados;
  }

  window.FitControlAPI = Object.freeze({
    API_BASE_URL,
    token,
    sair,
    autenticado,
    entrar,
    get: (caminho) => requisitar(caminho),
    post: (caminho, body) => requisitar(caminho, { method: "POST", body }),
    put: (caminho, body) => requisitar(caminho, { method: "PUT", body }),
    patch: (caminho, body) => requisitar(caminho, { method: "PATCH", body }),
    del: (caminho) => requisitar(caminho, { method: "DELETE" }),
  });
})();
