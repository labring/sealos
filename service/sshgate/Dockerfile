# Build stage
FROM golang:1.25-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    git \
    ca-certificates \
    && update-ca-certificates

WORKDIR /workspace

ENV CGO_ENABLED=0

COPY . .

RUN cd service/sshgate && go mod download

RUN cd service/sshgate && \
    go build \
    -trimpath \
    -ldflags "-s -w" \
    -o /sshgate \
    .

# Runtime stage
FROM gcr.io/distroless/static:nonroot

# Copy the binary from builder
COPY --from=builder /sshgate /sshgate

# Use non-root user
USER 65532:65532

EXPOSE 2222

ENTRYPOINT ["/sshgate"]