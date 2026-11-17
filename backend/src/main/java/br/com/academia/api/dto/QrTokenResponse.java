package br.com.academia.api.dto;

public record QrTokenResponse(
        String qrToken,
        int expiraEmSegundos
) {}