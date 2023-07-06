---
sidebar_position: 6
---

# pull: Pulling Images

The `sealos pull` command is a useful command that allows you to download images from a container image registry and store them locally. You can specify the image to download using the image's tag or digest. If no tag is specified, the command will default to downloading the image with the 'latest' tag, if it exists.

By using this command, you can easily download the desired images from remote repositories, greatly improving work efficiency.

## Usage:

`sealos pull [flags] [options] imageName`

## Parameters:

Here are the parameters for the `sealos pull` command:

- `-a, --all-tags=false`: Download all tagged images from the repository.

- `--authfile=''`: Path to the authentication file. You can override it with the `REGISTRY_AUTH_FILE` environment variable.

- `--cert-dir=''`: Specify the path to the certificate used to access the image registry.

- `--creds=''`: Use `[username[:password]]` to access the image registry.

- `--decryption-key=[]`: The key(s) required to decrypt the image.

- `--platform=[linux/arm64/v8]`: Prefer the specified OS/ARCH when selecting an image, instead of the current operating system and architecture.

- `--policy='missing'`: Set the policy, which can be 'missing', 'always', or 'never'.

- `-q, --quiet=false`: Suppress progress information while pulling the image.

- `--remove-signatures=false`: Do not copy signatures when pulling the image.

- `--retry=3`: Number of retries to perform if the pull fails.

- `--retry-delay=2s`: Delay between retries when the pull fails.

## Examples:

- Pull a single image: `sealos pull my-image:latest`

- Pull an image from the Docker daemon: `sealos pull docker-daemon:my-image:tag`

- Pull an image from a specific repository: `sealos pull myregistry/myrepository/my-image:tag`

- Pull multiple images: `sealos pull imageID1 imageID2 imageID3`

These are the usage guidelines for the `sealos push` command. We hope this helps you. If you encounter any issues during the process, please feel free to ask us.
