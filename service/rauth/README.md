# rauth - Registry Authentication Service

A Docker Registry authentication service based on Kubernetes namespaces. Each namespace can only pull images belonging to its own namespace.

## Features

- Image access control based on Kubernetes namespaces
- Supports the Docker Registry Token Authentication protocol
- Reads credentials from Secrets within the namespace
- Supports JWT token generation and validation

## Architecture

```text
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │───>│  Registry   │───>│   rauth     │
│ (kubelet)   │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
│                  │
│                  │
▼                  ▼
┌─────────────┐    ┌─────────────┐
│   Images    │    │  K8s API    │
│   Storage   │    │  (Secrets)  │
└─────────────┘    └─────────────┘
```

## Workflow

1. The Pod attempts to pull the image `internal-registry.io/namespace-a/myapp:v1`
2. The registry returns HTTP status code 401, requesting authentication
3. The kubelet uses the credentials from imagePullSecrets to request a token from rauth.
4. rauth performs the following validations:
- Parses the target namespace (`namespace-a`) from the request.
- Reads the credentials from the `devbox-registry` Secret in `namespace-a`.
- Verifies that the username and password in the request match the stored credentials.
- Ensures the requested image belongs to that namespace.
5. Upon successful validation, rauth returns a JWT token.
6. The kubelet uses the token to pull the image from the registry.

## Deployment

### Prerequisites

- A Kubernetes cluster
- Helm 3.x
- A Docker registry (deployed either inside or outside the cluster)
- Each namespace must have a controller that generates the `devbox-registry` Secret

### Deploying with Helm

```bash
# Add a local chart (if already packaged)
helm install rauth ./deploy/charts/rauth -n devbox-system --create-namespace

# Or use custom configuration
helm install rauth ./deploy/charts/rauth -n devbox-system --create-namespace \
  --set config.service=internal-registry.io \
  --set config.issuer=rauth
```

## Helm Chart Parameters

| Parameter | Default Value | Description |
|-----------|----------------|-------------|
| `replicaCount` | 2 | Number of replicas |
| `image` | internal-registry.io/registry/rauth | Image repository |
| `config.port` | 8080 | Service port |
| `config.issuer` | rauth | Token issuer |
| `config.service` | internal-registry.io | Registry service name |
| `config.secretName` | devbox-registry | Credentials Secret name |
| `config.tokenExpiry` | 5m | Token validity period |
| `config.logLevel` | info | Log level |
| `config.adminUsername` | - | Global administrator username |
| `config.adminPassword` | - | Global administrator password |
| `rbac.create` | true | Whether to create RBAC resources |
| `serviceAccount.create` | true | Whether to create a ServiceAccount |
| `registry.enabled` | false | Whether to deploy the built-in registry |

## API

### GET /token

Token request endpoint compliant with the Docker Registry Token Authentication specification.

**Request parameters:**

- `service`: Registry service name
- `scope`: Access scope, formatted as `repository:namespace/image:action`

**Request headers:**

- `Authorization`: Basic authentication, formatted as `Basic base64(username:password)`

**Response:**

```json
{
"token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
"access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
"expires_in": 300
}
```
