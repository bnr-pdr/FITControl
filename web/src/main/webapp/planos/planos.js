"use strict";

const listaPlanos = document.getElementById("listaPlanos");
const buscarPlano = document.getElementById("buscarPlano");
const btnNovoPlano = document.getElementById("btnNovoPlano");
const btnExcluirSelecionados = document.getElementById(
  "btnExcluirSelecionados",
);
const selecionarTodosPlanos = document.getElementById("selecionarTodosPlanos");
const modalPlano = document.getElementById("modalPlano");
const formPlano = document.getElementById("formPlano");
const cancelarPlano = document.getElementById("cancelarPlano");
const campoPlanoEmEdicao = document.getElementById("planoEmEdicao");
const campoNomePlano = document.getElementById("nomePlano");
const campoValorPlano = document.getElementById("valorPlano");
const campoDuracaoPlano = document.getElementById("duracaoPlano");
const campoDescricaoPlano = document.getElementById("descricaoPlano");
const campoStatusPlano = document.getElementById("statusPlano");
const mensagemErroPlano = document.getElementById("mensagemErroPlano");
const modalConsultaPlano = document.getElementById("modalConsultaPlano");
const modalExcluirPlano = document.getElementById("modalExcluirPlano");
const cancelarExclusaoPlano = document.getElementById("cancelarExclusaoPlano");
const confirmarExclusaoPlano = document.getElementById(
  "confirmarExclusaoPlano",
);
const statusApiPlanos = document.getElementById("statusApiPlanos");

const ehAdmin =
  (sessionStorage.getItem("fitcontrolPerfil") || "").toLowerCase() === "admin";

let planosDoBanco = [];
let idsPlanosExcluir = [];

function informarPlano(texto, erro = false) {
  statusApiPlanos.textContent = texto;
  statusApiPlanos.style.color = erro ? "#ff8585" : "#89d6a2";
  statusApiPlanos.style.margin = "12px 0";
}

function mostrarErroPlano(mensagem, campo) {
  mensagemErroPlano.textContent = mensagem;
  mensagemErroPlano.hidden = false;
  if (campo) campo.focus();
}

function limparErroPlano() {
  mensagemErroPlano.textContent = "";
  mensagemErroPlano.hidden = true;
}

function formatarValorPlano(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero)
    ? numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "Valor indisponível";
}

function aplicarMascaraMoeda(texto) {
  const digitos = String(texto ?? "").replace(/\D/g, "");
  if (!digitos) return "";
  const centavos = Number(digitos) / 100;
  return centavos.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function extrairNumeroMoeda(texto) {
  const digitos = String(texto ?? "").replace(/\D/g, "");
  if (!digitos) return NaN;
  return Number(digitos) / 100;
}

campoValorPlano.addEventListener("input", function () {
  campoValorPlano.value = aplicarMascaraMoeda(campoValorPlano.value);
  limparErroPlano();
});

campoNomePlano.addEventListener("input", limparErroPlano);
campoDescricaoPlano.addEventListener("input", limparErroPlano);

function criarCelulaPlano(texto) {
  const celula = document.createElement("td");
  celula.textContent = texto ?? "";
  return celula;
}

function atualizarSelecaoPlanos() {
  const visiveis = Array.from(
    listaPlanos.querySelectorAll("tr:not([hidden]) .selecionar-plano"),
  );
  const marcados = visiveis.filter((cb) => cb.checked);
  btnExcluirSelecionados.disabled = !ehAdmin || marcados.length === 0;
  selecionarTodosPlanos.checked =
    visiveis.length > 0 && marcados.length === visiveis.length;
  selecionarTodosPlanos.indeterminate =
    marcados.length > 0 && marcados.length < visiveis.length;
}

function renderizarPlanos() {
  listaPlanos.replaceChildren();
  const pesquisa = buscarPlano.value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const filtrados = planosDoBanco.filter((plano) =>
    String(plano.nome ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .startsWith(pesquisa),
  );

  filtrados.forEach((plano) => {
    const linha = document.createElement("tr");
    linha.dataset.id = String(plano.id);

    const celulaSelecao = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "selecionar-plano";
    checkbox.disabled = !ehAdmin;
    checkbox.addEventListener("change", atualizarSelecaoPlanos);
    celulaSelecao.append(checkbox);
    linha.append(celulaSelecao);

    linha.append(criarCelulaPlano(plano.nome));
    linha.append(criarCelulaPlano(formatarValorPlano(plano.valor)));
    linha.append(criarCelulaPlano(plano.ativo === false ? "Inativo" : "Ativo"));

    const celulaAcoes = document.createElement("td");
    const consultar = document.createElement("button");
    consultar.className = "btn-consultar";
    consultar.type = "button";
    consultar.textContent = "Consultar";

    const editar = document.createElement("button");
    editar.className = "btn-editar";
    editar.type = "button";
    editar.textContent = "Editar";
    editar.disabled = !ehAdmin;
    if (!ehAdmin) editar.title = "Apenas administradores podem editar planos";

    const excluir = document.createElement("button");
    excluir.className = "btn-excluir";
    excluir.type = "button";
    excluir.textContent = "Excluir";
    excluir.disabled = !ehAdmin;
    if (!ehAdmin) excluir.title = "Apenas administradores podem excluir planos";

    celulaAcoes.append(consultar, editar, excluir);
    linha.append(celulaAcoes);
    listaPlanos.append(linha);
  });

  document.getElementById("mensagemSemPlanos").hidden = filtrados.length > 0;
  atualizarSelecaoPlanos();
}

async function carregarPlanosDaApi() {
  informarPlano("Carregando planos do PostgreSQL...");
  try {
    const dados = await FitControlAPI.get("web/planos");
    if (!Array.isArray(dados))
      throw new Error("A API não retornou uma lista de planos.");
    planosDoBanco = dados.sort((a, b) => Number(a.valor) - Number(b.valor));
    renderizarPlanos();
    informarPlano(`${planosDoBanco.length} plano(s) carregado(s) do banco.`);
  } catch (erro) {
    planosDoBanco = [];
    listaPlanos.replaceChildren();
    document.getElementById("mensagemSemPlanos").hidden = true;
    informarPlano(`Não foi possível consultar planos: ${erro.message}`, true);
  }
}

function abrirFormularioNovoPlano() {
  if (!ehAdmin) return;
  formPlano.reset();
  limparErroPlano();
  campoPlanoEmEdicao.value = "";
  document.getElementById("tituloFormularioPlano").textContent =
    "Cadastrar plano";
  document.getElementById("descricaoFormularioPlano").textContent =
    "Preencha as informações do novo plano.";
  if (campoDuracaoPlano) campoDuracaoPlano.value = "1";
  campoStatusPlano.value = "Ativo";
  modalPlano.hidden = false;
  campoNomePlano.focus();
}

function abrirFormularioEditarPlano(plano) {
  if (!ehAdmin) return;
  formPlano.reset();
  limparErroPlano();
  campoPlanoEmEdicao.value = String(plano.id);
  document.getElementById("tituloFormularioPlano").textContent = "Editar plano";
  document.getElementById("descricaoFormularioPlano").textContent =
    "Atualize as informações do plano no PostgreSQL.";
  campoNomePlano.value = plano.nome || "";
  campoValorPlano.value = formatarValorPlano(plano.valor);
  if (campoDuracaoPlano) {
    const duracao = String(plano.duracao_meses || 1);
    if (
      !Array.from(campoDuracaoPlano.options).some(
        (opt) => opt.value === duracao,
      )
    ) {
      campoDuracaoPlano.append(new Option(`${duracao} meses`, duracao));
    }
    campoDuracaoPlano.value = duracao;
  }
  campoDescricaoPlano.value = plano.descricao || "";
  campoStatusPlano.value = plano.ativo === false ? "Inativo" : "Ativo";
  modalPlano.hidden = false;
  campoNomePlano.focus();
}

function fecharFormularioPlano() {
  modalPlano.hidden = true;
  formPlano.reset();
  limparErroPlano();
  campoPlanoEmEdicao.value = "";
  btnNovoPlano.focus();
}

btnNovoPlano.addEventListener("click", abrirFormularioNovoPlano);
cancelarPlano.addEventListener("click", fecharFormularioPlano);

formPlano.addEventListener("submit", async function (event) {
  event.preventDefault();
  limparErroPlano();

  const idEdicao = campoPlanoEmEdicao.value.trim();
  const nome = campoNomePlano.value.trim();
  const valor = extrairNumeroMoeda(campoValorPlano.value);
  const duracaoMeses = Number(
    (campoDuracaoPlano && campoDuracaoPlano.value) || 1,
  );
  const descricao = campoDescricaoPlano.value.trim();
  const ativo = campoStatusPlano.value === "Ativo";

  if (!nome) {
    mostrarErroPlano("Informe o nome do plano.", campoNomePlano);
    return;
  }
  if (!Number.isFinite(valor) || valor < 0) {
    mostrarErroPlano("Informe um valor válido para o plano.", campoValorPlano);
    return;
  }
  if (
    planosDoBanco.some(
      (p) =>
        String(p.id) !== idEdicao &&
        String(p.nome).toLowerCase() === nome.toLowerCase(),
    )
  ) {
    mostrarErroPlano(
      "Já existe um plano cadastrado com este nome.",
      campoNomePlano,
    );
    return;
  }

  const botaoSalvar = document.getElementById("salvarPlano");
  botaoSalvar.disabled = true;
  botaoSalvar.textContent = "Salvando...";

  try {
    const payload = {
      nome,
      valor: Number(valor.toFixed(2)),
      duracao_meses: duracaoMeses,
      descricao,
      ativo,
    };
    if (idEdicao) {
      await FitControlAPI.put(`web/planos/${idEdicao}`, payload);
      fecharFormularioPlano();
      await carregarPlanosDaApi();
      informarPlano("Plano atualizado no PostgreSQL com sucesso.");
    } else {
      await FitControlAPI.post("web/planos", payload);
      fecharFormularioPlano();
      await carregarPlanosDaApi();
      informarPlano("Plano cadastrado no PostgreSQL com sucesso.");
    }
  } catch (erro) {
    mostrarErroPlano(`Não foi possível salvar o plano: ${erro.message}`, null);
  } finally {
    botaoSalvar.disabled = false;
    botaoSalvar.textContent = "Salvar plano";
  }
});

function abrirModalExcluirPlanos(ids, nomePlano) {
  if (!ehAdmin || ids.length === 0) return;
  idsPlanosExcluir = ids;
  const titulo = document.getElementById("tituloExcluirPlano");
  const msg = document.getElementById("mensagemExcluirPlano");
  const textoSpan = document.getElementById("textoPlanoExcluir");
  const nomeStrong = document.getElementById("nomePlanoExcluir");

  if (ids.length === 1) {
    titulo.textContent = "Excluir plano";
    msg.textContent = "Tem certeza de que deseja desativar este plano?";
    textoSpan.textContent = "Plano selecionado: ";
    nomeStrong.textContent = nomePlano;
  } else {
    titulo.textContent = "Excluir planos selecionados";
    msg.textContent =
      "Tem certeza de que deseja desativar os planos selecionados?";
    textoSpan.textContent = "Quantidade selecionada: ";
    nomeStrong.textContent = `${ids.length} plano(s)`;
  }
  modalExcluirPlano.hidden = false;
  cancelarExclusaoPlano.focus();
}

function fecharModalExcluirPlanos() {
  modalExcluirPlano.hidden = true;
  idsPlanosExcluir = [];
}

cancelarExclusaoPlano.addEventListener("click", fecharModalExcluirPlanos);

confirmarExclusaoPlano.addEventListener("click", async function () {
  if (idsPlanosExcluir.length === 0) return;
  confirmarExclusaoPlano.disabled = true;
  confirmarExclusaoPlano.textContent = "Excluindo...";
  try {
    for (const id of idsPlanosExcluir) {
      await FitControlAPI.del(`web/planos/${id}`);
    }
    const total = idsPlanosExcluir.length;
    fecharModalExcluirPlanos();
    await carregarPlanosDaApi();
    informarPlano(`${total} plano(s) desativado(s) no PostgreSQL com sucesso.`);
  } catch (erro) {
    fecharModalExcluirPlanos();
    informarPlano(`Erro ao excluir plano(s): ${erro.message}`, true);
  } finally {
    confirmarExclusaoPlano.disabled = false;
    confirmarExclusaoPlano.textContent = "Excluir plano";
  }
});

btnExcluirSelecionados.addEventListener("click", function () {
  const selecionados = Array.from(
    listaPlanos.querySelectorAll(".selecionar-plano:checked"),
  ).map((cb) => cb.closest("tr").dataset.id);
  abrirModalExcluirPlanos(selecionados, "");
});

selecionarTodosPlanos.addEventListener("change", function () {
  const marcar = selecionarTodosPlanos.checked;
  listaPlanos
    .querySelectorAll("tr:not([hidden]) .selecionar-plano:not(:disabled)")
    .forEach((cb) => {
      cb.checked = marcar;
    });
  atualizarSelecaoPlanos();
});

buscarPlano.addEventListener("input", renderizarPlanos);

listaPlanos.addEventListener("click", function (event) {
  const linha = event.target.closest("tr");
  if (!linha) return;
  const plano = planosDoBanco.find((p) => String(p.id) === linha.dataset.id);
  if (!plano) return;

  if (event.target.closest(".btn-consultar")) {
    document.getElementById("consultaNomePlano").textContent = plano.nome ?? "";
    document.getElementById("consultaValorPlano").textContent =
      formatarValorPlano(plano.valor);
    const duracaoEl = document.getElementById("consultaDuracaoPlano");
    if (duracaoEl) {
      const duracao = Number(plano.duracao_meses || 1);
      duracaoEl.textContent = duracao === 1 ? "1 mês" : `${duracao} meses`;
    }
    document.getElementById("consultaDescricaoPlano").textContent =
      plano.descricao || "Descrição não informada.";
    document.getElementById("consultaStatusPlano").textContent =
      plano.ativo === false ? "Inativo" : "Ativo";
    modalConsultaPlano.hidden = false;
    document.getElementById("fecharConsultaPlano").focus();
    return;
  }

  if (event.target.closest(".btn-editar")) {
    abrirFormularioEditarPlano(plano);
    return;
  }

  if (event.target.closest(".btn-excluir")) {
    abrirModalExcluirPlanos([String(plano.id)], plano.nome);
  }
});

document.getElementById("fecharConsultaPlano").addEventListener("click", () => {
  modalConsultaPlano.hidden = true;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!modalConsultaPlano.hidden) modalConsultaPlano.hidden = true;
    if (!modalPlano.hidden) fecharFormularioPlano();
    if (!modalExcluirPlano.hidden) fecharModalExcluirPlanos();
  }
});

if (!ehAdmin) {
  btnNovoPlano.disabled = true;
  btnNovoPlano.title = "Apenas administradores podem cadastrar planos";
  btnExcluirSelecionados.disabled = true;
  selecionarTodosPlanos.disabled = true;
}

carregarPlanosDaApi();
