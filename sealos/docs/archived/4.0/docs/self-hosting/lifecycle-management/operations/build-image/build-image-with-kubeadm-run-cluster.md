---
sidebar_position: 7
---

# Customizing a Kubernetes Cluster by Building Custom Images

This guide introduces how to use `kubeadm config` to build custom images for customizing a Kubernetes cluster.

## Building Custom Images

To build a custom image, run the following commands:

```bash
$ mkdir -p /tmp/buildimage
  cat > /tmp/buildimage/kubeadm.yml <<EOF
  apiVersion: kubeadm.k8s.io/v1beta2
  kind: ClusterConfiguration
  networking:
    serviceSubnet: "100.55.0.0/16"
    podSubnet: "10.160.0.0/12"
EOF

$ cat > /tmp/buildimage/Kubefile <<EOF
  FROM labring/kubernetes-docker:v1.25.0
  COPY kubeadm.yml etc/
EOF

$ sudo sealos build --debug -t hack:dev  /tmp/buildimage
```

## Attaching Application Configurations to Clusterfile

Next, we will attach application configurations in the `Clusterfile`. For example, if you want to change the CIDR range for Pods, you should change the `spec.data.spec.calicoNetwork.ipPools.cidr` field. The final `Clusterfile` would look like this:

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

In this example, we have attached the configuration of the `calico` application to the `Clusterfile`. This configuration specifies the CIDR range for Pods and other options needed for the application to run.

## Installing the Cluster

Finally, we can install the cluster using `sealos apply -f Clusterfile`. After installing the cluster, `Clusterfile` will be saved in the `.sealos/default/Clusterfile` directory. You can modify the `Clusterfile` to further customize the cluster.

**⚠️ Note:**

+ You can refer to the [official documentation](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-config/) or use the `kubeadm config print init-defaults` command to print the kubeadm configuration.
