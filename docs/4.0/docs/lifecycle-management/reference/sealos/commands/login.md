---
sidebar_position: 6
---

# login: Log in to Registry

The `sealos login` command is used to log in to a container registry on a specified server. Once logged in to the registry, you can pull and push images.

## Usage

```
sealos login [flags] [options] registryName
```

## Flags

Here are the flags for the `sealos login` command:

- `--authfile=''`: Path to the authentication file. You can override it using the REGISTRY_AUTH_FILE environment variable.

- `--cert-dir=''`: Use certificates from the specified path to access the image registry.

- `--get-login=true`: Print the current login command for the registry.

- `-k, --kubeconfig=''`: Log in to the sealos image registry hub.sealos.io using the kubeconfig.

- `-p, --password=''`: Password for the registry.

- `--password-stdin=false`: Take the password from stdin.

- `-u, --username=''`: Username for the registry.

- `-v, --verbose=false`: Enable verbose output.

## Examples

Here is an example of logging in to the quay.io registry: `sealos login -u myusername -p mypassword quay.io`

Note that when using the `sealos login` command, you need to ensure that you provide the correct username and password, otherwise the login process may fail. If you encounter any issues during the login process, you may need to check your username and password to ensure they are not entered incorrectly or forgotten.

That concludes the usage guide for the `sealos login` command. We hope this information has been helpful to you. If you have any further questions or encounter any issues during usage, please don't hesitate to reach out to us.
