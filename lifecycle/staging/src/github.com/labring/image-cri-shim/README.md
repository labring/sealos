# image-cri-shim

image hack cri socket

## kubelet add post shell

if kubelet is stop,but dockershim.sock is zombie sock. so proxy is panic.

```shell
#!/bin/bash
rm -rf /var/run/dockershim.sock
```

```
[Unit]
Description=kubelet: The Kubernetes Node Agent
Documentation=http://kubernetes.io/docs/

[Service]
ExecStart=/usr/bin/kubelet
ExecStartPre=/usr/bin/kubelet-pre-start.sh
ExecStopPost=/usr/bin/kubelet-post-stop.sh
Restart=always
StartLimitInterval=0
RestartSec=10

[Install]
WantedBy=multi-user.target

```

## config yaml example

```
shim: /var/run/image-cri-shim.sock
cri: /var/run/cri-dockerd.sock
address: http://sealos.hub:5000
debug: false
image: /var/lib/image-cri-shim
auth: admin:passw0rd
version: v1
timeout: 15m
```

### Registry Priority Configuration

image-cri-shim supports configuring priorities for multiple registries to control the order in which they are tried when pulling images.

**Priority Rules:**
- **sealos.hub** (offline registry):
  - Default priority = 1000 (highest)
  - Can be customized via `offlinePriority` field (optional)
  - If not specified or set to 0: uses default 1000
- **User-configured registries**:
  - If `priority` is not specified: Default priority = 500
  - If `priority` is specified: Use the configured value (range: 0-10000)
  - Values < 0 are clamped to 0
  - Values > 10000 are clamped to 10000
- **Matching order**: Registries with higher priority are tried first
- **Tie-breaking**: When priorities are equal, sealos.hub comes first, then sorted by domain name

**Configuration Example:**

```yaml
shim: /var/run/image-cri-shim.sock
cri: /var/run/containerd/containerd.sock
address: http://sealos.hub:5000
auth: admin:passw0rd
version: v1
timeout: 15m

# Optional: Customize sealos.hub priority (default: 1000)
# Set to 0 or omit to use default value
offlinePriority: 1000

# Registry priority configuration (optional)
registries:
  # This registry will use default priority (500)
  - address: docker.io
    auth: user1:pass1

  # This registry has higher priority (800) than docker.io
  - address: registry.example.com
    auth: user2:pass2
    priority: 800

  # This registry has higher priority (1200) than sealos.hub (1000)
  - address: fast-registry.company.com
    auth: user4:pass4
    priority: 1200

  # This registry has lower priority (100)
  - address: slow-registry.company.com
    auth: user3:pass3
    priority: 100
```

**Customizing sealos.hub Priority:**

If you want other registries to be tried before sealos.hub, you can lower sealos.hub's priority:

```yaml
address: http://sealos.hub:5000
auth: admin:passw0rd

# Lower sealos.hub priority to try other registries first
offlinePriority: 700

registries:
  - address: fast-registry.company.com
    auth: user:pass
    priority: 900  # Will be tried before sealos.hub

  - address: docker.io
    auth: user:pass
    priority: 500
```

**Behavior:**
1. When pulling `nginx:latest`, image-cri-shim will:
   - First check fast-registry.company.com (priority 1200) - **highest**
   - Then check sealos.hub (priority 1000) - **second**
   - Then check registry.example.com (priority 800)
   - Then check docker.io (priority 500)
   - Finally check slow-registry.company.com (priority 100)
   - If none have the image, use the original image name

2. The matching result is cached, so subsequent pulls of the same image will use the cached registry (within TTL)

3. This provides flexible control over registry selection order while maintaining sensible defaults

**Backward Compatibility:**
- Existing configurations without `offlinePriority` work unchanged (sealos.hub uses default 1000)
- The `offlinePriority` field is completely optional
- Setting `offlinePriority: 0` explicitly uses the default value


## Changelog
- **Add registry priority support**: Configure custom priorities for registries to control image pull order
  - sealos.hub has highest priority (1000) by default
  - sealos.hub priority can be customized via optional `offlinePriority` field
  - User-configured registries default to priority 500
  - Priority range: 0-10000, values are clamped if out of range
  - Supports optional `priority` field in registry configuration
  - Fully backward compatible with existing configurations
- add grpc timeout in config json ,default `15m`
- add cri version in config json , default `v1alpha2` suuport value `v1` and `v1alpha2`
- add grpc default message size is 16MB

## CRI support 
- kubernetes v1.23.0 support v1 cri
- kubernetes v1.26.0 delete v1alpha2 cri
- cri-dockerd support v1 cri issue: https://github.com/Mirantis/cri-dockerd/issues/125
- crictl v1.23+ is v1alpha2, crictl v1.24.2 is v1


## The relationship table of cri

| k8s version    | cri version | crictl version                | cri-docker cri version |
|----------------|-------------|-------------------------------|----|
| `<1.23`          | v1alpha2    | v1alpha2                      |v1alpha2|
| `=1.23`          | v1alpha2/v1 | v1alpha2                      |v1alpha2|
| `>=1.24 && <1.26` | v1alpha2/v1 | v1 |v1alpha2|
| `>=1.26`         | v1 | v1 |https://github.com/Mirantis/cri-dockerd/issues/125|


## Test

### test v1.26.0

```
FROM labring/kubernetes:v1.26.0
ADD image-cri-shim cri/image-cri-shim
ADD cfg.yaml etc/image-cri-shim.yaml.tmpl
```

```
shim: /var/run/image-cri-shim.sock
cri: /run/containerd/containerd.sock
address: http://{{ .registryDomain }}:{{ .registryPort }}
force: true
debug: false
image: /var/lib/image-cri-shim
version: v1
auth: {{ .registryUsername }}:{{ .registryPassword }}
```

### test v1.23.8

```
root@test-node-0:~/123# cat cfg.yaml
shim: /var/run/image-cri-shim.sock
cri: /run/containerd/containerd.sock
address: http://{{ .registryDomain }}:{{ .registryPort }}
force: true
debug: false
image: /var/lib/image-cri-shim
version: v1alpha2
auth: {{ .registryUsername }}:{{ .registryPassword }}

root@test-node-0:~/123# crictl version
Version:  0.1.0
RuntimeName:  containerd
RuntimeVersion:  v1.6.2
RuntimeApiVersion:  v1alpha2
root@test-node-0:~/123#
```

### test v1.24.0

```
root@test-node-0:~/126# crictl version
Version:  0.1.0
RuntimeName:  containerd
RuntimeVersion:  v1.6.2
RuntimeApiVersion:  v1
root@test-node-0:~/126# crictl -v
crictl version v1.24.2
root@test-node-0:~/126# ls
Dockerfile  cfg.yaml  image-cri-shim
root@test-node-0:~/126# cd ../124/
root@test-node-0:~/124# ls
Dockerfile  cfg.yaml  image-cri-shim
root@test-node-0:~/124# cat cfg.yaml
shim: /var/run/image-cri-shim.sock
cri: /run/containerd/containerd.sock
address: http://{{ .registryDomain }}:{{ .registryPort }}
force: true
debug: false
image: /var/lib/image-cri-shim
version: v1
auth: {{ .registryUsername }}:{{ .registryPassword }}
```


### test v1.22.0

```
root@test-node-0:~/124# crictl version
Version:  0.1.0
RuntimeName:  containerd
RuntimeVersion:  v1.6.2
RuntimeApiVersion:  v1alpha2
root@test-node-0:~/124# cd ../122/
root@test-node-0:~/122# ls
Dockerfile  cfg.yaml  image-cri-shim
root@test-node-0:~/122# cat cfg.yaml
shim: /var/run/image-cri-shim.sock
cri: /run/containerd/containerd.sock
address: http://{{ .registryDomain }}:{{ .registryPort }}
force: true
debug: false
image: /var/lib/image-cri-shim
version: v1alpha2
auth: {{ .registryUsername }}:{{ .registryPassword }}

root@test-node-0:~/122# crictl images
IMAGE                                     TAG                 IMAGE ID            SIZE
sealos.hub:5000/coredns/coredns           v1.8.4              6d3ffc2696ac2       12.3MB
sealos.hub:5000/etcd                      3.5.0-0             2252d5eb703b0       158MB
sealos.hub:5000/kube-apiserver            v1.22.0             b3acf0bcef06c       28.4MB
sealos.hub:5000/kube-controller-manager   v1.22.0             d3853f34f0d18       27MB
sealos.hub:5000/kube-proxy                v1.22.0             fef37187b2389       34.4MB
sealos.hub:5000/kube-scheduler            v1.22.0             64207abfeeeac       13.5MB
sealos.hub:5000/pause                     3.5                 f7ff3c4042631       253kB
```


### test timeout

```
shim: /var/run/image-cri-shim.sock
cri: /run/containerd/containerd.sock
address: http://{{ .registryDomain }}:{{ .registryPort }}
force: true
debug: false
image: /var/lib/image-cri-shim
version: v1
timeout: 20m
auth: {{ .registryUsername }}:{{ .registryPassword }}
```

show image-cri-shim logs

```
root@test-node-0:~/122# journalctl -xeu image-cri-shim.service
░░ Defined-By: systemd
░░ Support: http://www.ubuntu.com/support
░░
░░ A start job for unit image-cri-shim.service has finished successfully.
░░
░░ The job identifier is 14430.
Dec 11 02:18:47 test-node-0 image-cri-shim[46869]: 2022-12-11T02:18:47 info shim-socket: /var/run/image-cri-shim.sock
Dec 11 02:18:47 test-node-0 image-cri-shim[46869]: 2022-12-11T02:18:47 info cri-socket: /run/containerd/containerd.sock
Dec 11 02:18:47 test-node-0 image-cri-shim[46869]: 2022-12-11T02:18:47 info hub-address: http://sealos.hub:5000
Dec 11 02:18:47 test-node-0 image-cri-shim[46869]: 2022-12-11T02:18:47 info RegistryDomain: sealos.hub:5000
Dec 11 02:18:47 test-node-0 image-cri-shim[46869]: 2022-12-11T02:18:47 info Force: true
Dec 11 02:18:47 test-node-0 image-cri-shim[46869]: 2022-12-11T02:18:47 info Debug: false
Dec 11 02:18:47 test-node-0 image-cri-shim[46869]: 2022-12-11T02:18:47 info ImageDir: /var/lib/image-cri-shim
Dec 11 02:18:47 test-node-0 image-cri-shim[46869]: 2022-12-11T02:18:47 info Timeout: {20m0s}
Dec 11 02:18:47 test-node-0 image-cri-shim[46869]: 2022-12-11T02:18:47 info Auth: admin:passw0rd
Dec 11 02:18:47 test-node-0 image-cri-shim[46869]: 2022-12-11T02:18:47 info Username: admin
Dec 11 02:18:47 test-node-0 image-cri-shim[46869]: 2022-12-11T02:18:47 info Password: passw0rd
Dec 11 02:18:47 test-node-0 image-cri-shim[46869]: 2022-12-11T02:18:47 info CRIVersion: v1
```

# Contribution Policy

🚫 **This repository does NOT accept any form of contributions.**  
This includes:
- ❌ Pull requests
- ❌ Direct code submissions
- ❌ Bug reports
- ❌ Feature requests
- ❌ Documentation changes

**All contributions must be submitted exclusively to the central repository:**  
👉 **https://github.com/labring/sealos**

---

## Contribution Guidelines
1. **For bugs**  
   → Report in the [Issues section of the main repository](https://github.com/labring/sealos/issues)  
   → Include reproduction steps and environment details

2. **For code contributions**  
   → Submit changes via **main repository only**  
   → Follow contribution guidelines at [sealos/CONTRIBUTING.md](https://github.com/labring/sealos/blob/main/CONTRIBUTING.md)

3. **For feature requests**  
   → Create an Issue in the [main repository](https://github.com/labring/sealos/issues) with `[Feature]` prefix

---

## Important Notes
⚠️ **This repository is read-only**
- Serves as reference implementation only
- Active development occurs exclusively at [labring/sealos](https://github.com/labring/sealos)
- PRs/issues submitted here will be **closed immediately without review**

📌 **Any contributions made to this repository will be invalid**  
For your submissions to be considered, please use the central repository.