# SSH Gateway for Sealos Devbox

A Kubernetes-native SSH gateway that routes SSH connections to Devbox pods based on client public keys.

## Features

- **Public Key Routing**: Automatically matches and routes connections based on SSH public keys
- **Real-time Sync**: Uses client-go Informers to watch Kubernetes Secrets and Pods
- **Multi-replica Consistency**: All replicas use identical host keys via deterministic key generation
- **Flexible Username**: Accepts any SSH username
- **Multiple Proxy Modes**: Supports Agent forwarding and ProxyJump (direct-tcpip)

## Architecture

```
User (ssh <username>@gateway -i ~/.ssh/key)
    ↓
SSH Gateway (public key matching)
    ↓
Registry (Informer cache)
    ↓
Backend Devbox Pod (via Pod IP)
```

## How It Works

1. User connects via `ssh <username>@gateway` (username can be anything)
2. Gateway looks up the corresponding Devbox using the user's public key
3. Connects to the backend pod using the Devbox's private key
4. Proxies all SSH traffic bidirectionally

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SSH_LISTEN_ADDR` | `:2222` | Listen address |
| `SSH_HOST_KEY_SEED` | `sealos-devbox` | Seed for deterministic key generation |
| `SSH_BACKEND_PORT` | `22` | Backend SSH port |
| `ENABLE_AGENT_FORWARD` | `true` | Enable Agent forwarding mode |
| `ENABLE_PROXY_JUMP` | `false` | Enable ProxyJump mode |
| `LOG_LEVEL` | `info` | Log level (debug/info/warn/error) |
| `LOG_FORMAT` | `text` | Log format (text/json) |

### Kubernetes Resources

The gateway watches the following resources:

**Secret**:

- Label: `app.kubernetes.io/part-of: devbox`
- Data fields:
  - `SEALOS_DEVBOX_PUBLIC_KEY`: User's public key (base64)
  - `SEALOS_DEVBOX_PRIVATE_KEY`: Devbox's private key (base64)
- OwnerReference: Points to Devbox CR

**Pod**:

- Label: `app.kubernetes.io/part-of: devbox`
- OwnerReference: Points to Devbox CR
- Must have PodIP assigned
