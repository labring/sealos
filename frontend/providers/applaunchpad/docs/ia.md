# Information Architecture

## Routes

- `/apps`: application list.
- `/app/edit`: create and edit application form.
- `/app/detail`: application detail, network addresses, status, logs, and monitoring entry points.
- `/api-docs`: rendered OpenAPI reference.

## API Areas

- `src/pages/api/v1`: v1 Launchpad API.
- `src/pages/api/v2alpha`: v2alpha Launchpad API and OpenAPI document.
- `src/pages/api/platform`: platform helper APIs, including custom-domain verification and init data.
- `src/pages/api/kubeFileSystem`: pod filesystem helpers.
- `src/pages/api/log` and monitor routes: logs and metrics retrieval.

## Main Modules

- `src/pages/app/edit/components`: create/edit form sections.
- `src/components/app/detail`: detail page sections.
- `src/types`: v1 schemas and OpenAPI helpers.
- `src/types/v2alpha`: v2alpha schemas, OpenAPI helpers, and API error shapes.
- `src/utils/deployYaml2Json.ts`: converts app form data into Kubernetes YAML.
- `src/utils/adapt.ts`: adapts Kubernetes resources back into app detail data.
