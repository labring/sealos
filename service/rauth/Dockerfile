FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install ca-certificates for HTTPS
RUN apk add --no-cache ca-certificates

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o rauth .

# Final image - using alpine for health check support
FROM alpine:3.19

RUN apk add --no-cache ca-certificates wget

COPY --from=builder /app/rauth /rauth

EXPOSE 8080

ENTRYPOINT ["/rauth"]
