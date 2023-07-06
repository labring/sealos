---
sidebar_position: 6
---

# logout: Log out of Registry

The `sealos logout` command is used to remove locally cached account and password for an image registry on a specified server.

## Usage

```
sealos logout [flags] [options] registryName
```

## Flags

Here is the flag for the `sealos logout` command:

- `--authfile=''`: Path to the authentication file. You can override it using the REGISTRY_AUTH_FILE environment variable.

- `-a, --all=false`: Remove all authentication information.

## Examples

Here is an example of logging out of the quay.io image registry: `sealos logout quay.io`

That concludes the usage guide for the `sealos logout` command. We hope this information has been helpful to you. If you have any further questions or encounter any issues during usage, please don't hesitate to reach out to us.
