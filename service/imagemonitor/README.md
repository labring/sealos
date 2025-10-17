# Image Monitor Service

A real-time Kubernetes image pull monitoring service for Sealos, designed to track and analyze container image pulling issues with Prometheus metrics integration.

## Overview

Image Monitor Service acts as a monitoring layer for Kubernetes cluster image pull operations, providing:

- **Real-time Pod Monitoring**: Continuously watches Pod events using Kubernetes Informer mechanism
- **Image Pull Failure Detection**: Automatically detects and classifies various image pull failures
- **Slow Pull Alerts**: Tracks and alerts on slow image pull operations (>3 minutes)
- **Prometheus Metrics**: Exports detailed metrics for monitoring and alerting
- **Intelligent Classification**: Categorizes failures by root cause (network errors, auth issues, image not found, etc.)
- **Graceful Shutdown**: Proper signal handling for zero-downtime deployments

## Architecture

```
┌─────────────────┐
│   Kubernetes    │
│   API Server    │
└────────┬────────┘
         │ Watch Pods
         ▼
┌──────────────────┐     ┌──────────────────┐
│  Image Monitor   │────▶│   Prometheus     │
│     Service      │     │     Metrics      │
└──────────────────┘     └──────────────────┘
         │
         ▼
  ┌──────────────┐
  │ Failure      │
  │ Analyzer     │
  │ - Network    │
  │ - Auth       │
  │ - Not Found  │
  │ - Slow Pull  │
  └──────────────┘
```

### Key Components

- **Pod Informer**: Watches all Pod resources across the cluster, tracking image pull status changes
- **Failure Analyzer** (`analyzer.go`): Analyzes container status and identifies image pull errors
- **Failure Classifier** (`classifier.go`): Categorizes failures into specific types using regex pattern matching
- **Slow Pull Tracker** (`slow_pull.go`): Monitors pulling duration and triggers alerts for slow operations
- **Metrics Exporter** (`metrics.go`): Exposes Prometheus metrics at `:8080/metrics`

## Features

- **Comprehensive Failure Classification**: Automatically identifies and categorizes:
  - Image not found (404, manifest unknown)
  - Proxy connection errors
  - Authentication/authorization failures
  - TLS handshake failures
  - I/O timeout issues
  - Connection refused errors
  - Network request failures
  - Back-off states

- **Slow Pull Detection**:
  - Tracks images in "ContainerCreating" state
  - Alerts when pulling exceeds 3-minute threshold
  - Clears alert when image finally succeeds or fails

- **Smart State Management**:
  - Preserves specific failure reasons over generic back-off states
  - Cleans up metrics when Pods are deleted
  - Handles both init containers and regular containers

- **Public Registry Focus**: Monitors only public registry images to avoid exposing private infrastructure

## Prerequisites

- Kubernetes cluster (v1.20+)
- In-cluster deployment with appropriate RBAC permissions
- Prometheus for metrics collection (optional but recommended)
- Go 1.24+ (for development)

## Metrics

The service exposes two main Prometheus metrics:

### `image_pull_failure`
Tracks active image pull failures with detailed labels.

**Type**: Gauge
**Labels**:
- `namespace`: Pod namespace
- `pod`: Pod name
- `node`: Node where pull is failing
- `registry`: Container registry (e.g., docker.io, ghcr.io)
- `image`: Full image reference
- `reason`: Classified failure reason

**Example**:
```promql
image_pull_failure{
  namespace="default",
  pod="my-app-xyz",
  node="node-1",
  registry="docker.io",
  image="nginx:latest",
  reason="image_not_found"
} 1
```

### `image_pull_slow_alert`
Tracks slow image pull operations (>3 minutes).

**Type**: Gauge
**Labels**:
- `namespace`: Pod namespace
- `pod`: Pod name
- `container`: Container name
- `image`: Full image reference

**Example**:
```promql
image_pull_slow_alert{
  namespace="default",
  pod="my-app-xyz",
  container="app",
  image="docker.io/myimage:v1.0"
} 1
```
