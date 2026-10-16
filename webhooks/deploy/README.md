# Webhook Helm deployment and upgrades

Admission and stargz have separate charts and releases. The deployment layout
follows [sealos-apps/state-metrics](https://github.com/sealos-apps/state-metrics/tree/main/deploy).
The supported entrypoints use Helm and stage backend changes before admission
registration changes. They do not install cert-manager or modify node runtimes.

## Requirements

The deployment host needs Bash, Helm **3** (verified with 3.19.0), kubectl,
[mikefarah/yq v4](https://github.com/mikefarah/yq), jq and OpenSSL with
`verify -verify_hostname`. The cluster must already run cert-manager, including
cainjector. The installer requires permission to manage these cluster-scoped
webhook/RBAC resources and namespaced workloads, Certificates and Issuers.
No new API token or third-party account is needed. Private image registries use
existing Kubernetes imagePullSecrets. ICP authentication can reference an
existing Secret instead of putting its key in values.

For a source checkout, run the module's `deploy/entrypoint.sh`. A Sealos cluster
image bundles that entrypoint, the chart, `helm-webhook.sh` and
`post-renderer.sh`. Manual cluster-image builds must first copy the shared
scripts into the module's deploy directory, as CI does:

```sh
cp webhooks/deploy/helm-webhook.sh webhooks/deploy/post-renderer.sh webhooks/admission/deploy/
# For stargz, use webhooks/stargz/deploy/ as the destination instead.
```

## Install

```sh
bash webhooks/admission/deploy/entrypoint.sh apply
bash webhooks/stargz/deploy/entrypoint.sh apply
```

Default releases are `admission-webhook` and `stargz-webhook`, both in
`sealos-system`. The shared Namespace is not a chart resource. The default
admission deployment has one replica, matching the old deployment; stargz has
two. Both use RollingUpdate with zero unavailable replicas and one surge Pod.
An upgrade needs capacity for that extra Pod. If it cannot schedule, the old
backend remains available and the upgrade fails.

The charts are standard Helm charts and can be rendered or packaged directly:

```sh
helm template admission-webhook webhooks/admission/deploy/charts/admission-webhook -n sealos-system
helm package webhooks/stargz/deploy/charts/stargz-webhook
```

Use the entrypoint for production installation, upgrade and rollback. A raw
single-step `helm upgrade` does not enforce backend-before-registration ordering.
GitOps integrations must implement the same two stages themselves.

## Persistent configuration

The entrypoints create an empty user override file only if it does not exist:

- `/root/.sealos/cloud/values/core/admission-webhook-values.yaml`
- `/root/.sealos/cloud/values/core/stargz-webhook-values.yaml`

Override its path with `USER_VALUES_FILE`. For example:

```yaml
# admission-webhook-values.yaml
replicaCount: 2
config:
  cnameDomains: cloud.example.com,laf.example.com
  cnameCheck: true
  resourceCreatorWebhookEnabled: false
  icpKeySecretRef:
    name: admission-icp
    key: ICP_KEY
```

```yaml
# stargz-webhook-values.yaml
webhook:
  registries: registry.example.com,sealos.hub:5000
  failurePolicy: Ignore
```

Values precedence, low to high:

1. Chart defaults.
2. `global.featureConfigs.admission` or `global.featureConfigs.stargz`, extracted
   from `/root/.sealos/cloud/values/global.yaml` when that file exists.
3. Settings captured from a migrated legacy deployment.
4. The persistent module user values file.
5. Explicit legacy environment variables on this invocation.
6. Explicit values options passed to `entrypoint.sh apply` or `migrate`.

This follows the [global YAML convention](../../proposal/design/zh/global-yaml-usage-convention.zh.md).
`GLOBAL_VALUES_FILE` can select another global file. New settings belong in YAML;
legacy environment variables are a compatibility input, not a new config store.
Lists use Helm's whole-list replacement semantics. Every upgrade uses new chart
defaults plus these overrides (`--reset-values`), rather than accumulating old
chart defaults through `--reuse-values`. Do not copy the entire chart defaults
into user values. In particular, leave `image` out to follow the bundled image.
Set `image` explicitly only when intentionally pinning a version.

Admission accepts the existing `cnameDomains`, `cnameCheck`, `denyDomains`,
`ingressMutatingAnnotations`, `ingressWebhookEnabled`,
`ingressWebhookFailurePolicy`, `namespaceWebhookEnabled`,
`namespaceWebhookFailurePolicy`, `resourceCreatorWebhookEnabled`, `icpEnabled`,
`icpEndpoint` and `icpKey` environment variables. Boolean inputs must be `true`
or `false`. The old Kubefile ENV defaults have been removed so they cannot
silently overwrite persisted values.

The stargz compatibility wrapper accepts `NAMESPACE` and passes through explicit
`WEBHOOK_IMAGE`, `INTERNAL_REGISTRIES`, `RUNTIME_CLASS_NAME`, `RUNTIME_HANDLER`,
`SKIP_ANNOTATION`, `WEBHOOK_FAILURE_POLICY` and `WEBHOOK_REPLICAS` variables. Custom
legacy object names require reviewed values; automatic migration recognizes only
the two layouts shipped by this repository.

## First migration from YAML or the old stargz script

Take an infrastructure snapshot according to your operational policy and stop
other installers/GitOps controllers from applying the old deployment. Use:

```sh
bash webhooks/admission/deploy/entrypoint.sh migrate
bash webhooks/stargz/deploy/entrypoint.sh migrate
```

`apply` refuses to adopt existing unmanaged resources. `migrate` is an explicit,
one-time ownership transition:

1. Identify the old layout and reject duplicate/custom registrations or objects
   owned by another Helm release. Do not run a migration while manually editing
   the same resources.
2. Save live resources, ownership metadata, user values and the TLS Secret into
   a private backup directory beside the user values file. Backups may contain
   credentials. Keep that directory private and protect it like a Kubernetes
   configuration backup; it is created with mode 0700/0600.
3. Preserve the Deployment selector, Service selector, Certificate spec, Issuer
   spec, TLS Secret reference, business configuration, replicas, enabled rules
   and the full RuntimeClass scheduling settings.
   Captured settings are saved in `<module>-webhook-state/legacy-values.yaml`.
   The old image is recorded in the baseline Helm revision, not pinned in user
   values. Existing historical stargz RBAC that the stateless webhook no longer
   needs is left intact and unmanaged.
4. Add Helm ownership to the chart's existing objects. Install revision 1 using
   a post-renderer that records each existing object verbatim apart from server
   metadata and the RuntimeClass retention annotation. This does not redeploy
   the old backend or activate new rules.
5. Run the normal staged upgrade to the image bundled with the new chart.

The admission migration supports the shipped `admission-*` layout. Stargz
supports the original script's `pod-stargz-runtime-injector` Deployment and the
Kustomize `pod-stargz-runtime-injector-controller-manager` Deployment. Both
present, custom names, missing core objects, or changed immutable selectors are
rejected before ownership changes. Inspect the live objects and resolve those
cases explicitly rather than using `helm --take-ownership` or `--force` broadly.

First adoption deliberately does **not** use `--atomic`: failed Helm installation
cleanup could delete adopted production resources. If adoption fails, use the
backup path printed by the command:

```sh
bash webhooks/admission/deploy/entrypoint.sh recover /path/to/admission-webhook-state/backup-TIMESTAMP
```

Recovery first verifies the backup marker stored in revision 1's values, resource
UIDs, ownership and TLS Secret. It refuses changed identities, rotated TLS data and
unreadable Helm state before writing anything. It then reapplies the snapshot,
restores prior ownership and removes only the first Helm bookkeeping Secret.
It never runs Helm uninstall. Histories beyond the first adoption revision
must use rollback. A killed process may leave the operation
lock directory: confirm no installer is running before removing that empty lock.
Backups are retained until an operator removes them after verification.

## Upgrade and rollback

Edit user values, then run `entrypoint.sh apply` again. Each successful apply
creates two revisions:

1. Roll the backend while retaining live webhook registrations. Existing releases
   restore their previous revision with the current serving CA on a failed rollout.
   On first installation, this stage has empty registrations. Readiness requires the TLS webhook server
   to have started, not just a successful health Ping.
2. After the complete Deployment rollout, verify Certificate readiness, serving
   certificate validity, Service DNS and certificate chain. Then publish the
   desired registrations. Wait for cainjector to inject the current CA into every
   entry; a CA verification failure restores the backend-stage revision.

The registration step restores its immediately preceding backend revision if it
fails. Automatic restoration uses the same current-CA manifest restore as explicit
rollback; native Helm atomic rollback could reapply obsolete certificate data.
If the process is interrupted between stages, the newer backend continues serving the old rules; rerun apply. `HELM_TIMEOUT` defaults to `5m`.
CA injection is checked for up to 120 seconds separately. The release name,
resource names, selectors and certificate references must remain stable during a
rolling upgrade. Certificate rotation stays with cert-manager; no upgrade deletes
the TLS Secret.

Choose a previously successful revision:

```sh
helm history admission-webhook -n sealos-system
bash webhooks/admission/deploy/entrypoint.sh rollback 3
```

The rollback entrypoint restores the target's registration rules while the newer
backend is still available, waits for the current CA bundle, then rolls back the
backend. It records the historical manifest as a new Helm upgrade revision using
a temporary `webhook-manifest-restore` chart, with the current CA and RuntimeClass
retention metadata. Native `helm rollback` would reapply a baseline's historical
CA; use the entrypoint so that obsolete CA is never written back. Supported
rollback targets must have compatible resource/certificate identities and endpoints supported by the current backend.
Update user values to match the restored configuration before the next apply;
rollback does not rewrite a local values file. The next `apply` uses the regular
module chart and reconstructs values from the persistent configuration.

For resource creator, the default remains **disabled**, matching the current
Kubefile's intended behavior. Enabling it defaults to `failurePolicy: Fail`;
`config.resourceCreatorWebhookFailurePolicy` can preserve a prior policy. Before
returning to an image without creator endpoints, remove both creator webhook
entries first. The rollback entrypoint handles this when the target revision has
them disabled. Existing creator annotations are not removed or backfilled; writes
made while this protection is disabled may lack creator records.

## Stargz runtime lifecycle and uninstall

Install the node runtime and label nodes with `deploy-stargz-runtime.sh` before
enabling injection. Helm does not install or upgrade containerd or the stargz
snapshotter. `RuntimeClass.handler` is immutable. The injected RuntimeClass name
must match the chart's RuntimeClass name, unless an existing external RuntimeClass
is selected with `runtimeClass.create: false`.

The default failure policy stays `Ignore`. Public registry images, explicit
RuntimeClass settings, the skip annotation and Devbox exclusions retain their
existing behavior. Rollback does not mutate running Pods or undo node runtime
installation. Disable injection and inspect Pods using the RuntimeClass before
removing any runtime components.

For uninstall, first remove the release's Mutating/ValidatingWebhookConfiguration
objects to stop new calls, then use `helm uninstall <release> -n sealos-system`.
The stargz RuntimeClass has `helm.sh/resource-policy: keep`; it must not disappear
while existing Pods depend on it. Certificates and chart-owned Issuers are removed
by Helm; cert-manager's own Secret ownership policy determines Secret retention.
The shared Namespace and node runtime are never removed by Helm. The old stargz
wrapper's `delete` operation is rejected to prevent a second resource owner.

## Verification and release

```sh
bash webhooks/deploy/tests/run.sh
(cd webhooks/admission && GOWORK=off go test -race ./...)
(cd webhooks/stargz && GOWORK=off go test -race ./internal/... ./cmd/...)
```

The lifecycle suite uses actual Helm rendering and packaging with mock Kubernetes
and Helm writes. It checks old layout snapshots, idempotency, ordering, config
preservation, ownership conflicts and failed-adoption recovery. It does not prove
API-server admission or scheduling behavior; the CI Kind integration covers the
live certificate, backend rollout and admission path.

CI checks YAML changes, injects the exact published application image into chart
values and appVersion, and builds both webhook cluster images for amd64/arm64.
Chart version is independent of appVersion; increment Chart.yaml version for
chart changes, and publish immutable app tags/digests for production. The first
chart version is 0.1.0. Sealos build discovers the chart's images (including the
admission metrics proxy) for its registry cache; offline image installation must
be validated before promoting a cluster-image release.
