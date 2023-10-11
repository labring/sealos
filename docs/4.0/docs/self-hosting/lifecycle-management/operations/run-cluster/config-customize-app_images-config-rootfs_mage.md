---
sidebar_position: 2
---

# Configuring and Customizing Application Images and Their Runtime Environment

Sealos provides a way to patch files at runtime using the `Config` object. This article will provide detailed instructions on how to do this.

## Introduction to the `Config` Object

The `Config` is an object that describes how to patch, create, or replace specific files at runtime for a specific application image or all images in the runtime list.

Let's take the case where we need to use a cluster with `node-local-dns`.

## Creating the Cloud Image for the `node-local-dns` Application

First, we create the cloud image for the `node-local-dns` application:

```bash
$ tree node-local-dns
node-local-dns
├── Kubefile
└── charts
    ├── node-local-dns-1.3.2.tgz
    └── node-local-dns.values.yaml
$ cat node-local-dns/Kubefile
FROM scratch
LABEL VERSION="1.3.2"
COPY . .
CMD ["helm -n kube-system upgrade --install -f charts/node-local-dns.values.yaml node-local-dns charts/node-local-dns-1.3.2.tgz"]
$ cat node-local-dns/charts/node-local-dns.values.yaml
image:
  repository: k8s.tencentcloudcr.com/dns/k8s-dns-node-cache
  pullPolicy: IfNotPresent
  tag: 1.17.4
$ cd node-local-dns && sudo sealos build -t node-local-dns:1.3.2 -f Kubefile .
```

The chart file can be downloaded from [here](https://artifacthub.io/packages/helm/node-local-dns/node-local-dns).

## Creating a `Clusterfile`

Next, we create a `Clusterfile`:

```yaml
{{- $kubeDNS := ipAt (default "10.96.0.0/18" .Values.networking.serviceSubnet) 10 -}}

apiVersion: apps.sealos.io/v1beta1
kind: Cluster
metadata:
  name: default
spec:
  ...
  image:
  - labring/kubernetes:v1.23.8
  - labring/calico:v3.24.1
  - node-local-dns:1.3.2
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
networking:
  dnsDomain: {{ default "cluster.local" .Values.networking.dnsDomain }}
  serviceSubnet: {{ default "10.96.0.0/18" .Values.networking.serviceSubnet }}
  podSubnet: {{ default "100.64.0.0/17" .Values.networking.podSubnet }}
---
apiVersion: kubelet.config.k8s.io/v1beta1
clusterDNS:
{{- if .Values.localDNS.enabled }}
  - {{ .Values.localDNS.bind }}
{{- else }}
  - {{ $kubeDNS }}
{{- end }}
kind: KubeletConfiguration
---
apiVersion: apps.sealos.io/v1beta1
kind: Config
metadata:
  name: node-local-dns
spec:
  path: charts/node-local-dns.values.yaml
  match: {{ .Values.localDNS.image }}
  strategy: merge
  data: |
    config:
      localDnsIp: {{ .Values.localDNS.bind }}
      zones:
        -
          zone: .:53
          plugins:
            errors: true
            reload: true
            debug: false
            log:
              format: combined
              classes

: all
            cache:
              parameters: 30
              denial:
                {}
                # size: 0
                # ttl: 1
              success:
                {}
                # size: 8192
                # ttl: 30
              prefetch:
                {}
                # amount: 1
                # duration: 10m
                # percentage: 20%
              serve_stale: false
            forward:
              parameters: /etc/resolv.conf
              force_tcp: false
              prefer_udp: false
              policy: "" # random|round_robin|sequential
              max_fails: "" # 10
              expire: "" # 10s
              health_check: "" # 10s
            prometheus: true
            health:
              port: 8080
        - zone: ip6.arpa:53
          plugins:
            errors: true
            reload: true
            debug: false
            log:
              format: combined
              classes: all
            cache:
              parameters: 30
            forward:
              parameters: {{ $kubeDNS }}
              force_tcp: true
            prometheus: true
            health:
              port: 8080
        - zone: in-addr.arpa:53
          plugins:
            errors: true
            reload: true
            debug: false
            log:
              format: combined
              classes: all
            cache:
              parameters: 30
            forward:
              parameters: {{ $kubeDNS }}
              force_tcp: true
            prometheus: true
            health:
              port: 8080
        - zone: {{ printf "%s:53" .Values.networking.dnsDomain }}
          plugins:
            errors: true
            reload: true
            debug: false
            log:
              format: combined
              classes: all
            cache:
              parameters: 30
              denial:
                size: 9984
                ttl: 5
              success:
                size: 9984
                ttl: 30
            forward:
              parameters: {{ $kubeDNS }} # defaults to /etc/resolv.conf
              force_tcp: true
            prometheus: true
            health:
              port: 8080
{{- end }
```

## Using the `Config` Object

Because the `localDNS` field in the `kubelet` configuration needs to match the listening address of `node-local-dns`, it must be pre-defined in the Clusterfile. At the same time, we want to modify the configuration of `node-local-dns` flexibly, so we use `Config` to patch the `charts/node-local-dns.values.yaml` file before Sealos actually calls the `helm` command.

Here's a brief introduction to the fields of the `Config` object:

- `metadata.name`: This name cannot be duplicated with other names.
- `spec.path`: The file path in the application image.
- `spec.match`: Optional. When `match` is defined, `Config` is applied to the image that matches it; otherwise, it is applied to all images.
- `spec.strategy`: Can be `merge`, `insert`, `append`, or `override`.
  - `merge`: Only applicable to YAML/JSON files.
  - `insert`/`append`: Inserts data into the file.
  - `override`: Overrides the contents of the file.
- `spec.data`: The data to be applied.

Run Sealos apply:

```bash
sudo sealos apply -f Clusterfile --set localDNS.enabled=true --set localDNS.bind=169.254.20.11 --set localDNS.image=node-local-dns:1.3.2
```

## More Use Cases
We can use this mechanism to customize pre-built images or customize the configuration of a specific component without rebuilding it. For example, adding custom containerd configuration.

Before the initial run, add the Config in the Clusterfile.
```yaml
---
...
---
apiVersion: apps.sealos.io/v1beta1
kind: Config
metadata:
  name: containerd-config
spec:
  strategy: override
  # only applied to rootfs
  match: labring/kubernetes:v1.23.8
  path: etc/config.toml
  data: |
    version = 2
    root = "/var/lib/containerd"
    state = "/run/containerd"
    oom_score = 0

    [grpc]
      address = "/run/containerd/containerd.sock"
      uid = 0
      gid = 0
      max_recv_message_size = 16777216
      max_send_message_size = 16777216

    [debug]
      address = "/run/containerd/containerd-debug.sock"
      uid = 0
      gid = 0
      level = "warn"

    [timeouts]
      "io.containerd.timeout.shim.cleanup" = "5s"
      "io.containerd.timeout.shim.load" = "5s"
      "io.containerd.timeout.shim.shutdown" = "3s"
      "io.containerd.timeout.task.state" = "2s"

    [plugins]
      [plugins."io.containerd.grpc.v1.cri"]
        sandbox_image = "sealos.hub:5000/pause:3.6"
        max_container_log_line_size = -1
        max_concurrent_downloads = 20
        [plugins."io.containerd.grpc.v1.cri".containerd]
          snapshotter = "overlayfs"
          default_runtime_name = "runc"
          [plugins."io.containerd.grpc.v1.cri".containerd.runtimes]
            [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
              runtime_type = "io.containerd.runc.v2"
              runtime_engine = ""
              runtime_root = ""
              [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
                SystemdCgroup = true
                __options__
        [plugins."io.containerd.grpc.v1.cri".registry]
          config_path = "/etc/containerd/certs.d"
```

