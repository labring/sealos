---
sidebar_position: 3
---

# Customize a Cluster by Build image

1. Run `sealos build` to build a Customize image by kubeadm config, Example:

```shell
$ mkdir -p /tmp/buildimage
  cat > /tmp/buildimage/kubeadm.yml <<EOF
  apiVersion: kubeadm.k8s.io/v1beta2
  kind: ClusterConfiguration
  networking:
    serviceSubnet: "100.55.0.0/16"
    podSubnet: "10.160.0.0/12"
  EOF
  cat > /tmp/buildimage/Kubefile <<EOF
  FROM labring/kubernetes-docker:v1.25.0
  COPY kubeadm.yml etc/
  EOF
  sudo sealos build --debug -t hack:dev  /tmp/buildimage
```

2. Then you can Append `application configuration` to Clusterfile.For example, if you want to change the CIDR range of pods, you should change the `spec.data.spec.calicoNetwork.ipPools.cidr` fields. The final Clusterfile will be like this:

<details>
<summary>Clusterfile</summary>

```yaml
apiVersion: apps.sealos.io/v1beta1
kind: Cluster
metadata:
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
    - hack:dev
    - labring/helm:v3.8.2
    - labring/calico:v3.24.1
  ssh:
    passwd: xxx
    pk: /root/.ssh/id_rsa
    port: 22
    user: root
status: {}
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

3. Run `sealos apply -f Clusterfile` to install the cluster. After the cluster is installed, Clusterfile will be saved in the `.sealos/default/Clusterfile` directory. You can modify the Clusterfile to customize the cluster.

**Notes：**

- You can refer to the [official docs](https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta2/) or `kubeadm config print init-defaults` command to print kubeadm configuration.
- Experimental usage please check [CLI](https://www.sealos.io/docs/cli/apply#experimental)
