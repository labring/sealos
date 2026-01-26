# Build stage
FROM golang:1.25-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    git \
    ca-certificates \
    && update-ca-certificates

WORKDIR /workspace

# Copy all source code
COPY . .

ENV CGO_ENABLED=0

# Build the binary
RUN cd service/pay && \
    go build -tags=jsoniter \
    -trimpath \
    -ldflags "-s -w" \
    -o /manager \
    main.go

# Runtime stage
FROM gcr.io/distroless/static:nonroot

# Copy the binary from builder
COPY --from=builder /manager /manager

# Use non-root user
USER 65532:65532

EXPOSE 2303

ENTRYPOINT ["/manager"]