"use strict";

const btnNovoAluno = document.getElementById("btnNovoAluno");
const modalAluno = document.getElementById("modalAluno");
const cancelarAluno = document.getElementById("cancelarAluno");
const formAluno = document.getElementById("formAluno");
const mensagemErroAluno = document.getElementById("mensagemErroAluno");
const statusApiAlunos = document.getElementById("statusApiAlunos");
const listaAlunos = document.getElementById("listaAlunos");
const buscarAluno = document.getElementById("buscarAluno");
const filtroStatusAluno = document.getElementById("filtroStatusAluno");
const campoAlunoEmEdicao = document.getElementById("alunoEmEdicao");
const campoCpf = document.getElementById("cpfAluno");
const campoTelefone = document.getElementById("telefoneAluno");
const campoSenha = document.getElementById("senhaAluno");
const labelSenhaAluno =
  document.getElementById("labelSenhaAluno") ||
  document.querySelector('label[for="senhaAluno"]');
const campoPlano = document.getElementById("planoAluno");
const campoStatus = document.getElementById("statusAluno");
const modalConsulta = document.getElementById("modalConsulta");
const modalExcluir = document.getElementById("modalExcluir");
const cancelarExclusao = document.getElementById("cancelarExclusao");
const confirmarExclusao = document.getElementById("confirmarExclusao");
const btnExcluirSelecionadosAlunos = document.getElementById(
  "btnExcluirSelecionadosAlunos",
);
const selecionarTodosAlunos = document.getElementById("selecionarTodosAlunos");

const ehAdmin =
  (sessionStorage.getItem("fitcontrolPerfil") || "").toLowerCase() === "admin";

let alunosDoBanco = [];
let planosDoBanco = [];
let planosCarregados = false;
let idsParaExcluir = [];

function informar(mensagem, erro = false) {
  statusApiAlunos.textContent = mensagem;
  statusApiAlunos.style.color = erro ? "#ff8585" : "#89d6a2";
  statusApiAlunos.style.margin = "12px 0";
}

function mostrarErroAluno(mensagem, campo) {
  mensagemErroAluno.textContent = mensagem;
  mensagemErroAluno.hidden = false;
  if (campo) campo.focus();
}

function limparErroAluno() {
  mensagemErroAluno.textContent = "";
  mensagemErroAluno.hidden = true;
}

function formatarCPF(valor) {
  const digitos = String(valor ?? "")
    .replace(/\D/g, "")
    .slice(0, 11);
  if (digitos.length <= 3) return digitos;
  if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
  if (digitos.length <= 9)
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
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

function formatarStatusAluno(aluno) {
  return aluno.ativo === false ? "Inativo" : "Ativo";
}

campoCpf.addEventListener("input", function () {
  campoCpf.value = formatarCPF(campoCpf.value);
  limparErroAluno();
});

campoTelefone.addEventListener("input", function () {
  campoTelefone.value = formatarTelefone(campoTelefone.value);
  limparErroAluno();
});

document
  .getElementById("emailAluno")
  .addEventListener("input", limparErroAluno);
campoSenha.addEventListener("input", limparErroAluno);

function fecharFormulario() {
  modalAluno.hidden = true;
  formAluno.reset();
  limparErroAluno();
  campoAlunoEmEdicao.value = "";
  btnNovoAluno.focus();
}

function abrirFormularioCadastro() {
  if (!ehAdmin) return;
  if (
    !planosCarregados ||
    planosDoBanco.filter((p) => p.ativo !== false).length === 0
  ) {
    informar(
      "É necessário carregar os planos da API antes de cadastrar alunos.",
      true,
    );
    return;
  }
  formAluno.reset();
  limparErroAluno();
  campoAlunoEmEdicao.value = "";
  document.getElementById("tituloFormulario").textContent = "Cadastrar aluno";
  document.getElementById("descricaoFormulario").textContent =
    "Os dados serão salvos no PostgreSQL. Informe também a senha inicial do aplicativo.";
  labelSenhaAluno.textContent = "Senha inicial do aluno (para o aplicativo)";
  campoSenha.required = true;
  campoSenha.placeholder = "Mínimo de 6 caracteres";
  campoStatus.value = "Ativo";
  campoStatus.disabled = true;
  modalAluno.hidden = false;
  document.getElementById("nomeAluno").focus();
}

function abrirFormularioEdicao(aluno) {
  if (!ehAdmin) return;
  formAluno.reset();
  limparErroAluno();
  campoAlunoEmEdicao.value = String(aluno.id);
  document.getElementById("tituloFormulario").textContent = "Editar aluno";
  document.getElementById("descricaoFormulario").textContent =
    "Atualize os dados do aluno no PostgreSQL.";
  document.getElementById("nomeAluno").value = aluno.nome || "";
  document.getElementById("emailAluno").value = aluno.email || "";
  campoCpf.value = formatarCPF(aluno.cpf || "");
  campoTelefone.value = formatarTelefone(aluno.telefone || "");
  labelSenhaAluno.textContent =
    "Nova senha (opcional — deixe em branco para manter)";
  campoSenha.required = false;
  campoSenha.value = "";
  campoSenha.placeholder = "Deixe em branco para manter a atual";

  if (aluno.plano_id) {
    campoPlano.value = String(aluno.plano_id);
  } else if (aluno.plano) {
    const encontrado = planosDoBanco.find(
      (p) => String(p.nome).toLowerCase() === String(aluno.plano).toLowerCase(),
    );
    campoPlano.value = encontrado ? String(encontrado.id) : "";
  } else {
    campoPlano.value = "";
  }

  campoStatus.value = aluno.ativo === false ? "Inativo" : "Ativo";
  campoStatus.disabled = false;
  modalAluno.hidden = false;
  document.getElementById("nomeAluno").focus();
}

btnNovoAluno.addEventListener("click", abrirFormularioCadastro);
cancelarAluno.addEventListener("click", fecharFormulario);

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    if (!modalAluno.hidden) fecharFormulario();
    if (!modalConsulta.hidden) modalConsulta.hidden = true;
    if (!modalExcluir.hidden) fecharModalExcluir();
  }
});

function celula(texto) {
  const td = document.createElement("td");
  td.textContent = texto ?? "";
  return td;
}

function valorCPFExibicao(cpf) {
  const bruto = String(cpf ?? "");
  return /^\d{11}$/.test(bruto) ? formatarCPF(bruto) : bruto || "Não informado";
}

function atualizarEstadoSelecao() {
  const checkboxesVisiveis = Array.from(
    listaAlunos.querySelectorAll("tr:not([hidden]) .checkbox-aluno"),
  );
  const marcados = checkboxesVisiveis.filter((cb) => cb.checked);
  btnExcluirSelecionadosAlunos.disabled = !ehAdmin || marcados.length === 0;
  if (selecionarTodosAlunos) {
    selecionarTodosAlunos.disabled =
      !ehAdmin || checkboxesVisiveis.length === 0;
    selecionarTodosAlunos.checked =
      checkboxesVisiveis.length > 0 &&
      marcados.length === checkboxesVisiveis.length;
    selecionarTodosAlunos.indeterminate =
      marcados.length > 0 && marcados.length < checkboxesVisiveis.length;
  }
}

function montarLinha(aluno) {
  const linha = document.createElement("tr");
  linha.dataset.id = String(aluno.id);
  linha.dataset.cpf = String(aluno.cpf ?? "");
  linha.dataset.telefone = String(aluno.telefone ?? "");
  linha.dataset.nome = String(aluno.nome ?? "");
  linha.dataset.ativo = aluno.ativo === false ? "false" : "true";

  const colunaCheckbox = document.createElement("td");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "checkbox-aluno";
  checkbox.disabled = !ehAdmin;
  checkbox.setAttribute("aria-label", `Selecionar ${aluno.nome}`);
  checkbox.addEventListener("change", atualizarEstadoSelecao);
  colunaCheckbox.append(checkbox);
  linha.append(colunaCheckbox);

  linha.append(celula(aluno.nome));
  linha.append(celula(aluno.email));
  linha.append(celula(aluno.plano || "Sem plano"));
  linha.append(celula(formatarStatusAluno(aluno)));

  const colunaAcoes = document.createElement("td");
  const btnConsultar = document.createElement("button");
  btnConsultar.type = "button";
  btnConsultar.className = "btn-consultar";
  btnConsultar.textContent = "Consultar";

  const btnEditar = document.createElement("button");
  btnEditar.type = "button";
  btnEditar.className = "btn-editar";
  btnEditar.textContent = "Editar";
  btnEditar.disabled = !ehAdmin;
  if (!ehAdmin) btnEditar.title = "Apenas administradores podem editar alunos";

  const btnExcluir = document.createElement("button");
  btnExcluir.type = "button";
  btnExcluir.className = "btn-excluir";
  btnExcluir.textContent = "Excluir";
  btnExcluir.disabled = !ehAdmin;
  if (!ehAdmin)
    btnExcluir.title = "Apenas administradores podem excluir alunos";

  colunaAcoes.append(btnConsultar, btnEditar, btnExcluir);
  linha.append(colunaAcoes);
  return linha;
}

function atualizarPesquisa() {
  const pesquisa = buscarAluno.value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const statusFiltro = filtroStatusAluno ? filtroStatusAluno.value : "todos";

  let encontrados = 0;
  listaAlunos.querySelectorAll("tr").forEach((linha) => {
    const nome = linha.dataset.nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const partes = nome.split(/\s+/);
    const correspondeNome =
      !pesquisa ||
      nome.startsWith(pesquisa) ||
      partes.some((parte) => parte.startsWith(pesquisa));

    const ehAtivo = linha.dataset.ativo !== "false";
    const correspondeStatus =
      statusFiltro === "todos" ||
      (statusFiltro === "ativos" && ehAtivo) ||
      (statusFiltro === "inativos" && !ehAtivo);

    const visivel = correspondeNome && correspondeStatus;
    linha.hidden = !visivel;
    if (!visivel) {
      const cb = linha.querySelector(".checkbox-aluno");
      if (cb) cb.checked = false;
    } else {
      encontrados++;
    }
  });

  const semAlunos = document.getElementById("nenhumAluno");
  semAlunos.hidden = encontrados > 0;
  semAlunos.textContent =
    alunosDoBanco.length === 0
      ? "Nenhum aluno cadastrado no banco."
      : "Nenhum aluno encontrado para os filtros selecionados.";
  atualizarEstadoSelecao();
}

buscarAluno.addEventListener("input", atualizarPesquisa);
if (filtroStatusAluno) {
  filtroStatusAluno.addEventListener("change", atualizarPesquisa);
}

selecionarTodosAlunos.addEventListener("change", function () {
  const marcar = selecionarTodosAlunos.checked;
  listaAlunos
    .querySelectorAll("tr:not([hidden]) .checkbox-aluno:not(:disabled)")
    .forEach((cb) => {
      cb.checked = marcar;
    });
  atualizarEstadoSelecao();
});

async function carregarAlunos() {
  informar("Carregando alunos do PostgreSQL...");
  try {
    const dados = await FitControlAPI.get("web/alunos");
    if (!Array.isArray(dados))
      throw new Error("A API não retornou uma lista de alunos.");
    alunosDoBanco = dados;
    listaAlunos.replaceChildren();
    alunosDoBanco.sort((a, b) =>
      String(a.nome).localeCompare(String(b.nome), "pt-BR", {
        sensitivity: "base",
      }),
    );
    alunosDoBanco.forEach((aluno) => listaAlunos.append(montarLinha(aluno)));
    atualizarPesquisa();
    informar(`${alunosDoBanco.length} aluno(s) carregado(s) do banco.`);
  } catch (erro) {
    alunosDoBanco = [];
    listaAlunos.replaceChildren();
    document.getElementById("nenhumAluno").hidden = true;
    informar(`Não foi possível listar alunos: ${erro.message}`, true);
  }
}

async function carregarPlanos() {
  planosCarregados = false;
  campoPlano.replaceChildren(new Option("Carregando planos...", ""));
  try {
    const dados = await FitControlAPI.get("web/planos");
    if (!Array.isArray(dados)) throw new Error("A API não retornou os planos.");
    planosDoBanco = dados;
    campoPlano.replaceChildren(new Option("Selecione um plano", ""));
    planosDoBanco
      .filter((plano) => plano.ativo !== false)
      .forEach((plano) => {
        campoPlano.append(new Option(plano.nome, String(plano.id)));
      });
    planosCarregados = true;
  } catch (erro) {
    planosDoBanco = [];
    campoPlano.replaceChildren(new Option("Planos indisponíveis", ""));
    informar(`Não foi possível carregar planos: ${erro.message}`, true);
  }
}

function cpfJaCadastrado(cpf, ignorarId = null) {
  return alunosDoBanco.some(
    (aluno) =>
      String(aluno.id) !== String(ignorarId) &&
      String(aluno.cpf ?? "").replace(/\D/g, "") === cpf,
  );
}

formAluno.addEventListener("submit", async function (event) {
  event.preventDefault();
  limparErroAluno();

  const idEdicao = campoAlunoEmEdicao.value.trim();
  const editando = idEdicao !== "";
  const nome = document.getElementById("nomeAluno").value.trim();
  const email = document
    .getElementById("emailAluno")
    .value.trim()
    .toLowerCase();
  const cpf = campoCpf.value.replace(/\D/g, "");
  const telefone = campoTelefone.value.replace(/\D/g, "");
  const senha = campoSenha.value;
  const planoId = Number(campoPlano.value);
  const ativo = campoStatus.value === "Ativo";

  if (cpf.length !== 11) {
    mostrarErroAluno("O CPF deve conter exatamente 11 números.", campoCpf);
    return;
  }
  if (telefone.length !== 11) {
    mostrarErroAluno("Informe um celular com DDD e 11 dígitos.", campoTelefone);
    return;
  }
  if (!editando && (!senha || senha.length < 6)) {
    mostrarErroAluno(
      "Informe uma senha inicial de pelo menos 6 caracteres.",
      campoSenha,
    );
    return;
  }
  if (editando && senha && senha.length < 6) {
    mostrarErroAluno(
      "A nova senha deve ter pelo menos 6 caracteres.",
      campoSenha,
    );
    return;
  }
  if (ativo && (!Number.isInteger(planoId) || planoId < 1)) {
    mostrarErroAluno("Selecione um plano da API.", campoPlano);
    return;
  }
  if (
    alunosDoBanco.some(
      (aluno) =>
        String(aluno.id) !== idEdicao &&
        String(aluno.email).toLowerCase() === email,
    )
  ) {
    mostrarErroAluno(
      "Este e-mail já está cadastrado para outro aluno.",
      document.getElementById("emailAluno"),
    );
    return;
  }
  if (cpfJaCadastrado(cpf, idEdicao)) {
    mostrarErroAluno("Este CPF já está cadastrado para outro aluno.", campoCpf);
    return;
  }
  if (
    alunosDoBanco.some(
      (aluno) =>
        String(aluno.id) !== idEdicao &&
        String(aluno.telefone ?? "").replace(/\D/g, "") === telefone,
    )
  ) {
    mostrarErroAluno(
      "Este celular já está cadastrado para outro aluno.",
      campoTelefone,
    );
    return;
  }

  const botaoSalvar = formAluno.querySelector('button[type="submit"]');
  botaoSalvar.disabled = true;
  botaoSalvar.textContent = "Salvando...";

  try {
    if (editando) {
      await FitControlAPI.put(`web/alunos/${idEdicao}`, {
        nome,
        email,
        senha: senha || null,
        cpf,
        telefone,
        plano_id: ativo ? planoId : null,
        ativo,
      });
      fecharFormulario();
      await carregarAlunos();
      informar("Dados do aluno atualizados no PostgreSQL com sucesso.");
    } else {
      const criado = await FitControlAPI.post("web/alunos", {
        nome,
        email,
        senha,
        cpf,
        telefone,
        data_nascimento: null,
      });
      try {
        if (!criado || !criado.alunoId)
          throw new Error("O cadastro não devolveu alunoId.");
        await FitControlAPI.post("web/matriculas", {
          aluno_id: Number(criado.alunoId),
          plano_id: planoId,
        });
        fecharFormulario();
        await carregarAlunos();
        informar("Aluno e matrícula cadastrados no PostgreSQL com sucesso.");
      } catch (erroMatricula) {
        fecharFormulario();
        await carregarAlunos();
        informar(
          `O aluno foi criado, mas a matrícula não foi concluída: ${erroMatricula.message}. Não cadastre este aluno novamente.`,
          true,
        );
      }
    }
  } catch (erro) {
    mostrarErroAluno(`Não foi possível salvar: ${erro.message}`, null);
  } finally {
    botaoSalvar.disabled = false;
    botaoSalvar.textContent = "Salvar aluno";
  }
});

function abrirModalExcluir(ids, descricaoNome) {
  if (!ehAdmin || ids.length === 0) return;
  idsParaExcluir = ids;
  const titulo = document.getElementById("tituloExcluirAluno");
  const msg = document.getElementById("mensagemExcluirAluno");
  if (ids.length === 1) {
    titulo.textContent = "Excluir aluno";
    msg.innerHTML = `Tem certeza que deseja excluir o aluno <strong id="nomeAlunoExcluir"></strong>?`;
    document.getElementById("nomeAlunoExcluir").textContent = descricaoNome;
  } else {
    titulo.textContent = "Excluir alunos selecionados";
    msg.innerHTML = `Tem certeza que deseja excluir <span class="quantidade-alunos-excluir">${ids.length} alunos</span> selecionados?`;
  }
  modalExcluir.hidden = false;
  cancelarExclusao.focus();
}

function fecharModalExcluir() {
  modalExcluir.hidden = true;
  idsParaExcluir = [];
}

cancelarExclusao.addEventListener("click", fecharModalExcluir);

confirmarExclusao.addEventListener("click", async function () {
  if (idsParaExcluir.length === 0) return;
  confirmarExclusao.disabled = true;
  confirmarExclusao.textContent = "Excluindo...";
  try {
    for (const id of idsParaExcluir) {
      await FitControlAPI.del(`web/alunos/${id}`);
    }
    const total = idsParaExcluir.length;
    fecharModalExcluir();
    await carregarAlunos();
    informar(`${total} aluno(s) desativado(s) no PostgreSQL com sucesso.`);
  } catch (erro) {
    fecharModalExcluir();
    informar(`Erro ao excluir aluno(s): ${erro.message}`, true);
  } finally {
    confirmarExclusao.disabled = false;
    confirmarExclusao.textContent = "Sim, excluir";
  }
});

btnExcluirSelecionadosAlunos.addEventListener("click", function () {
  const selecionados = Array.from(
    listaAlunos.querySelectorAll(".checkbox-aluno:checked"),
  ).map((cb) => cb.closest("tr").dataset.id);
  abrirModalExcluir(selecionados, "");
});

listaAlunos.addEventListener("click", function (event) {
  const linha = event.target.closest("tr");
  if (!linha) return;
  const aluno = alunosDoBanco.find(
    (item) => String(item.id) === linha.dataset.id,
  );
  if (!aluno) return;

  if (event.target.closest(".btn-consultar")) {
    document.getElementById("consultaNome").textContent =
      aluno.nome || "Não informado";
    document.getElementById("consultaEmail").textContent =
      aluno.email || "Não informado";
    document.getElementById("consultaCpf").textContent = valorCPFExibicao(
      aluno.cpf,
    );
    document.getElementById("consultaTelefone").textContent = aluno.telefone
      ? formatarTelefone(aluno.telefone)
      : "Não informado";
    document.getElementById("consultaPlano").textContent =
      aluno.plano || "Sem plano";
    document.getElementById("consultaStatus").textContent =
      formatarStatusAluno(aluno);
    modalConsulta.hidden = false;
    document.getElementById("fecharConsulta").focus();
    return;
  }

  if (event.target.closest(".btn-editar")) {
    abrirFormularioEdicao(aluno);
    return;
  }

  if (event.target.closest(".btn-excluir")) {
    abrirModalExcluir([String(aluno.id)], aluno.nome);
  }
});

document
  .getElementById("fecharConsulta")
  .addEventListener("click", function () {
    modalConsulta.hidden = true;
  });

if (!ehAdmin) {
  btnNovoAluno.disabled = true;
  btnNovoAluno.title =
    "A política do banco permite cadastrar alunos apenas para administradores";
  btnExcluirSelecionadosAlunos.disabled = true;
  if (selecionarTodosAlunos) selecionarTodosAlunos.disabled = true;
  informar(
    "Sua conta de professor pode consultar alunos, mas o banco exige perfil de administrador para alterações.",
    true,
  );
}

(async function () {
  await carregarPlanos();
  await carregarAlunos();
})();
