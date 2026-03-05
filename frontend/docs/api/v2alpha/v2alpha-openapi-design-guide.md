# v2alpha API OpenAPI Design Guide

> **Companion to** [`v2alpha-api-error-design.md`](./v2alpha-api-error-design.md) — read that doc first for error type/code conventions. This guide covers document structure, authoring standards, and cross-provider consistency rules.

---

## 1. Document Metadata

### 1.1 OpenAPI Version

All documents must declare version `3.1.0`.

```yaml
openapi: '3.1.0'
```

### 1.2 `info` Section

| Field         | Required | Standard                                                |
| ------------- | -------- | ------------------------------------------------------- |
| `title`       | ✓        | `<Service Name> API` — e.g. `Application Launchpad API` |
| `version`     | ✓        | `2.0.0-alpha` for all v2alpha APIs                      |
| `description` | ✓        | Markdown; follow the structure below                    |

**`info.description` required sections** (in this order):

````markdown
<One-sentence description of what this service is and what the API lets you do.>

## Authentication

<Auth method, header format, and how to obtain credentials.>

## Errors

All error responses use a unified format:

```json
{
  "error": {
    "type": "validation_error",
    "code": "INVALID_PARAMETER",
    "message": "...",
    "details": [...]
  }
}
```
````

- `type` — high-level category (e.g. `validation_error`, `resource_error`, `internal_error`)
- `code` — stable identifier for programmatic handling
- `message` — human-readable explanation
- `details` — optional extra context; shape varies by `code` (field list, string, or object)

## Operations

**Query** (read-only): returns `200 OK` with data in the response body.

**Mutation** (write):

- Create (sync) → `201 Created` with the created resource in the response body.
- Create (async) → `202 Accepted` with a minimal status body `{ "name": "...", "status": "creating" }`.
  Use when the resource is provisioned asynchronously and the final state is not yet available.
  Poll the corresponding `GET` endpoint to track progress.
- Update / Delete / Action → `204 No Content` with no response body.

````

---

## 2. Servers

Standard server list for all providers:

```ts
servers: [
  {
    url: 'http://localhost:3000/api/v2alpha',
    description: 'Local development'
  },
  {
    url: 'https://<service>.<domain>/api/v2alpha',
    description: 'Production'
  },
  {
    url: '{baseUrl}/api/v2alpha',
    description: 'Custom',
    variables: {
      baseUrl: {
        default: 'https://<service>.example.com',
        description: 'Base URL of your instance (e.g. https://<service>.192.168.x.x.nip.io)'
      }
    }
  }
]
````

Rules:

- **No hard-coded internal IPs** (e.g. `192.168.12.53`). Use the `Custom` variable entry instead.
- **No broken URLs** (e.g. `https://template./api/v2alpha` is invalid — the domain is missing).
- **No duplicate `description` values**. Each entry must be uniquely named.
- The `Production` URL must resolve to a real address or be generated dynamically at runtime.

---

## 3. Tags

Use exactly two tags. Their `description` must be consistent word-for-word across all providers:

```ts
tags: [
  {
    name: 'Query',
    description: 'Read-only operations. Success: `200 OK` with data in the response body.'
  },
  {
    name: 'Mutation',
    description:
      'Write operations. Sync create: `201 Created` with the new resource. ' +
      'Async create: `202 Accepted` with `{ name, status }` (poll GET to track progress). ' +
      'Update/Delete/Action: `204 No Content`.'
  }
];
```

Every operation must carry exactly one tag: `'Query'` or `'Mutation'`.

---

## 4. Security / `securitySchemes`

### 4.1 Kubeconfig-only authentication (applaunchpad, template, …)

```ts
components: {
  securitySchemes: {
    kubeconfigAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'Authorization',
      description:
        'URL-encoded kubeconfig YAML. Encode with `encodeURIComponent(kubeconfigYaml)` ' +
        'before setting the header value. Obtain your kubeconfig from the Sealos console.'
    }
  }
},
security: [{ kubeconfigAuth: [] }]
```

Declare `security` at the **root level**. Per-operation `security` overrides are only needed for endpoints with different requirements (e.g. a public read-only endpoint that skips auth).

### 4.2 Dual-auth (aiproxy)

aiproxy accepts two mutually exclusive credential types in the same `Authorization` header. Document both schemes and declare them as root-level OR alternatives:

```ts
components: {
  securitySchemes: {
    sealosAppToken: {
      type: 'http',
      scheme: 'bearer',
      description:
        'Sealos-issued App Token (a signed token specific to the Sealos platform). ' +
        'Obtain from the Sealos console. ' +
        'Header: `Authorization: Bearer <appToken>`'
    },
    kubeconfigAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'Authorization',
      description:
        'URL-encoded kubeconfig YAML. ' +
        'Header: `Authorization: <encodeURIComponent(kubeconfigYaml)>`'
    }
  }
},
// OpenAPI "security" array means OR — provide exactly one credential type per request.
security: [{ sealosAppToken: [] }, { kubeconfigAuth: [] }]
```

---

## 5. Path Naming

| Resource type       | Pattern                      | Examples                                     |
| ------------------- | ---------------------------- | -------------------------------------------- |
| Collection          | `/<resources>`               | `/apps`, `/tokens`, `/templates`             |
| Single item         | `/<resources>/{name}`        | `/apps/{name}`, `/tokens/{name}`             |
| Sub-resource        | `/<resources>/{name}/<sub>`  | `/apps/{name}/storage`                       |
| Action (not a noun) | `/<resources>/{name}/<verb>` | `/apps/{name}/start`, `/apps/{name}/restart` |

- Use **plural nouns** for collections.
- Use **lowercase with hyphens** for multi-word path segments.
- Path parameter names use **camelCase** (e.g. `{templateName}`).

---

## 6. Operations

### 6.1 Required Fields

| Field         | Requirement                                       |
| ------------- | ------------------------------------------------- |
| `tags`        | Exactly one: `'Query'` or `'Mutation'`            |
| `summary`     | Short verb phrase, ≤ 10 words, no trailing period |
| `description` | See §6.2                                          |
| `operationId` | See §6.3                                          |
| `responses`   | All applicable HTTP codes (see §9)                |

### 6.2 Description Guidelines

Descriptions must be written from the **API consumer's perspective** — what it does and what to expect, not how it is implemented.

**Never include:**

- Internal routing logic (`"when path is instances, request is delegated to…"`)
- Historical API structure (`"no separate /configmap endpoint"`)
- Implementation mechanism detail that has no impact on API behaviour

**Format for non-trivial endpoints:**

```
<One-sentence purpose.>

Key points:
- <Non-obvious constraint or behaviour>
- <Another constraint or behaviour>
```

Use `**Bold**` for warnings (e.g. `**Irreversible.**`). Use fenced code blocks sparingly and only for request/response examples.

### 6.3 `operationId` Convention

Format: `{verb}{Resource}` in camelCase.

| HTTP method               | Verb                                         |
| ------------------------- | -------------------------------------------- |
| `GET` on collection       | `list`                                       |
| `GET` on single item      | `get`                                        |
| `POST` (create)           | `create`                                     |
| `PATCH`                   | `update`                                     |
| `PUT`                     | `replace`                                    |
| `DELETE`                  | `delete`                                     |
| `POST` on action sub-path | the action verb: `start`, `pause`, `restart` |

Examples: `listApps`, `getApp`, `createApp`, `updateApp`, `deleteApp`, `startApp`, `pauseApp`, `restartApp`.

`operationId` must be **unique within the document**.

---

## 7. Parameters

### 7.1 Path Parameters

Every path parameter must declare all of the following:

```ts
{
  name: 'name',
  in: 'path',
  required: true,
  description: '<What this identifies> (format: <format constraints>)',
  schema: {
    type: 'string',
    minLength: 1,
    // maxLength if applicable
    example: '<realistic-value>'
  }
}
```

**Consistency rule:** When the same path parameter appears on multiple operations in the same path item (e.g. `GET`, `PATCH`, and `DELETE` on `/apps/{name}`), the `description` and `schema` constraints must be identical across all of them.

### 7.2 Query Parameters

- Always declare `required: false` explicitly (do not rely on the implicit default).
- Always set `default` for parameters that have one.
- Always include `example`.

---

## 8. Request Body

```ts
requestBody: {
  required: true,   // always set explicitly for mutation endpoints
  content: {
    'application/json': {
      schema: <ZodSchema | $ref>
    }
  }
}
```

### 8.1 Request Body Examples

`zod-openapi`'s `createDocument` does not carry `examples` through to the output when `schema` is a Zod type — the field is silently dropped. Do **not** place `examples` as a sibling of `schema` in the media type object.

**Use `description` markdown code blocks instead:**

````ts
description:
  'Creates a new application.\n\n' +
  '**Example — minimal deployment:**\n' +
  '```json\n' +
  '{ "name": "web-api", "image": { "imageName": "nginx:1.21" }, "quota": { "cpu": 0.5, "memory": 1, "replicas": 1 } }\n' +
  '```\n\n' +
  '**Example — HPA auto-scaling:**\n' +
  // ...
````

Rules:

- At least **one example** is required per complex request body (any body with more than one top-level field or nested objects).
- Use `**Example — <scenario>:**` as the heading for each code block.
- Each `value` must be a realistic, copy-paste-ready JSON snippet.
- Simple request bodies (a single flat field or trivially self-evident schema) do not need an example.

> This limitation does not affect **response** `examples` or **error** schema `examples` — those use plain JSON Schema objects and are passed through correctly.

---

## 9. Responses

### 9.1 Success Responses

| Scenario                       | Code             | Body                                      |
| ------------------------------ | ---------------- | ----------------------------------------- |
| Query (`GET`)                  | `200 OK`         | JSON resource or collection               |
| Create (`POST`) — sync         | `201 Created`    | JSON of the created resource              |
| Create (`POST`) — async        | `202 Accepted`   | `{ "name": "...", "status": "creating" }` |
| Update (`PATCH` / `PUT`)       | `204 No Content` | none                                      |
| Delete (`DELETE`)              | `204 No Content` | none                                      |
| Action (`POST /…/start`, etc.) | `204 No Content` | none                                      |

**Async create (`202`)** — use when the resource is provisioned by a background controller (e.g. a Kubernetes operator) and the final state is not yet known at request time. The response body must include at minimum `name` (the resource name) and `status` (always `"creating"`). The operation description must direct the caller to poll `GET /{resource}/{name}` to track progress.

Always include a `description` on `204` responses (e.g. `'Application started successfully'`).

### 9.2 Idempotency

An operation is **idempotent** if identical inputs always produce the same HTTP status code, regardless of how many times it is called.

| Operation          | Idempotent? | Behaviour                                                            |
| ------------------ | ----------- | -------------------------------------------------------------------- |
| `start`            | ✓           | If already running → `204` (not `409`)                               |
| `pause`            | ✗           | If already paused → `409 CONFLICT`; reason depends on implementation |
| `restart`          | ✓           | Always triggers a rolling restart → `204`                            |
| `delete`           | ✓           | If resource does not exist → `204` (not `404`)                       |
| `create` (default) | ✗           | If resource already exists → `409 ALREADY_EXISTS`                    |

> Do not use the word "idempotent" in a description unless the operation truly is idempotent — i.e. it never returns `409` or `404` for repeated identical requests.

#### Get-or-Create pattern (idempotent create)

Some create operations use **get-or-create** semantics: if the resource already exists the request succeeds and returns the existing resource rather than an error. This is an intentional deviation from the default and must be explicitly justified and declared.

**When to use it:**

- The caller's intent is "ensure this resource exists", not "create a new one" (e.g. provisioning a token for a service on startup).
- Duplicate creation is expected and harmless from a business perspective.
- The resource does **not** contain a one-time secret that is only available at creation time (if it does, a duplicate request would silently return a masked/useless value — use the always-201 variant below instead).

Do **not** declare `409` on an endpoint that uses get-or-create semantics.

**Variant A — 201/200 (backend can distinguish new vs. existing):**

Declare both response codes and explain the difference in the operation `description`:

```ts
description:
  'Creates a new token. ' +
  'If a token with this name already exists it is returned as-is (`200 OK`) ' +
  'rather than producing an error. ' +
  'The full unmasked `key` is **only present in the `201` response** — ' +
  'store it securely as it will not be shown again.',

responses: {
  '201': { description: 'Token created. The `key` field contains the full unmasked API key.' },
  '200': { description: 'A token with this name already existed and is returned as-is.' },
  // ... error responses
}
```

**Variant B — always 201 (backend cannot distinguish, or uses `ignore_exist` flag):**

Use when the backend always returns success without distinguishing new vs. existing. Declare only `201`:

```ts
description:
  'Creates a new API token. Always returns `201`. ' +
  'If a token with this name already exists it is returned as-is rather than producing an error.',

responses: {
  '201': { description: 'Token created or returned as-is if it already existed.' },
  // ... error responses
}
```

### 9.3 Error Responses

For the full type/code taxonomy and which type/code values are permitted under each HTTP status, see [`v2alpha-api-error-design.md`](./v2alpha-api-error-design.md). This section only covers **which HTTP status codes to declare in your OpenAPI document**.

**Always declare:**

| Code  | Condition                                           |
| ----- | --------------------------------------------------- |
| `400` | Any endpoint with path parameters or a request body |
| `401` | Any authenticated endpoint                          |
| `500` | All endpoints                                       |

**Declare any other status code your endpoint can realistically emit.** The full set of supported status codes, their permitted type/code values, and when each applies is defined in [`v2alpha-api-error-design.md`](./v2alpha-api-error-design.md) — that document is the single source of truth. When a new status code is added there, no change is needed here.

**Each error response must include:**

1. A `schema` using the appropriate `create*Schema` factory from `types/v2alpha/error`.
2. At least one `example` per listed `code` using `createErrorExample`.

When a schema lists multiple codes, provide a separate named example for each — do not leave a declared code without an example.

---

## 10. Components

Use `$ref` for any schema referenced in more than one place. Place all reusable schemas in `components/schemas`.

**Naming convention:** PascalCase for schema names (e.g. `AppInfo`, `TokenListResponse`, `StorageVolume`).

---

## 11. Nullable Fields

In OpenAPI 3.1.0, use JSON Schema union syntax. Do **not** use the deprecated `nullable: true` from 3.0.x.

```ts
// ✓ 3.1.0
{ type: ['string', 'null'], example: null }

// ✗ 3.0.x — invalid in 3.1.0
{ type: 'string', nullable: true }
```

For Zod schemas, use `.nullable()` — `zod-openapi` and `zodToJsonSchema` both emit the correct 3.1.0 syntax automatically.

---

## 12. Example Standards

- Use **realistic values**, not placeholders like `string`, `123`, or `foo`.
- Resource names: use Kubernetes-style DNS names — `web-api`, `my-perplexica-instance`.
- Timestamps: **Unix epoch seconds** (integer) for stored values; **ISO 8601** for display strings.
- API keys: always mask — `sk-****abc123`. Never show real keys.
- URLs: use plausible-looking hostnames — `https://xyz789abc.cloud.sealos.io`.
- Kubernetes errors in `details`: use real K8s error message format — `'deployments.apps "web-api" not found'`.
