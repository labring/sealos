# Sealos Horizontal Configuration Layering (ConfigMap and globals)

## 0. Key Conclusion

Your design can be split into two clear tracks:

1. `ConfigMap`: solves runtime read/injection for `entrypoint.sh`.
2. `globals.yaml`: solves horizontal Helm values aggregation and unified feature switches.

These two tracks are not replacements; they are layered:
- `globals.yaml` handles declarative aggregation.
- `ConfigMap` handles runtime injection/discovery.

## 1. Problem Definition

Current configuration has two different dimensions:

1. Runtime injection dimension: module `entrypoint.sh` scripts need a consistent place to read base parameters (for example `sealos-config`).
2. Aggregation dimension: shared feature switches across modules currently lack one unified values aggregation entry.

## 2. Responsibility Layering Model

### 2.1 ConfigMap Layer (Runtime Injection Layer)

Goal: serve `entrypoint.sh` and ensure modules can auto-read runtime parameters during install/upgrade.

Typical flow:
1. `entrypoint.sh` reads params via `kubectl get configmap`.
2. It converts values into Helm `--set-string` args or environment variables.
3. Parameters are injected during chart rendering.

Typical sources already used:
- `sealos-config`: base platform params (domain/port/region/db/jwt/salt)
- `cert-config`: certificate mode
- `nm-agent-config`: traffic Mongo entry
- `objectstorage-config`: object storage account entry
- `sealos-cloud-admin`: initial admin password storage

### 2.2 globals Layer (Helm Values Aggregation Layer)

Goal: aggregate horizontal feature configs and unify multi-module switches/defaults.

Typical flow:
1. Maintain `/root/.sealos/cloud/values/globals.yaml`.
2. Install scripts parse `globals.yaml` via `yq`.
3. Merge parsed values with module values before invoking Helm.

## 3. Summary of Current Content

### 3.1 Core Design Points

1. Introduce a unified `globals` file for horizontal features.
2. Separate switch and config: `feature_gates` + `feature_configs`.
3. First feature set: `gpu_hami`, `online_ide`, `import_ide`, `gitea_template`, `nfs`.

### 3.2 Path Conventions (Your Added Direction)

1. Global config: `/root/.sealos/cloud/values/globals.yaml`
2. Module override: `/root/.sealos/cloud/values/core/<module>-values.yaml`
3. App-level extension: `/root/.sealos/cloud/values/apps/devbox/xxx.yaml`

### 3.3 Current Attention Items

1. SA dependencies and ENV dependencies should be governed separately.
2. `sealos-config` usage needs one shared contract (fields, precedence, fallback logic).
3. Install flow should explicitly depend on `yq` to parse `globals.yaml`.
4. Chart naming/path conventions should be normalized.

## 4. `globals.yaml` Draft (v1)

```yaml
globals:
  version: v1alpha1

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

## 5. Module Loading Order and Precedence (Unified Contract)

### 5.1 Loading Order (execution order, lower to higher)

1. `charts/<module>/values.yaml`
2. `/root/.sealos/cloud/values/globals.yaml`
3. `/root/.sealos/cloud/values/apps/<module>/*-values.yaml` (optional)
4. `/root/.sealos/cloud/values/core/<module>-values.yaml`

### 5.2 Effective Precedence (high to low)

1. `HELM_OPTIONS/--set/--set-string`
2. `/root/.sealos/cloud/values/core/<module>-values.yaml`
3. `/root/.sealos/cloud/values/apps/<module>/*-values.yaml`
4. `/root/.sealos/cloud/values/globals.yaml`
5. `charts/<module>/values.yaml`

### 5.3 Feature Resolution Rule

1. Evaluate `globals.feature_gates.<feature>` first.
2. If `false`, ignore `feature_configs.<feature>` and module-local same-name switches.
3. If `true`, merge feature config into module values.

### 5.4 Script Examples

Example A: `entrypoint.sh` reads base variables from `sealos-config`

```bash
varCloudDomain=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.cloudDomain}')
varCloudPort=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.cloudPort}')
varRegionUID=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.regionUID}')
varDatabaseGlobalCockroachdbURI=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.databaseGlobalCockroachdbURI}')
varDatabaseLocalCockroachdbURI=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.databaseLocalCockroachdbURI}')
varDatabaseMongodbURI=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.databaseMongodbURI}')
varPasswordSalt=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.passwordSalt}')
varJwtInternal=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.jwtInternal}')
varJwtRegional=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.jwtRegional}')
varJwtGlobal=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.jwtGlobal}')
```

Example B: read `globals` using `yq` (`yq` path: `~/.sealos/cloud/bin/yq`)

```bash
YQ_BIN="${HOME}/.sealos/cloud/bin/yq"
GLOBALS_FILE="/root/.sealos/cloud/values/globals.yaml"

# Read switch: globals.feature_gates.gpu_hami
gpuHamiEnabled=$("${YQ_BIN}" e -r '.globals.feature_gates.gpu_hami // false' "${GLOBALS_FILE}")

# Read parameter: globals.feature_configs.nfs.storage_class
nfsStorageClass=$("${YQ_BIN}" e -r '.globals.feature_configs.nfs.storage_class // "nfs-client"' "${GLOBALS_FILE}")

# Read parameter: globals.feature_configs.online_ide.startup_config_map
onlineIDEStartupCM=$("${YQ_BIN}" e -r '.globals.feature_configs.online_ide.startup_config_map // "devbox-startup"' "${GLOBALS_FILE}")
```

## 6. Chart Naming Convention (Recommendation)

Multiple styles currently coexist:
- `charts/${MODULE_PATH}/values.yaml`
- `charts/${MODULE_PATH}-controller/values.yaml`
- `charts/${MODULE_PATH}-frontend/values.yaml`

Next step should unify naming rules (at least one consistent "module + role suffix" convention) and provide one module-to-chart-path mapping table as the single source of truth for scripts and docs.
