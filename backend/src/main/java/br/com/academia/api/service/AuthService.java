package br.com.academia.api.service;

import br.com.academia.api.dto.LoginRequest;
import br.com.academia.api.dto.LoginResponse;
import br.com.academia.api.security.JwtService;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AuthService {

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(JdbcTemplate jdbcTemplate, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public LoginResponse autenticar(LoginRequest request) {
        if (request == null || request.email() == null || request.senha() == null) {
            throw new IllegalArgumentException("E-mail e senha são obrigatórios.");
        }

        String emailNormalizado = request.email().trim().toLowerCase();
        Map<String, Object> usuario;
        try {
            // fn_login(email) retorna: id, nome, tipo, senha_hash (apenas para usuários ativos)
            usuario = jdbcTemplate.queryForMap(
                    "SELECT * FROM fn_login(?)",
                    emailNormalizado
            );
        } catch (EmptyResultDataAccessException e) {
            throw new SecurityException("Credenciais inválidas ou usuário inativo.");
        }

        if (usuario.containsKey("ativo") && usuario.get("ativo") instanceof Boolean ativo && !ativo) {
            throw new SecurityException("Usuário desativado.");
        }

        String senhaHash = (String) usuario.get("senha_hash");
        if (senhaHash == null || !passwordEncoder.matches(request.senha(), senhaHash)) {
            throw new SecurityException("Credenciais inválidas.");
        }

        Long id = ((Number) usuario.get("id")).longValue();
        String nome = usuario.get("nome") != null ? usuario.get("nome").toString() : "";
        String email = usuario.get("email") != null ? usuario.get("email").toString() : emailNormalizado;
        Object tipoRaw = usuario.get("tipo") != null ? usuario.get("tipo") : usuario.get("perfil");
        String perfil = tipoRaw != null ? tipoRaw.toString() : "";

        String token = jwtService.gerarToken(id, email, perfil);
        return new LoginResponse(token, id, nome, email, perfil);
    }
}