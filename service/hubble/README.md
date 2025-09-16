# Hubble Service

A high-performance monitoring data collection and caching service for Sealos, designed to aggregate and serve network flow metrics from Cilium Hubble with Redis-based caching for optimal performance.

## Overview

Hubble Service acts as an intermediary layer between Cilium Hubble and frontend applications, providing:

- **Real-time Data Collection**: Continuously collects network flow metrics from Cilium Hubble Relay
- **High-Performance Caching**: Redis-based caching layer for fast data retrieval
- **RESTful API**: Clean HTTP endpoints for accessing monitoring data
- **Authentication Support**: Built-in whitelist-based authentication mechanism
- **Graceful Shutdown**: Proper signal handling for zero-downtime deployments

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│  Cilium Hubble  │────▶│ Hubble       │────▶│    Redis    │
│      Relay      │     │   Service    │     │    Cache    │
└─────────────────┘     └──────────────┘     └─────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │   Frontend   │
                        │ Applications │
                        └──────────────┘
```

## Features

- **Efficient Data Collection**: Connects to Hubble Relay for streaming network flow data
- **Redis Integration**: Persistent caching with configurable TTL
- **HTTP API Server**: RESTful endpoints for data retrieval
- **TLS Support**: Secure communication with Hubble Relay
- **Configurable Authentication**: Whitelist-based access control
- **Production Ready**: Graceful shutdown, health checks, and proper error handling

## Prerequisites

- Kubernetes cluster with Cilium and Hubble enabled
- Redis instance (for caching)
- Go 1.20+ (for development)
- Docker (for containerization)

## Installation

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/labring/sealos.git
cd sealos/service/hubble
```

2. **Configure the service**

Edit `config.yml` to match your environment:
```yaml
auth:
  whiteList: ["allowed-namespace-1", "allowed-namespace-2"]
http:
  addr: ":8080"
hubble:
  addr: "hubble-relay.kube-system.svc.cluster.local:80"
redis:
  addr: "redis.default.svc.cluster.local:6379"
  username: "default"
  password: "your-redis-password"
  db: 10
```

3. **Build and deploy**

Using Docker:
```bash
# Build the Docker image
make docker-build IMG=your-registry/hubble-service:latest

# Push to registry
make docker-push IMG=your-registry/hubble-service:latest

# Deploy to Kubernetes
kubectl apply -f deploy/manifests/
```

### Kubernetes Deployment

1. **Update the deployment manifest**

Edit `deploy/manifests/deploy.yaml` with your image and configuration:
```yaml
spec:
  containers:
  - name: hubble-service
    image: your-registry/hubble-service:latest
    env:
    - name: HUBBLE_RELAY_ADDR
      value: "hubble-relay.kube-system.svc.cluster.local:80"
    - name: REDIS_ADDR
      value: "redis.default.svc.cluster.local:6379"
```

2. **Apply the manifests**
```bash
kubectl apply -f deploy/manifests/
```

3. **Verify deployment**
```bash
kubectl get pods -l app=hubble-service
kubectl logs -l app=hubble-service
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CONFIG_PATH` | Path to configuration file | `./config.yml` |
| `HUBBLE_RELAY_ADDR` | Hubble Relay service address | `hubble-relay.kube-system.svc.cluster.local:80` |
| `REDIS_ADDR` | Redis server address | Required |
| `REDIS_PASSWORD` | Redis authentication password | Optional |
| `HTTP_PORT` | HTTP server listening port | `:8080` |
| `AUTH_WHITELIST` | Comma-separated list of allowed namespaces | Optional |

### Configuration File

The service can be configured via a YAML file:

```yaml
auth:
  whiteList: []  # List of allowed namespaces
http:
  addr: ":8080"  # HTTP server address
hubble:
  addr: "hubble-relay.kube-system.svc.cluster.local:80"
redis:
  addr: "localhost:6379"
  username: "default"
  password: ""
  db: 10
```

## API Endpoints

### Health Check
```
GET /health
```
Returns service health status

### Get Flow Metrics
```
GET /api/v1/flows
```
Returns cached network flow data

### Get Namespace Metrics
```
GET /api/v1/metrics/namespace/{namespace}
```
Returns metrics for a specific namespace

## Development

### Local Development

1. **Install dependencies**
```bash
go mod download
```

2. **Run locally**
```bash
# Start Redis locally
docker run -d -p 6379:6379 redis

# Run the service
go run cmd/main.go -config=config.yml
```

3. **Run tests**
```bash
go test ./...
```

### Building from Source

```bash
# Build binary
go build -o hubble-service cmd/main.go

# Build with specific version
go build -ldflags="-X main.version=v1.0.0" -o hubble-service cmd/main.go
```

## Monitoring

The service exposes internal metrics that can be scraped by Prometheus:

- `hubble_collector_flows_total` - Total number of flows collected
- `hubble_cache_hits_total` - Cache hit rate
- `hubble_cache_misses_total` - Cache miss rate
- `hubble_api_requests_total` - API request count
- `hubble_api_request_duration_seconds` - API request latency

## Troubleshooting

### Common Issues

1. **Cannot connect to Hubble Relay**
   - Verify Hubble is enabled in your Cilium installation
   - Check the Hubble Relay service is running: `kubectl get svc -n kube-system hubble-relay`
   - Ensure network policies allow communication

2. **Redis connection errors**
   - Verify Redis is accessible from the pod
   - Check Redis credentials and database number
   - Ensure Redis has sufficient memory

3. **No data returned from API**
   - Check collector logs for errors
   - Verify Hubble is generating flow data
   - Ensure Redis cache is working properly

### Debug Mode

Enable debug logging by setting the environment variable:
```bash
LOG_LEVEL=debug
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Copyright 2023 Sealos Contributors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

## Support

For issues and questions:
- GitHub Issues: [https://github.com/labring/sealos/issues](https://github.com/labring/sealos/issues)
- Documentation: [https://docs.sealos.io](https://docs.sealos.io)