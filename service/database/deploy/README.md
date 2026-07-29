### Helm deploy

```bash
make docker-build IMG=<your-image>
```

Package the `deploy/` image and run it in the cluster. The entrypoint:

- deletes the legacy `deploy/manifests/deploy.yaml` install on first migration
- installs or upgrades `database-monitor` in namespace `sealos`
- injects `PROMETHEUS_SERVICE_HOST` from `PROMETHEUS_URL`
- stores user overrides at `/root/.sealos/cloud/values/apps/database/database-monitor-values.yaml`
