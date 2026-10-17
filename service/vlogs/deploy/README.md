# vlogs deployment

vlogs is the Sealos log query API. It connects to an existing VictoriaLogs or
vmauth endpoint; this chart does not install a log storage backend or log collector.

## Helm

Requires Kubernetes 1.21+ and Helm 3. Run these commands from `service/vlogs`.
Create a site values file, for example:

```yaml
# vlogs-values.yaml
config:
  path: http://victoria-logs-single-server.vm.svc.cluster.local:9428
  username: ""
  password: ""
# Optional external API addresses accepted from user kubeconfigs:
whitelistKubernetesHosts:
  - https://kubernetes.example.com:6443
```

Set `config.path` to the actual backend base URL. The application appends
`/select/logsql/query`; do not include that suffix. With an empty whitelist,
authentication uses the in-cluster Kubernetes API address. No cluster-wide RBAC
is granted: requests authenticate with the caller's kubeconfig.

```bash
helm upgrade -i vlogs deploy/charts/vlogs-service \
  -n sealos --create-namespace -f vlogs-values.yaml
# Equivalent Make target:
make helm-deploy HELM_VALUES=vlogs-values.yaml
```

The default Service remains `service-vlogs.sealos.svc.cluster.local:8428`.
The chart mounts `/config/config.yml` from a Secret and restarts Pods when its
configuration changes. TCP probes check the server listener, not backend health.
To manage credentials outside Helm, set `existingConfigSecret` to a Secret in
the release namespace containing the entire `config.yml` file:

```yaml
server:
  addr: ":8428"
  path: http://your-victorialogs:9428
  username: reader
  password: your-password
```

With an external Secret, keep `server.addr` consistent with `containerPort` and
restart the Deployment after changing it; the application does not reload config.

Common values:

| Value | Default | Purpose |
| --- | --- | --- |
| `image` | `ghcr.io/labring/sealos-vlogs-service:latest` | Complete runtime image reference |
| `imagePullPolicy` | `IfNotPresent` | Use `Always` if deploying a mutable tag |
| `imagePullSecrets` | `[]` | Private registry credentials |
| `replicaCount` | `1` | API replicas |
| `fullnameOverride` | `service-vlogs` | Set a unique name for additional releases in a namespace |
| `containerPort` | `8428` | Listener port; generates `server.addr` |
| `service.port` | `8428` | Service port |
| `config.path` | `http://victoria-logs-single-server.vm.svc.cluster.local:9428` | Example backend address; configure for your cluster |
| `config.username` / `config.password` | empty | Backend Basic Auth |
| `existingConfigSecret` | empty | Supply a pre-existing `config.yml` Secret |
| `whitelistKubernetesHosts` | `[]` | Allowed Kubernetes API addresses |
| `resources`, `nodeSelector`, `tolerations`, `affinity` | See `values.yaml` | Resource and scheduling settings |

## Sealos cluster image

The layout follows [state-metrics](https://github.com/sealos-apps/state-metrics):
each native runner uses `sealos registry save` to create its architecture's cache,
then packages it as `/registry`, alongside the chart and `entrypoint.sh`.
An independent release job combines the two images with `docker manifest`.

Prepare the persistent site configuration **before the first run**:

```bash
install -d -m 700 /root/.sealos/cloud/values/core
install -m 600 vlogs-values.yaml /root/.sealos/cloud/values/core/vlogs-service-values.yaml
sealos run ghcr.io/labring/sealos-cloud-vlogs-service:<tag>
```

On first install, the entrypoint copies the packaged minimal override file if no
user file exists. Upgrades preserve that file, and omitted values inherit the new
chart defaults. In particular, the packaged override file does not pin `image`,
so upgrades use the runtime image shipped with the new cluster image. If you set
`image` yourself, make sure that image is available in your environment.

Installer environment overrides (pass through `sealos run --env KEY=value`):

| Variable | Default |
| --- | --- |
| `RELEASE_NAME` | `vlogs` |
| `RELEASE_NAMESPACE` | `sealos` |
| `CHART_PATH` | `charts/vlogs-service` beside the entrypoint |
| `USER_VALUES_FILE` | `/root/.sealos/cloud/values/core/vlogs-service-values.yaml` |
| `PACKAGED_APP_VALUES_FILE` | `vlogs-service-values.yaml` inside the chart |
| `CHART_APP_VALUES_FILE` | Compatibility alias for the packaged values file |
| `HELM_OPTS` | Additional whitespace-separated Helm flags, e.g. `--wait --timeout 5m` |

The entrypoint also accepts positional Helm arguments. Use a values file for
values containing spaces. For multiple installations, choose distinct release
names, `fullnameOverride` values and persistent values paths.

## Build and CI

The existing `services.yml` / `service-build.yml` workflows detect vlogs changes,
including chart-only YAML changes, and call `vlogs-images.yml` after deployment
checks and Go tests pass. PRs lint/render the chart, check the entrypoint,
test config preservation and build the runtime container for amd64 and arm64.

Both runtime and cluster image jobs use `ubuntu-24.04` for amd64 and
`ubuntu-24.04-arm` for arm64. Go compiles directly on each native runner; the
runtime Dockerfile only packages `bin/manager`. Docker packaging uses ordinary
`docker build`, with no Buildx action, cross-architecture build or QEMU setup.
Independent release jobs wait for both architectures before publishing a combined
image using `docker manifest create`, `annotate` and `push`.

Architecture tags use `build-<run-id>-<attempt>-<arch>` and merged internal tags
use `build-<run-id>-<attempt>`. The cluster chart references this run's merged
runtime tag, preventing concurrent workflows from mixing runtime images. Each
cluster runner caches only its own architecture before packaging its image.

Published repositories:

- Runtime: `ghcr.io/<owner>/sealos-vlogs-service`
- Cluster image: `ghcr.io/<owner>/sealos-cloud-vlogs-service`
- Optional Aliyun mirrors use the existing `ALIYUN_*` secrets.

Both merged images retain the existing branch, release, explicit and commit tags.
The workflow uses `GHCR_TOKEN` or `GITHUB_TOKEN` and the existing Sealos installer.
Other services continue to use their existing cluster image build path.

To publish locally, run the runtime build on each matching Linux machine:

```bash
# On amd64:
make docker-build-push IMG=example.com/team/vlogs:v1-amd64
# On arm64:
make docker-build-push IMG=example.com/team/vlogs:v1-arm64
# After both pushes, on either machine:
docker manifest create example.com/team/vlogs:v1 \
  example.com/team/vlogs:v1-amd64 example.com/team/vlogs:v1-arm64
docker manifest push --purge example.com/team/vlogs:v1
```

Set the chart's `image` field in `deploy/charts/vlogs-service/values.yaml` to
`example.com/team/vlogs:v1` on both machines, then build each cluster image:

```bash
# On amd64:
make cluster-build-push IMG=example.com/team/vlogs:v1 CLUSTER_IMG=example.com/team/vlogs-cluster:v1-amd64
# On arm64:
make cluster-build-push IMG=example.com/team/vlogs:v1 CLUSTER_IMG=example.com/team/vlogs-cluster:v1-arm64
# After both pushes:
docker manifest create example.com/team/vlogs-cluster:v1 \
  example.com/team/vlogs-cluster:v1-amd64 example.com/team/vlogs-cluster:v1-arm64
docker manifest push --purge example.com/team/vlogs-cluster:v1
```

Local builds require Go, Docker, Sealos for the cluster cache and registry login.
Old manifests are retained for manual compatibility but excluded from the cluster
image.

## Migrate an existing YAML installation

The old Deployment uses an immutable `app: service-vlogs` selector, while the
chart uses Helm release labels. Helm cannot adopt that Deployment in place.
Back up the existing backend configuration and whitelist into your values file,
then schedule a brief interruption to replace the old resources:

```bash
kubectl delete -f deploy/manifests/deploy.yaml --ignore-not-found
helm upgrade -i vlogs deploy/charts/vlogs-service \
  -n sealos --create-namespace -f vlogs-values.yaml
```

The Service name and port stay the same. Use this migration once before managing
the installation with Helm or the new cluster image.

## Validate locally

```bash
make helm-lint
python3 -m venv /tmp/vlogs-deploy-check
/tmp/vlogs-deploy-check/bin/pip install PyYAML==6.0.2
/tmp/vlogs-deploy-check/bin/python deploy/tests/test_deploy.py
/tmp/vlogs-deploy-check/bin/python deploy/tests/test_images.py
```

These checks need Helm and ShellCheck, but no Kubernetes cluster. To uninstall:

```bash
helm uninstall vlogs -n sealos
```
