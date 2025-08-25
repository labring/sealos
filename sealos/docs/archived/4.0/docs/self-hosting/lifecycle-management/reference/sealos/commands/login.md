---
sidebar_position: 6
---

# Login to Repository

The `sealos login` command is used to log into the container registry on the specified server. After logging into the registry, you can pull and push images.

## Usage:

`sealos login [flags] [options] registryName`

## Parameters:

Here are the parameters for the `sealos login` command:

- `--authfile=''`: Path to the authentication file. It can be overridden with the REGISTRY_AUTH_FILE environment variable.

- `--cert-dir=''`: Use certificates at the specified path to access the image repository.

- `--get-login=true`: Return the current login user for the registry.

- `-k, --kubeconfig=''`: Log into the sealos image repository hub.sealos.io using kubeconfig.

- `-p, --password=''`: Password for the registry.

- `--password-stdin=false`: Take the password from standard input.

- `-u, --username=''`: Username for the registry.

- `-v, --verbose=false`: Write more detailed information to standard output.

## Examples:

- Log into the quay.io registry: `sealos login -u myusername -p mypassword quay.io`

Please note that when using the `sealos login` command, you need to make sure that you provide the correct username and password, otherwise the login process might fail. If you encounter problems during the login process, you might need to check your username and password to ensure they have not been entered incorrectly or forgotten.

That's the usage guide for the `sealos login` command, and we hope it has been helpful. If you encounter any problems during usage, feel free to ask us.
