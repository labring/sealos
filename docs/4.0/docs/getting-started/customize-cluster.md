---
sidebar_position: 3
---

# Customize a Cluster

1. Run `sealos gen` to generate a Clusterfile, Example:

```shell
$ sealos gen labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 \
  --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
  --nodes 192.168.0.5,192.168.0.6,192.168.0.7 \
  --passwd xxx > Clusterfile
```

The generated Clusterfile like this:

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
  - labring/calico:v3.24.1
  ssh:
    passwd: xxx
    pk: /root/.ssh/id_rsa
    port: 22
    user: root
status: {}
```

</details>

2. Then you can Append `kubeadm Configuration` or `application configuration` to Clusterfile.For example, if you want to change the CIDR range of pods, you should change the `networking.podSubnet` and `spec.data.spec.calicoNetwork.ipPools.cidr` fields. The final Clusterfile will be like this:

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
    - labring/kubernetes:v1.25.0
    - labring/helm:v3.8.2
    - labring/calico:v3.24.1
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

3. Run `sealos apply -f Clusterfile` to install the cluster. After the cluster is installed, Clusterfile will be saved in the `.sealos/default/Clusterfile` directory. You can modify the Clusterfile to customize the cluster.

**Notes：**

- You can refer to the [official docs](https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta2/) or `kubeadm config print init-defaults` command to print kubeadm configuration.
- Experimental usage please check [CLI](https://www.sealos.io/docs/cli/apply#experimental)
