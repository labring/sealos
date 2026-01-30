# Build stage
FROM golang:1.25-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    git \
    ca-certificates \
    && update-ca-certificates

ARG TARGETARCH

WORKDIR /workspace

ENV CGO_ENABLED=0

COPY . .

RUN \
    BUILD_DIR="/workspace"; \
    if [ -d "/workspace/service/account" ]; then \
        BUILD_DIR="/workspace/service/account"; \
    fi && \
    cd ${BUILD_DIR} && \
    if [ -f "bin/service-account-${TARGETARCH}" ]; then \
        cp "bin/service-account-${TARGETARCH}" /manager; \
    else \
        go mod download && \
        go build -tags=jsoniter \
        -trimpath \
        -ldflags "-s -w" \
        -o /manager \
        . ; \
    fi

# Runtime stage
FROM gcr.io/distroless/static:nonroot

# Copy the binary from builder
COPY --from=builder /manager /manager

# Use non-root user
USER 65532:65532

EXPOSE 9090

ENTRYPOINT ["/manager"]