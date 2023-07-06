---
sidebar_position: 4
---

# delete: Remove Cluster Nodes

The `sealos delete` command is a command in the Sealos command-line tool used to remove nodes from a cluster. This guide provides detailed information on how to use this command and its options.

**Note: Ensure that the number of control nodes is odd to ensure proper etcd leader election.**

## Basic Usage

### Delete Nodes

To remove a node from the cluster, you can use the `--nodes` option:

```bash
sealos delete --nodes x.x.x.x
```

In the above command, replace `x.x.x.x` with the IP address of the node you want to delete. If you accidentally delete the wrong node, you can restore it using the `sealos add` command:

```bash
sealos add --nodes x.x.x.x
```

### Delete Control Nodes

To remove control nodes from the cluster, you can use the `--masters` option:

```bash
sealos delete --masters x.x.x.x
```

Please note that if you specify the `--masters` parameter, Sealos will remove your control nodes.

### Delete Control Nodes and Nodes

If you want to delete both control nodes and regular nodes, you can use both the `--masters` and `--nodes` options together:

```bash
sealos delete --masters x.x.x.x --nodes x.x.x.x
sealos delete --masters x.x.x.x-x.x.x.y --nodes x.x.x.x-x.x.x.y
```

## Options

The `sealos delete` command provides the following options:

- `--cluster='default'`: Specifies the name of the cluster on which the delete operation should be applied. Defaults to `default`.

- `--force=false`: Allows input of a `--force` flag to forcefully remove the nodes.

- `--masters=''`: Specifies the control nodes to be removed.

- `--nodes=''`: Specifies the nodes to be removed.

Each option can be followed by an argument.

## Usage Examples

Here's an example that removes a node with the IP address `192.168.0.2`:

```bash
sealos delete --nodes 192.168.0.2
```

That concludes the usage guide for the `sealos delete` command. We hope this information has been helpful to you. If you encounter any issues during the usage, please feel free to ask us for assistance.
