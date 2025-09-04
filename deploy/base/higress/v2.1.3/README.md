# Higress by sealos

Higress is an open-source cloud-native API gateway and service mesh built on top of Kubernetes, Envoy, and Istio. It provides a unified platform for managing and securing APIs and microservices in a cloud-native environment.

## Changes

- Base on helm chart from [higress](https://higress.io/helm-charts)
- add condition for higress console
- add redis cache image values

## Usage

```bash

sealos run -e CLOUD_PORT=443 -e CLOUD_DOMAIN=sealos.cloud   ghcr.io/labring/sealos/higress:v2.1.3

```