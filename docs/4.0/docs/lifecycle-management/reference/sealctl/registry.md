---
sidebar_position: 5
---

# Registry Image Repository

## Sealos: Detailed Guide and Usage of `sealctl registry serve` Command

Sealos provides the `sealctl registry serve` command to facilitate the construction and management of Docker image repositories. This document provides a detailed guide and usage examples for the `sealctl registry serve` command.

### Introduction

The `sealctl registry serve` command is primarily used to start a Docker distribution image repository server. It supports two modes: `filesystem` and `inmem`.

1. **Filesystem Mode**: In this mode, `sealctl` runs a Docker distribution image repository server for a specified directory. The image data is stored on disk in this mode. **This command is also used by Sealos for incremental image synchronization**.

2. **In-memory Mode**: In this mode, `sealctl` runs an in-memory Docker distribution image repository server. The image data is only stored in memory, and the data will be lost when the process exits.

### Command Options

The `sealctl registry serve filesystem` command supports the following options:

- `--disable-logging`: Disable logging output (default is false).
- `--log-level`: Configure the log level (default is 'error').
- `-p, --port`: The port the server listens on (default is a randomly unused port).

### Usage Examples

Here are some usage examples of the `sealctl registry serve` command:

#### Start a Filesystem Image Repository Server

```bash
sealctl registry serve filesystem --port=5000
```

The above command starts a filesystem image repository server on port 5000.

#### Start an In-memory Image Repository Server

```bash
sealctl registry serve inmem
```

The above command starts an in-memory image repository server. The server will lose stored data when the process exits.

With the `sealctl registry serve` command, users can easily manage and operate Docker image repositories. It is a powerful and user-friendly tool for both development and production environments.
