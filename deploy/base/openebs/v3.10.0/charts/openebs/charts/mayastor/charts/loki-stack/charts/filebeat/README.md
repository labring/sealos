# Filebeat Helm Chart

[![Build Status](https://img.shields.io/jenkins/s/https/devops-ci.elastic.co/job/elastic+helm-charts+master.svg)](https://devops-ci.elastic.co/job/elastic+helm-charts+master/) [![Artifact HUB](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/elastic)](https://artifacthub.io/packages/search?repo=elastic)

This Helm chart is a lightweight way to configure and run our official
[Filebeat Docker image][].

<!-- development warning placeholder -->

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Requirements](#requirements)
- [Installing](#installing)
  - [Install released version using Helm repository](#install-released-version-using-helm-repository)
  - [Install development version from a branch](#install-development-version-from-a-branch)
- [Upgrading](#upgrading)
- [Usage notes](#usage-notes)
- [Configuration](#configuration)
  - [Deprecated](#deprecated)
- [FAQ](#faq)
  - [How to use Filebeat with Elasticsearch with security (authentication and TLS) enabled?](#how-to-use-filebeat-with-elasticsearch-with-security-authentication-and-tls-enabled)
  - [How to install OSS version of Filebeat?](#how-to-install-oss-version-of-filebeat)
  - [Why is Filebeat host.name field set to Kubernetes pod name?](#why-is-filebeat-hostname-field-set-to-kubernetes-pod-name)
  - [How do I get multiple beats agents working with hostNetworking enabled?](#how-do-i-get-multiple-beats-agents-working-with-hostnetworking-enabled)
  - [How to change readinessProbe for outputs which don't support testing](#how-to-change-readinessprobe-for-outputs-which-dont-support-testing)
- [Contributing](#contributing)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->
<!-- Use this to update TOC: -->
<!-- docker run --rm -it -v $(pwd):/usr/src jorgeandrada/doctoc --github -->


## Requirements

* Kubernetes >= 1.14
* [Helm][] >= 2.17.0

See [supported configurations][] for more details.


## Installing

This chart is tested with the latest 7.17.1 version.

### Install released version using Helm repository

* Add the Elastic Helm charts repo:
`helm repo add elastic https://helm.elastic.co`

* Install it:
  - with Helm 3: `helm install filebeat --version <version> elastic/filebeat`
  - with Helm 2 (deprecated): `helm install --name filebeat --version <version> elastic/filebeat`

### Install development version from a branch

* Clone the git repo: `git clone git@github.com:elastic/helm-charts.git`

* Checkout the branch : `git checkout 7.17`
* Install it:
  - with Helm 3: `helm install filebeat ./helm-charts/filebeat --set imageTag=7.17.1`
  - with Helm 2 (deprecated): `helm install --name filebeat ./helm-charts/filebeat --set imageTag=7.17.1`


## Upgrading

Please always check [CHANGELOG.md][] and [BREAKING_CHANGES.md][] before
upgrading to a new chart version.


## Usage notes

* The default Filebeat configuration file for this chart is configured to use an
Elasticsearch endpoint. Without any additional changes, Filebeat will send
documents to the service URL that the Elasticsearch Helm chart sets up by
default. You may either set the `ELASTICSEARCH_HOSTS` environment variable in
`extraEnvs` to override this endpoint or modify the default `filebeatConfig` to
change this behavior.
* The default Filebeat configuration file is also configured to capture
container logs and enrich them with Kubernetes metadata by default. This will
capture all container logs in the cluster.
* This chart disables the [HostNetwork][] setting by default for compatibility
reasons with the majority of kubernetes providers and scenarios. Some kubernetes
providers may not allow enabling `hostNetwork` and deploying multiple Filebeat
pods on the same node isn't possible with `hostNetwork` However Filebeat does
recommend activating it. If your kubernetes provider is compatible with
`hostNetwork` and you don't need to run multiple Filebeat DaemonSets, you can
activate it by setting `hostNetworking: true` in [values.yaml][].
* This repo includes a number of [examples][] configurations which can be used
as a reference. They are also used in the automated testing of this chart.


## Configuration

| Parameter                      | Description                                                                                                                                                                  | Default                            |
|--------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------|
| `clusterRoleRules`             | Configurable [cluster role rules][] that Filebeat uses to access Kubernetes resources                                                                                        | see [values.yaml][]                |
| `daemonset.annotations`        | Configurable [annotations][] for filebeat daemonset                                                                                                                          | `{}`                               |
| `daemonset.labels`             | Configurable [labels][] applied to all filebeat DaemonSet pods                                                                                                               | `{}`                               |
| `daemonset.affinity`           | Configurable [affinity][] for filebeat daemonset                                                                                                                             | `{}`                               |
| `daemonset.enabled`            | If true, enable daemonset                                                                                                                                                    | `true`                             |
| `daemonset.envFrom`            | Templatable string of `envFrom` to be passed to the  [environment from variables][] which will be appended to filebeat container for DaemonSet                               | `[]`                               |
| `daemonset.extraEnvs`          | Extra [environment variables][] which will be appended to filebeat container for DaemonSet                                                                                   | `[]`                               |
| `daemonset.extraVolumeMounts`  | Templatable string of additional `volumeMounts` to be passed to the `tpl` function for DaemonSet                                                                             | `[]`                               |
| `daemonset.extraVolumes`       | Templatable string of additional `volumes` to be passed to the `tpl` function for DaemonSet                                                                                  | `[]`                               |
| `daemonset.hostAliases`        | Configurable [hostAliases][] for filebeat DaemonSet                                                                                                                          | `[]`                               |
| `daemonset.hostNetworking`     | Enable filebeat DaemonSet to use `hostNetwork`                                                                                                                               | `false`                            |
| `daemonset.filebeatConfig`     | Allows you to add any config files in `/usr/share/filebeat` such as `filebeat.yml` for filebeat DaemonSet                                                                    | see [values.yaml][]                |
| `daemonset.maxUnavailable`     | The [maxUnavailable][] value for the pod disruption budget. By default this will prevent Kubernetes from having more than 1 unhealthy pod in the node group                  | `1`                                |
| `daemonset.nodeSelector`       | Configurable [nodeSelector][] for filebeat DaemonSet                                                                                                                         | `{}`                               |
| `daemonset.secretMounts`       | Allows you easily mount a secret as a file inside the DaemonSet. Useful for mounting certificates and other secrets. See [values.yaml][] for an example                      | `[]`                               |
| `daemonset.podSecurityContext` | Configurable [podSecurityContext][] for filebeat DaemonSet pod execution environment                                                                                         | see [values.yaml][]                |
| `daemonset.resources`          | Allows you to set the [resources][] for filebeat DaemonSet                                                                                                                   | see [values.yaml][]                |
| `daemonset.tolerations`        | Configurable [tolerations][] for filebeat DaemonSet                                                                                                                          | `[]`                               |
| `deployment.annotations`       | Configurable [annotations][] for filebeat Deployment                                                                                                                         | `{}`                               |
| `deployment.labels`            | Configurable [labels][] applied to all filebeat Deployment pods                                                                                                              | `{}`                               |
| `deployment.affinity`          | Configurable [affinity][] for filebeat Deployment                                                                                                                            | `{}`                               |
| `deployment.enabled`           | If true, enable deployment                                                                                                                                                   | `false`                            |
| `deployment.envFrom`           | Templatable string of `envFrom` to be passed to the  [environment from variables][] which will be appended to filebeat container for Deployment                              | `[]`                               |
| `deployment.extraEnvs`         | Extra [environment variables][] which will be appended to filebeat container for Deployment                                                                                  | `[]`                               |
| `deployment.extraVolumeMounts` | Templatable string of additional `volumeMounts` to be passed to the `tpl` function for DaemonSet                                                                             | `[]`                               |
| `deployment.extraVolumes`      | Templatable string of additional `volumes` to be passed to the `tpl` function for Deployment                                                                                 | `[]`                               |
| `daemonset.hostAliases`        | Configurable [hostAliases][] for filebeat Deployment                                                                                                                         | `[]`                               |
| `deployment.filebeatConfig`    | Allows you to add any config files in `/usr/share/filebeat` such as `filebeat.yml` for filebeat Deployment                                                                   | see [values.yaml][]                |
| `deployment.nodeSelector`      | Configurable [nodeSelector][] for filebeat Deployment                                                                                                                        | `{}`                               |
| `deployment.secretMounts`      | Allows you easily mount a secret as a file inside the Deployment Useful for mounting certificates and other secrets. See [values.yaml][] for an example                      | `[]`                               |
| `deployment.resources`         | Allows you to set the [resources][] for filebeat Deployment                                                                                                                  | see [values.yaml][]                |
| `deployment.securityContext`   | Configurable [securityContext][] for filebeat Deployment pod execution environment                                                                                           | see [values.yaml][]                |
| `deployment.tolerations`       | Configurable [tolerations][] for filebeat Deployment                                                                                                                         | `[]`                               |
| `replicas`                     | The replica count for the Filebeat deployment                                                                                                                                | `1`                                |
| `extraContainers`              | Templatable string of additional containers to be passed to the `tpl` function                                                                                               | `""`                               |
| `extraInitContainers`          | Templatable string of additional containers to be passed to the `tpl` function                                                                                               | `""`                               |
| `fullnameOverride`             | Overrides the full name of the resources. If not set the name will default to " `.Release.Name` - `.Values.nameOverride or .Chart.Name` "                                    | `""`                               |
| `hostPathRoot`                 | Fully-qualified [hostPath][] that will be used to persist filebeat registry data                                                                                             | `/var/lib`                         |
| `imagePullPolicy`              | The Kubernetes [imagePullPolicy][] value                                                                                                                                     | `IfNotPresent`                     |
| `imagePullSecrets`             | Configuration for [imagePullSecrets][] so that you can use a private registry for your image                                                                                 | `[]`                               |
| `imageTag`                     | The filebeat Docker image tag                                                                                                                                                | `7.17.1`                           |
| `image`                        | The filebeat Docker image                                                                                                                                                    | `docker.elastic.co/beats/filebeat` |
| `livenessProbe`                | Parameters to pass to liveness [probe][] checks for values such as timeouts and thresholds                                                                                   | see [values.yaml][]                |
| `managedServiceAccount`        | Whether the `serviceAccount` should be managed by this helm chart. Set this to `false` in order to manage your own service account and related roles                         | `true`                             |
| `nameOverride`                 | Overrides the chart name for resources. If not set the name will default to `.Chart.Name`                                                                                    | `""`                               |
| `podAnnotations`               | Configurable [annotations][] applied to all filebeat pods                                                                                                                    | `{}`                               |
| `priorityClassName`            | The name of the [PriorityClass][]. No default is supplied as the PriorityClass must be created first                                                                         | `""`                               |
| `readinessProbe`               | Parameters to pass to readiness [probe][] checks for values such as timeouts and thresholds                                                                                  | see [values.yaml][]                |
| `serviceAccount`               | Custom [serviceAccount][] that filebeat will use during execution. By default will use the service account created by this chart                                             | `""`                               |
| `serviceAccountAnnotations`    | Annotations to be added to the ServiceAccount that is created by this chart.                                                                                                 | `{}`                               |
| `terminationGracePeriod`       | Termination period (in seconds) to wait before killing filebeat pod process on pod shutdown                                                                                  | `30`                               |
| `updateStrategy`               | The [updateStrategy][] for the DaemonSet By default Kubernetes will kill and recreate pods on updates. Setting this to `OnDelete` will require that pods be deleted manually | `RollingUpdate`                    |

### Deprecated

| Parameter            | Description                                                                                                                                          | Default |
|----------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|---------|
| `affinity`           | Configurable [affinity][] for filebeat DaemonSet                                                                                                     | `{}`    |
| `envFrom`            | Templatable string to be passed to the [environment from variables][] which will be appended to filebeat container for both DaemonSet and Deployment | `[]`    |
| `extraEnvs`          | Extra [environment variables][] which will be appended to filebeat container for both DaemonSet and Deployment                                       | `[]`    |
| `extraVolumeMounts`  | Templatable string of additional `volumeMounts` to be passed to the `tpl` function for both DaemonSet and Deployment                                 | `[]`    |
| `extraVolumes`       | Templatable string of additional `volumes` to be passed to the `tpl` function for both DaemonSet and Deployment                                      | `[]`    |
| `filebeatConfig`     | Allows you to add any config files in `/usr/share/filebeat` such as `filebeat.yml` for both filebeat DaemonSet and Deployment                        | `{}`    |
| `hostAliases`        | Configurable [hostAliases][]                                                                                                                         | `[]`    |
| `nodeSelector`       | Configurable [nodeSelector][] for filebeat DaemonSet                                                                                                 | `{}`    |
| `podSecurityContext` | Configurable [securityContext][] for filebeat DaemonSet and Deployment pod execution environment                                                     | `{}`    |
| `resources`          | Allows you to set the [resources][] for both filebeat DaemonSet and Deployment                                                                       | `{}`    |
| `secretMounts`       | Allows you easily mount a secret as a file inside DaemonSet and Deployment Useful for mounting certificates and other secrets                        | `[]`    |
| `tolerations`        | Configurable [tolerations][] for both filebeat DaemonSet and Deployment                                                                              | `[]`    |
| `labels`             | Configurable [labels][] applied to all filebeat pods                                                                                                 | `{}`    |

## FAQ

### How to use Filebeat with Elasticsearch with security (authentication and TLS) enabled?

This Helm chart can use existing [Kubernetes secrets][] to setup
credentials or certificates for examples. These secrets should be created
outside of this chart and accessed using [environment variables][] and volumes.

An example can be found in [examples/security][].

### How to install OSS version of Filebeat?

Deploying OSS version of Filebeat can be done by setting `image` value to
[Filebeat OSS Docker image][]

An example of Filebeat deployment using OSS version can be found in
[examples/oss][].

### Why is Filebeat host.name field set to Kubernetes pod name?

The default Filebeat configuration is using Filebeat pod name for
`agent.hostname` and `host.name` fields. The `hostname` of the Kubernetes nodes
can be find in `kubernetes.node.name` field. If you would like to have
`agent.hostname` and `host.name` fields set to the hostname of the nodes, you'll
need to set `hostNetworking` value to true.

Note that enabling [hostNetwork][] make Filebeat pod use the host network
namespace which gives it access to the host loopback device, services listening
on localhost, could be used to snoop on network activity of other pods on the
same node.

### How do I get multiple beats agents working with hostNetworking enabled?

The default http port for multiple beats agents may be on the same port, for
example, Filebeats and Metricbeats both default to 5066. When `hostNetworking`
is enabled this will cause collisions when standing up the http server. The work
around for this is to set `http.port` in the config file for one of the beats agent
to use a different port.

### How to change readinessProbe for outputs which don't support testing

Some [Filebeat outputs][] like [Kafka output][] don't support testing using
`filebeat test output` command which is used by Filebeat chart readiness probe.

This makes Filebeat pods crash before being ready with the following message:
`Readiness probe failed: kafka output doesn't support testing`.

The workaround when using this kind of output is to override the readiness probe
command to check Filebeat API instead (same as existing liveness probe).

```
readinessProbe:
  exec:
    command:
      - sh
      - -c
      - |
        #!/usr/bin/env bash -e
        curl --fail 127.0.0.1:5066
```


## Contributing

Please check [CONTRIBUTING.md][] before any contribution or for any questions
about our development and testing process.

[7.17]: https://github.com/elastic/helm-charts/releases
[BREAKING_CHANGES.md]: https://github.com/elastic/helm-charts/blob/master/BREAKING_CHANGES.md
[CHANGELOG.md]: https://github.com/elastic/helm-charts/blob/master/CHANGELOG.md
[CONTRIBUTING.md]: https://github.com/elastic/helm-charts/blob/master/CONTRIBUTING.md
[affinity]: https://kubernetes.io/docs/concepts/configuration/assign-pod-node/#affinity-and-anti-affinity
[annotations]: https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/
[cluster role rules]: https://kubernetes.io/docs/reference/access-authn-authz/rbac/#role-and-clusterrole
[dnsConfig]: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
[environment variables]: https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/#using-environment-variables-inside-of-your-config
[environment from variables]: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/#configure-all-key-value-pairs-in-a-configmap-as-container-environment-variables
[examples]: https://github.com/elastic/helm-charts/tree/7.17/filebeat/examples
[examples/oss]: https://github.com/elastic/helm-charts/tree/7.17/filebeat/examples/oss
[examples/security]: https://github.com/elastic/helm-charts/tree/7.17/filebeat/examples/security
[filebeat docker image]: https://www.elastic.co/guide/en/beats/filebeat/7.17/running-on-docker.html
[filebeat oss docker image]: https://www.docker.elastic.co/r/beats/filebeat-oss
[filebeat outputs]: https://www.elastic.co/guide/en/beats/filebeat/7.17/configuring-output.html
[helm]: https://helm.sh
[hostAliases]: https://kubernetes.io/docs/concepts/services-networking/add-entries-to-pod-etc-hosts-with-host-aliases/
[hostNetwork]: https://kubernetes.io/docs/concepts/policy/pod-security-policy/#host-namespaces
[hostPath]: https://kubernetes.io/docs/concepts/storage/volumes/#hostpath
[imagePullPolicy]: https://kubernetes.io/docs/concepts/containers/images/#updating-images
[imagePullSecrets]: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/#create-a-pod-that-uses-your-secret
[kafka output]: https://www.elastic.co/guide/en/beats/filebeat/7.17/kafka-output.html
[kubernetes secrets]: https://kubernetes.io/docs/concepts/configuration/secret/
[labels]: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
[maxUnavailable]: https://kubernetes.io/docs/tasks/run-application/configure-pdb/#specifying-a-poddisruptionbudget
[nodeSelector]: https://kubernetes.io/docs/concepts/configuration/assign-pod-node/#nodeselector
[podSecurityContext]: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
[priorityClass]: https://kubernetes.io/docs/concepts/configuration/pod-priority-preemption/#priorityclass
[probe]: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-probes/
[resources]: https://kubernetes.io/docs/concepts/configuration/manage-compute-resources-container/
[supported configurations]: https://github.com/elastic/helm-charts/tree/7.17/README.md#supported-configurations
[serviceAccount]: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
[tolerations]: https://kubernetes.io/docs/concepts/configuration/taint-and-toleration/
[updateStrategy]: https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/#daemonset-update-strategy
[values.yaml]: https://github.com/elastic/helm-charts/tree/7.17/filebeat/values.yaml
