# v2alpha API Error Design

> **Implementation:** `packages/shared/src-server/v2alpha/error.ts` (exported as `@sealos/shared/server/v2alpha`)

## Response Structure

All error responses use a unified format, wrapped in an `error` object:

```json
{
  "error": {
    "type": "validation_error",
    "code": "INVALID_PARAMETER",
    "message": "Request body validation failed.",
    "details": [{ "field": "image.imageName", "message": "Required" }]
  }
}
```

| Field     | Required | Description                                                                             |
| --------- | -------- | --------------------------------------------------------------------------------------- |
| `type`    | ✓        | High-level error category                                                               |
| `code`    | ✓        | Specific error code for programmatic handling and i18n                                  |
| `message` | ✓        | Human-readable description                                                              |
| `details` | -        | Extra context. Shape depends on `code`; see [details Conventions](#details-conventions) |

---

## HTTP Status Codes

| Status | Status Text           | Description                                                                                                                                                                                            |
| ------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 400    | Bad Request           | The request is invalid. Either the parameters failed validation (wrong type, missing required field), or the operation is not allowed for the current resource state. Fix the request before retrying. |
| 401    | Unauthorized          | No valid credentials were provided, or the credentials have expired. Re-authenticate and retry.                                                                                                        |
| 403    | Forbidden             | The request is authenticated but the identity lacks permission to perform this operation.                                                                                                              |
| 404    | Not Found             | The specified resource does not exist. Verify the identifier and try again.                                                                                                                            |
| 405    | Method Not Allowed    | The HTTP method used is not supported on this endpoint. Check the `Allow` response header for the correct method.                                                                                      |
| 409    | Conflict              | The request conflicts with current state — the resource already exists, or a concurrent modification was detected.                                                                                     |
| 500    | Internal Server Error | The server failed to complete the request. This may be a transient issue (retry later) or a persistent failure (check `details` and report to support).                                                |

### Status Code → type / code Constraints

Each HTTP status code has a fixed set of permitted `type` and `code` values. Using a value outside the permitted set is a contract violation.

| Status | Permitted `type`       | Permitted `code`                                                |
| ------ | ---------------------- | --------------------------------------------------------------- |
| 400    | `validation_error`     | `INVALID_PARAMETER`, `INVALID_VALUE`                            |
| 400    | `client_error`         | `UNSUPPORTED_OPERATION`, `STORAGE_REQUIRES_STATEFULSET`         |
| 401    | `authentication_error` | `AUTHENTICATION_REQUIRED`                                       |
| 403    | `authorization_error`  | `PERMISSION_DENIED`                                             |
| 404    | `resource_error`       | `NOT_FOUND`                                                     |
| 405    | `client_error`         | `METHOD_NOT_ALLOWED`                                            |
| 409    | `resource_error`       | `ALREADY_EXISTS`, `CONFLICT`                                    |
| 500    | `operation_error`      | `KUBERNETES_ERROR`, `STORAGE_UPDATE_FAILED`, `OPERATION_FAILED` |
| 500    | `internal_error`       | `INTERNAL_ERROR`, `SERVICE_UNAVAILABLE`                         |

> **Rules:**
>
> - A `type` must only appear under the HTTP status codes listed above for that type. For example, `authentication_error` must never be returned with a 400 or 500.
> - A `code` must only appear under its parent `type` (see [Error Code](#error-code) section). For example, `NOT_FOUND` must never be paired with `operation_error`.
> - `METHOD_NOT_ALLOWED` (405) is only used for unregistered HTTP methods caught at the framework level — individual endpoint handlers never emit it directly.

---

## Error Type

Update this table when adding new types.

| type                   | When to use                                                                                                                                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validation_error`     | Request body or path params **fail schema/type validation**. Structurally invalid — wrong type, format, or missing required field. Always include `details`.                                                                 |
| `client_error`         | Request passes schema validation but is **semantically disallowed**: wrong HTTP method, operation not supported for current workload type or state.                                                                          |
| `resource_error`       | Resource does not exist, already exists, or is in conflict.                                                                                                                                                                  |
| `operation_error`      | Request was valid and the resource exists, but the **server-side operation failed** during execution. `details` usually explains the cause; retrying with the same request may not help without fixing the underlying issue. |
| `authentication_error` | No valid credentials provided or credentials are expired.                                                                                                                                                                    |
| `authorization_error`  | Authenticated but lacks permission to perform the operation.                                                                                                                                                                 |
| `internal_error`       | Unexpected server exception or dependency failure. Not caused by the request itself — retrying later may succeed. Report to support if it persists.                                                                          |

> **Boundary rule — `validation_error` vs `client_error`:**
> Use `validation_error` when the request itself is structurally invalid (wrong type, format, missing field).
> Use `client_error` when the request is structurally valid but the operation is not allowed in the current context (e.g. calling storage update on a Deployment, or trying to pause an already-paused resource).

---

## Error Code

Update this table when adding new codes.

### validation_error

| code                | Description                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INVALID_PARAMETER` | Path param or body field failed validation (wrong type, format, missing required field, etc.). Check `details` for field-level issues.              |
| `INVALID_VALUE`     | Field passes type validation but violates a business rule (e.g. value out of range, mutually exclusive fields). Check `message` for the constraint. |

### client_error

| code                           | Description                                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `METHOD_NOT_ALLOWED`           | The HTTP method is not supported on this endpoint. Check the API docs for the correct method.                            |
| `UNSUPPORTED_OPERATION`        | The operation is not allowed in the current context (e.g. the resource state does not permit this action).               |
| `STORAGE_REQUIRES_STATEFULSET` | Storage management is only supported for StatefulSet workloads. _(Internal API — uses Kubernetes workload terminology.)_ |

### resource_error

| code             | Description                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| `NOT_FOUND`      | The requested resource does not exist. Verify the name or check if it was deleted.                   |
| `ALREADY_EXISTS` | A resource with this name or ID already exists. Use a different identifier.                          |
| `CONFLICT`       | The request conflicts with the current resource state (e.g. concurrent modification, port conflict). |

### operation_error

| code                    | Description                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| `KUBERNETES_ERROR`      | A Kubernetes API call returned an error. `details` contains the raw K8s error message for troubleshooting. |
| `STORAGE_UPDATE_FAILED` | StatefulSet recreation or PVC update failed. `details` contains the underlying error.                      |
| `OPERATION_FAILED`      | Generic operation failure. Use when no more specific code applies.                                         |

### authentication_error

| code                      | Description                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| `AUTHENTICATION_REQUIRED` | No valid credentials were provided, or the credentials are expired. Re-authenticate and retry. |

### authorization_error

| code                | Description                                                                    |
| ------------------- | ------------------------------------------------------------------------------ |
| `PERMISSION_DENIED` | The authenticated identity does not have permission to perform this operation. |

### internal_error

| code                  | Description                                                                    |
| --------------------- | ------------------------------------------------------------------------------ |
| `INTERNAL_ERROR`      | Unexpected server-side exception. Retry later; contact support if it persists. |
| `SERVICE_UNAVAILABLE` | A required dependency is temporarily unavailable. Retry later.                 |

---

## details Conventions

The shape of `details` depends on `code` — always check `code` before consuming `details`.

| code                    | details shape                                                | Example                                                   |
| ----------------------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| `INVALID_PARAMETER`     | `Array<{ field: string, message: string }>` — always present | `[{ "field": "ports[0].number", "message": "Required" }]` |
| `INVALID_VALUE`         | `string` — optional; omitted if `message` is sufficient      | `"cpu and memory must both be specified"`                 |
| `KUBERNETES_ERROR`      | `string` — raw error from the underlying system              | `"deployments.apps \"web-api\" not found"`                |
| `STORAGE_UPDATE_FAILED` | `string` — raw error from the underlying system              | `"cannot shrink PVC from 10Gi to 5Gi"`                    |
| `INTERNAL_ERROR`        | `string` — raw error, for support/debugging only             | `"TypeError: Cannot read properties of undefined"`        |
| All others              | `string` — optional; omit if nothing useful to add           | —                                                         |

---

## Server Usage

Import from `@sealos/shared/server/v2alpha`. Use `buildErrorBody` / `buildValidationErrorBody` (framework-agnostic) and wrap them in a framework-specific helper.

### Pages Router (Next.js `pages/api/`)

```ts
import {
  ErrorType,
  ErrorCode,
  buildErrorBody,
  buildValidationErrorBody
} from '@sealos/shared/server/v2alpha';
import { NextApiRequest, NextApiResponse } from 'next';

// Generic error
res.status(404).json(
  buildErrorBody({
    type: ErrorType.RESOURCE_ERROR,
    code: ErrorCode.NOT_FOUND,
    message: 'Resource not found.'
  })
);

// Validation failure
res.status(400).json(buildValidationErrorBody(zodError, 'Request body validation failed.'));
```

Recommended thin wrapper for Pages Router providers:

```ts
import {
  buildErrorBody,
  buildValidationErrorBody,
  ErrorTypeValue,
  ErrorCodeType
} from '@sealos/shared/server/v2alpha';
import { NextApiResponse } from 'next';
import { ZodError } from 'zod';

export function sendError(
  res: NextApiResponse,
  config: {
    status: number;
    type: ErrorTypeValue;
    code: ErrorCodeType;
    message: string;
    details?: unknown;
  }
): void {
  res.status(config.status).json(buildErrorBody(config));
}

export function sendValidationError(
  res: NextApiResponse,
  error: ZodError,
  message = 'Validation failed'
): void {
  res.status(400).json(buildValidationErrorBody(error, message));
}
```

### App Router (Next.js `app/api/`)

```ts
import {
  ErrorType,
  ErrorCode,
  buildErrorBody,
  buildValidationErrorBody
} from '@sealos/shared/server/v2alpha';
import { NextResponse } from 'next/server';

// Generic error
return NextResponse.json(
  buildErrorBody({
    type: ErrorType.RESOURCE_ERROR,
    code: ErrorCode.NOT_FOUND,
    message: 'Resource not found.'
  }),
  { status: 404 }
);

// Validation failure
return NextResponse.json(buildValidationErrorBody(zodError, 'Request body validation failed.'), {
  status: 400
});
```

Recommended thin wrapper for App Router providers:

```ts
import {
  buildErrorBody,
  buildValidationErrorBody,
  ErrorTypeValue,
  ErrorCodeType
} from '@sealos/shared/server/v2alpha';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function sendError(config: {
  status: number;
  type: ErrorTypeValue;
  code: ErrorCodeType;
  message: string;
  details?: unknown;
}): NextResponse {
  return NextResponse.json(buildErrorBody(config), { status: config.status });
}

export function sendValidationError(error: ZodError, message = 'Validation failed'): NextResponse {
  return NextResponse.json(buildValidationErrorBody(error, message), { status: 400 });
}
```

---

## OpenAPI Documentation

Use the per-status-code schemas from `@sealos/shared/server/v2alpha` in your OpenAPI document. These schemas narrow `type` and `code` to only the values permitted for each HTTP status, producing clear documentation.

```ts
import {
  Error400Schema, Error401Schema, Error403Schema,
  Error404Schema, Error409Schema, Error500Schema,
  ErrorType, ErrorCode, createErrorExample
} from '@sealos/shared/server/v2alpha';

// In your createDocument() responses:
'400': {
  content: {
    'application/json': {
      schema: Error400Schema,
      examples: {
        invalidParam: {
          summary: 'Invalid parameter',
          value: createErrorExample(ErrorType.VALIDATION_ERROR, ErrorCode.INVALID_PARAMETER, 'Name is required.')
        }
      }
    }
  }
}
```
