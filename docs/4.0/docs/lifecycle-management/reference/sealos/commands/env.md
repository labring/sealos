---
sidebar_position: 7
---

# env: Environment Variables

The `sealos env` command is a command in the Sealos command-line tool used to display the currently supported environment variables and their current values.

## Basic Usage

### View Environment Variables

To view the environment variables, you can use the `sealos env` command:

```bash
sealos env
```

### View Environment Variables with Descriptions

To view the environment variables along with their descriptions, you can use the `sealos env -v` command:

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

The above examples show how to set environment variables before executing Sealos commands. In the first example, the `BUILDAH_LOG_LEVEL` environment variable is set to `debug` before running the `sealos images` command. In the second example, the `SEALOS_REGISTRY_SYNC_EXPERIMENTAL` environment variable is set to `true` before running the `sealos build -t xxx .` command.

That concludes the usage guide for the `sealos env` command. We hope this information has been helpful to you. If you encounter any issues during the usage, please feel free to ask us for assistance.
