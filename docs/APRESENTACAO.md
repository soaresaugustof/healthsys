# HealthSys — Revisão para Apresentação

## O que é o projeto

Sistema de gestão hospitalar construído sobre **arquitetura de microserviços**, cobrindo os principais conceitos de sistemas distribuídos exigidos pela disciplina. O sistema gerencia triagem de pacientes, leitos, prontuários e usuários, com um frontend React se comunicando com o backend via API Gateway.

---

## Arquitetura Geral

```
Frontend (React + Vite)
        │  HTTP REST
        ▼
  API Gateway :8080          ← ponto único de entrada
  JWT Validation + Routing
        │
   ┌────┼────────────────────────────┐
   │    │                            │
   ▼    ▼    ▼          ▼           ▼
user  patient  triage  record    bed
:8081  :8082   :8083   :8084    :8085
   │              │
   ▼              ▼
PostgreSQL      Kafka
(compartilhado)  (triage-events)
```

---

## 1. Fundamentos de Sistemas Distribuídos

### Arquitetura Microserviços

**Por quê:** Separar responsabilidades de domínio permite que cada serviço seja desenvolvido, implantado e escalado de forma independente, sem que uma mudança em prontuários afete o serviço de triagem, por exemplo.

**O que foi construído:**

| Serviço | Porta | Responsabilidade |
|---|---|---|
| `user-service` | 8081 | Autenticação, cadastro e perfil de usuários |
| `patient-service` | 8082 | Cadastro e gestão de pacientes |
| `triage-service` | 8083 | Triagem, sinais vitais e classificação de risco |
| `record-service` | 8084 | Prontuários médicos |
| `bed-service` | 8085 | Gestão e disponibilidade de leitos |
| `api-gateway` | 8080 | Roteamento, autenticação JWT e CORS |

**Cada serviço tem:**
- Código-fonte isolado (`/user-service/src`, `/triage-service/src`, …)
- Build independente (`./gradlew :triage-service:bootJar`)
- Imagem Docker própria, construída a partir de um Dockerfile multi-stage único
- Variáveis de ambiente para configuração (DB, Kafka, JWT secret)

### Escalabilidade Horizontal

**Por quê:** Em sistemas distribuídos, a escalabilidade horizontal (adicionar mais instâncias) é preferível à vertical (máquinas maiores) por ser mais barata e tolerante a falhas.

**Como está suportado:**  
Cada microserviço é **stateless** — não guarda estado em memória entre requisições. A autenticação usa JWT (token no cliente), não sessão no servidor. Isso significa que qualquer número de réplicas de um serviço pode atender a mesma requisição:

```bash
# Exemplo: escalar o triage-service para 3 instâncias
docker compose up --scale triage-service=3
```

O API Gateway roteia requisições para o prefixo de path correto, e o Docker Compose resolve o DNS para as instâncias disponíveis.

### Alta Disponibilidade

**Por quê:** Em ambientes hospitalares, indisponibilidade tem impacto direto no atendimento.

**O que está implementado:**
- **Health checks do Docker Compose** para PostgreSQL e Kafka — os serviços dependentes só sobem após a infraestrutura estar pronta:
  ```yaml
  # PostgreSQL
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U myuser -d healthsys"]
    interval: 10s
    retries: 5
  
  # Kafka
  healthcheck:
    test: ["CMD", "kafka-broker-api-versions", "--bootstrap-server", "localhost:9092"]
    interval: 15s
    retries: 5
  ```
- **`depends_on` com `condition: service_healthy`** — o triage-service, por exemplo, não sobe antes do Kafka estar respondendo
- **DDL automático do JPA** (`ddl-auto=update`) — o schema do banco é mantido automaticamente ao subir um serviço

---

## 2. Modelos Utilizados

### Cliente-Servidor (Frontend + Backend)

**Por quê:** Modelo fundamental para separar a interface do usuário da lógica de negócio.

**Implementação:**
- **Cliente:** Frontend React (`/healthsys-front`) — SPA que consome a API REST
- **Servidor:** API Gateway (:8080) expõe todos os endpoints, valida JWT e roteia para o microserviço correto

Fluxo de autenticação:
```
1. Frontend POST /api/auth/login → API Gateway → user-service
2. user-service valida credenciais → retorna JWT
3. Frontend armazena JWT no localStorage
4. Todas as requisições subsequentes incluem: Authorization: Bearer <token>
5. API Gateway valida o JWT e extrai o e-mail do usuário
6. Downstream services recebem o header X-User-Email
```

### Cache Distribuído com Redis

**Situação atual:** Redis não foi configurado no projeto. A disciplina cita cache distribuído como um dos modelos a serem utilizados.

**O que seria a implementação:** O `bed-service` e o `patient-service` são candidatos naturais a cache — listagens de leitos disponíveis e dados de pacientes são lidos com frequência e mudam raramente. Com Spring Cache + Redis:
```java
@Cacheable("leitos")
public List<Bed> findAll() { … }
```

**Para apresentação:** É válido mencionar que a arquitetura suporta adição de Redis sem mudanças estruturais, pois os serviços são stateless e o acesso a dados já está centralizado nos repositories.

### Peer-to-Peer

**Situação atual:** Não há comunicação direta entre microserviços (service-to-service). Toda comunicação passa pelo API Gateway ou pelo Kafka.

**Para apresentação:** O modelo P2P se manifesta **indiretamente** no Kafka — o triage-service produz eventos sem saber quais consumidores existem, e qualquer serviço pode consumir esses eventos de forma descentralizada, sem coordenação central.

---

## 3. Modelos de Interação

### Comunicação Síncrona — REST API

**Por quê:** REST é o padrão mais amplamente adotado para APIs web, com boa compatibilidade entre frontend e backend.

**Implementação:**  
Todos os 5 microserviços expõem APIs REST com Spring Boot Web. O API Gateway usa **Spring WebFlux** (stack reativa, não-bloqueante) para fazer o proxy das requisições:

```java
// ProxyFilter.java — API Gateway roteando para os serviços
routes.put("/api/auth",     userUrl);
routes.put("/api/patients", patientUrl);
routes.put("/api/triage",   triageUrl);
routes.put("/api/records",  recordUrl);
routes.put("/api/beds",     bedUrl);
```

**Endpoints implementados:**

| Método | Endpoint | Serviço | Descrição |
|---|---|---|---|
| POST | /api/auth/login | user-service | Autenticação |
| GET/POST | /api/patients | patient-service | Pacientes |
| GET/POST | /api/triage | triage-service | Triagens |
| PATCH | /api/triage/{id}/call | triage-service | Chamar paciente |
| PATCH | /api/triage/{id}/finish | triage-service | Finalizar atendimento |
| GET/POST | /api/records | record-service | Prontuários |
| GET/PUT | /api/beds | bed-service | Leitos |
| GET/POST/DELETE | /api/users | user-service | Usuários |

### Comunicação Síncrona — gRPC

**Situação atual:** gRPC não foi implementado.

**Para apresentação:** gRPC seria aplicável na comunicação entre microserviços (service-to-service) onde performance é crítica — por exemplo, o triage-service consultando dados do patient-service antes de salvar uma triagem. REST foi suficiente para o escopo atual.

### Comunicação Assíncrona — Kafka

**Por quê:** Eventos de triagem (paciente chegou, paciente foi chamado, atendimento finalizado) não precisam de resposta imediata. Kafka desacopla o produtor dos consumidores e garante durabilidade dos eventos.

**Implementação no triage-service:**

```
triage-service → Kafka (tópico: triage-events)

Eventos publicados:
  triage.created:{id}   → quando triagem é registrada
  patient.called:{id}   → quando paciente é chamado
  triage.finalized:{id} → quando atendimento é finalizado
```

Configuração Kafka:
```properties
spring.kafka.bootstrap-servers=${KAFKA_SERVERS:localhost:9092}
spring.kafka.producer.key-serializer=StringSerializer
spring.kafka.producer.value-serializer=StringSerializer
```

O tópico `triage-events` é criado automaticamente (`KAFKA_AUTO_CREATE_TOPICS_ENABLE=true`). O payload é o objeto `Triage` serializado em JSON.

**Nota:** O projeto implementa o lado produtor. Consumidores (ex: notification-service para alertas) seriam a extensão natural.

### Comunicação Assíncrona — RabbitMQ

**Situação atual:** Não implementado. O projeto optou por Kafka como único message broker.

**Para apresentação:** Kafka e RabbitMQ atendem casos diferentes — Kafka é ideal para **event streaming** com persistência e replay (adequado para eventos de triagem), enquanto RabbitMQ é mais simples para **task queues**. A escolha do Kafka foi deliberada dado o contexto de auditoria de atendimento hospitalar.

---

## 4. Modelos de Falha

### Health Checks

**O que está implementado:**

1. **Docker Compose Health Checks** — verificam se PostgreSQL e Kafka estão respondendo antes de subir os serviços dependentes (detalhado na seção de Alta Disponibilidade)

2. **Dependências condicionais** — o triage-service só inicia após Kafka estar healthy:
```yaml
triage-service:
  depends_on:
    postgres:
      condition: service_healthy
    kafka:
      condition: service_healthy
```

**Spring Actuator (Health Checks programáticos):**  
Não configurado no projeto atual. Com Actuator, cada serviço exporia `/actuator/health` com status detalhado (banco, kafka, disco). É a extensão natural para monitoramento em produção:
```properties
management.endpoints.web.exposure.include=health,info,metrics
management.endpoint.health.show-details=always
```

### Chaos Engineering

**Situação atual:** Não há ferramentas de chaos engineering configuradas (Gremlin, Chaos Monkey, Toxiproxy).

**Para apresentação:** A arquitetura de microserviços por si só **simula** cenários de falha ao derrubar serviços individuais:
```bash
# Simular falha do triage-service
docker compose stop triage-service
# O sistema continua funcionando para pacientes e leitos
docker compose start triage-service
```
Isso demonstra o princípio de **falha isolada** — um serviço fora do ar não derruba os demais.

---

## 5. Middleware

### API Gateway

**Por quê:** Em microserviços, o cliente não pode conhecer os endereços de cada serviço. O gateway é o ponto único de entrada que centraliza autenticação, roteamento e CORS.

**Implementação com Spring WebFlux:**

O gateway tem dois filtros em cadeia:

**JwtAuthFilter (Order -100) — executa primeiro:**
- Libera apenas `/api/auth/*` sem token
- Valida o JWT em todas as demais rotas
- Extrai o e-mail do subject do token → adiciona `X-User-Email` no header
- Retorna 401 para token ausente ou inválido
- Trata preflight CORS (OPTIONS)

**ProxyFilter (Order 0) — executa depois:**
- Faz o match do path para o serviço correto
- Encaminha a requisição via `WebClient` (reativo, não-bloqueante)
- Repassa headers e body sem transformação
- Retorna 404 para rotas desconhecidas

```java
// Exemplo do fluxo de um PATCH /api/triage/5/call
// 1. JwtAuthFilter valida JWT → OK
// 2. ProxyFilter detecta prefixo "/api/triage" → encaminha para triage-service:8083
// 3. triage-service processa e retorna Triage com status "Em Atendimento"
```

### Service Discovery

**Situação atual:** Não implementado com ferramenta dedicada (Eureka, Consul). As URLs dos serviços são configuradas via variáveis de ambiente no docker-compose:

```yaml
api-gateway:
  environment:
    USER_SERVICE_URL:    http://user-service:8081
    PATIENT_SERVICE_URL: http://patient-service:8082
    TRIAGE_SERVICE_URL:  http://triage-service:8083
    RECORD_SERVICE_URL:  http://record-service:8084
    BED_SERVICE_URL:     http://bed-service:8085
```

**Para apresentação:** O Docker Compose atua como um **service registry simplificado** — os nomes dos containers (`user-service`, `triage-service`) são resolvidos via DNS interno da rede Docker. Em produção com Kubernetes, isso seria substituído por DNS automático + Service Discovery nativo.

### Message Brokers — Kafka

**Por quê:** Kafka como middleware garante que eventos de triagem sejam durável, ordenados e reprocessáveis — propriedades essenciais em sistemas de saúde onde auditoria é obrigatória.

**Infraestrutura:**
- **Zookeeper** — coordenação do cluster Kafka (metadados, eleição de líder)
- **Kafka Broker** — armazena e distribui os eventos do tópico `triage-events`
- Configurado com `replication-factor=1` (desenvolvimento) — em produção seria ≥ 3

**Fluxo de evento:**
```
Médico clica "Finalizar" no frontend
    → PATCH /api/triage/5/finish (REST síncrono)
    → API Gateway → triage-service
    → Status muda para FINALIZADO no PostgreSQL
    → Evento "triage.finalized:5" publicado no Kafka
    → (Consumidores futuros: notificação, auditoria, faturamento)
```

---

## Tecnologias e Justificativas — Resumo

| Tecnologia | Versão | Papel no Sistema | Por quê |
|---|---|---|---|
| Spring Boot | 4.0.5 | Framework base de todos os microserviços | Produtividade, ecossistema maduro, suporte nativo a Kafka e JPA |
| Spring WebFlux | 4.0.5 | API Gateway | Stack reativa: o gateway pode gerenciar muitas conexões simultâneas sem bloquear threads |
| Spring Security | 4.0.5 | Autenticação no user-service | Integração nativa com JWT e gestão de usuários |
| Spring Data JPA | 4.0.5 | Persistência em todos os serviços | Abstração do banco com repositórios tipados, sem SQL boilerplate |
| Spring Kafka | 4.0.5 | Produtor de eventos no triage-service | API declarativa para Kafka; integração com Spring Boot |
| PostgreSQL | 16 | Banco de dados compartilhado | ACID, confiabilidade, suporte a tipos complexos |
| Apache Kafka | 7.6.0 | Message broker para eventos de triagem | Durabilidade, ordenação, replay de eventos |
| Apache Zookeeper | 7.6.0 | Coordenação do cluster Kafka | Gerenciamento de metadados e eleição de líder do Kafka |
| JWT (JJWT) | 0.11.5 | Tokens de autenticação stateless | Sem estado no servidor: suporta escalabilidade horizontal |
| Lombok | latest | Redução de boilerplate | Gera getters/setters/construtores automaticamente |
| Docker + Compose | latest | Containerização e orquestração local | Ambiente reproduzível; isolamento de serviços |
| React + Vite | 19 / 6 | Frontend SPA | Cliente do modelo cliente-servidor |
| Gradle | 9.4.1 | Build multi-módulo | Gerencia build de todos os 6 serviços em um único projeto |

---

## O que o projeto demonstra na prática

1. **Isolamento de falhas:** derrubar o `record-service` não afeta triagem ou leitos
2. **Deploy independente:** rebuildar apenas o `triage-service` (`docker compose up --build --no-deps triage-service`) sem tocar nos demais
3. **Autenticação centralizada:** o gateway valida o JWT uma vez; os serviços internos confiam no header `X-User-Email`
4. **Desacoplamento via eventos:** o triage-service não sabe quem vai consumir os eventos de triagem — novos consumidores podem ser adicionados sem modificar o produtor
5. **Configuração por ambiente:** todas as credenciais e URLs são variáveis de ambiente, sem hardcode no código-fonte

---

## Pontos a Reforçar na Apresentação

- O projeto **implementa a base sólida** de microserviços com REST + Kafka + API Gateway
- A arquitetura **suporta extensões** sem refatoração estrutural: Redis para cache, Actuator para health checks, Eureka para service discovery
- A escolha de **Kafka sobre RabbitMQ** foi deliberada: eventos de triagem têm característica de stream auditável, não de fila simples
- O gateway com **WebFlux reativo** é uma decisão de performance: não bloqueia threads enquanto aguarda respostas dos serviços
- **Enums com `@JsonValue`**: os status são type-safe no código Java, armazenados como string no banco, e transmitidos em formato legível na API — exemplo de decisão de design consciente
