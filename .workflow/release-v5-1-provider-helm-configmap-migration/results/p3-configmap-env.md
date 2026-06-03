# P3 ConfigMap Env Result

Accepted:
- `applaunchpad` now stores `NODE_TLS_REJECT_UNAUTHORIZED` in the chart ConfigMap and the Deployment reads it with `configMapKeyRef`.
- `terminal` now stores `TTYD_IMAGE`, `SITE`, and `KEEPALIVED` in the chart ConfigMap and the Deployment reads them with `configMapKeyRef`.
- `dbprovider` now stores its release-v5.1 container env keys in the chart ConfigMap and the Deployment reads each with `configMapKeyRef`.
- `template` now stores its release-v5.1 container env keys in the chart ConfigMap and the Deployment reads each with `configMapKeyRef`.

Rejected:
- Did not use broad `envFrom` because the ConfigMaps also include `config.yaml`/`config.json`, which are not valid env var names.
- Did not add main branch-specific env names such as split migration image vars.

Conflicts:
- None observed.

Decisions:
- Keep app code unchanged and preserve `process.env` behavior by changing only Kubernetes env sourcing.
- Use explicit ConfigMap key references to avoid invalid env var events.

Remaining risks:
- Quoting behavior for empty strings depends on Helm-rendered ConfigMap values; rendered manifests were inspected and preserve empty-string values.
