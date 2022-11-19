# Customize images at runtime

Here we use `Config` object to patch file(s) at runtime. First thing first, let me explain what `Config` is. `Config` is an object that describe how to patch, create or replace a specified file in one specified application image OR all images in the run list. Let's say that we need to provision a cluster with `node-local-dns` installed.

First, create `node-local-dns` application cloud image

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

> chart can downloaded from [here](https://artifacthub.io/packages/helm/node-local-dns/node-local-dns)

Then create a `Clusterfile`

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
        - zone: .:53
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

Since `localDNS` field in `kubelet`'s config should match `node-local-dns`'s listening address, so it **MUST** predefined in Clusterfile. and, we would like to have the flexibility to modify the config for `node-local-dns`, so we use `Config` to patch `charts/node-local-dns.values.yaml` file before sealos actually call `helm` command.

- `metadata.name` just don't duplicate the name with others
- `spec.path` path of file in application image
- `spec.match` optional, when `match` is defined, `Config` will applied to `matched` image, otherwise, it will be applied to all images
- `spec.strategy` can be `merge`/`insert`/`append`/`override`
  - `merge` only works on YAML/JSON file
  - `insert`/`append` to data in file
  - `override` overwrite contents in file
- `spec.data` data to applied into

Run sealos apply

```bash
sudo sealos apply -f Clusterfile --set localDNS.enabled=true --set localDNS.bind=169.254.20.11 --set localDNS.image=node-local-dns:1.3.2
```

---

## More use cases

We can use this mechanism to customize images already built OR customize some component's config without rebuild it. For example, adding custom containerd configuration.

add `Config` in `Clusterfile` before first run.

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
          [plugins."io.containerd.grpc.v1.cri".registry.configs]
              [plugins."io.containerd.grpc.v1.cri".registry.configs."sealos.hub:5000".auth]
                username = "__username__"
                password = "__password__"
```

> `Config` module is under active development, function behavior may change, so stay tuned.
