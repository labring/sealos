# RESTServer

## Description

restserver for victoria logs

## Getting Started

### Running on the cluster

Install with Helm or a Sealos cluster image. See the
[deployment guide](deploy/README.md) for configuration, image builds, CI and
migration from the legacy YAML manifests.

```sh
helm upgrade -i vlogs deploy/charts/vlogs-service \
  -n sealos --create-namespace -f vlogs-values.yaml
```

### How it works

The API authenticates the caller's kubeconfig and queries an existing
VictoriaLogs backend. Set `config.path` to the VictoriaLogs or vmauth base URL,
and `config.username` / `config.password` if the backend requires Basic Auth.
The default API endpoint is `http://service-vlogs.sealos.svc.cluster.local:8428`.

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
