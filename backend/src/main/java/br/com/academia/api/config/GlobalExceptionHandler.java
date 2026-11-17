package br.com.academia.api.config;

import org.springframework.core.NestedExceptionUtils;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "erro", ex.getMessage(),
                "timestamp", OffsetDateTime.now().toString()
        ));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<?> handleInvalidJson(HttpMessageNotReadableException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "erro", "Corpo da requisição inválido ou malformado.",
                "timestamp", OffsetDateTime.now().toString()
        ));
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<?> handleUnauthorized(SecurityException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "erro", ex.getMessage(),
                "timestamp", OffsetDateTime.now().toString()
        ));
    }

    @ExceptionHandler(EmptyResultDataAccessException.class)
    public ResponseEntity<?> handleNotFound(EmptyResultDataAccessException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "erro", "Nenhum registro encontrado ou acesso restrito pela política de segurança.",
                "timestamp", OffsetDateTime.now().toString()
        ));
    }

    @ExceptionHandler(DuplicateKeyException.class)
    public ResponseEntity<?> handleDuplicate(DuplicateKeyException ex) {
        Throwable root = NestedExceptionUtils.getMostSpecificCause(ex);
        String msg = root.getMessage() != null ? root.getMessage().toLowerCase() : "";

        String erroAmigavel;
        if (msg.contains("usuario_email_key")) {
            erroAmigavel = "Este e-mail já está cadastrado no sistema.";
        } else if (msg.contains("aluno_cpf_key")) {
            erroAmigavel = "Este CPF já está cadastrado no sistema.";
        } else if (msg.contains("professor_cref_key")) {
            erroAmigavel = "Este CREF já está cadastrado para outro professor.";
        } else if (msg.contains("plano_nome_key")) {
            erroAmigavel = "Já existe um plano cadastrado com este nome.";
        } else if (msg.contains("checkin_aluno_id_data_key")) {
            erroAmigavel = "Check-in já realizado hoje.";
        } else if (msg.contains("uq_matricula_ativa")) {
            erroAmigavel = "Este aluno já possui uma matrícula ativa.";
        } else if (msg.contains("uq_treino_dia")) {
            erroAmigavel = "Este aluno já possui uma ficha ativa neste dia da semana.";
        } else if (msg.contains("exercicio_nome_key")) {
            erroAmigavel = "Já existe um exercício cadastrado com este nome.";
        } else {
            erroAmigavel = "Registro duplicado: já existe um cadastro com os dados informados.";
        }

        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "erro", erroAmigavel,
                "timestamp", OffsetDateTime.now().toString()
        ));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<?> handleDatabaseRuleError(DataAccessException ex) {
        Throwable root = NestedExceptionUtils.getMostSpecificCause(ex);
        String rawMessage = root.getMessage() != null ? root.getMessage() : "Erro ao processar operação no banco.";

        String cleanMessage = rawMessage.contains("ERROR:")
                ? rawMessage.substring(rawMessage.indexOf("ERROR:") + 6).split("\n")[0].trim()
                : rawMessage;

        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(Map.of(
                "erro", cleanMessage,
                "timestamp", OffsetDateTime.now().toString()
        ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGenericError(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "erro", ex.getMessage() != null ? ex.getMessage() : "Erro interno no servidor.",
                "timestamp", OffsetDateTime.now().toString()
        ));
    }
}