# jaeger-operator

[jaeger-operator](https://github.com/jaegertracing/jaeger-operator) is a Kubernetes operator.

## Install

```console
$ helm install jaegertracing/jaeger-operator
```

## Introduction

This chart bootstraps a jaeger-operator deployment on a [Kubernetes](http://kubernetes.io) cluster using the [Helm](https://helm.sh) package manager.

## Prerequisites

- Kubernetes 1.19+

## Installing the Chart

Add the Jaeger Tracing Helm repository:

```console
$ helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
```

To install the chart with the release name `my-release`:

```console
$ helm install --name my-release jaegertracing/jaeger-operator
```

The command deploys jaeger-operator on the Kubernetes cluster in the default configuration. The [configuration](#configuration) section lists the parameters that can be configured during installation.

> **Tip**: List all releases using `helm list`

## Uninstalling the Chart

To uninstall/delete the `my-release` deployment:

```console
$ helm delete my-release
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

## Configuration

The following table lists the configurable parameters of the jaeger-operator chart and their default values.

| Parameter               | Description                                                                                                 | Default                         |
| :---------------------- | :---------------------------------------------------------------------------------------------------------- | :------------------------------ |
| `extraLabels`           | Additional labels to jaeger-operator deployment  | `{}`
| `image.repository`      | Controller container image repository                                                                       | `jaegertracing/jaeger-operator` |
| `image.tag`             | Controller container image tag                                                                              | `1.24.0`                        |
| `image.pullPolicy`      | Controller container image pull policy                                                                      | `IfNotPresent`                  |
| `jaeger.create`         | Jaeger instance will be created                                                                             | `false`                         |
| `jaeger.spec`           | Jaeger instance specification                                                                               | `{}`                            |
| `crd.install`           | CustomResourceDefinition will be installed                                                                  | `true`                          |
| `rbac.create`           | All required roles and rolebindings will be created                                                         | `true`                          |
| `serviceAccount.create` | Service account to use                                                                                      | `true`                          |
| `rbac.pspEnabled`       | Pod security policy for pod will be created and included in rbac role                                       | `false`                         |
| `rbac.clusterRole`      | ClusterRole will be used by operator ServiceAccount                                                         | `false`                         |
| `serviceAccount.name`   | Service account name to use. If not set and create is true, a name is generated using the fullname template | `nil`                           |
| `extraEnv`              | Additional environment variables passed to the operator. For example:   name: LOG-LEVEL   value: debug      | `[]`                            |
| `resources`             | K8s pod resources                                                                                           | `None`                          |
| `nodeSelector`          | Node labels for pod assignment                                                                              | `{}`                            |
| `tolerations`           | Toleration labels for pod assignment                                                                        | `[]`                            |
| `affinity`              | Affinity settings for pod assignment                                                                        | `{}`                            |
| `securityContext`       | Security context for pod                                                                                    | `{}`                            |
| `priorityClassName`     | Priority class name for the pod                                                                             | `None`                          |

Specify each parameter you'd like to override using a YAML file as described above in the [installation](#installing-the-chart) section.

You can also specify any non-array parameter using the `--set key=value[,key=value]` argument to `helm install`. For example,

```console
$ helm install jaegertracing/jaeger-operator --name my-release \
    --set rbac.create=false
```

## After the Helm Installation

### Creating a new Jaeger instance

The simplest possible way to install is by creating a YAML file like the following:

```YAML
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: simplest
```

The YAML file can then be used with `kubectl`:

```console
$ kubectl apply -f simplest.yaml
```

### Creating a new Jaeger with ElasticSearch

To do that you need to have an ElasticSearch installed in your Kubernetes cluster or install one using the [Helm Chart](https://github.com/helm/charts/tree/master/incubator/elasticsearch) available for that.

After that just deploy the following manifest:

```YAML
# setup an elasticsearch with `make es`
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: simple-prod
spec:
  strategy: production
  storage:
    type: elasticsearch
    options:
      es:
        server-urls: http://elasticsearch:9200
        username: elastic
        password: changeme
```

The YAML file can then be used with `kubectl`:

```console
$ kubectl apply -f simple-prod.yaml
```
