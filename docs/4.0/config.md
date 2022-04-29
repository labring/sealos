### config

Clusterfile

```yaml
...
---
apiVersion: apps.sealyun.com/v1beta1
kind: Config
metadata:
  name: calico
spec:
  strategy: merge
  path: manifests/calico.yaml
  data: |
    apiVersion: operator.tigera.io/v1
    kind: Installation
    metadata:
      name: default
    spec:
      # Configures Calico networking.
      calicoNetwork:
        # Note: The ipPools section cannot be modified post-install.
        ipPools:
          - blockSize: 26
            cidr: 100.63.0.0/10
            encapsulation: IPIP
            natOutgoing: Enabled
            nodeSelector: all()
        nodeAddressAutodetectionV4:
          #  Interface enables IP auto-detection based on interfaces that match the given regex.
          interface: "eth.*|en.*"


```
