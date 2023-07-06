---
sidebar_position: 5
---

# exec: Execute Commands

The `sealos exec` command is a command in the Sealos command-line tool used to execute shell commands or scripts on specified cluster nodes. This guide provides detailed information on how to use the command and its options.

## Basic Usage

The basic format of the `sealos exec` command is as follows:

```bash
sealos exec "shell command or script"
```

In the above command, `shell command or script` represents the shell command or script that you want to execute on the cluster nodes.

## Options

The `sealos exec` command provides the following options:

- `-c, --cluster='default'`: Specifies the name of the cluster on which to execute the command. The default value is `default`.

- `--ips=[]`: Runs the command on nodes with the specified IP addresses.

- `-r, --roles='':`: Runs the command on nodes with the specified roles. Currently supports `master`, `node`, and `registry`.

Each option can be followed by one or more parameters.

## Examples

For example, you can use the following command to view the contents of the `/etc/hosts` file on all nodes of the default cluster:

```bash
sealos exec "cat /etc/hosts"
```

If you want to view the contents of the `/etc/hosts` file on the `master` and `node` role nodes of a cluster named `my-cluster`, you can use the following command:

```bash
sealos exec -c my-cluster -r master,node "cat /etc/hosts"
```

If you only want to view the contents of the `/etc/hosts` file on a node with the IP address `172.16.1.38`, you can use the following command:

```bash
sealos exec -c my-cluster --ips 172.16.1.38 "cat /etc/hosts"
```

That concludes the usage guide for the `sealos exec` command. We hope this information has been helpful to you. If you encounter any issues during the usage, please feel free to ask us for assistance.
