---
sidebar_position: 6
---

# Logout from Repository

The `sealos logout` command is used to remove the locally cached account and password of the image repository on the specified server.

## Usage:

`sealos logout [flags] [options] registryName`

## Parameters:

Here are the parameters for the `sealos logout` command:

- `--authfile=''`: Path to the authentication file. It can be overridden with the REGISTRY_AUTH_FILE environment variable.

- `-a, --all=false`: Delete all authentication information.


## Examples:

- Logout from the quay.io image repository: `sealos logout quay.io`

That's the usage guide for the `sealos logout` command, and we hope it has been helpful. If you encounter any problems during usage, feel free to ask us.
