---
sidebar_position: 5
---

# scp: Copy Files

The `sealos scp` command in Sealos is used to copy files to specified cluster nodes. This guide provides detailed instructions on how to use it along with the available options.

## Basic Usage

The basic format of the `sealos scp` command is as follows:

```bash
sealos scp "source file path" "destination file path"
```

In the above command, `source file path` represents the local path of the file you want to copy, and `destination file path` represents the remote node path where you want to copy the file.

## Options

The `sealos scp` command provides the following options:

- `-c, --cluster='default'`: The name of the cluster to which the file should be copied. Defaults to `default`.

- `--ips=[]`: The IP addresses of the nodes to which the file should be copied.

- `-r, --roles='':`: The roles of the nodes to which the file should be copied.

Each option can be followed by one or more parameters.

## Examples

For example, you can use the following command to copy the local file `/root/aa.txt` to the `/root/dd.txt` on all nodes of the default cluster:

```bash
sealos scp "/root/aa.txt" "/root/dd.txt"
```

If you want to copy the file to nodes with the `master` and `node` roles in a cluster named `my-cluster`, you can use the following command:

```bash
sealos scp -c my-cluster -r master,node "/root/aa.txt" "/root/dd.txt"
```

If you only want to copy the file to a node with the IP address `172.16.1.38`, you can use the following command:

```bash
sealos scp -c my-cluster --ips 172.16.1.38 "/root/aa.txt" "/root/dd.txt"
```

This concludes the usage guide for the `sealos scp` command. We hope you find it helpful. If you have any questions or encounter any issues during usage, feel free to ask us.
