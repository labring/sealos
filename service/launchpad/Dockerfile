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

RUN cd service/launchpad && go mod download

RUN cd service/launchpad && \
    go build \
    -trimpath \
    -ldflags "-s -w" \
    -o /manager \
    .

# Runtime stage
FROM gcr.io/distroless/static:nonroot

# Copy the binary from builder
COPY --from=builder /manager /manager

# Use non-root user
USER 65532:65532

EXPOSE 9090

ENTRYPOINT ["/manager"]
