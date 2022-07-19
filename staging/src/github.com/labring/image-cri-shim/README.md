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
