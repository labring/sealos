### How to build image

```shell
sealos build -t docker.io/labring/sealos-terminal-controller:latest -f Kubefile .
```

### How to run

```shell
sealos run docker.io/labring/sealos-terminal-controller:latest
```

### Configuration

The terminal controller supports the following environment variables:

- `RELEASE_NAME`: Helm release name (default: `terminal`)
- `RELEASE_NAMESPACE`: Deployment namespace (default: `terminal-system`)
- `CHART_PATH`: Path to helm chart (default: `./charts/terminal-controller`)
- `HELM_OPTS`: Additional helm options
- `SEALOS_CLOUD_DOMAIN`: Cloud domain (auto-detected from sealos-config)
- `SEALOS_CLOUD_PORT`: Cloud port (auto-detected from sealos-config)
- `TERMINAL_BACKUP_ENABLED`: Enable resource backup (default: `true`)
- `TERMINAL_BACKUP_DIR`: Backup directory (default: `/tmp/sealos-backup/terminal-controller`)

### Deployment Structure

This deployment uses Helm charts for better manageability:

- **Chart**: `charts/terminal-controller/`
- **Entrypoint**: `terminal-controller-entrypoint.sh`
- **CRD**: Terminals.terminal.sealos.io

The controller will automatically:
- Create namespace if it doesn't exist (via `--create-namespace`)
- Adopt existing resources for smooth migration
- Backup resources before upgrades
- Configure from sealos-system configmap
