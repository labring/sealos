# PRODUCT.md

## Product

Applaunchpad lets Sealos users deploy and manage containerized applications without hand-writing
Kubernetes manifests. It wraps image, resource, storage, environment, networking, domain, logs, and
monitoring workflows into a provider UI and API.

## Users

- Console users who need a guided create/edit flow for applications.
- Operators who need predictable Kubernetes objects and readable failure states.
- API users who automate Launchpad application creation and updates through v1 or v2alpha routes.

## Core Scenarios

- Create an app from an image and expose one or more ports.
- Edit resources, commands, environment variables, storage, and network settings.
- Configure public access through generated domains or custom domains.
- Inspect app status, logs, pod details, and monitoring data.
- Use OpenAPI routes for programmatic app lifecycle operations.

## Product Principles

- Keep UI behavior, YAML conversion, and API schemas aligned.
- Preserve existing network identity when users edit ports or public access.
- Surface infrastructure conflicts as clear product errors when possible.
- Respect underlying Kubernetes and DNS constraints instead of adding arbitrary product limits.

## Register

product
