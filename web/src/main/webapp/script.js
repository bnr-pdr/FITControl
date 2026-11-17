/* FITCONTROL - DASHBOARD VINCULADO À API */
(async function () {
    "use strict";
    if (!document.getElementById("totalAlunos")) return;
    const indicadorAlunos = document.getElementById("totalAlunos");
    const indicadorMatriculas = document.getElementById("totalPlanosAtivos");
    const indicadorProfessores = document.getElementById("totalProfessores");
    const informacao = document.createElement("p");
    informacao.setAttribute("role", "status");
    informacao.style.marginTop = "18px";
    informacao.style.color = "#e6b1b1";
    document.querySelector(".cartoes").after(informacao);
    indicadorAlunos.textContent = "—";
    indicadorMatriculas.textContent = "—";
    indicadorProfessores.textContent = "—";

    try {
        const dados = await FitControlAPI.get("web/dashboard");
        indicadorAlunos.textContent = String(dados.total_alunos ?? "—");
        indicadorMatriculas.textContent = String(dados.matriculas_ativas ?? "—");
        indicadorProfessores.textContent = String(dados.total_professores ?? "—");
        informacao.textContent = "Dados carregados do PostgreSQL pela API.";
        informacao.style.color = "#87d5a0";
    } catch (erro) {
        informacao.textContent = `Não foi possível carregar os indicadores: ${erro.message}`;
    }
})();
