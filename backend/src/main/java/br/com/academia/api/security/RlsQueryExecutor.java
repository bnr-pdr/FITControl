package br.com.academia.api.security;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.function.Function;

@Component
public class RlsQueryExecutor {

    private final JdbcTemplate jdbcTemplate;

    public RlsQueryExecutor(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public <T> T executeAsUser(Long userId, Function<JdbcTemplate, T> callback) {
        jdbcTemplate.queryForObject(
                "SELECT set_config('app.user_id', ?, true)",
                String.class,
                String.valueOf(userId)
        );
        return callback.apply(jdbcTemplate);
    }
}