/* FITCONTROL - PROTEÇÃO DAS TELAS DE GESTÃO
 * api.js precisa ser carregado antes deste arquivo.
 */
(function () {
    "use strict";
    const api = window.FitControlAPI;
    const perfil = (sessionStorage.getItem("fitcontrolPerfil") || "").toLowerCase();
    if (!api || !api.autenticado() || !["admin", "professor"].includes(perfil)) {
        if (api) api.sair();
        window.location.replace(new URL("login/login.html", document.currentScript.src).href);
    }
})();
