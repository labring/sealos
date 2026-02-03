# Build stage - use native platform for faster builds
FROM --platform=$BUILDPLATFORM golang:1.25-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    git \
    ca-certificates \
    && update-ca-certificates

WORKDIR /workspace

# Set target OS/ARCH for cross-compilation
ARG TARGETOS
ARG TARGETARCH
ENV CGO_ENABLED=0 \
    GOOS=$TARGETOS \
    GOARCH=$TARGETARCH

# Copy service and controllers
COPY service service
COPY controllers controllers

# Download dependencies with cache mount
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    cd service/sshgate && go mod download

# Build the service with cross-compilation
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    cd service/sshgate && \
    go build \
    -trimpath \
    -ldflags "-s -w" \
    -o /sshgate \
    .

# Runtime stage - use target platform
FROM gcr.io/distroless/static:nonroot

# Copy the binary from builder
COPY --from=builder /sshgate /sshgate

# Use non-root user
USER 65532:65532

EXPOSE 2222

ENTRYPOINT ["/sshgate"]