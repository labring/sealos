# RESTServer

## Description

restserver for database monitoring

## Getting Started

### Running on the cluster

1. Build and push your image to the location specified by `IMG`:

```sh
make docker-build docker-push IMG=<some-registry>/sealos-cloud-database-monitor:tag
```

2. Deploy the restserver:

```sh
kubectl apply -f deploy/manifests/
```
  
### How it works

To enable the database frontend application to retrieve monitoring data, you need to modify the environment variable `MONITOR_URL` of the frontend deployment to the corresponding address of the restserver.

Additionally, to configure the data source, you need to set the environment variable `PROMETHEUS_SERVICE_HOST` of the restserver deployment to the correct address.

```
e.g.
http://prometheus.sealos.svc.cluster.local
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