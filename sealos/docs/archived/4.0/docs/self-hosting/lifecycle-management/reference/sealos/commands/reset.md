---
sidebar_position: 2
---

# Reset Cluster

The `sealos reset` is a command in the Sealos command-line tool for resetting the entire cluster. This command is particularly useful when you want to completely clear cluster data or rebuild the cluster. This guide will detail how to use it.

## Basic Usage

The basic format of the `sealos reset` command is as follows:

```bash
sealos reset --cluster cluster_name
```

In the above command, `cluster_name` is the name of the cluster you want to reset.

## Example

For instance, you can use the following command to reset a cluster named `mycluster`:

```bash
sealos reset --cluster mycluster
```

## Optional Parameters

- `--force`: This parameter is used to force the reset of the cluster, even if the cluster reset operation has not been successfully completed.

```bash
sealos reset --cluster mycluster --force
```

- `--masters`: This parameter is used to specify the master nodes to be reset.

```bash
sealos reset --cluster mycluster --masters master1
```

- `--nodes`: This parameter is used to specify the worker nodes to be reset.

```bash
sealos reset --cluster mycluster --nodes node1 node2
```

- `-p`, `--passwd`: This parameter is used to provide a password for authentication.

- `-i`, `--pk`: This parameter specifies the file to read the identity (private key) used for public key authentication.

- `--pk-passwd`: This parameter is used for the passphrase to decrypt the PEM-encoded private key.

- `--port`: This parameter is used to specify the port of the remote host to connect to.

- `-u`, `--user`: This parameter is used to specify the username for authentication.

```bash
sealos reset --cluster mycluster --user username --pk /root/.ssh/id_rsa --pk-passwd yourpassword
```

The above is the usage guide for the `sealos reset` command. We hope it is helpful to you. If you encounter any problems during use, feel free to ask us any questions.
