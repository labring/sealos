---
sidebar_position: 1
---

# Starting a Cluster with `sealos apply`

`sealos apply` is an important command in the Sealos command-line tool used to run cluster images in a Kubernetes cluster. This guide provides detailed instructions on how to use the command and its options.

## Basic Usage

The basic usage of the `sealos apply` command is as follows:

```shell
$ sealos apply -f Clusterfile
```

Clusterfile content:

```yaml
apiVersion: apps.sealos.io/v1beta1
kind: Cluster
metadata:
  name: default
spec:
  # Server IP addresses and roles
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
```

This command will run cluster images in the Kubernetes cluster based on the specified `Clusterfile`.


## Options

The `sealos apply` command provides several options to customize its behavior:

- `-f, --Clusterfile='Clusterfile'`: Specifies the Clusterfile to apply. Defaults to `Clusterfile`.
- `--config-file=[]`: Specifies the path to a custom config file to replace or modify resources.
- `--env=[]`: Sets environment variables to be used during command execution.
- `--set=[]`: Sets values on the command line, usually for replacing template values.
- `--values=[]`: Specifies values files to be applied to the `Clusterfile`, usually used for templating.

Each option can be followed by one or more parameters. Multiple parameters are separated by commas.

For example, you can use the `--set` option to set values on the command line:

```shell
sealos apply -f Clusterfile --set key1=value1,key2=value2
```

This command will set the values of `key1` and `key2` to `value1` and `value2`, and then apply the `Clusterfile`.

Similarly, you can use the `--values` option to specify a values file:

```shell
sealos apply -f Clusterfile --values values.yaml
```

This command will apply the `Clusterfile` based on the values in the `values.yaml` file.

**For more examples, please refer to the [Run Cluster](/self-hosting/lifecycle-management/operations/run-cluster/.md) section.**

That's it for the usage guide of the `sealos apply` command. We hope this helps you. If you have any questions or encounter any issues during the process, feel free to ask us.
