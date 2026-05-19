# Devbox Product Context

Devbox gives Sealos users a browser-managed development environment that can be
created from runtime templates, configured with resources and network access,
opened in IDEs, released, and deployed as an application.

## Primary Users

- Developers who need an on-demand cloud development environment.
- Template maintainers who convert existing DevBoxes into reusable templates.
- Platform operators who configure feature flags, runtime catalogs, pricing,
  ingress domains, storage defaults, IDE availability, and database provider
  settings for a region.

## Core Jobs

- Create a DevBox from a runtime/template with CPU, memory, GPU, storage, and
  network settings.
- Open the DevBox in configured IDEs such as VS Code, Cursor, Web IDE, or other
  enabled options.
- Edit an existing DevBox without rebuilding the mental model from YAML.
- Expose ports through generated public domains or user custom domains.
- Release a DevBox version and deploy it as an app.
- Convert a configured DevBox into a reusable template while reviewing
  environment variables and ConfigMap defaults.

## Product Boundaries

- This provider owns the frontend and provider API surface. It does not own the
  DevBox controller, runtime image internals, account service, monitor service,
  registry service, or desktop shell.
- Provider-side changes can generate Kubernetes resources and patch existing
  resources, but runtime behavior inside the user container belongs to the
  runtime/controller layer.
- Database schema and migration execution must be explicit because this repo
  supports both CockroachDB and PostgreSQL Prisma schemas.
