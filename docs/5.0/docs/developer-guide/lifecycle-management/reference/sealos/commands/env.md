---
sidebar_position: 7
keywords: [sealos env, environment variables, Sealos CLI, Docker environment, container configuration, Buildah log level, registry sync, Sealos command-line tool, container development, DevOps]
description: Learn how to use the 'sealos env' command to view and set environment variables for Sealos, enhancing your container development and DevOps workflows.
---

# Environment Variables

`sealos env` is a command in the Sealos command-line tool, used to display the current environment variables supported
by sealos and their current values.

## Basic Usage

### Viewing Environment Variables

To view the environment variables, you can use the `sealos env` command:

```bash
sealos env
```

### Viewing Environment Variables and Descriptions

To view the environment variables and their descriptions, you can use the `sealos env -v` command:

```bash
sealos env -v
```

## How to Set Environment Variables

```shell
BUILDAH_LOG_LEVEL=debug sealos images
```

```shell
SEALOS_REGISTRY_SYNC_EXPERIMENTAL=true sealos build -t xxx .
```

That's the usage guide for the `sealos env` command, and we hope it has been helpful. If you encounter any problems
during usage, feel free to ask us.
