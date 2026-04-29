# =============================================================
# Dockerfile raiz — usado por todos os microserviços.
# Passe SERVICE_NAME e SERVICE_PORT via --build-arg ou docker-compose.
#
# Exemplo standalone:
#   docker build --build-arg SERVICE_NAME=user-service \
#                --build-arg SERVICE_PORT=8081 \
#                -t healthsys/user-service .
# =============================================================

# ── Estágio de build ──────────────────────────────────────────
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app

# Copia o wrapper e a configuração raiz do Gradle
COPY gradlew gradlew.bat settings.gradle build.gradle ./
COPY gradle ./gradle
RUN chmod +x gradlew

# Copia os build.gradle de todos os subprojetos
# (Gradle precisa avaliar todos os módulos mesmo ao buildar apenas um)
COPY api-gateway/build.gradle     api-gateway/build.gradle
COPY user-service/build.gradle    user-service/build.gradle
COPY patient-service/build.gradle patient-service/build.gradle
COPY triage-service/build.gradle  triage-service/build.gradle
COPY record-service/build.gradle  record-service/build.gradle
COPY bed-service/build.gradle     bed-service/build.gradle

# Baixa dependências em camada separada (melhor cache do Docker)
RUN ./gradlew dependencies --no-daemon -q 2>/dev/null || true

# Copia apenas o código-fonte do serviço alvo
ARG SERVICE_NAME
COPY ${SERVICE_NAME}/src ./${SERVICE_NAME}/src

# Gera o fat JAR (sempre nomeado "app.jar" pelo build.gradle raiz)
RUN ./gradlew :${SERVICE_NAME}:bootJar -x test --no-daemon

# ── Estágio de runtime ────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

ARG SERVICE_NAME
ARG SERVICE_PORT=8080
COPY --from=build /app/${SERVICE_NAME}/build/libs/app.jar app.jar

EXPOSE ${SERVICE_PORT}
ENTRYPOINT ["java", "-jar", "app.jar"]
