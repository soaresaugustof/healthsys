package com.healthsys.gateway.filter;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
@Order(0)
public class ProxyFilter implements WebFilter {

    private final WebClient webClient;
    private final Map<String, String> routes = new LinkedHashMap<>();

    public ProxyFilter(
            WebClient.Builder builder,
            @Value("${USER_SERVICE_URL:http://localhost:8081}") String userUrl,
            @Value("${PATIENT_SERVICE_URL:http://localhost:8082}") String patientUrl,
            @Value("${TRIAGE_SERVICE_URL:http://localhost:8083}") String triageUrl,
            @Value("${RECORD_SERVICE_URL:http://localhost:8084}") String recordUrl,
            @Value("${BED_SERVICE_URL:http://localhost:8085}") String bedUrl) {
        this.webClient = builder.build();
        routes.put("/api/auth", userUrl);
        routes.put("/api/users", userUrl);
        routes.put("/api/patients", patientUrl);
        routes.put("/api/triage", triageUrl);
        routes.put("/api/records", recordUrl);
        routes.put("/api/beds", bedUrl);
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = exchange.getRequest().getPath().value();

        String targetBase = routes.entrySet().stream()
                .filter(e -> path.startsWith(e.getKey()))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse(null);

        if (targetBase == null) {
            exchange.getResponse().setStatusCode(HttpStatus.NOT_FOUND);
            return exchange.getResponse().setComplete();
        }

        ServerHttpRequest req = exchange.getRequest();
        String rawQuery = req.getURI().getRawQuery();
        URI target = URI.create(targetBase + path + (rawQuery != null ? "?" + rawQuery : ""));

        return webClient.method(req.getMethod())
                .uri(target)
                .headers(h -> req.getHeaders().forEach((name, values) -> {
                    if (!name.equalsIgnoreCase("host")) h.put(name, values);
                }))
                .body(BodyInserters.fromDataBuffers(req.getBody()))
                .exchangeToMono(clientResponse -> {
                    ServerHttpResponse res = exchange.getResponse();
                    res.setStatusCode(clientResponse.statusCode());
                    clientResponse.headers().asHttpHeaders().forEach((name, values) -> {
                        if (!name.equalsIgnoreCase("transfer-encoding")
                                && !name.toLowerCase().startsWith("access-control-")) {
                            res.getHeaders().put(name, values);
                        }
                    });
                    return res.writeWith(clientResponse.bodyToFlux(DataBuffer.class));
                });
    }
}
