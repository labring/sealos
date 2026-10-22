# Native desktop workspace quota API

`GET /api/workspace/getQuota` adapts Kubernetes ResourceQuota to the native
desktop client's billing overview contract. It reports allocated resource usage,
not AIProxy token consumption, actual CPU/memory utilization, or account balance.
No additional configuration or environment variables are required.

Send the regional token in `Authorization`, as for `/api/account/getAmount`.
The workspace is always taken from the verified token's `workspaceId`; query
parameters and request bodies cannot select another workspace. Reads use the
user's kubeconfig and Kubernetes RBAC. The endpoint does not modify resources.

The response uses the existing desktop API envelope:

```json
{
  "code": 200,
  "message": "",
  "data": {
    "quota": [
      { "type": "cpu", "used": 250, "limit": 2000 },
      { "type": "memory", "used": 512, "limit": 4096 },
      { "type": "storage", "used": 2048, "limit": 102400 },
      { "type": "pod", "used": 3, "limit": 20 },
      { "type": "nodeport", "used": 1, "limit": 5 }
    ]
  }
}
```

| Client type | ResourceQuota keys, in priority order        | Response unit |
| ----------- | -------------------------------------------- | ------------- |
| `cpu`       | `limits.cpu`, `requests.cpu`, `cpu`          | millicores    |
| `memory`    | `limits.memory`, `requests.memory`, `memory` | Mi            |
| `storage`   | `requests.storage`                           | Mi            |
| `pod`       | `pods`, `count/pods`                         | count         |
| `nodeport`  | `services.nodeports`                         | count         |

Both `used` and `limit` come from the same selected key in
`quota-<workspaceId>.status`. Unconfigured resources are omitted, configured zero
limits are preserved, and absent usage defaults to zero. Kubernetes decimal SI,
binary SI and exponent quantities are converted to the response units.

Responses include `Cache-Control: no-store`. As with existing desktop APIs,
clients must inspect envelope `code` even when HTTP status is 200: 401 means an
invalid regional token, 403 means Kubernetes denied access, 404 means the user's
kubeconfig or quota was not found, and 500 means the read or normalization failed
(including unavailable quota status). These failures return `data: null`, never
a successful empty quota. Non-GET requests return envelope code 405 and `Allow: GET`.

This endpoint preserves the current native client contract. The client's combined
balance/quota failure handling remains unchanged; deploying the endpoint addresses
the missing-route error but does not prove authenticated billing acceptance.
