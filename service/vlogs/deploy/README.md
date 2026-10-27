# vlogs Helm deployment

The chart, Kubefile and entrypoint follow `release-v5.1`. This package deploys the
VictoriaLogs query gateway; the log backend and shared installer configuration
must already exist.

## Installation

Build the runtime image from `service/vlogs` for both supported platforms:

```sh
make docker-buildx-push IMG=your-registry/sealos-vlogs-service:your-version
```

Package `deploy/` with Sealos and run the cluster image in the prepared cluster.
The Kubefile includes `registry`, `charts`, `remove` and `entrypoint.sh`. The
entrypoint must run from the package directory, with Helm, kubectl and the shared
installer tools available.

The default release is `vlogs` in namespace `sealos`. Resource names follow the
release: Service `vlogs` (port 8428), Deployment `vlogs-deployment`, ConfigMap
`vlogs-config`, and selector `app: vlogs`. Callers using the default release must
use `http://vlogs.sealos.svc:8428`. Changing `RELEASE_NAME` changes these names.

## Configuration sources and precedence

1. Load `/root/.sealos/cloud/scripts/tools.sh` and call
   `ensure_global_values_ready_for_component`. Missing tools or required functions
   stop installation with instructions to run `./sealos-pro.sh sync-config`.
2. Read `cloudDomain` from `sealos-system/sealos-config`; obtain the scheme and
   effective external port through `global_http_scheme` and
   `global_http_effective_port` to form the Kubernetes host whitelist.
3. Read `SELECT_USER` and `SELECT_PASSWORD` from `sealos-system/vlogs-config-user`.
   A missing domain, username or password stops installation.
4. Seed `/root/.sealos/cloud/values/core/vlogs-values.yaml` from
   `charts/vlogs/vlogs-monitor-values.yaml` if the file does not exist.
5. Run Helm with chart defaults, operator values, automatic configuration,
   `HELM_OPTIONS`, then `HELM_OPTS`, in that order. Later entries override earlier
   ones. In particular, automatic backend/credential/whitelist values override the
   operator file; use the Helm environment options to override those fields.

| Setting | Default | Purpose and override |
| --- | --- | --- |
| `RELEASE_NAME` | `vlogs` | Helm release and resource naming |
| `RELEASE_NAMESPACE` | `sealos` | Target namespace |
| `CHART_PATH` | `./charts/vlogs` | Chart location |
| `LEGACY_MANIFEST` | `./remove/deploy.yaml` | Old resources removed on first migration |
| `TOOLS_FILE` | `/root/.sealos/cloud/scripts/tools.sh` | Shared installer tools |
| `HELM_OPTIONS`, `HELM_OPTS` | empty | Additional Helm flags; `HELM_OPTS` is applied last |
| `image` | `ghcr.io/labring/sealos-vlogs-service:latest` | Pin the runtime image via Helm options |
| `imagePullPolicy` | `Always` | Image pull policy |
| `replicaCount` | `1` | Gateway replicas |
| `resources` | requests 5m/64Mi; limits 500m/1Gi | CPU/memory resources |
| `service.port` | `8428` | Service and listener port |
| `serviceVlogsConfig.path` | `http://usr-vlc-victoria-logs-cluster-vmauth.vlc.svc:8427` | Automatically supplied backend URL |
| `serviceVlogsConfig.username`, `.password` | empty in chart; supplied from ConfigMap | Backend Basic Auth |
| `serviceVlogsConfig.whitelistKubernetesHosts` | empty in chart; generated from global HTTP configuration | Injected as `WHITELIST_KUBERNETES_HOSTS` |

Set script options through exported environment variables or Sealos `--env`.
See [env.template](../env.template). The operator values path is fixed, matching
5.1; `USER_VALUES_PATH` and `BACKUP_DIR` are not supported environment overrides.
`HELM_OPTIONS` and `HELM_OPTS` are split on whitespace, matching the 5.1 script.
Protect values files, ConfigMaps and Helm release metadata containing credentials.

## Health probes

`GET /health` returns `200` and `{"status":"healthy"}` without authentication or
backend calls. Other methods return `405` with `Allow: GET`. It checks HTTP process
responsiveness, not database or log-query availability. Business routes retain
their normal authorization.

The chart and operator template contain the same probes as 5.1:

- startup: `/health:8428`, every 5s, timeout 3s, 30 failures;
- liveness: `/health:8428`, delay 3s, every 10s;
- readiness: `/health:8428`, delay 3s, every 5s, 6 failures.

Use an image containing the health endpoint. If overriding `service.port`, also
override all three probes' `httpGet.port`; 5.1 uses numeric probe ports.

## Migration behavior

On first installation (when `helm status` fails), the entrypoint deletes resources
listed in `remove/deploy.yaml`, then installs the release. This removes the old
`service-vlogs` Service, `service-vlogs-deployment` and `service-vlogs-config` in
namespace `sealos`. The cleanup manifest's namespace is fixed; changing
`RELEASE_NAMESPACE` does not change its cleanup target. Subsequent installations
use `helm upgrade -i` without repeating that cleanup.

Before a legacy migration, back up old configuration and arrange the caller
cutover to the release-based service address. This follows the 5.1 migration
behavior, not an in-place Helm adoption.

An installation managed by the earlier version of PR #7414 is different: Helm
release `vlogs` already owns `service-vlogs*` resources. Upgrading it to this chart
changes names/selectors and can replace/remove those resources. Treat that as a
separate deployment migration, with backups and caller cutover; do not assume a
code-alignment change is safe to roll out automatically.

## Verification

From `service/`:

```sh
go test -race ./vlogs/... ./pkg/server/...
go build ./vlogs/...
```

From `service/vlogs/deploy/`:

```sh
bash -n entrypoint.sh
helm lint charts/vlogs
helm template vlogs charts/vlogs -n sealos -f charts/vlogs/vlogs-monitor-values.yaml
```

A live deployment additionally requires checking the rollout, `/health`, and an
authorized log query. Local rendering does not verify installer configuration or
business availability. After a successful deployment, Helm history/rollback can
restore a previous Helm revision; the first legacy deletion has no Helm revision
and requires the pre-migration resource backup for recovery.
