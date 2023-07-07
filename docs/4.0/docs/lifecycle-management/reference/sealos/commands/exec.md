---
sidebar_position: 5
---

# Execute Command

`sealos exec` is a command in the Sealos command-line tool, used to execute Shell commands or scripts on specified cluster nodes. This guide will detail its usage and options.

## Basic Usage

The basic `sealos exec` command format is as follows:

```bash
sealos exec "shell command or script"
```

In the above command, `shell command or script` is the Shell command or script you want to execute on the cluster nodes.

## Options

The `sealos exec` command provides the following options:

- `-c, --cluster='default'`: The name of the cluster on which the command will be executed. The default is `default`.

- `--ips=[]`: Run commands on nodes with specified IP addresses.

- `-r, --roles='':` Run commands on nodes with specified roles. Currently supports master,node,registry.

Each option can be followed by one or more parameters.

## Examples

For example, you can use the following command to view the contents of the `/etc/hosts` file on all nodes of the default cluster:

```bash
sealos exec "cat /etc/hosts"
```

If you want to view the contents of the `/etc/hosts` file on nodes with `master` and `node` roles in a cluster named `my-cluster`, you can use the following command:

```bash
sealos exec -c my-cluster -r master,node "cat /etc/hosts"
```

If you only want to view the contents of the `/etc/hosts` file on a node with the IP address `172.16.1.38`, you can use the following command:

```bash
sealos exec -c my-cluster --ips 172.16.1.38 "cat /etc/hosts"
```

That's the usage guide for the `sealos exec` command, and we hope it has been helpful. If you encounter any problems during usage, feel free to ask us.
