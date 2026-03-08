FROM golang:1.22-alpine AS builder
WORKDIR /app

# Copia arquivos de dependência primeiro para cache eficiente
COPY go.mod go.sum ./
RUN go mod download

# Copia o restante do código
COPY . .

# Faz o build do binário
RUN go build -o api ./cmd/api

# Imagem final
FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app

# Copia o binário do builder
COPY --from=builder /app/api .

# (Opcional) Copie migrations, .env.example, etc, se necessário:
# COPY --from=builder /app/migrations ./migrations

EXPOSE 8080
CMD ["./api"]
