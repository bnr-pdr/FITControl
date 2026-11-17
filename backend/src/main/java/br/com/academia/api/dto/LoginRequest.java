package br.com.academia.api.dto;

public record LoginRequest(
        String email,
        String senha
) {}