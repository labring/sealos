# Product

## Register

product

## Users

Sealos users and operators who need to launch, inspect, and operate applications without manually composing Kubernetes manifests. The primary user is in a task flow: choose an image or YAML, configure resources and networking, deploy, then return later to debug pods, logs, metrics, storage, and access settings.

Developers and API consumers also use the v1/v1alpha/v2alpha routes to automate application lifecycle operations with a kubeconfig authorization header.

## Product Purpose

App Launchpad turns Kubernetes application deployment into a guided product surface. Success means users can create a working app, understand its health, adjust operational settings, and recover from common deployment or networking failures without dropping into raw cluster tooling.

The provider also acts as a compatibility layer between Sealos Desktop session state, Launchpad UI state, public API schemas, and Kubernetes resources such as Deployment, StatefulSet, Service, Ingress, HPA, Secret, and ConfigMap.

## Brand Personality

Calm, precise, operational. The UI should feel like a trustworthy control panel: dense enough for repeated work, explicit about consequences, and direct when cluster-side errors need user action.

## Anti-references

Do not make Launchpad feel like a marketing page, decorative dashboard, or generic SaaS hero. Avoid oversized empty compositions, ornamental gradients, cute copy, hidden destructive actions, and vague infrastructure errors.

Do not bury cluster incompatibilities or ownership conflicts behind generic failure messages when the backend can identify a reliable product-level cause.

## Design Principles

- Keep the task visible: create, edit, inspect, and operate flows should prioritize current state, next action, and validation feedback.
- Translate infrastructure into product language: raw Kubernetes errors are acceptable for debugging detail, but user-facing decisions need clear conflict, quota, permission, and readiness messages.
- Preserve API and UI parity: changes to networking, public domains, app shape, or validation must stay aligned across form state, YAML adaptation, legacy APIs, and v2alpha APIs.
- Optimize for repeat operators: lists, forms, tables, logs, and monitoring surfaces should remain compact, predictable, and fast to scan.
- Prefer local proof over assumption: development workflows should state the required kubeconfig, config file, port-forward, and verification commands.

## Accessibility & Inclusion

Use familiar product UI controls, visible focus states, readable 12-16px interface text, non-color-only status indicators, and predictable keyboard behavior in forms, tabs, menus, tables, and modal dialogs. Motion should communicate state only and should never block the user's task.
