package br.com.academia.api.controller;

import br.com.academia.api.security.UsuarioAutenticado;
import br.com.academia.api.service.AcademiaService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/web")
public class WebGestaoController {

    private final AcademiaService academiaService;

    public WebGestaoController(AcademiaService academiaService) {
        this.academiaService = academiaService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard(@AuthenticationPrincipal UsuarioAutenticado user) {
        return ResponseEntity.ok(academiaService.buscarDashboard(user.id()));
    }

    // ==================== ALUNOS ====================

    @GetMapping("/alunos")
    public ResponseEntity<List<?>> listarAlunos(@AuthenticationPrincipal UsuarioAutenticado user) {
        return ResponseEntity.ok(academiaService.listarAlunos(user.id()));
    }

    @PostMapping("/alunos")
    public ResponseEntity<?> cadastrarAluno(
            @AuthenticationPrincipal UsuarioAutenticado user,
            @RequestBody Map<String, Object> body
    ) {
        return ResponseEntity.ok(academiaService.cadastrarAluno(user.id(), body));
    }

    @PutMapping("/alunos/{id}")
    public ResponseEntity<?> atualizarAluno(
            @AuthenticationPrincipal UsuarioAutenticado user,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {
        return ResponseEntity.ok(academiaService.atualizarAluno(user.id(), id, body));
    }

    @DeleteMapping("/alunos/{id}")
    public ResponseEntity<?> desativarAluno(
            @AuthenticationPrincipal UsuarioAutenticado user,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(academiaService.desativarAluno(user.id(), id));
    }

    // ==================== PLANOS ====================

    @GetMapping("/planos")
    public ResponseEntity<List<?>> listarPlanos(@AuthenticationPrincipal UsuarioAutenticado user) {
        return ResponseEntity.ok(academiaService.listarPlanos(user.id()));
    }

    @PostMapping("/planos")
    public ResponseEntity<?> cadastrarPlano(
            @AuthenticationPrincipal UsuarioAutenticado user,
            @RequestBody Map<String, Object> body
    ) {
        return ResponseEntity.ok(academiaService.cadastrarPlano(user.id(), body));
    }

    @PutMapping("/planos/{id}")
    public ResponseEntity<?> atualizarPlano(
            @AuthenticationPrincipal UsuarioAutenticado user,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {
        return ResponseEntity.ok(academiaService.atualizarPlano(user.id(), id, body));
    }

    @DeleteMapping("/planos/{id}")
    public ResponseEntity<?> desativarPlano(
            @AuthenticationPrincipal UsuarioAutenticado user,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(academiaService.desativarPlano(user.id(), id));
    }

    // ==================== PROFESSORES ====================

    @GetMapping("/professores")
    public ResponseEntity<List<?>> listarProfessores(@AuthenticationPrincipal UsuarioAutenticado user) {
        return ResponseEntity.ok(academiaService.listarProfessores(user.id()));
    }

    @PostMapping("/professores")
    public ResponseEntity<?> cadastrarProfessor(
            @AuthenticationPrincipal UsuarioAutenticado user,
            @RequestBody Map<String, Object> body
    ) {
        return ResponseEntity.ok(academiaService.cadastrarProfessor(user.id(), body));
    }

    @PutMapping("/professores/{id}")
    public ResponseEntity<?> atualizarProfessor(
            @AuthenticationPrincipal UsuarioAutenticado user,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {
        return ResponseEntity.ok(academiaService.atualizarProfessor(user.id(), id, body));
    }

    @DeleteMapping("/professores/{id}")
    public ResponseEntity<?> desativarProfessor(
            @AuthenticationPrincipal UsuarioAutenticado user,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(academiaService.desativarProfessor(user.id(), id));
    }

    // ==================== MATRÍCULAS E PAGAMENTOS ====================

    @PostMapping("/matriculas")
    public ResponseEntity<?> criarMatricula(
            @AuthenticationPrincipal UsuarioAutenticado user,
            @RequestBody Map<String, Object> body
    ) {
        return ResponseEntity.ok(academiaService.criarMatricula(user.id(), body));
    }

    @GetMapping("/pagamentos")
    public ResponseEntity<List<?>> listarPagamentos(@AuthenticationPrincipal UsuarioAutenticado user) {
        return ResponseEntity.ok(academiaService.listarPagamentos(user.id()));
    }

    @PatchMapping("/pagamentos/{id}/pagar")
    public ResponseEntity<?> pagar(
            @AuthenticationPrincipal UsuarioAutenticado user,
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        String forma = body.getOrDefault("forma_pagamento", "pix");
        return ResponseEntity.ok(academiaService.confirmarPagamento(user.id(), id, forma));
    }

    // ==================== TREINOS E EXERCÍCIOS ====================

    @GetMapping("/exercicios")
    public ResponseEntity<List<?>> listarExercicios(@AuthenticationPrincipal UsuarioAutenticado user) {
        return ResponseEntity.ok(academiaService.listarExercicios(user.id()));
    }

    @GetMapping("/treinos/resumo-alunos")
    public ResponseEntity<List<?>> listarTreinosResumoAlunos(@AuthenticationPrincipal UsuarioAutenticado user) {
        return ResponseEntity.ok(academiaService.listarTreinosResumoAlunos(user.id()));
    }

    @GetMapping("/alunos/{alunoId}/treinos")
    public ResponseEntity<?> buscarTreinosPorAluno(
            @AuthenticationPrincipal UsuarioAutenticado user,
            @PathVariable Long alunoId
    ) {
        return ResponseEntity.ok(academiaService.buscarTreinosPorAluno(user.id(), alunoId));
    }

    @PostMapping("/alunos/{alunoId}/treinos")
    public ResponseEntity<?> criarTreinoParaAluno(
            @AuthenticationPrincipal UsuarioAutenticado user,
            @PathVariable Long alunoId,
            @RequestBody Map<String, Object> body
    ) {
        return ResponseEntity.ok(academiaService.criarTreinoParaAluno(user.id(), alunoId, body));
    }

    @GetMapping("/treinos")
    public ResponseEntity<List<?>> listarTreinos(@AuthenticationPrincipal UsuarioAutenticado user) {
        return ResponseEntity.ok(academiaService.listarTreinos(user.id()));
    }

    @PostMapping("/treinos")
    public ResponseEntity<?> criarTreino(
            @AuthenticationPrincipal UsuarioAutenticado user,
            @RequestBody Map<String, Object> body
    ) {
        return ResponseEntity.ok(academiaService.criarTreino(user.id(), body));
    }

    @PutMapping("/treinos/{id}")
    public ResponseEntity<?> atualizarTreino(
            @AuthenticationPrincipal UsuarioAutenticado user,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {
        return ResponseEntity.ok(academiaService.atualizarTreino(user.id(), id, body));
    }

    @DeleteMapping("/treinos/{id}")
    public ResponseEntity<?> excluirTreino(
            @AuthenticationPrincipal UsuarioAutenticado user,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(academiaService.excluirTreino(user.id(), id));
    }

    @PostMapping("/treinos/{id}/exercicios")
    public ResponseEntity<?> adicionarExercicioTreino(
            @AuthenticationPrincipal UsuarioAutenticado user,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {
        return ResponseEntity.ok(academiaService.adicionarExercicioTreino(user.id(), id, body));
    }

    @PutMapping("/treinos/{treinoId}/exercicios/{itemId}")
    public ResponseEntity<?> atualizarExercicioTreino(
            @AuthenticationPrincipal UsuarioAutenticado user,
            @PathVariable Long treinoId,
            @PathVariable Long itemId,
            @RequestBody Map<String, Object> body
    ) {
        return ResponseEntity.ok(academiaService.atualizarExercicioTreino(user.id(), treinoId, itemId, body));
    }

    @DeleteMapping("/treinos/{treinoId}/exercicios/{itemId}")
    public ResponseEntity<?> removerExercicioTreino(
            @AuthenticationPrincipal UsuarioAutenticado user,
            @PathVariable Long treinoId,
            @PathVariable Long itemId
    ) {
        return ResponseEntity.ok(academiaService.removerExercicioTreino(user.id(), treinoId, itemId));
    }

}