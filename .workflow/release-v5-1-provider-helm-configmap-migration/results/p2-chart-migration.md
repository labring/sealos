# P2 Chart Migration Result

Accepted:
- `dbprovider` now has `deploy/charts/dbprovider-frontend` with Chart.yaml, values, ConfigMap, Deployment, Service, Ingress, App CR, and RBAC templates.
- `template` now has `deploy/charts/template-frontend` with Chart.yaml, values, ConfigMap, Deployment, Service, Ingress, App CR, CronJob, and RBAC templates.
- `dbprovider/deploy/Kubefile` and `template/deploy/Kubefile` now copy `charts` and their entrypoint scripts, then run `bash *-frontend-entrypoint.sh`.
- The old `deploy/manifests` directories were kept for comparison and rollback context.

Rejected:
- Did not import main branch app config schemas or business env content.
- Did not rename release-v5.1 env variables.

Conflicts:
- None observed.

Decisions:
- Entrypoints prefer `sealos-system/sealos-config` for cloud domain/port/cert when available, then fall back to existing release env names/defaults.
- Chart templates preserve old resource names where resources existed, using `fullnameOverride` defaults.

Remaining risks:
- Live Helm adoption should be tested in a real cluster before production rollout because labels/annotations are mutated during entrypoint execution.
