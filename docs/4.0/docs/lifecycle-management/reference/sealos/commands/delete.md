---
sidebar_position: 4
---

# Delete Cluster Node Removal

`sealos delete` is a command in the Sealos command line tool, mainly used to remove nodes from the cluster. This guide will detail its usage and options.

**Note to ensure the number of control nodes is odd to ensure normal election of etcd**

## Basic Usage

### Delete Node

To remove a node from the cluster, you can use the `--nodes` option:

```bash
sealos delete --nodes x.x.x.x
```

In the above command, `x.x.x.x` should be replaced with the IP address of the node you want to delete. If you accidentally delete the wrong node, you can use the `sealos add` command to recover it:

```bash
sealos add --nodes x.x.x.x
```

### Delete Control Node

To remove a control node from the cluster, you can use the `--masters` option:

```bash
sealos delete --masters x.x.x.x
```

Please note, if the `--masters` parameter is specified, sealos will delete your control node.

### Delete Control Node and Node

If you want to delete both control nodes and nodes at the same time, you can use the `--masters` and `--nodes` options at the same time:

```bash
sealos delete --masters x.x.x.x --nodes x.x.x.x
sealos delete --masters x.x.x.x-x.x.x.y --nodes x.x.x.x-x.x.x.y
```

## Options

The `sealos delete` command provides the following options:

- `--cluster='default'`: The name of the cluster to which the deletion operation applies. The default is `default`.

- `--force=false`: You can enter a `--force` flag to force delete nodes.

- `--masters=''`: The control nodes to be removed.

- `--nodes=''`: The nodes to be removed.

Each option can be followed by an argument.

## Usage Example

Here is a usage example that deletes a node with the IP address of `192.168.0.2`:

```bash
sealos delete --nodes 192.168.0.2
```

The above is the usage guide for the `sealos delete` command, hope it helps. If you encounter any problems during use, feel free to ask us.
