# Service VLogs

Victoria Logs service for Sealos.

## Getting Started

1. Build and push the image:

```bash
make docker-build docker-push IMG=<some-registry>/sealos-vlogs-service:latest
```

2. Use the cluster deployment package built from `deploy/Kubefile` and run the
   resulting image with Sealos. The shared service build workflow publishes the
   `sealos-cloud-vlogs-service` cluster image.

The deployment entrypoint installs or upgrades the Helm release `vlogs` in the
`sealos` namespace, removes the legacy raw-manifest install on first migration,
renders backend credentials from `sealos-system/vlogs-config-user`, and injects
`WHITELIST_KUBERNETES_HOSTS` from the current cloud URL.

User overrides live at `/root/.sealos/cloud/values/core/vlogs-values.yaml`.

## License

Copyright 2023.

Licensed under the Apache License, Version 2.0 (the "License");

you may not use this file except in compliance with the License.

You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software

distributed under the License is distributed on an "AS IS" BASIS,

WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

See the License for the specific language governing permissions and

limitations under the License.
