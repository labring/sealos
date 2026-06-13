# Information Architecture

This document maps App Launchpad routes and the primary user workflows they support.

## Product Routes

| Route | Purpose |
| --- | --- |
| `/apps` | Application list, empty state, refresh, pod status, and monitor summaries. |
| `/app/edit` | Create a new application. |
| `/app/edit?name=<app>` | Edit an existing application. |
| `/app/detail?name=<app>` | Application detail overview, access info, advanced info, and pods. |
| `/app/detail/monitor?name=<app>` | Monitoring charts for app resources. |
| `/app/detail/logs?name=<app>` | Log query and pod log inspection. |
| `/api-docs` | API reference UI. |
| `/redirect` | Entry point for encoded form data redirection. |
| `/icons` | Icon utility page. |

## API Route Families

| Family | Purpose |
| --- | --- |
| `/api/platform/*` | Init data, quota, pricing, permission, image port detection, CNAME and domain challenge checks. |
| `/api/v1/*` | OpenAPI and v1 compatibility routes. |
| `/api/v1alpha/*` | Older lifecycle compatibility routes. |
| `/api/v2alpha/*` | Structured v2alpha API, OpenAPI output, and Kubernetes error mapping. |
| `/api/log/*` | Log service proxy routes. |
| `/api/monitor/*` | Monitor service proxy routes. |
| `/api/kubeFileSystem/*` | Pod file browser operations. |
| `/api/*App*`, `/api/*Pod*` | UI-backed lifecycle, pod, metrics, events, and detail routes. |

## Main Workflows

### Create Application

1. User enters image/YAML and app metadata in `/app/edit`.
2. Form state derives resource, storage, environment, command, and network configuration.
3. Image registry metadata may prefill exposed ports.
4. YAML preview reflects generated Kubernetes resources.
5. Submit path calls API routes with encoded kubeconfig.
6. Backend creates or applies Kubernetes resources in the user's namespace.

### Edit Application

1. Existing app data is loaded from Kubernetes resources.
2. App state is adapted back into form state.
3. User changes form fields or YAML.
4. Backend applies patch or replacement logic for changed resources.

### Observe and Operate

1. `/apps` polls visible app pod state and periodic monitor summaries.
2. `/app/detail` loads app detail, pod table, access info, and advanced state.
3. Monitor/log tabs proxy to cluster services with user kubeconfig authorization.
4. Lifecycle actions call API routes that operate on user namespace resources.

## Navigation Principles

- The app list is the task hub.
- Detail pages should preserve app context through the `name` query parameter.
- Create/edit should keep form, YAML preview, validation, and submit feedback tightly connected.
- API docs should reflect the same schema decisions used by backend handlers.
