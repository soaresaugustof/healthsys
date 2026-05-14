package com.healthsys.gateway.filter;

import org.reactivestreams.Publisher;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.http.server.reactive.ServerHttpResponseDecorator;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;

@Component
@Order(-50)
public class CacheFilter implements WebFilter {

    private final ReactiveRedisTemplate<String, String> redisTemplate;
    private static final Duration CACHE_TTL = Duration.ofSeconds(30);

    private static final List<String> CACHEABLE_PREFIXES = List.of(
            "/api/beds", "/api/patients", "/api/triage", "/api/records"
    );

    public CacheFilter(ReactiveRedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = exchange.getRequest().getPath().value();

        String matchedPrefix = CACHEABLE_PREFIXES.stream()
                .filter(path::startsWith)
                .findFirst()
                .orElse(null);

        if (matchedPrefix == null) {
            return chain.filter(exchange);
        }

        // Mutação → prossegue e invalida o cache do recurso afetado
        if (exchange.getRequest().getMethod() != HttpMethod.GET) {
            return chain.filter(exchange)
                    .then(redisTemplate.delete("cache:" + matchedPrefix).then());
        }

        // GET → verifica cache antes de chamar o serviço
        String cacheKey = "cache:" + path;

        return redisTemplate.opsForValue().get(cacheKey)
                .flatMap(cached -> {
                    // Cache hit — retorna direto sem bater no serviço
                    ServerHttpResponse response = exchange.getResponse();
                    response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
                    response.setStatusCode(HttpStatus.OK);
                    DataBuffer buffer = response.bufferFactory()
                            .wrap(cached.getBytes(StandardCharsets.UTF_8));
                    return response.writeWith(Mono.just(buffer));
                })
                .switchIfEmpty(Mono.defer(() -> {
                    // Cache miss — encaminha ao serviço e armazena a resposta
                    ResponseCapturingDecorator decorator =
                            new ResponseCapturingDecorator(exchange.getResponse(), cacheKey);
                    return chain.filter(exchange.mutate().response(decorator).build());
                }));
    }

    private class ResponseCapturingDecorator extends ServerHttpResponseDecorator {

        private final String cacheKey;

        ResponseCapturingDecorator(ServerHttpResponse delegate, String cacheKey) {
            super(delegate);
            this.cacheKey = cacheKey;
        }

        @Override
        public Mono<Void> writeWith(Publisher<? extends DataBuffer> body) {
            if (HttpStatus.OK.equals(getStatusCode())) {
                return DataBufferUtils.join(Flux.from(body))
                        .flatMap(dataBuffer -> {
                            byte[] bytes = new byte[dataBuffer.readableByteCount()];
                            dataBuffer.read(bytes);
                            DataBufferUtils.release(dataBuffer);
                            String responseBody = new String(bytes, StandardCharsets.UTF_8);
                            DataBuffer newBuffer = bufferFactory().wrap(bytes);
                            return redisTemplate.opsForValue()
                                    .set(cacheKey, responseBody, CACHE_TTL)
                                    .then(super.writeWith(Mono.just(newBuffer)));
                        });
            }
            return super.writeWith(body);
        }
    }
}
