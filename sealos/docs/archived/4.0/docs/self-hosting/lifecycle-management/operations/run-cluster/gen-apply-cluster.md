---
sidebar_position: 1
---

# Custom Configuration Installation

1. Run `sealos gen` to generate a Clusterfile, for example:

```shell
$ sealos gen labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 \
   --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
   --nodes 192.168.0.5,192.168.0.6,192.168.0.7 --passwd 'xxx' > Clusterfile
```

Notice: labring/helm should be set before labring/calico.

The generated Clusterfile is as follows:

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
  - labring/helm:v3.8.2
  - labring/calico:v3.24.1
  ssh:
    passwd: xxx
    pk: /root/.ssh/id_rsa
    port: 22
    user: root
status: {}
```

</details>

2. After generating the Clusterfile, update the cluster configuration. For example, to modify the CIDR range of pods, you can modify the `networking.podSubnet` and `spec.data.spec.calicoNetwork.ipPools.cidr` fields. The final Clusterfile would look like this:

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
  path: charts/calico/values.yaml
  strategy: merge
  data: |
    installation:
      enabled: true
      kubernetesProvider: ""
      calicoNetwork:
        ipPools:
        - blockSize: 26
          cidr: 10.160.0.0/12
          encapsulation: IPIP
          natOutgoing: Enabled
          nodeSelector: all()
        nodeAddressAutodetectionV4:
          interface: "eth.*|en.*"
```

</details>

3. Run `sealos apply -f Clusterfile` to start the cluster. After the cluster is successfully running, the Clusterfile will be saved in the `.sealos/default/Clusterfile` file. You can modify the fields in it to reapply changes to the cluster.

**Note:**

- You can refer to the [official documentation](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-config/) or run the `kubeadm config print init-defaults` command to print the kubeadm configuration.
