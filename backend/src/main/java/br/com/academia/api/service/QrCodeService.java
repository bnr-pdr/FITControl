package br.com.academia.api.service;

import br.com.academia.api.dto.QrTokenResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class QrCodeService {

    private final byte[] secretBytes;
    private final int ttlSeconds;

    public QrCodeService(
            @Value("${app.qr.hmac-secret}") String secret,
            @Value("${app.qr.ttl-seconds:45}") int ttlSeconds
    ) {
        this.secretBytes = secret.getBytes(StandardCharsets.UTF_8);
        this.ttlSeconds = ttlSeconds;
    }

    public QrTokenResponse gerarTokenRecepcao() {
        long timestamp = Instant.now().getEpochSecond();
        String nonce = UUID.randomUUID().toString().substring(0, 8);
        String payload = timestamp + ":" + nonce;
        String assinatura = assinarHmac(payload);

        return new QrTokenResponse(payload + ":" + assinatura, ttlSeconds);
    }

    public void validarToken(String qrToken) {
        if (qrToken == null || qrToken.isBlank()) {
            throw new IllegalArgumentException("QR Code não informado.");
        }

        String[] partes = qrToken.split(":");
        if (partes.length != 3) {
            throw new IllegalArgumentException("Formato de QR Code inválido.");
        }

        long timestamp;
        try {
            timestamp = Long.parseLong(partes[0]);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Timestamp do QR Code inválido.");
        }

        long agora = Instant.now().getEpochSecond();
        if (agora - timestamp > ttlSeconds || timestamp > agora + 5) {
            throw new IllegalArgumentException("QR Code expirado. Escaneie novamente na recepção.");
        }

        String payload = partes[0] + ":" + partes[1];
        String assinaturaEsperada = assinarHmac(payload);

        boolean valido = MessageDigest.isEqual(
                assinaturaEsperada.getBytes(StandardCharsets.UTF_8),
                partes[2].getBytes(StandardCharsets.UTF_8)
        );

        if (!valido) {
            throw new SecurityException("Assinatura do QR Code adulterada ou inválida.");
        }
    }

    private String assinarHmac(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretBytes, "HmacSHA256"));
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(rawHmac);
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao calcular HMAC-SHA256", e);
        }
    }
}