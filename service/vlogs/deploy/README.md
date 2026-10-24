# vlogs deployment

This chart deploys the **query gateway**, not VictoriaLogs, vmauth or log collectors.
The backend and its query credentials must already exist. It exposes
`service-vlogs.sealos.svc:8428` by default. The resource names remain
`service-vlogs`, `service-vlogs-deployment` and `service-vlogs-config`, with the
legacy `app: service-vlogs` selector. Only one installation per namespace is supported.

## Install or migrate

Use Helm 3 and kubectl with access to the target cluster. From `service/vlogs/deploy`:

```sh
mkdir -p /root/.sealos/cloud/values/core
cp charts/vlogs/vlogs-values.yaml /root/.sealos/cloud/values/core/vlogs-values.yaml
chmod 600 /root/.sealos/cloud/values/core/vlogs-values.yaml
# Edit that file with the actual backend, query credentials and Kubernetes API URL(s).
bash entrypoint.sh --set-string image=your-registry/sealos-vlogs-service:your-version
```

For an existing installation, first copy `server.path`, `server.username` and
`server.password` from `service-vlogs-config`'s `config.yml`, and
`WHITELIST_KUBERNETES_HOSTS` from the Deployment into `serviceVlogsConfig` in the
values file. Preserve custom replicas, resources and image pull secrets there too.
The script does not infer or overwrite these settings from private installer tools.
Do not run an unmodified example values file against an existing deployment.

The entrypoint validates chart rendering, refuses resources owned by another
release or an incompatible Deployment selector, backs up the live resources and
operator values, adds Helm ownership metadata, and runs `helm upgrade --install`.
It does not delete legacy resources. If the values file is missing, it creates a
private template and exits **before modifying the cluster**. Keep using the same
release name and namespace on subsequent upgrades. Use an image that includes
`GET /health` before enabling these probes; older images may otherwise restart.

For a **fresh** namespace, Helm can also be used directly:

```sh
helm upgrade --install vlogs ./charts/vlogs -n sealos --create-namespace \
  -f /root/.sealos/cloud/values/core/vlogs-values.yaml \
  --set-string image=your-registry/sealos-vlogs-service:your-version --wait --timeout 5m
```

The Sealos cluster image's Kubefile packages the chart and entrypoint. Its
`sealos run` invocation uses the same default values path; export script options
using `--env USER_VALUES_PATH=...`, etc. It does not need the Pro installer tools.
The general `scripts/cloud/install-v2.sh` does not install a VictoriaLogs backend,
so this component is not added there unconditionally.

## Configuration

Chart defaults are in `charts/vlogs/values.yaml`. Override them with the private
operator file, extra `-f` files, or `--set` / `--set-string` / `--set-file` /
`--set-json` arguments to the entrypoint. Later overrides win. Shell arguments
are passed as arrays; values containing spaces are not split. Do not pass secrets
on the command line. Helm renders them into a ConfigMap and stores them in its
release metadata, matching the existing deployment model; restrict access to both.

| Value | Default | Purpose |
| --- | --- | --- |
| `image` | `ghcr.io/labring/sealos-vlogs-service:latest` | Gateway image; pin a tested version in deployments |
| `imagePullPolicy` | `Always` | Image pull policy |
| `imagePullSecrets` | `[]` | Registry credentials, as Kubernetes Secret name objects |
| `replicaCount` | `1` | Gateway replicas; existing `Recreate` strategy is preserved |
| `resources` | requests 5m/64Mi, limits 500m/1Gi | Container CPU and memory |
| `podAnnotations` | `{}` | Extra pod annotations |
| `service.port` | `8428` | Service and listener port; probes use the named `http` port |
| `serviceVlogsConfig.path` | `http://usr-vlc-victoria-logs-cluster-vmauth.vlc.svc:8427` | VictoriaLogs query endpoint |
| `serviceVlogsConfig.username` / `.password` | empty | Backend Basic Auth credentials, when required |
| `serviceVlogsConfig.whitelistKubernetesHosts` | empty | Comma-separated allowed Kubernetes API URLs; injected as `WHITELIST_KUBERNETES_HOSTS` |
| `startupProbe` | `/health`, every 5s, timeout 3s, 30 failures | Up to approximately 150s for startup |
| `livenessProbe` | `/health`, delay 3s, every 10s | HTTP process responsiveness |
| `readinessProbe` | `/health`, delay 3s, every 5s, 6 failures | HTTP request-serving readiness |

`GET /health` returns `200` and `{"status":"healthy"}` without authentication or
backend access. Other methods return `405` with `Allow: GET`. It does **not** prove
VictoriaLogs or Kubernetes authorization is working. Dependency outages must not
cause liveness-driven restart loops. Business routes still require their normal
request parameters and authorization. Configuration changes update the pod
checksum and roll out the mounted configuration.

Deployment environment options are also listed in `../env.template` (a reference,
not a file automatically loaded by Go):

| Variable | Default | Purpose / override |
| --- | --- | --- |
| `RELEASE_NAME` | `vlogs` | Helm release identity, not resource naming |
| `RELEASE_NAMESPACE` | `sealos` | Target namespace |
| `CHART_PATH` | `./charts/vlogs` | Chart directory, relative to working directory |
| `USER_VALUES_PATH` | `/root/.sealos/cloud/values/core/vlogs-values.yaml` | Operator overrides |
| `BACKUP_DIR` | `/root/.sealos/cloud/backups/vlogs-<timestamp>` | Private pre-upgrade backups; use a new directory per run |
| `KUBECONFIG` | standard kubectl/Helm current context | Target cluster configuration |

## Validation

```sh
helm lint charts/vlogs
helm template vlogs charts/vlogs -n sealos -f /path/to/private-values.yaml
bash -n entrypoint.sh
python3 -m unittest discover -s tests -p '*_test.py'
# From service/ (no account process or database initialization):
go test ./vlogs/... ./pkg/server/...
go build ./vlogs/...
```

After deployment, check `kubectl rollout status deployment/service-vlogs-deployment
-n sealos`, then port-forward `service/service-vlogs` and request `/health`.
Finally query `/queryLogsByParams` with an existing authorized kubeconfig and a
known application's namespace/name. A healthy pod alone is not business acceptance.
The legacy `manifests/deploy.yaml` remains available with probes for direct-YAML
users; do not apply it over a Helm-managed installation.

## Failure recovery

The entrypoint intentionally does not use `--atomic` on first adoption: failed
install cleanup could delete the pre-existing resources. Backups are mode-restricted
and contain credentials; do not commit or share them.

- Before a successful first Helm revision exists, do **not** uninstall the failed
  release to recover. Restore the saved resource specs/data from
  `BACKUP_DIR/resources.yaml` (remove server-generated metadata/status when needed),
  keep ownership metadata for a retry, correct the values/image and rerun the
  entrypoint. The original manifest's image has no new probes, so restore the whole
  Deployment spec, not just the old image tag.
- After a successful revision, use `helm history vlogs -n sealos` and
  `helm rollback vlogs <known-good-revision> -n sealos --wait --timeout 5m`.
- A Helm uninstall removes adopted resources too; it is not a way to return to
  unmanaged YAML. No database data or schema changes are required by this chart.
