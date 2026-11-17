"use strict";

const btnNovoProfessor = document.getElementById("btnNovoProfessor");
const btnExcluirSelecionadosProfessores = document.getElementById(
  "btnExcluirSelecionadosProfessores",
);
const selecionarTodosProfessores =
  document.getElementById("selecionarTodosProfessores") ||
  document.querySelector('.tabela-professores thead input[type="checkbox"]');
const pesquisarProfessor = document.getElementById("pesquisarProfessor");
const statusApiProfessores = document.getElementById("statusApiProfessores");
const listaProfessores = document.getElementById("listaProfessores");
const nenhumProfessor = document.getElementById("nenhumProfessor");

const modalProfessor = document.getElementById("modalProfessor");
const formProfessor = document.getElementById("formProfessor");
const cancelarProfessor = document.getElementById("cancelarProfessor");
const campoProfessorEmEdicao = document.getElementById("professorEmEdicao");
const campoNomeProfessor = document.getElementById("nomeProfessor");
const campoEspecialidadeProfessor = document.getElementById(
  "especialidadeProfessor",
);
const campoCrefProfessor = document.getElementById("crefProfessor");
const campoEmailProfessor = document.getElementById("emailProfessor");
const campoSenhaProfessor = document.getElementById("senhaProfessor");
const labelSenhaProfessor = document.getElementById("labelSenhaProfessor");
const campoTelefoneProfessor = document.getElementById("telefoneProfessor");
const campoStatusProfessor = document.getElementById("statusProfessor");
const mensagemErroProfessor = document.getElementById("mensagemErroProfessor");

const modalConsultaProfessor = document.getElementById(
  "modalConsultaProfessor",
);
const modalExcluirProfessor = document.getElementById("modalExcluirProfessor");
const cancelarExclusaoProfessor = document.getElementById(
  "cancelarExclusaoProfessor",
);
const confirmarExclusaoProfessor = document.getElementById(
  "confirmarExclusaoProfessor",
);

const ehAdmin =
  (sessionStorage.getItem("fitcontrolPerfil") || "").toLowerCase() === "admin";

let professoresDoBanco = [];
let idsProfessoresExcluir = [];

function informarProfessor(texto, erro = false) {
  statusApiProfessores.textContent = texto;
  statusApiProfessores.style.color = erro ? "#ff8585" : "#89d6a2";
  statusApiProfessores.style.margin = "12px 0";
}

function mostrarErroProfessor(mensagem, campo) {
  mensagemErroProfessor.textContent = mensagem;
  mensagemErroProfessor.hidden = false;
  if (campo) campo.focus();
}

function limparErroProfessor() {
  mensagemErroProfessor.textContent = "";
  mensagemErroProfessor.hidden = true;
}

function formatarTelefone(valor) {
  const numeros = String(valor ?? "")
    .replace(/\D/g, "")
    .slice(0, 11);
  if (numeros.length <= 2) return numeros.length ? `(${numeros}` : "";
  if (numeros.length <= 6)
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  if (numeros.length === 10)
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

campoTelefoneProfessor.addEventListener("input", function () {
  campoTelefoneProfessor.value = formatarTelefone(campoTelefoneProfessor.value);
  limparErroProfessor();
});

campoNomeProfessor.addEventListener("input", limparErroProfessor);
campoEspecialidadeProfessor.addEventListener("input", limparErroProfessor);
campoEmailProfessor.addEventListener("input", limparErroProfessor);
if (campoSenhaProfessor)
  campoSenhaProfessor.addEventListener("input", limparErroProfessor);

function celulaProfessor(texto) {
  const td = document.createElement("td");
  td.textContent = texto ?? "";
  return td;
}

function atualizarSelecaoProfessores() {
  const visiveis = Array.from(
    listaProfessores.querySelectorAll("tr:not([hidden]) .checkbox-professor"),
  );
  const marcados = visiveis.filter((cb) => cb.checked);
  btnExcluirSelecionadosProfessores.disabled =
    !ehAdmin || marcados.length === 0;
  if (selecionarTodosProfessores) {
    selecionarTodosProfessores.disabled = !ehAdmin || visiveis.length === 0;
    selecionarTodosProfessores.checked =
      visiveis.length > 0 && marcados.length === visiveis.length;
    selecionarTodosProfessores.indeterminate =
      marcados.length > 0 && marcados.length < visiveis.length;
  }
}

function montarLinhaProfessor(prof) {
  const linha = document.createElement("tr");
  linha.dataset.id = String(prof.id);
  linha.dataset.nome = String(prof.nome ?? "");

  const colCheck = document.createElement("td");
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.className = "checkbox-professor";
  cb.disabled = !ehAdmin;
  cb.setAttribute("aria-label", `Selecionar ${prof.nome}`);
  cb.addEventListener("change", atualizarSelecaoProfessores);
  colCheck.append(cb);
  linha.append(colCheck);

  linha.append(celulaProfessor(prof.nome));
  linha.append(celulaProfessor(prof.especialidade || "Não informada"));
  linha.append(celulaProfessor(prof.email));
  linha.append(celulaProfessor(prof.ativo === false ? "Inativo" : "Ativo"));

  const colAcoes = document.createElement("td");
  const btnConsultar = document.createElement("button");
  btnConsultar.type = "button";
  btnConsultar.className = "btn-consultar";
  btnConsultar.textContent = "Consultar";

  const btnEditar = document.createElement("button");
  btnEditar.type = "button";
  btnEditar.className = "btn-editar";
  btnEditar.textContent = "Editar";
  btnEditar.disabled = !ehAdmin;
  if (!ehAdmin)
    btnEditar.title = "Apenas administradores podem editar professores";

  const btnExcluir = document.createElement("button");
  btnExcluir.type = "button";
  btnExcluir.className = "btn-excluir";
  btnExcluir.textContent = "Excluir";
  btnExcluir.disabled = !ehAdmin;
  if (!ehAdmin)
    btnExcluir.title = "Apenas administradores podem excluir professores";

  colAcoes.append(btnConsultar, btnEditar, btnExcluir);
  linha.append(colAcoes);
  return linha;
}

function filtrarProfessores() {
  const termo = pesquisarProfessor.value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  let encontrados = 0;
  listaProfessores.querySelectorAll("tr").forEach((linha) => {
    const nome = linha.dataset.nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const partes = nome.split(/\s+/);
    const ok =
      !termo ||
      nome.startsWith(termo) ||
      partes.some((p) => p.startsWith(termo));
    linha.hidden = !ok;
    if (ok) encontrados++;
  });
  nenhumProfessor.hidden = encontrados > 0;
  nenhumProfessor.textContent =
    professoresDoBanco.length === 0
      ? "Nenhum professor cadastrado no banco."
      : "Nenhum professor encontrado para esta pesquisa.";
  atualizarSelecaoProfessores();
}

pesquisarProfessor.addEventListener("input", filtrarProfessores);

async function carregarProfessores() {
  informarProfessor("Carregando professores do PostgreSQL...");
  try {
    const dados = await FitControlAPI.get("web/professores");
    if (!Array.isArray(dados))
      throw new Error("A API não retornou uma lista de professores.");
    professoresDoBanco = dados.sort((a, b) =>
      String(a.nome).localeCompare(String(b.nome), "pt-BR", {
        sensitivity: "base",
      }),
    );
    listaProfessores.replaceChildren();
    professoresDoBanco.forEach((prof) =>
      listaProfessores.append(montarLinhaProfessor(prof)),
    );
    filtrarProfessores();
    informarProfessor(
      `${professoresDoBanco.length} professor(es) carregado(s) do banco.`,
    );
  } catch (erro) {
    professoresDoBanco = [];
    listaProfessores.replaceChildren();
    nenhumProfessor.hidden = true;
    informarProfessor(
      `Não foi possível listar professores: ${erro.message}`,
      true,
    );
  }
}

function abrirFormularioNovoProfessor() {
  if (!ehAdmin) return;
  formProfessor.reset();
  limparErroProfessor();
  campoProfessorEmEdicao.value = "";
  document.getElementById("tituloFormularioProfessor").textContent =
    "Cadastrar professor";
  document.getElementById("descricaoFormularioProfessor").textContent =
    "Preencha as informações do novo professor.";
  if (labelSenhaProfessor) labelSenhaProfessor.textContent = "Senha de acesso";
  if (campoSenhaProfessor) {
    campoSenhaProfessor.required = true;
    campoSenhaProfessor.placeholder = "Mínimo de 6 caracteres";
  }
  campoStatusProfessor.value = "Ativo";
  campoStatusProfessor.disabled = true;
  modalProfessor.hidden = false;
  campoNomeProfessor.focus();
}

function abrirFormularioEditarProfessor(prof) {
  if (!ehAdmin) return;
  formProfessor.reset();
  limparErroProfessor();
  campoProfessorEmEdicao.value = String(prof.id);
  document.getElementById("tituloFormularioProfessor").textContent =
    "Editar professor";
  document.getElementById("descricaoFormularioProfessor").textContent =
    "Atualize os dados do professor no PostgreSQL.";
  campoNomeProfessor.value = prof.nome || "";
  campoEspecialidadeProfessor.value = prof.especialidade || "";
  if (campoCrefProfessor) campoCrefProfessor.value = prof.cref || "";
  campoEmailProfessor.value = prof.email || "";
  if (labelSenhaProfessor)
    labelSenhaProfessor.textContent =
      "Nova senha (opcional — deixe em branco para manter)";
  if (campoSenhaProfessor) {
    campoSenhaProfessor.required = false;
    campoSenhaProfessor.value = "";
    campoSenhaProfessor.placeholder = "Deixe em branco para manter a atual";
  }
  campoTelefoneProfessor.value = formatarTelefone(prof.telefone || "");
  campoStatusProfessor.value = prof.ativo === false ? "Inativo" : "Ativo";
  campoStatusProfessor.disabled = false;
  modalProfessor.hidden = false;
  campoNomeProfessor.focus();
}

function fecharFormularioProfessor() {
  modalProfessor.hidden = true;
  formProfessor.reset();
  limparErroProfessor();
  campoProfessorEmEdicao.value = "";
  btnNovoProfessor.focus();
}

btnNovoProfessor.addEventListener("click", abrirFormularioNovoProfessor);
cancelarProfessor.addEventListener("click", fecharFormularioProfessor);

formProfessor.addEventListener("submit", async function (event) {
  event.preventDefault();
  limparErroProfessor();

  const idEdicao = campoProfessorEmEdicao.value.trim();
  const editando = idEdicao !== "";
  const nome = campoNomeProfessor.value.trim();
  const especialidade = campoEspecialidadeProfessor.value.trim();
  const cref = campoCrefProfessor ? campoCrefProfessor.value.trim() : "";
  const email = campoEmailProfessor.value.trim().toLowerCase();
  const senha = campoSenhaProfessor ? campoSenhaProfessor.value : "";
  const telefone = campoTelefoneProfessor.value.replace(/\D/g, "");
  const ativo = campoStatusProfessor.value === "Ativo";

  if (!nome) {
    mostrarErroProfessor(
      "Informe o nome completo do professor.",
      campoNomeProfessor,
    );
    return;
  }
  if (!especialidade) {
    mostrarErroProfessor(
      "Informe a especialidade do professor.",
      campoEspecialidadeProfessor,
    );
    return;
  }
  if (!editando && (!senha || senha.length < 6)) {
    mostrarErroProfessor(
      "Informe uma senha inicial de pelo menos 6 caracteres.",
      campoSenhaProfessor,
    );
    return;
  }
  if (editando && senha && senha.length < 6) {
    mostrarErroProfessor(
      "A nova senha deve ter pelo menos 6 caracteres.",
      campoSenhaProfessor,
    );
    return;
  }
  if (telefone.length !== 11) {
    mostrarErroProfessor(
      "Informe um celular com DDD e 11 dígitos.",
      campoTelefoneProfessor,
    );
    return;
  }
  if (
    professoresDoBanco.some(
      (p) =>
        String(p.id) !== idEdicao && String(p.email).toLowerCase() === email,
    )
  ) {
    mostrarErroProfessor(
      "Este e-mail já está cadastrado para outro professor.",
      campoEmailProfessor,
    );
    return;
  }

  const botaoSalvar = document.getElementById("salvarProfessor");
  botaoSalvar.disabled = true;
  botaoSalvar.textContent = "Salvando...";

  try {
    const payload = {
      nome,
      especialidade,
      cref: cref || null,
      email,
      senha: senha || null,
      telefone,
      ativo,
    };
    if (editando) {
      await FitControlAPI.put(`web/professores/${idEdicao}`, payload);
      fecharFormularioProfessor();
      await carregarProfessores();
      informarProfessor("Professor atualizado no PostgreSQL com sucesso.");
    } else {
      await FitControlAPI.post("web/professores", payload);
      fecharFormularioProfessor();
      await carregarProfessores();
      informarProfessor("Professor cadastrado no PostgreSQL com sucesso.");
    }
  } catch (erro) {
    mostrarErroProfessor(`Não foi possível salvar: ${erro.message}`, null);
  } finally {
    botaoSalvar.disabled = false;
    botaoSalvar.textContent = "Salvar professor";
  }
});

function abrirModalExcluirProfessores(ids, nomeProf) {
  if (!ehAdmin || ids.length === 0) return;
  idsProfessoresExcluir = ids;
  const titulo = document.getElementById("tituloExcluirProfessor");
  const msg = document.getElementById("mensagemExcluirProfessor");
  if (ids.length === 1) {
    titulo.textContent = "Excluir professor";
    msg.innerHTML = `Tem certeza de que deseja excluir o professor <strong id="nomeProfessorExcluir"></strong>?`;
    document.getElementById("nomeProfessorExcluir").textContent = nomeProf;
  } else {
    titulo.textContent = "Excluir professores selecionados";
    msg.innerHTML = `Tem certeza de que deseja excluir <span class="quantidade-professores-excluir">${ids.length} professores</span> selecionados?`;
  }
  modalExcluirProfessor.hidden = false;
  cancelarExclusaoProfessor.focus();
}

function fecharModalExcluirProfessores() {
  modalExcluirProfessor.hidden = true;
  idsProfessoresExcluir = [];
}

cancelarExclusaoProfessor.addEventListener(
  "click",
  fecharModalExcluirProfessores,
);

confirmarExclusaoProfessor.addEventListener("click", async function () {
  if (idsProfessoresExcluir.length === 0) return;
  confirmarExclusaoProfessor.disabled = true;
  confirmarExclusaoProfessor.textContent = "Excluindo...";
  try {
    for (const id of idsProfessoresExcluir) {
      await FitControlAPI.del(`web/professores/${id}`);
    }
    const total = idsProfessoresExcluir.length;
    fecharModalExcluirProfessores();
    await carregarProfessores();
    informarProfessor(
      `${total} professor(es) desativado(s) no PostgreSQL com sucesso.`,
    );
  } catch (erro) {
    fecharModalExcluirProfessores();
    informarProfessor(`Erro ao excluir professor(es): ${erro.message}`, true);
  } finally {
    confirmarExclusaoProfessor.disabled = false;
    confirmarExclusaoProfessor.textContent = "Sim, excluir";
  }
});

btnExcluirSelecionadosProfessores.addEventListener("click", function () {
  const selecionados = Array.from(
    listaProfessores.querySelectorAll(".checkbox-professor:checked"),
  ).map((cb) => cb.closest("tr").dataset.id);
  abrirModalExcluirProfessores(selecionados, "");
});

if (selecionarTodosProfessores) {
  selecionarTodosProfessores.addEventListener("change", function () {
    const marcar = selecionarTodosProfessores.checked;
    listaProfessores
      .querySelectorAll("tr:not([hidden]) .checkbox-professor:not(:disabled)")
      .forEach((cb) => {
        cb.checked = marcar;
      });
    atualizarSelecaoProfessores();
  });
}

listaProfessores.addEventListener("click", function (event) {
  const linha = event.target.closest("tr");
  if (!linha) return;
  const prof = professoresDoBanco.find(
    (p) => String(p.id) === linha.dataset.id,
  );
  if (!prof) return;

  if (event.target.closest(".btn-consultar")) {
    document.getElementById("consultaNomeProfessor").textContent =
      prof.nome || "Não informado";
    document.getElementById("consultaEspecialidadeProfessor").textContent =
      prof.especialidade || "Não informada";
    const crefEl = document.getElementById("consultaCrefProfessor");
    if (crefEl) crefEl.textContent = prof.cref || "Não informado";
    document.getElementById("consultaEmailProfessor").textContent =
      prof.email || "Não informado";
    document.getElementById("consultaTelefoneProfessor").textContent =
      prof.telefone ? formatarTelefone(prof.telefone) : "Não informado";
    document.getElementById("consultaStatusProfessor").textContent =
      prof.ativo === false ? "Inativo" : "Ativo";
    modalConsultaProfessor.hidden = false;
    document.getElementById("fecharConsultaProfessor").focus();
    return;
  }

  if (event.target.closest(".btn-editar")) {
    abrirFormularioEditarProfessor(prof);
    return;
  }

  if (event.target.closest(".btn-excluir")) {
    abrirModalExcluirProfessores([String(prof.id)], prof.nome);
  }
});

document
  .getElementById("fecharConsultaProfessor")
  .addEventListener("click", function () {
    modalConsultaProfessor.hidden = true;
  });

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    if (!modalConsultaProfessor.hidden) modalConsultaProfessor.hidden = true;
    if (!modalProfessor.hidden) fecharFormularioProfessor();
    if (!modalExcluirProfessor.hidden) fecharModalExcluirProfessores();
  }
});

if (!ehAdmin) {
  btnNovoProfessor.disabled = true;
  btnNovoProfessor.title = "Apenas administradores podem cadastrar professores";
  btnExcluirSelecionadosProfessores.disabled = true;
  if (selecionarTodosProfessores) {
    selecionarTodosProfessores.disabled = true;
    selecionarTodosProfessores.title =
      "Apenas administradores podem selecionar professores";
  }
}

carregarProfessores();
