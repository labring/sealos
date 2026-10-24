# vlogs service

HTTP query gateway for VictoriaLogs. Business routes authenticate the caller's
Kubernetes access; `GET /health` returns process health without authentication
or calls to Kubernetes or VictoriaLogs.

## Build and deploy

From this directory, build and publish both supported platforms:

```sh
make docker-buildx-push IMG=your-registry/sealos-vlogs-service:your-version
```

See [deployment instructions](deploy/README.md) for Helm configuration, migration
from legacy manifests, probes, validation and rollback. The backend URL and
credentials come from the YAML file passed to `/manager`; the Kubernetes host
whitelist comes from `WHITELIST_KUBERNETES_HOSTS`. See [env.template](env.template).

## Local verification

From `service/`:

```sh
go test ./vlogs/... ./pkg/server/...
go build ./vlogs/...
```

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