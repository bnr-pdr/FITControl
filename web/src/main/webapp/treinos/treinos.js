"use strict";

const buscarAlunoTreino = document.getElementById("buscarAlunoTreino");
const statusApiTreinos = document.getElementById("statusApiTreinos");
const listaAlunosTreinos = document.getElementById("listaAlunosTreinos");
const nenhumAlunoTreino = document.getElementById("nenhumAlunoTreino");

const modalTreinosAluno = document.getElementById("modalTreinosAluno");
const fecharModalTreinos = document.getElementById("fecharModalTreinos");
const tituloModalTreinos = document.getElementById("tituloModalTreinos");
const subtituloModalTreinos = document.getElementById("subtituloModalTreinos");
const abasTreinosAluno = document.getElementById("abasTreinosAluno");
const btnCriarProximaFicha = document.getElementById("btnCriarProximaFicha");
const btnExcluirFichaAtual = document.getElementById("btnExcluirFichaAtual");
const statusModalTreino = document.getElementById("statusModalTreino");

const conteudoFichaSelecionada = document.getElementById(
  "conteudoFichaSelecionada",
);
const estadoSemFichas = document.getElementById("estadoSemFichas");
const nomeFichaAtiva = document.getElementById("nomeFichaAtiva");
const infoFichaAtiva = document.getElementById("infoFichaAtiva");
const listaExerciciosFicha = document.getElementById("listaExerciciosFicha");
const semExerciciosFicha = document.getElementById("semExerciciosFicha");

const formExercicioFicha = document.getElementById("formExercicioFicha");
const tituloFormExercicio = document.getElementById("tituloFormExercicio");
const itemExercicioEmEdicao = document.getElementById("itemExercicioEmEdicao");
const nomeExercicioInput = document.getElementById("nomeExercicioInput");
const localExercicioInput = document.getElementById("localExercicioInput");
const seriesExercicioInput = document.getElementById("seriesExercicioInput");
const repeticoesExercicioInput = document.getElementById(
  "repeticoesExercicioInput",
);
const descansoExercicioInput = document.getElementById(
  "descansoExercicioInput",
);
const catalogoExerciciosList = document.getElementById(
  "catalogoExerciciosList",
);
const mensagemErroExercicio = document.getElementById("mensagemErroExercicio");
const cancelarEdicaoExercicio = document.getElementById(
  "cancelarEdicaoExercicio",
);
const btnSalvarExercicio = document.getElementById("btnSalvarExercicio");

const modalConfirmarExclusaoFicha = document.getElementById(
  "modalConfirmarExclusaoFicha",
);
const nomeFichaExcluirTexto = document.getElementById("nomeFichaExcluirTexto");
const cancelarExclusaoFicha = document.getElementById("cancelarExclusaoFicha");
const confirmarExclusaoFicha = document.getElementById(
  "confirmarExclusaoFicha",
);

const FICHAS_PERMITIDAS = ["Treino A", "Treino B", "Treino C"];

let resumoAlunos = [];
let catalogoExercicios = [];
let alunoAtualId = null;
let dadosAlunoModal = null;
let treinoSelecionadoId = null;

function informarPagina(texto, erro = false) {
  statusApiTreinos.textContent = texto;
  statusApiTreinos.style.color = erro ? "#ff8585" : "#89d6a2";
  statusApiTreinos.style.margin = "10px 0 16px";
}

function informarModal(texto, erro = false) {
  statusModalTreino.textContent = texto;
  statusModalTreino.style.color = erro ? "#ff8585" : "#89d6a2";
  statusModalTreino.style.margin = texto ? "0 0 14px" : "0";
}

function mostrarErroExercicio(texto, campo) {
  mensagemErroExercicio.textContent = texto;
  mensagemErroExercicio.hidden = false;
  if (campo) campo.focus();
}

function limparErroExercicio() {
  mensagemErroExercicio.textContent = "";
  mensagemErroExercicio.hidden = true;
}

function capitalizarTexto(texto) {
  const s = String(texto ?? "").trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatarDataCriacao(iso) {
  if (!iso) return "";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleDateString("pt-BR");
}

function celula(texto) {
  const td = document.createElement("td");
  td.textContent = texto ?? "";
  return td;
}

// ==================== CATALOGO DE EXERCICIOS ====================

async function carregarCatalogoExercicios() {
  try {
    const lista = await FitControlAPI.get("web/exercicios");
    catalogoExercicios = Array.isArray(lista) ? lista : [];
    catalogoExerciciosList.replaceChildren();
    catalogoExercicios.forEach((ex) => {
      const opt = document.createElement("option");
      opt.value = ex.nome;
      if (ex.grupo_muscular) {
        opt.label = `${ex.nome} (${capitalizarTexto(ex.grupo_muscular)})`;
      }
      catalogoExerciciosList.append(opt);
    });
  } catch (_) {
    catalogoExercicios = [];
  }
}

nomeExercicioInput.addEventListener("input", function () {
  limparErroExercicio();
  const digitado = nomeExercicioInput.value.trim().toLowerCase();
  if (!digitado) return;
  const encontrado = catalogoExercicios.find(
    (e) => String(e.nome).trim().toLowerCase() === digitado,
  );
  if (
    encontrado &&
    encontrado.grupo_muscular &&
    !localExercicioInput.value.trim()
  ) {
    localExercicioInput.value = capitalizarTexto(encontrado.grupo_muscular);
  }
});

[
  localExercicioInput,
  seriesExercicioInput,
  repeticoesExercicioInput,
  descansoExercicioInput,
].forEach((campo) => campo.addEventListener("input", limparErroExercicio));

// ==================== LISTAGEM PRINCIPAL DE ALUNOS ====================

function montarLinhaAlunoTreino(item) {
  const tr = document.createElement("tr");
  tr.dataset.alunoId = String(item.aluno_id);
  tr.dataset.nome = String(item.aluno_nome ?? "");

  tr.append(celula(item.aluno_nome));
  tr.append(celula(item.objetivo || "Não informado"));

  const tdTreinos = document.createElement("td");
  const resumo = String(item.treinos_resumo || "").trim();
  const badge = document.createElement("span");
  if (resumo) {
    badge.className = "badge-treinos";
    badge.textContent = resumo;
  } else {
    badge.className = "badge-sem-treino";
    badge.textContent = "Sem fichas";
  }
  tdTreinos.append(badge);
  tr.append(tdTreinos);

  tr.append(celula(item.professor_responsavel || "—"));

  const tdAcoes = document.createElement("td");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn-gerenciar-treino";
  btn.textContent = "Consultar / Editar Treinos";
  btn.addEventListener("click", () => abrirModalTreinosDoAluno(item.aluno_id));
  tdAcoes.append(btn);
  tr.append(tdAcoes);

  return tr;
}

function filtrarAlunosTreino() {
  const termo = buscarAlunoTreino.value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  let visiveis = 0;
  listaAlunosTreinos.querySelectorAll("tr").forEach((linha) => {
    const nome = linha.dataset.nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const ok = !termo || nome.includes(termo);
    linha.hidden = !ok;
    if (ok) visiveis++;
  });

  nenhumAlunoTreino.hidden = visiveis > 0;
  nenhumAlunoTreino.textContent =
    resumoAlunos.length === 0
      ? "Nenhum aluno ativo cadastrado no sistema."
      : "Nenhum aluno encontrado para esta pesquisa.";
}

buscarAlunoTreino.addEventListener("input", filtrarAlunosTreino);

async function carregarResumoAlunos() {
  informarPagina("Carregando alunos e fichas de treino...");
  try {
    const dados = await FitControlAPI.get("web/treinos/resumo-alunos");
    resumoAlunos = Array.isArray(dados) ? dados : [];
    listaAlunosTreinos.replaceChildren();
    resumoAlunos.forEach((item) =>
      listaAlunosTreinos.append(montarLinhaAlunoTreino(item)),
    );
    filtrarAlunosTreino();
    informarPagina(`${resumoAlunos.length} aluno(s) carregado(s).`);
  } catch (erro) {
    resumoAlunos = [];
    listaAlunosTreinos.replaceChildren();
    informarPagina(
      `Não foi possível carregar os treinos: ${erro.message}`,
      true,
    );
  }
}

// ==================== MODAL DE FICHAS DO ALUNO ====================

function obterProximaFichaDisponivel(treinos) {
  const existentes = new Set(
    treinos.map((t) =>
      String(t.nome || "")
        .trim()
        .toLowerCase(),
    ),
  );
  return (
    FICHAS_PERMITIDAS.find((nome) => !existentes.has(nome.toLowerCase())) ||
    null
  );
}

function resetarFormularioExercicio() {
  formExercicioFicha.reset();
  itemExercicioEmEdicao.value = "";
  seriesExercicioInput.value = "3";
  descansoExercicioInput.value = "60";
  tituloFormExercicio.textContent = "Adicionar exercício na ficha";
  btnSalvarExercicio.textContent = "+ Adicionar exercício";
  cancelarEdicaoExercicio.hidden = true;
  limparErroExercicio();
}

function preencherEdicaoExercicio(ex) {
  itemExercicioEmEdicao.value = String(ex.id);
  nomeExercicioInput.value = ex.exercicio || "";
  localExercicioInput.value = capitalizarTexto(ex.grupo_muscular || "");
  seriesExercicioInput.value = String(ex.series ?? 3);
  repeticoesExercicioInput.value = ex.repeticoes || "12";
  descansoExercicioInput.value = String(ex.descanso_seg ?? 60);

  tituloFormExercicio.textContent = `Editando: ${ex.exercicio}`;
  btnSalvarExercicio.textContent = "Salvar alterações";
  cancelarEdicaoExercicio.hidden = false;
  limparErroExercicio();
  nomeExercicioInput.focus();
}

cancelarEdicaoExercicio.addEventListener("click", resetarFormularioExercicio);

function renderizarModalTreinos() {
  if (!dadosAlunoModal) return;

  const aluno = dadosAlunoModal.aluno || {};
  const treinos = Array.isArray(dadosAlunoModal.treinos)
    ? dadosAlunoModal.treinos
    : [];

  tituloModalTreinos.textContent = `Treinos de ${aluno.nome || "Aluno"}`;
  subtituloModalTreinos.textContent = aluno.objetivo
    ? `Objetivo: ${aluno.objetivo} · ${aluno.email || ""}`
    : aluno.email || "";

  // Botão "+ Criar Treino A / B / C"
  const proximaFicha = obterProximaFichaDisponivel(treinos);
  if (proximaFicha) {
    btnCriarProximaFicha.hidden = false;
    btnCriarProximaFicha.disabled = false;
    btnCriarProximaFicha.textContent = `+ Criar ${proximaFicha}`;
    btnCriarProximaFicha.dataset.nomeFicha = proximaFicha;
  } else {
    btnCriarProximaFicha.hidden = true;
  }

  // Abas das fichas
  abasTreinosAluno.replaceChildren();
  treinos.forEach((t) => {
    const btnAba = document.createElement("button");
    btnAba.type = "button";
    btnAba.className = "aba-treino-btn";
    btnAba.textContent = t.nome;
    if (String(t.id) === String(treinoSelecionadoId)) {
      btnAba.classList.add("ativa");
    }
    btnAba.addEventListener("click", () => {
      treinoSelecionadoId = t.id;
      resetarFormularioExercicio();
      informarModal("");
      renderizarModalTreinos();
    });
    abasTreinosAluno.append(btnAba);
  });

  if (treinos.length === 0) {
    conteudoFichaSelecionada.hidden = true;
    estadoSemFichas.hidden = false;
    btnExcluirFichaAtual.hidden = true;
    return;
  }

  estadoSemFichas.hidden = true;
  conteudoFichaSelecionada.hidden = false;
  btnExcluirFichaAtual.hidden = false;

  const fichaAtual =
    treinos.find((t) => String(t.id) === String(treinoSelecionadoId)) ||
    treinos[0];
  treinoSelecionadoId = fichaAtual.id;

  nomeFichaAtiva.textContent = fichaAtual.nome;
  const partesMeta = [];
  if (fichaAtual.professor_nome) {
    partesMeta.push(`Última edição por: ${fichaAtual.professor_nome}`);
  }
  const dataCriacao = formatarDataCriacao(fichaAtual.criado_em);
  if (dataCriacao) {
    partesMeta.push(`Criado em: ${dataCriacao}`);
  }
  infoFichaAtiva.textContent = partesMeta.join(" · ");

  const exercicios = Array.isArray(fichaAtual.exercicios)
    ? fichaAtual.exercicios
    : [];
  listaExerciciosFicha.replaceChildren();
  semExerciciosFicha.hidden = exercicios.length > 0;

  exercicios.forEach((ex, index) => {
    const tr = document.createElement("tr");
    tr.append(celula(String(ex.ordem ?? index + 1)));
    tr.append(celula(ex.exercicio));
    tr.append(celula(capitalizarTexto(ex.grupo_muscular || "Geral")));
    tr.append(celula(`${ex.series}x`));
    tr.append(celula(ex.repeticoes));
    tr.append(celula(`${ex.descanso_seg ?? 60}s`));

    const tdAcoes = document.createElement("td");

    const btnEditar = document.createElement("button");
    btnEditar.type = "button";
    btnEditar.className = "btn-editar-ex";
    btnEditar.textContent = "Editar";
    btnEditar.addEventListener("click", () => preencherEdicaoExercicio(ex));

    const btnRemover = document.createElement("button");
    btnRemover.type = "button";
    btnRemover.className = "btn-excluir-ex";
    btnRemover.textContent = "Excluir";
    btnRemover.addEventListener("click", () =>
      removerExercicioDaFicha(ex.id, ex.exercicio),
    );

    tdAcoes.append(btnEditar, btnRemover);
    tr.append(tdAcoes);
    listaExerciciosFicha.append(tr);
  });
}

async function recarregarDadosDoAlunoNoModal(manterTreinoId = null) {
  const dados = await FitControlAPI.get(`web/alunos/${alunoAtualId}/treinos`);
  dadosAlunoModal = dados;
  const treinos = Array.isArray(dados.treinos) ? dados.treinos : [];
  if (
    manterTreinoId &&
    treinos.some((t) => String(t.id) === String(manterTreinoId))
  ) {
    treinoSelecionadoId = manterTreinoId;
  } else {
    treinoSelecionadoId = treinos.length > 0 ? treinos[0].id : null;
  }
  renderizarModalTreinos();
}

async function abrirModalTreinosDoAluno(alunoId) {
  alunoAtualId = alunoId;
  treinoSelecionadoId = null;
  resetarFormularioExercicio();
  informarModal("Carregando fichas do aluno...");
  modalTreinosAluno.hidden = false;

  try {
    await recarregarDadosDoAlunoNoModal();
    informarModal("");
  } catch (erro) {
    informarModal(`Erro ao carregar fichas: ${erro.message}`, true);
  }
}

function fecharModalTreinosAluno() {
  modalTreinosAluno.hidden = true;
  alunoAtualId = null;
  dadosAlunoModal = null;
  treinoSelecionadoId = null;
  resetarFormularioExercicio();
}

fecharModalTreinos.addEventListener("click", fecharModalTreinosAluno);

// ==================== CRIAR E EXCLUIR FICHAS (A, B, C) ====================

btnCriarProximaFicha.addEventListener("click", async function () {
  const nomeNovaFicha = btnCriarProximaFicha.dataset.nomeFicha;
  if (!alunoAtualId || !nomeNovaFicha) return;

  btnCriarProximaFicha.disabled = true;
  informarModal(`Criando ${nomeNovaFicha}...`);

  try {
    const resp = await FitControlAPI.post(
      `web/alunos/${alunoAtualId}/treinos`,
      {
        nome: nomeNovaFicha,
      },
    );
    await recarregarDadosDoAlunoNoModal(resp.treinoId);
    await carregarResumoAlunos();
    informarModal(
      `${nomeNovaFicha} criado com sucesso! Adicione os exercícios abaixo.`,
    );
    nomeExercicioInput.focus();
  } catch (erro) {
    informarModal(
      `Não foi possível criar ${nomeNovaFicha}: ${erro.message}`,
      true,
    );
  } finally {
    btnCriarProximaFicha.disabled = false;
  }
});

btnExcluirFichaAtual.addEventListener("click", function () {
  if (!dadosAlunoModal || !treinoSelecionadoId) return;
  const ficha = (dadosAlunoModal.treinos || []).find(
    (t) => String(t.id) === String(treinoSelecionadoId),
  );
  if (!ficha) return;
  nomeFichaExcluirTexto.textContent = ficha.nome;
  modalConfirmarExclusaoFicha.hidden = false;
  cancelarExclusaoFicha.focus();
});

cancelarExclusaoFicha.addEventListener("click", function () {
  modalConfirmarExclusaoFicha.hidden = true;
});

confirmarExclusaoFicha.addEventListener("click", async function () {
  if (!treinoSelecionadoId) return;
  confirmarExclusaoFicha.disabled = true;
  confirmarExclusaoFicha.textContent = "Excluindo...";

  try {
    await FitControlAPI.del(`web/treinos/${treinoSelecionadoId}`);
    modalConfirmarExclusaoFicha.hidden = true;
    resetarFormularioExercicio();
    await recarregarDadosDoAlunoNoModal();
    await carregarResumoAlunos();
    informarModal("Ficha de treino excluída com sucesso.");
  } catch (erro) {
    modalConfirmarExclusaoFicha.hidden = true;
    informarModal(`Erro ao excluir ficha: ${erro.message}`, true);
  } finally {
    confirmarExclusaoFicha.disabled = false;
    confirmarExclusaoFicha.textContent = "Sim, excluir ficha";
  }
});

// ==================== ADICIONAR / EDITAR / REMOVER EXERCICIOS ====================

formExercicioFicha.addEventListener("submit", async function (event) {
  event.preventDefault();
  limparErroExercicio();

  if (!treinoSelecionadoId) {
    mostrarErroExercicio(
      "Selecione ou crie uma ficha de treino primeiro.",
      null,
    );
    return;
  }

  const exercicio = nomeExercicioInput.value.trim();
  const grupoMuscular = localExercicioInput.value.trim().toLowerCase();
  const series = Number.parseInt(seriesExercicioInput.value, 10);
  const repeticoes = repeticoesExercicioInput.value.trim();
  const descansoSeg = Number.parseInt(descansoExercicioInput.value, 10);
  const itemId = itemExercicioEmEdicao.value.trim();

  if (!exercicio) {
    mostrarErroExercicio("Informe o nome do exercício.", nomeExercicioInput);
    return;
  }
  if (!grupoMuscular) {
    mostrarErroExercicio(
      "Informe o local (grupo muscular) do exercício.",
      localExercicioInput,
    );
    return;
  }
  if (!Number.isInteger(series) || series <= 0) {
    mostrarErroExercicio(
      "Informe uma quantidade válida de séries.",
      seriesExercicioInput,
    );
    return;
  }
  if (!repeticoes) {
    mostrarErroExercicio(
      "Informe as repetições (ex.: 12 ou 8-12).",
      repeticoesExercicioInput,
    );
    return;
  }
  if (!Number.isInteger(descansoSeg) || descansoSeg < 0) {
    mostrarErroExercicio(
      "Informe o tempo de descanso em segundos.",
      descansoExercicioInput,
    );
    return;
  }

  btnSalvarExercicio.disabled = true;
  btnSalvarExercicio.textContent = "Salvando...";

  const payload = {
    exercicio,
    grupo_muscular: grupoMuscular,
    series,
    repeticoes,
    descanso_seg: descansoSeg,
  };

  try {
    if (itemId) {
      await FitControlAPI.put(
        `web/treinos/${treinoSelecionadoId}/exercicios/${itemId}`,
        payload,
      );
      informarModal("Exercício atualizado com sucesso.");
    } else {
      await FitControlAPI.post(
        `web/treinos/${treinoSelecionadoId}/exercicios`,
        payload,
      );
      informarModal("Exercício adicionado à ficha.");
    }

    resetarFormularioExercicio();
    await carregarCatalogoExercicios();
    await recarregarDadosDoAlunoNoModal(treinoSelecionadoId);
    await carregarResumoAlunos();
  } catch (erro) {
    mostrarErroExercicio(`Não foi possível salvar: ${erro.message}`, null);
  } finally {
    btnSalvarExercicio.disabled = false;
    btnSalvarExercicio.textContent = itemExercicioEmEdicao.value
      ? "Salvar alterações"
      : "+ Adicionar exercício";
  }
});

async function removerExercicioDaFicha(itemId, nomeExercicio) {
  if (!treinoSelecionadoId) return;
  informarModal(`Removendo "${nomeExercicio}"...`);
  try {
    await FitControlAPI.del(
      `web/treinos/${treinoSelecionadoId}/exercicios/${itemId}`,
    );
    if (itemExercicioEmEdicao.value === String(itemId)) {
      resetarFormularioExercicio();
    }
    await recarregarDadosDoAlunoNoModal(treinoSelecionadoId);
    await carregarResumoAlunos();
    informarModal(`Exercício "${nomeExercicio}" removido da ficha.`);
  } catch (erro) {
    informarModal(`Erro ao remover exercício: ${erro.message}`, true);
  }
}

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    if (!modalConfirmarExclusaoFicha.hidden) {
      modalConfirmarExclusaoFicha.hidden = true;
      return;
    }
    if (!modalTreinosAluno.hidden) {
      fecharModalTreinosAluno();
    }
  }
});

// ==================== INICIALIZACAO ====================

carregarCatalogoExercicios();
carregarResumoAlunos();
