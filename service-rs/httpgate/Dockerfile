FROM rust:alpine AS builder

RUN apk add \
    musl-dev \
    make \
    cmake \
    g++

WORKDIR /app

# Copy workspace root files
COPY Cargo.toml Cargo.lock ./

# Copy the target crate
COPY httpgate ./httpgate

# Build the specific package
RUN cargo build --release --package httpgate

FROM alpine

# Run as non-root user
RUN adduser -D -u 1000 httpgate
USER httpgate

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/target/release/httpgate /app/httpgate

EXPOSE 8080

ENTRYPOINT ["/app/httpgate"]
