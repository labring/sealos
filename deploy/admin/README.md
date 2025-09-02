# Admin Frontend Deployment

This directory contains deployment scripts for the Sealos Cloud Admin frontend.

## Deployment

To deploy the admin frontend:

```bash
# From the deploy/admin directory
sealos run init.sh
```

This will:
1. Pull the `ghcr.io/labring/sealos-cloud-admin:latest` image
2. Save it as `tars/frontend-admin.tar` 
3. Deploy the admin frontend with environment variables from sealos-config

## Deletion

To remove the admin frontend deployment:

```bash
# From the deploy/admin/scripts directory  
./delete.sh
```

This will remove all admin frontend components including:
- Deployments, services, and ingresses
- ConfigMaps and secrets
- Any resources with 'admin' in the name from sealos-system namespace

## Files

- `init.sh` - Main deployment script that pulls and saves the admin image
- `scripts/init.sh` - Installation script that deploys the saved admin tar
- `scripts/delete.sh` - Deletion script that removes admin components
- `Kubefile` - Container definition for the deployment