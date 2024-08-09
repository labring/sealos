---
sidebar_position: 2
---

# 配置和自定义应用镜像及其运行时环境

Sealos 提供了一种使用 `Config` 对象来在运行时对文件进行补丁操作的方式。本文将详细介绍这一操作的过程和使用方法。

## `Config` 对象简介

`Config` 是一个描述如何在运行时为特定应用镜像或运行列表中的所有镜像打补丁、创建或替换指定文件的对象。

以我们需要使用包含 `node-local-dns` 的集群为例。

## 创建 `node-local-dns` 应用云镜像

首先，创建 `node-local-dns` 应用的云镜像：

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

这里的 chart 文件可以从 [这里](https://artifacthub.io/packages/helm/node-local-dns/node-local-dns) 下载。

## 创建 `Clusterfile`

接着，我们创建一个 `Clusterfile`：

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
              classes: all
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

## 使用 `Config` 对象

由于 `kubelet` 配置中的 `localDNS` 字段需要匹配 `node-local-dns` 的监听地址，因此在 Clusterfile 中必须预先定义。同时，我们希望有灵活性地修改 `node-local-dns` 的配置，因此我们使用 `Config` 在 Sealos 实际调用 `helm` 命令之前对 `charts/node-local-dns.values.yaml` 文件进行补丁操作。

关于 `Config` 对象的字段，我们简要介绍一下：

- `metadata.name`：此名称不可与其他名称重复。
- `spec.path`：应用镜像中的文件路径。
- `spec.match`：可选项。当定义了 `match` 时，`Config` 将应用于与其匹配的镜像；否则，它将应用于所有镜像。
- `spec.strategy`：可以是 `merge`、`insert`、`append` 或 `override`。
  - `merge`：仅适用于 YAML/JSON

 文件。
  - `insert`/`append`：将数据插入文件。
  - `override`：覆盖文件中的内容。
- `spec.data`：要应用的数据。

运行 Sealos apply：

```bash
sudo sealos apply -f Clusterfile --set localDNS.enabled=true --set localDNS.bind=169.254.20.11 --set localDNS.image=node-local-dns:1.3.2
```

## 更多用例

我们可以使用这种机制来定制已构建的镜像，或者在不重新构建的情况下定制某个组件的配置。例如，添加自定义的 containerd 配置。

在首次运行之前，在 `Clusterfile` 中添加 `Config`。

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

