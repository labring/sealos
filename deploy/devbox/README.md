# Devbox Deployment

This directory contains deployment scripts for the Sealos Devbox components.

## Deployment

To deploy devbox:

```bash
# From the deploy/devbox directory
sealos run init.sh
```

This will:
1. Pull the devbox controller and frontend images
2. Save them as `tars/devbox-controller.tar` and `tars/devbox-frontend.tar`
3. Deploy both components with the required environment variables

## Deletion

To remove the devbox deployment:

```bash
# From the deploy/devbox/scripts directory
./delete.sh
```

This will remove all devbox components including:
- The entire `devbox-system` namespace (controller resources)
- Devbox CRDs (CustomResourceDefinitions)
- Devbox frontend resources from sealos-system namespace
- ConfigMaps and secrets related to devbox

## Components

The devbox deployment includes:
- **Controller**: Manages devbox resources and lifecycle
- **Frontend**: Web interface for devbox management  

## Files

- `init.sh` - Main deployment script that pulls and saves devbox images
- `scripts/init.sh` - Installation script that deploys the saved tars
- `scripts/delete.sh` - Deletion script that removes devbox components
- `Kubefile` - Container definition for the deployment

## Environment Variables

The deployment accepts these environment variables:
- `cloudDomain` - Domain for the cloud deployment
- `cloudPort` - Port for the cloud deployment  
- `registryAddr` - Container registry address
- `registryUser` - Registry username
- `registryPassword` - Registry password