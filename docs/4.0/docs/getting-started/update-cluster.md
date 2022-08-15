---
sidebar_position: 3
---

# Updating a Cluster

1. Run `sealos reset` to reset your cluster if you have started the cluster.

2. Run `sealos gen` to generate a Clusterfile. Example:

```shell
$ sealos gen labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.0.2,192.168.0.3,192.168.0.4 --nodes 192.168.0.5,192.168.0.6,192.168.0.7 --passwd xxx > Clusterfile
```

3. Append the [calico Clusterfile](https://github.com/labring/sealos/blob/main/applications/calico/Clusterfile) to the Clusterfile that was generated, and update the cluster configurations. For example, if you want to change the CIDR range of pods, you should change the `networking.podSubnet` and `spec.data.spec.calicoNetwork.ipPools.cidr` fields. The final Clusterfile will be like this:

<details>

<summary>Clusterfile</summary>

```yaml
apiVersion: apps.sealos.io/v1beta1
kind: Cluster
metadata:
  creationTimestamp: null
  name: default
spec:
  hosts:
    - ips:
        - 192.168.0.2:22
        - 192.168.0.3:22
        - 192.168.0.4:22
      roles:
        - master
        - amd64
    - ips:
        - 192.168.0.5:22
        - 192.168.0.6:22
        - 192.168.0.7:22
      roles:
        - node
        - amd64
  image:
    - labring/kubernetes:v1.24.0
    - labring/calico:v3.22.1
  ssh:
    passwd: xxx
    pk: /root/.ssh/id_rsa
    port: 22
    user: root
status: {}
---
apiVersion: kubeadm.k8s.io/v1beta2
kind: ClusterConfiguration
networking:
  podSubnet: 10.160.0.0/12
---
apiVersion: apps.sealos.io/v1beta1
kind: Config
metadata:
  name: calico
spec:
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
          # Note: Must be the same as podCIDR
          cidr: 10.160.0.0/12
          encapsulation: IPIP
          natOutgoing: Enabled
          nodeSelector: all()
        nodeAddressAutodetectionV4:
          interface: "eth.*|en.*"
```

</details>

4. Run `sealos apply -f Clusterfile` to start the cluster.
