### Helm deploy

```bash
make docker-build IMG=<your-image>
```

Package the `deploy/` image and run it in the cluster. The entrypoint:

- deletes the legacy `deploy/manifests/deploy.yaml` install on first migration
- installs or upgrades `service-vlogs` in namespace `sealos`
- reads `SELECT_USER` / `SELECT_PASSWORD` from `sealos-system/vlogs-config-user`
- fills `serviceVlogsConfig.path`, `username`, `password`, and `WHITELIST_KUBERNETES_HOSTS`
- stores user overrides at `/root/.sealos/cloud/values/core/service-vlogs-monitor-values.yaml`
