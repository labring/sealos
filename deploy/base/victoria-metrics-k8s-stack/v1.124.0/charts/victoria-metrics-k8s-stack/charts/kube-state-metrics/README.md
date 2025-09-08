# kube-state-metrics Helm Chart

Installs the [kube-state-metrics agent](https://github.com/kubernetes/kube-state-metrics).

## Get Repository Info
<!-- textlint-disable -->
```console
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

_See [helm repo](https://helm.sh/docs/helm/helm_repo/) for command documentation._
<!-- textlint-enable -->

## Install Chart

```console
helm install [RELEASE_NAME] prometheus-community/kube-state-metrics [flags]
```

_See [configuration](#configuration) below._

_See [helm install](https://helm.sh/docs/helm/helm_install/) for command documentation._

## Uninstall Chart

```console
helm uninstall [RELEASE_NAME]
```

This removes all the Kubernetes components associated with the chart and deletes the release.

_See [helm uninstall](https://helm.sh/docs/helm/helm_uninstall/) for command documentation._

## Upgrading Chart

```console
helm upgrade [RELEASE_NAME] prometheus-community/kube-state-metrics [flags]
```

_See [helm upgrade](https://helm.sh/docs/helm/helm_upgrade/) for command documentation._

### Migrating from stable/kube-state-metrics and kubernetes/kube-state-metrics

You can upgrade in-place:

1. [get repository info](#get-repository-info)
1. [upgrade](#upgrading-chart) your existing release name using the new chart repository

## Upgrading to v6.0.0

This version drops support for deprecated Pod Security Policy resources.

## Upgrading to v3.0.0

v3.0.0 includes kube-state-metrics v2.0, see the [changelog](https://github.com/kubernetes/kube-state-metrics/blob/release-2.0/CHANGELOG.md) for major changes on the application-side.

The upgraded chart now the following changes:

* Dropped support for helm v2 (helm v3 or later is required)
* collectors key was renamed to resources
* namespace key was renamed to namespaces

## Configuration

See [Customizing the Chart Before Installing](https://helm.sh/docs/intro/using_helm/#customizing-the-chart-before-installing). To see all configurable options with detailed comments:

```console
helm show values prometheus-community/kube-state-metrics
```

### kube-rbac-proxy

You can enable `kube-state-metrics` endpoint protection using `kube-rbac-proxy`. By setting `kubeRBACProxy.enabled: true`, this chart will deploy one RBAC proxy container per endpoint (metrics & telemetry).
To authorize access, authenticate your requests (via a `ServiceAccount` for example) with a `ClusterRole` attached such as:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kube-state-metrics-read
rules:
  - apiGroups: [ "" ]
    resources: ["services/kube-state-metrics"]
    verbs:
      - get
```

See [kube-rbac-proxy examples](https://github.com/brancz/kube-rbac-proxy/tree/master/examples/resource-attributes) for more details.
