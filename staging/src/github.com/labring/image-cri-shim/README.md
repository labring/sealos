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


## Changelog
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
