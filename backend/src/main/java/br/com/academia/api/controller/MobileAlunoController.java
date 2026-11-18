package br.com.academia.api.controller;

import br.com.academia.api.security.UsuarioAutenticado;
import br.com.academia.api.service.AcademiaService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mobile")
public class MobileAlunoController {

    private final AcademiaService academiaService;

    public MobileAlunoController(AcademiaService academiaService) {
        this.academiaService = academiaService;
    }

    @GetMapping("/meu-plano")
    public ResponseEntity<?> meuPlano(@AuthenticationPrincipal UsuarioAutenticado user) {
        return ResponseEntity.ok(academiaService.buscarMeuPlano(user.id()));
    }

    @GetMapping("/treino-hoje")
    public ResponseEntity<List<?>> treinoHoje(@AuthenticationPrincipal UsuarioAutenticado user) {
        return ResponseEntity.ok(academiaService.buscarTreinoDoDia(user.id()));
    }

    @GetMapping("/meus-treinos")
    public ResponseEntity<List<?>> meusTreinos(@AuthenticationPrincipal UsuarioAutenticado user) {
        return ResponseEntity.ok(academiaService.buscarMeusTreinos(user.id()));
    }

    @GetMapping("/frequencia")
    public ResponseEntity<List<?>> frequencia(@AuthenticationPrincipal UsuarioAutenticado user) {
        return ResponseEntity.ok(academiaService.buscarFrequenciaMensal(user.id()));
    }

    @GetMapping("/checkin-hoje")
    public ResponseEntity<?> checkinHoje(
            @AuthenticationPrincipal UsuarioAutenticado user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data
    ) {
        return ResponseEntity.ok(academiaService.verificarCheckinHoje(user.id(), data));
    }

    @PostMapping("/checkin")
    public ResponseEntity<?> checkin(
            @AuthenticationPrincipal UsuarioAutenticado user,
            @RequestBody(required = false) Map<String, Object> body
    ) {
        LocalDate data = null;
        if (body != null && body.get("data") != null && !body.get("data").toString().isBlank()) {
            try {
                data = LocalDate.parse(body.get("data").toString().trim());
            } catch (DateTimeParseException e) {
                throw new IllegalArgumentException("Formato de data inválido. Use AAAA-MM-DD.");
            }
        }

        return ResponseEntity.ok(academiaService.realizarCheckin(user.id(), data));
    }
}