# zombiedetector

A Kubernetes node monitoring tool that detects "zombie" nodes - nodes in Ready status but unable to retrieve resource metrics, and sends alerts via Feishu bot.

## Features

- 🔍 **Real-time Monitoring**: Continuously monitors metrics status of all nodes in the cluster
- 🧟 **Zombie Detection**: Identifies nodes with Ready status but no resource metrics for extended periods
- 📢 **Feishu Alerts**: Sends timely alert notifications via Feishu bot
- 🛡️ **Smart Deduplication**: Avoids duplicate alerts with configurable alert intervals
- 🔧 **Flexible Configuration**: Supports customization of monitoring parameters via environment variables
- 📊 **Detailed Logging**: Provides comprehensive monitoring logs and alert records
- 🎯 **Leader Election**: Supports high availability with leader election mechanism

## How It Works

1. Periodically queries Kubernetes API to get all node statuses
2. Retrieves node resource usage through metrics-server API
3. Triggers alerts when a node is in Ready status but has no metrics data beyond threshold time
4. Sends alert messages via Feishu Webhook

## Requirements

- Kubernetes 1.16+
- metrics-server deployed in the cluster
- Feishu bot Webhook URL

## Environment Variable Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `CLUSTER_NAME` | Cluster name | Optional | `default` |
| `FEISHU_WEBHOOK_URL` | Feishu bot Webhook URL | Required | `https://open.feishu.cn/open-apis/bot/v2/hook/xxx` |
| `CHECK_INTERVAL` | Interval for checking node status | `30s` | `1m`, `30s` |
| `ALERT_THRESHOLD` | Time before triggering alert when no metrics | `1m` | `3m`, `180s` |
| `ALERT_INTERVAL` | Minimum interval for repeat alerts on same node | `5m` | `10m`, `600s` |
| `POD_NAME` | Pod name for leader election | Optional | Set by Kubernetes |
| `POD_NAMESPACE` | Pod namespace for leader election | Optional | Set by Kubernetes |

## Alert Example

When a zombie node is detected, you will receive a Feishu message like:

```text
⚠️ Node Monitor Alert

Cluster Name: production
Node Name: worker-node-1
Description: Node is Ready, but no metrics data for 5m30s
Alert Time: 2024-01-15 10:30:45
```

## Deployment

### Using kubectl

```bash
kubectl apply -f deployment.yaml
```

### Environment Variables

Make sure to set the following environment variables:

```yaml
env:
  - name: FEISHU_WEBHOOK_URL
    value: "https://open.feishu.cn/open-apis/bot/v2/hook/your-webhook-url"
  - name: CLUSTER_NAME
    value: "production"
  - name: CHECK_INTERVAL
    value: "30s"
  - name: ALERT_THRESHOLD
    value: "3m"
  - name: ALERT_INTERVAL
    value: "10m"
  - name: POD_NAME
    valueFrom:
      fieldRef:
        fieldPath: metadata.name
  - name: POD_NAMESPACE
    valueFrom:
      fieldRef:
        fieldPath: metadata.namespace
```

## Health Checks

The service exposes health check endpoints on port 8080:

- `/healthz` - Liveness probe
- `/readyz` - Readiness probe

## Leader Election

When `POD_NAME` and `POD_NAMESPACE` are set, the service will run with leader election enabled. Only one pod will actively monitor nodes at a time, ensuring high availability without duplicate alerts.

## Architecture

The codebase is organized into multiple files:

- `main.go` - Entry point and initialization
- `monitor.go` - Core monitoring logic
- `alert.go` - Feishu alert functionality
- `leader_election.go` - Leader election logic
- `health.go` - Health check server
- `types.go` - Type definitions and constants
- `utils.go` - Utility functions

## License

This project is licensed under the Apache License 2.0.
