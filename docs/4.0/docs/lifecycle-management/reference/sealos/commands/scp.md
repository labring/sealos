---
sidebar_position: 5
---

# Scp: Copy Files

`sealos scp` is a command in the Sealos command-line tool, used for copying files to specified cluster nodes. This guide will detail its usage and options.

## Basic Usage

The basic `sealos scp` command format is as follows:

```bash
sealos scp "source file path" "destination file path"
```

In the above command, `source file path` is the local path of the file you want to copy, and `destination file path` is the remote node path you want to copy the file to.

## Options

The `sealos scp` command provides the following options:

- `-c, --cluster='default'`: The name of the cluster to which the files should be copied. The default is `default`.

- `--ips=[]`: Copies the files to nodes with the specified IP addresses.

- `-r, --roles='':`: Copies the files to nodes with specified roles.

Each option can be followed by one or more arguments.

## Examples

For example, you can use the following command to copy the local file `/root/aa.txt` to `/root/dd.txt` on all nodes in the default cluster:

```bash
sealos scp "/root/aa.txt" "/root/dd.txt"
```

If you want to copy files on the nodes with the `master` and `node` roles in the cluster named `my-cluster`, you can use the following command:

```bash
sealos scp -c my-cluster -r master,node "/root/aa.txt" "/root/dd.txt"
```

If you only want to copy files on the node with the IP address `172.16.1.38`, you can use the following command:

```bash
sealos scp -c my-cluster --ips 172.16.1.38 "/root/aa.txt" "/root/dd.txt"
```

The above is the usage guide for the `sealos scp` command, and we hope it is helpful to you. If you encounter any problems during use, feel free to ask us.
