FROM golang:1.22-alpine AS builder

WORKDIR /build

RUN apk add --no-cache git gcc musl-dev

COPY go.mod go.sum* ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o nexus-agent cmd/agent/main.go

FROM alpine:3.19

RUN apk add --no-cache ca-certificates docker-cli

WORKDIR /app
COPY --from=builder /build/nexus-agent /usr/local/bin/nexus-agent

EXPOSE 8443

CMD ["nexus-agent"]
