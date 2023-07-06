---
sidebar_position: 2
---

# reset: Resetting the Cluster

`sealos reset` is a command in the Sealos command-line tool used to reset the entire cluster. This command is particularly useful when you want to completely clear cluster data or rebuild the cluster. This guide provides detailed instructions on how to use it.

## Basic Usage

The basic format of the `sealos reset` command is as follows:

```bash
sealos reset --cluster cluster_name
```

In the above command, `cluster_name` refers to the name of the cluster you want to reset.

## Examples

For example, you can use the following command to reset a cluster named `mycluster`:

```bash
sealos reset --cluster mycluster
```

## Optional Parameters

- `--force`: This parameter is used to force the cluster reset, even if the cluster reset operation fails to complete successfully.

```bash
sealos reset --cluster mycluster --force
```

- `--masters`: This parameter is used to specify the master nodes to reset.

```bash
sealos reset --cluster mycluster --masters master1
```

- `--nodes`: This parameter is used to specify the worker nodes to reset.

```bash
sealos reset --cluster mycluster --nodes node1 node2
```

- `-p`, `--passwd`: This parameter is used to provide a password for authentication.

- `-i`, `--pk`: This parameter is used to specify the file to read the identity (private key) for public key authentication.

- `--pk-passwd`: This parameter is used to decrypt the passphrase-encrypted PEM encoded private key.

- `--port`: This parameter is used to specify the port of the remote host to connect to.

- `-u`, `--user`: This parameter is used to specify the username for authentication.

```bash
sealos reset --cluster mycluster --user username --pk /root/.ssh/id_rsa --pk-passwd yourpassword
```

These are the optional parameters you can use with the `sealos reset` command. They provide additional flexibility and control over the cluster reset process.

We hope this guide has been helpful in understanding how to use the `sealos reset` command. If you have any further questions or encounter any issues during the process, please feel free to ask us.
