---
sidebar_position: 4
---

# Adding Cluster Nodes with `sealos add`

`sealos add` is a command in the Sealos command-line tool used to add nodes to a cluster. This guide provides detailed instructions on how to use the command and its options.

**Note: Make sure the number of control nodes is odd to ensure proper etcd leader election.**

## Basic Usage

### Adding Nodes

To add nodes to the cluster, you can use the `--nodes` option:

```bash
sealos add --nodes x.x.x.x
```

In the above command, replace `x.x.x.x` with the IP address of the node you want to add.

### Adding Control Nodes

To add control nodes to the cluster, you can use the `--masters` option:

```bash
sealos add --masters x.x.x.x
```

### Adding Control and Regular Nodes Together

If you want to add both control nodes and regular nodes to the cluster, you can use the `--masters` and `--nodes` options together:

```bash
sealos add --masters x.x.x.x --nodes x.x.x.x
sealos add --masters x.x.x.x-x.x.x.y --nodes x.x.x.x-x.x.x.y
```

## Options

The `sealos add` command provides the following options:

- `--cluster='default'`: The name of the cluster to perform the add operation. Defaults to `default`.

- `--masters=''`: The control nodes to be added.

- `--nodes=''`: The nodes to be added.

Each option can be followed by an argument.

## Usage Example

Here's an example usage that adds a node with the IP address `192.168.0.2` to the cluster:

```bash
sealos add --nodes 192.168.0.2
```

That's it for the usage guide of the `sealos add` command. We hope this helps you. If you have any questions or encounter any issues during the process, feel free to ask us.
