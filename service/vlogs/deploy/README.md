### Helm deploy

```bash
make docker-build IMG=<your-image>
```

Package the `deploy/` image and run it in the cluster. The entrypoint:

- deletes the legacy `deploy/remove/deploy.yaml` install on first migration
- installs or upgrades the `vlogs` release in namespace `sealos`
- reads `SELECT_USER` / `SELECT_PASSWORD` from `sealos-system/vlogs-config-user`
- fills `serviceVlogsConfig.path`, `username`, `password`, and `WHITELIST_KUBERNETES_HOSTS`
- stores user overrides at `/root/.sealos/cloud/values/core/vlogs-values.yaml`
