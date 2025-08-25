---
sidebar_position: 8
---

# Token Management

The `sealctl token` command is primarily used to generate a token for connecting master and worker nodes in a Kubernetes cluster. In a Kubernetes cluster, when you want to add a new worker node, you typically need to provide a token for authentication. This token ensures that only worker nodes with the correct token can join the cluster.

The `sealctl token` command generates a token for authentication by accepting a configuration file (optional) and a certificate key (optional) as parameters. By default, if no configuration file and certificate key are provided, the command uses built-in default settings to generate the token.

In summary, the `sealctl token` command is used to generate a token for authentication, allowing worker nodes to securely join a Kubernetes cluster. Using this command simplifies the process of adding nodes to the cluster and ensures the security of the cluster.

**Usage**

```shell
sealctl token [config] [certificateKey]
```

**Parameters**

- `config`: Configuration file (optional).
- `certificateKey`: Certificate key (optional).

**Examples**

Generate a token with default parameters:

```shell
sealctl token
```

Generate a token with a custom configuration file and certificate key:

```shell
sealctl token my-config my-certificate-key
```
