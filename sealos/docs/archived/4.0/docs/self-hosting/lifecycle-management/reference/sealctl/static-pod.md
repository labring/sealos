---
sidebar_position: 7
---

# Static Pod Configuration

The `static-pod` command is used to generate static Pods that are managed directly by kubelet instead of the API server. Static Pods are useful in certain scenarios, such as setting up and managing control plane components in a Kubernetes cluster.

The `sealctl static-pod` command provides a convenient way to generate static Pod configuration files for specific purposes. Currently, it mainly supports generating the `lvscare` static Pod, which is a tool for managing IPVS rules.

Using `sealctl static-pod lvscare`, you can generate the `lvscare` static Pod YAML file based on specified parameters such as VIP, master node addresses, and image name. This file can then be stored in the static Pod path of kubelet, and kubelet will automatically create and manage the corresponding Pod.

**Usage**

```shell
sealctl static-pod lvscare [flags]
```

**Options**

- `--vip`: Default VIP IP (default is "10.103.97.2:6443").
- `--name`: Name of the generated lvscare static Pod.
- `--image`: Image for the generated lvscare static Pod (default is `sealos.hub:5000/sealos/lvscare:latest`).
- `--masters`: List of master addresses for the generated static Pod.
- `--print`: Whether to print the YAML.

**Examples**

Generate the lvscare static Pod file and print the YAML:

```shell
sealctl static-pod lvscare --vip 10.103.97.2:6443 --name lvscare --image lvscare:latest --masters 192.168.0.2:6443,192.168.0.3:6443 --print
```

If the `--print` option is not used, the configuration file will be directly generated in `/etc/kubernetes/manifests` and the static Pod will be enabled:

```shell
sealctl static-pod lvscare --vip 10.103.97.2:6443 --name lvscare --image lvscare:latest --masters 192.168.0.2:6443,192.168.0.3:6443
```
