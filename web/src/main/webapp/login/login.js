/* FITCONTROL - LOGIN REAL NA API JAVA */
const campoSenha = document.getElementById("senha");
const botaoMostrar = document.getElementById("mostrarSenha");
const formularioLogin = document.getElementById("formLogin");
const modalLogin = document.getElementById("modalLogin");
const fecharModal = document.getElementById("fecharModal");

botaoMostrar.addEventListener("click", function () {
    const oculto = campoSenha.type === "password";
    campoSenha.type = oculto ? "text" : "password";
    botaoMostrar.textContent = oculto ? "Ocultar" : "Mostrar";
});

formularioLogin.addEventListener("submit", async function (event) {
    event.preventDefault();
    const botao = formularioLogin.querySelector('button[type="submit"]');
    const email = document.getElementById("email").value.trim().toLowerCase();
    const senha = campoSenha.value;
    botao.disabled = true;
    botao.textContent = "Entrando...";
    try {
        await FitControlAPI.entrar(email, senha);
        window.location.href = "../dashboard.html";
    } catch (erro) {
        document.getElementById("modalTitulo").textContent = "Não foi possível entrar";
        document.getElementById("modalDescricao").textContent = erro.message;
        fecharModal.textContent = "Tentar novamente";
        modalLogin.hidden = false;
        fecharModal.focus();
    } finally {
        botao.disabled = false;
        botao.textContent = "Entrar";
    }
});

fecharModal.addEventListener("click", function () {
    modalLogin.hidden = true;
    formularioLogin.querySelector('button[type="submit"]').focus();
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !modalLogin.hidden) {
        modalLogin.hidden = true;
    }
});
