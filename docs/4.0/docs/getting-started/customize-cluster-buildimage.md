---
sidebar_position: 3
---

# Customize a Cluster by Build image
This guide explains how to customize a Kubernetes cluster by building a custom image using `kubeadm config`. 

## Building a Customize Image

To build a custom image, run the following command:

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

In this example, we create a directory `/tmp/buildimage` and create a `kubeadm.yml` file inside it that specifies the desired configuration for the image. We then create a `Kubefile` that specifies the base image and copies the `kubeadm.yml` file into the image. We use `sealos build` to build an image named `hack:dev` from the contents of the `/tmp/buildimage` directory.

## Appending an Application Configuration to Clusterfile

Next, we will append an application configuration to `Clusterfile`. For example, if you want to change the CIDR range of pods, you should change the `spec.data.spec.calicoNetwork.ipPools.cidr` fields. The final `Clusterfile` will be like this:

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

In this example, we have appended a configuration for the `calico` application to `Clusterfile`. This configuration specifies the CIDR range of pods and other options necessary for the application to run.

## Installing the Cluster

Finally, we can use `sealos apply -f Clusterfile` to install the cluster. After the cluster is installed, `Clusterfile` will be saved in the `.sealos/default/Clusterfile` directory. You can modify the `Clusterfile` to customize the cluster further.

**⚠️ Notes:**

+ You can refer to the [official docs](https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta2/) or use the `kubeadm config print init-defaults` command to print kubeadm configuration.
+ For experimental usage, see the [CLI documentation](https://www.sealos.io/docs/cli/apply#experimental).
