# Global YAML Usage Convention

## Summary

`global.yaml` is the canonical configuration file for installation and runtime defaults that have been migrated out of `sealos.env`.
New configurable runtime defaults should follow this convention unless there is a clear reason to keep them in another interface.

This document is the current usage convention. Earlier Helm global design documents remain useful as design background, but live implementations should follow this convention.

The local file path used by installation scripts is:

```text
/root/.sealos/cloud/values/global.yaml
```

The cluster copy is stored as the `global.yaml` key in the `sealos-system/global` ConfigMap.

## Goals

- Keep migrated configuration in one structured YAML file.
- Stop adding new runtime defaults to `sealos.env`.
- Give shell scripts one shared way to read local and cluster global configuration.
- Make `sealos-system/sealos-config` usage explicit because many cloud components read it directly.

## Non-Goals

- This proposal does not change current install behavior.
- This proposal does not migrate every existing environment variable.
- This proposal does not remove `sealos-config`; it documents how it should be used.

## Configuration Ownership

`global.yaml` is the source of truth for user-controlled global configuration. Fields that have been migrated to `global.yaml` must not be read from `sealos.env` again.

Use `sealos.env` only for legacy environment variables, node bootstrap settings, secrets that have not been migrated,
or compatibility values that are still required by existing scripts.

Use `sealos-system/sealos-config` for runtime values consumed by deployed components.
Most values in `sealos-config` should be rendered from `global.yaml` or generated during installation.

## Local File Usage

Installation scripts should read:

```text
/root/.sealos/cloud/values/global.yaml
```

Do not read `./values/global.yaml` from component scripts after installation starts.
The local bundle path is only for packaging defaults and pre-install rendering.
For example, `install --default` may update the bundle-local `./values/global.yaml` first and then copy it to `/root/.sealos/cloud/values/global.yaml`.

## Preferred Shell API

Scripts under the install bundle should source `scripts/tools.sh` and use the shared helpers.

### Read a value from the local global file:

```bash
source /root/.sealos/cloud/scripts/tools.sh

cloud_domain="$(read_yaml_file_path '.global.http.domain')"
dry_run="$(read_yaml_file_path '.global.install.dryRun')"
currency="$(read_yaml_file_path '.global.billing.currency')"
```

Read a list length:

```bash
volume_group_count="$(read_yaml_file_path '(.global.storage.openebs.volumeGroups // []) | length')"
```

### Read a value from the cluster global ConfigMap:

```bash
source /root/.sealos/cloud/scripts/tools.sh

# Defaults to namespace=sealos-system, ConfigMap=global, key=global.yaml.
cloud_domain="$(fetch_global_config_value '.global.http.domain')"
database_version="$(fetch_global_config_value '.global.featureConfigs.database.version')"

# Full signature:
# fetch_global_config_value <path_expr> [namespace] [configmap_name] [data_key] [retries] [delay_seconds]
cloud_domain="$(fetch_global_config_value '.global.http.domain' sealos-system global global.yaml 5 3)"
```

Use `fetch_global_config_value` when the source of truth should be the cluster ConfigMap rather than the local file. The helper first fetches the `global.yaml` data key, then evaluates the same `yq` path expression used by `read_yaml_file_path`.

The helpers return an empty string for missing values. Callers should apply explicit defaults close to the consumer:

```bash
kubeblocks_version="$(read_yaml_file_path '.global.featureConfigs.database.kubeblocksVersion')"
kubeblocks_version="${kubeblocks_version:-0.8.2}"
```

## Direct YAML Reads

Small scripts may read YAML directly with `yq` when they do not run inside the install helper environment:

```bash
yq e -r '.global.http.domain // ""' /root/.sealos/cloud/values/global.yaml
yq e -r '.global.cert.mode // "self-signed"' /root/.sealos/cloud/values/global.yaml
```

Prefer the shared helpers when `tools.sh` is available. Avoid adding new local YAML parsing functions unless a script cannot source `tools.sh`.

## Field Design Rules

- Use nested objects instead of new flat environment-style keys.
- Use lower camel case for YAML field names, for example `dryRun`, `disableHttps`, and `kubeblocksVersion`.
- Keep booleans as YAML booleans, not string booleans.
- Keep versions as strings when `x.y` or `vX.Y.Z` could be parsed unexpectedly.
- Put component-specific configuration under `global.featureConfigs.<component>` or another existing domain object.
- Put storage settings under `global.storage`.
- Put HTTP entry settings under `global.http`.
- Put certificate settings under `global.cert`.
- Do not add a `create` switch when creation can be derived from a required endpoint.
  For example, NFS StorageClass creation is derived from whether `global.storage.openebs.nfs.storageClass.parameters.server` is empty.

## Current Common Fields

```yaml
global:
  install:
    dryRun: false
  billing:
    currency: cny
  cert:
    mode: self-signed
    certFile: ""
    keyFile: ""
  http:
    domain: 127.0.0.1.nip.io
    httpsPort: 443
    httpPort: 80
    disableHttps: false
  storage:
    openebs:
      storage: /data/openebs
      vgName: ""
      volumeGroups: []
      nfs:
        storageClass:
          name: nfs-csi
          annotations:
            storageclass.kubernetes.io/is-default-class: "false"
          parameters:
            server: ""
            share: /
            subDir:
            mountPermissions: "0777"
          reclaimPolicy: Delete
          volumeBindingMode: Immediate
          mountOptions:
            - nfsvers=4.1
            - hard
  featureConfigs:
    database:
      type: cockroachdb
      kubeblocksVersion: "0.8.2"
      version: v23.1.11
      mongodbURI: ""
      nmAgentMongodbURI: ""
```

## `sealos-system/sealos-config`

`sealos-config` is a runtime ConfigMap in the `sealos-system` namespace.
It is read by many cloud components and should be treated as generated runtime state,
not as the first place to introduce new user-facing configuration.

Read one key directly:

```bash
kubectl get configmap sealos-config -n sealos-system \
  -o jsonpath='{.data.cloudDomain}'
```

Prefer the helper when retry behavior is useful:

```bash
source /root/.sealos/cloud/scripts/tools.sh

cloud_domain="$(fetch_configmap_field sealos-config '{.data.cloudDomain}')"
jwt_internal="$(fetch_configmap_field sealos-config '{.data.jwtInternal}')"
```

Common keys:

| Key | Meaning | Typical source |
| --- | --- | --- |
| `cloudDomain` | Public cloud domain | `global.http.domain` |
| `cloudPort` | HTTPS port | `global.http.httpsPort` |
| `httpPort` | HTTP port | `global.http.httpPort` |
| `disableHttps` | Whether HTTPS is disabled | `global.http.disableHttps` |
| `regionUID` | Region identity generated during install | Installer |
| `databaseGlobalCockroachdbURI` | Global CockroachDB connection URI | `global.featureConfigs.globalDatabase.uri` or generated database |
| `databaseLocalCockroachdbURI` | Local CockroachDB connection URI | `global.featureConfigs.localDatabase.uri` or generated database |
| `databaseMongodbURI` | MongoDB connection URI | `global.featureConfigs.database.mongodbURI` or generated database |
| `databaseType` | Database backend type | `global.featureConfigs.database.type` |
| `passwordSalt` | Password salt for services | Generated or `global.featureConfigs.regionInfo.passwordSalt` |
| `jwtInternal` | Internal JWT secret | Generated |
| `jwtRegional` | Regional JWT secret | Generated |
| `jwtGlobal` | Global JWT secret | Generated or `global.featureConfigs.regionInfo.jwtGlobal` |

## Synchronization Rules

When a `global.yaml` field feeds a runtime ConfigMap, the sync script should be the only writer for that derived key.
For example, `global.http` is synchronized to `sealos-system/sealos-config` keys such as `cloudDomain`,
`cloudPort`, `httpPort`, and `disableHttps`.

Component scripts should read `global.yaml` for install-time decisions and `sealos-config` for runtime values already published to the cluster.

## Adding New Global Fields

1. Add the field to the bundle `values/global.yaml`.
2. Document the field in the installation README when users are expected to edit it.
3. Read it through `read_yaml_file_path` or `fetch_global_config_value`.
4. If the field is needed by runtime components, synchronize it to a ConfigMap explicitly.
5. Add a guard so the same setting cannot also be configured through `sealos.env`.
6. Add or update verification that proves the field is read from `global.yaml`.

## Migration Pattern

When migrating an environment variable to `global.yaml`:

1. Add the new YAML field with the current default value.
2. Replace consumers to read the YAML path.
3. Keep compatibility only when required, and make it explicit in code.
4. Reject attempts to set the migrated environment variable through `sealos.env`.
5. Update user-facing docs and proposal conventions.

## Verification

Use these checks for changes that touch `global.yaml` conventions:

```bash
bash -n install/pro/<version>/scripts/*.sh
yq e '.global' install/pro/<version>/values/global.yaml
rg -n 'SEALOS_V2_OLD_KEY|oldYamlPath' install/pro openebs
```
