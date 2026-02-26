# Sealos Helm Horizontal Parameters (Globals) Design

## 0. Scope and Goals

This document organizes the horizontal-parameter problem as input for upcoming module-level configuration design.
Current scope:

1. Clarify current ConfigMap responsibilities and boundaries.
2. Define a unified `globals` configuration model (including feature gates).
3. Standardize module loading order and precedence rules.

## 1. Problem Statement

### 1.1 Current Situation

1. Configuration is scattered across multiple ConfigMaps with inconsistent sources.
2. Platform-wide parameters (for example `sealos-config`) and module-private parameters coexist without one shared contract.
3. Some sensitive values (passwords, URIs, JWT keys) are still stored in ConfigMaps.
4. Module-side loading behavior is not fully unified, causing override ambiguity.

### 1.2 Objectives of This Draft

1. Provide a clear role for each ConfigMap.
2. Define an extensible `globals` skeleton for cross-cutting features (`gpu_hami`, `online_ide`, `import_ide`, `gitea_template`, `nfs`).
3. Separate and define both loading order and effective precedence.

## 2. Current Configuration Inventory (Based on Existing Cluster Snapshot)

### 2.1 Confirmed Responsibilities (Consumers Found in Repository)

| ConfigMap | Main Purpose | Typical Consumers (Examples) | Consumption Pattern | Sensitivity |
| --- | --- | --- | --- | --- |
| `sealos-config` | Platform-wide base parameters (domain, region, DB, JWT, password salt) | `scripts/cloud/install-v2.sh`, `frontend/desktop/deploy/desktop-frontend-entrypoint.sh`, `controllers/account/deploy/account-controller-entrypoint.sh`, `controllers/terminal/deploy/terminal-controller-entrypoint.sh`, `controllers/resources/deploy/resources-controller-entrypoint.sh` | Scripts read via `kubectl get configmap`, then map to Helm `--set-string` | High |
| `cert-config` | Certificate mode/state (`self-signed`, `acmedns`, etc.) | `scripts/cloud/install-v2.sh`, `deploy/base/sealos-finish/v0.1.0/install.sh`, `deploy/base/sealos-certs/v0.1.0/charts/certs/templates/*.yaml` | Runtime reads `CERT_MODE`; cert chart writes this ConfigMap | Low |
| `nm-agent-config` | Traffic/billing Mongo entry (`MONGO_URI`) | `controllers/account/deploy/account-controller-entrypoint.sh`, `controllers/resources/deploy/resources-controller-entrypoint.sh` | Auto-config scripts read and inject into controller charts | High |
| `objectstorage-config` | Object storage account settings (especially root credentials) | `controllers/resources/deploy/resources-controller-entrypoint.sh` | Reads `MINIO_ROOT_USER/PASSWORD`, injects into `resources-controller` | High |
| `sealos-cloud-admin` | Persistent storage for initial admin password | `controllers/job/init/deploy/job-init-entrypoint.sh` | `job-init` reads existing value or generates and writes back | High |
| `devbox-startup` | Startup script template source for DevBox (`startup.sh`) | `controllers/devbox/internal/controller/devbox_sync_pipeline.go`, `controllers/devbox/internal/controller/helper/devbox.go` | Controller syncs template script into per-DevBox ConfigMap and mounts it | Medium |
| `higress-config` | Higress gateway plugin and wasm registry config | `deploy/base/higress/v2.1.3/charts/higress/charts/higress-core/templates/*.yaml`, `scripts/cloud/install.sh` | Higress core reads/mounts it; install script can patch it | Medium |

Note: `sealos-config` is currently the only explicit horizontal parameter center.

### 2.2 Pending Consumer Mapping (Exists in Snapshot, No Direct Consumer Located Yet)

| ConfigMap | Inferred Purpose (By Field Semantics) | Key Fields (Examples) | Current Status |
| --- | --- | --- | --- |
| `devbox-config` | DevBox image-registry access settings | `registryAddress`, `registryUsername`, `registryPassword` | Consumer path still to be confirmed (possibly in runtime image) |
| `registry-config` | Built-in registry account model (admin/auth) | `ADMIN_USER`, `ADMIN_PASSWORD`, `AUTH_USER`, `AUTH_PASSWORD` | Consumer not confirmed |
| `grafana-config` | Monitoring UI endpoint and login settings | `GF_ADDRESS`, `GF_USER`, `GF_PASSWORD` | Consumer not confirmed |
| `hami-webui-config` | HAMI WebUI endpoint and login settings | `HAMI_WEBUI_ADDRESS`, `HAMI_WEBUI_USER`, `HAMI_WEBUI_PASSWORD` | Consumer not confirmed |
| `vlogs-config` | Platform log service endpoint and read/write credentials | `ADDRESS`, `INSER_*`, `SELECT_*` | Consumer not confirmed |
| `vlogs-config-user` | User log service endpoint and read/write credentials | `ADDRESS`, `INSER_*`, `SELECT_*` | Consumer not confirmed |
| `vmui-config` | VictoriaMetrics UI access settings | `VMUI_ADDRESS`, `VMUI_USER`, `VMUI_PASSWORD` | Consumer not confirmed |

## 3. `globals` Configuration Proposal (Feature-Oriented)

### 3.1 Design Principles

1. Separate switches from parameters: `feature_gates` for booleans, `feature_configs` for details.
2. Use `snake_case` consistently for keys.
3. Move sensitive values to Secrets over time; keep only references in `globals` (for example `secret_name`).

### 3.2 Proposed Structure

```yaml
globals:
  feature_gates:
    gpu_hami: false
    online_ide: true
    import_ide: false
    gitea_template: false
    nfs: false

  feature_configs:
    gpu_hami:
      webui_config_map: hami-webui-config
      namespace: sealos-system

    online_ide:
      startup_config_map: devbox-startup
      registry_config_map: devbox-config
      namespace: sealos-system

    import_ide:
      enabled_sources: ["git", "tar", "registry"]
      max_package_size_mb: 2048

    gitea_template:
      endpoint: ""
      org: "templates"
      repo: "sealos-templates"
      branch: "main"

    nfs:
      storage_class: "nfs-client"
      provisioner: ""
      mount_options: []
```

### 3.3 First-Pass Mapping to Existing ConfigMaps

1. `gpu_hami` -> `hami-webui-config`
2. `online_ide` -> `devbox-startup` + `devbox-config`
3. `import_ide` -> new (no unified switch today)
4. `gitea_template` -> new (no unified config today)
5. `nfs` -> new (no dedicated global config today)

## 4. Module Loading Order and Effective Precedence

1. File loading order (execution order, lower to higher):
   - `charts/<module>/values.yaml`
   - `/root/.sealos/cloud/values/globals.yaml`
   - `/root/.sealos/cloud/values/core/<module>-values.yaml` (example: `desktop-values.yaml`)
2. Effective precedence (high to low):
   - `HELM_OPTIONS/--set/--set-string`
   - `/root/.sealos/cloud/values/core/<module>-values.yaml`
   - `/root/.sealos/cloud/values/globals.yaml`
   - `charts/<module>/values.yaml`
3. Feature resolution rule:
   - Evaluate `globals.feature_gates.<feature>` first.
   - If `false`, ignore `feature_configs.<feature>` and same-name module-local switches, then fall back to default behavior.

Example (desktop):
```bash
helm upgrade -i desktop-frontend charts/desktop-frontend \
  -f charts/desktop-frontend/values.yaml \
  -f /root/.sealos/cloud/values/globals.yaml \
  -f /root/.sealos/cloud/values/core/desktop-values.yaml
```

## 5. Suggested Next Steps

1. Complete real consumer mapping for section 2.2 (`who reads`, `when`, `how overridden`).
2. Add schema validation for `globals.yaml` (types, defaults, enums).
3. Migrate sensitive values from ConfigMap to Secret references gradually.

