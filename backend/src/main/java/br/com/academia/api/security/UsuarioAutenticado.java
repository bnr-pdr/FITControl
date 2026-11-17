package br.com.academia.api.security;

public record UsuarioAutenticado(
        Long id,
        String email,
        String perfil
) {}