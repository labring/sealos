# sealos Bytebase controller
Integration with Bytebase on sealos

## Description
The Bytebase controller provides integration with Bytebase on sealos:

* Spawn up a usable Bytebase instance as fast as applying a Bytebase custom resource
* Start using Bytebase with access to all your databases instances automatically or manually added

Currently, it only support automatically import the PostgreSQL instances created by the PostgreSQL operator on sealos. Other instances require manual import on Bytebase GUI.

## Getting Started

### Prerequisites
#### SSL Certificate
The ssl certificate needs to be installed as a secret along with the controller (under the same namespace), and it needs to be named `wildcard-cloud-sealos-io-cert`.
#### Kubernetes Nginx Controller
This controller needs Kubernetes Nginx Controller to generate ingress.
#### PostgreSQL
If you have problems syncing the PostgreSQL databases, please make sure that your `pg_hba.conf` is correctly configured to allow access from the Bytebase instance.
### Install the controller and the CRDs

``` sh
kubectl apply -f deploy/sealos-bytebase-controller.yaml
```
### Install the custom resource

``` sh
kubectl apply -f config/samples/
```

## Contributing
You’ll need a Kubernetes cluster to run against. You can use [KIND](https://sigs.k8s.io/kind) to get a local cluster for testing, or run against a remote cluster.
**Note:** Your controller will automatically use the current context in your kubeconfig file (i.e. whatever cluster `kubectl cluster-info` shows).

### Running on the cluster
1. Install Instances of Custom Resources:

```sh
kubectl apply -f config/samples/
```

2. Build and push your image to the location specified by `IMG`:

```sh
make docker-build docker-push IMG=<some-registry>/bytebase:tag
```

3. Deploy the controller to the cluster with the image specified by `IMG`:

```sh
make deploy IMG=<some-registry>/bytebase:tag
```

### Uninstall CRDs
To delete the CRDs from the cluster:

```sh
make uninstall
```

### Undeploy controller
UnDeploy the controller from the cluster:

```sh
make undeploy
```

### How it works
This project aims to follow the Kubernetes [Operator pattern](https://kubernetes.io/docs/concepts/extend-kubernetes/operator/).

It uses [Controllers](https://kubernetes.io/docs/concepts/architecture/controller/),
which provide a reconcile function responsible for synchronizing resources until the desired state is reached on the cluster.

### Test It Out
1. Install the CRDs into the cluster:

```sh
make install
```

2. Run your controller (this will run in the foreground, so switch to a new terminal if you want to leave it running):

```sh
make run
```

**NOTE:** You can also run this in one step by running: `make install run`

### Modifying the API definitions
If you are editing the API definitions, generate the manifests such as CRs or CRDs using:

```sh
make manifests
```

**NOTE:** Run `make --help` for more information on all potential `make` targets

More information can be found via the [Kubebuilder Documentation](https://book.kubebuilder.io/introduction.html)

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
