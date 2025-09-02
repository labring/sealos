# Devbox Service Deployment

This directory contains deployment scripts for the Sealos Devbox backend service.

## Deployment

To deploy the devbox service:

```bash
# From the service/devbox/deploy/scripts directory
./init.sh
```

This will:
1. Create the `devbox-system` namespace
2. Create the devbox service configuration
3. Deploy the devbox service

## Deletion

To remove the devbox service deployment:

```bash
# From the service/devbox/deploy/scripts directory
./delete.sh
```

This will remove:
- Devbox service deployment and service resources
- Devbox service configuration

**Note**: This script does not delete the `devbox-system` namespace as it may be shared with the devbox controller. Use the main devbox deployment delete script (`deploy/devbox/scripts/delete.sh`) for complete cleanup.

## Files

- `scripts/init.sh` - Installation script that deploys the service
- `scripts/delete.sh` - Deletion script that removes service components
- `manifests/deploy.yaml.tmpl` - Service deployment template
- `manifests/devbox-config.yaml.tmpl` - Service configuration template
- `Kubefile` - Container definition for the deployment