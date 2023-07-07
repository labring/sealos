---
sidebar_position: 6
---

# Pull Image

The `sealos pull` command is a very useful one that allows you to download images from the container image repository and store them locally. Users can obtain images by their tags or digests. If no tag is specified, the image with the 'latest' tag (if it exists) will be downloaded by default.

By using this command, users can easily download the required images from remote repositories, greatly improving work efficiency.

## Usage:

`sealos pull [flags] [options] imageName`

## Parameters:

The following are the parameters of the `sealos pull` command:

- `-a, --all-tags=false`: Download all tagged images in the repository.

- `--authfile=''`: The path to the authentication file. The REGISTRY_AUTH_FILE environment variable can be used to override it.

- `--cert-dir=''`: The specified path to the certificate for accessing the image repository.

- `--creds=''`: Use `[username[:password]]` to access the image repository.

- `--decryption-key=[]`: The key needed to decrypt the image.

- `--platform=[linux/arm64/v8]`: When choosing an image, prioritize the specified OS/ARCH over the current operating system and architecture.

- `--policy='missing'`: Set the policy, the optional values include 'missing', 'always', 'never'.

- `-q, --quiet=false`: Do not output progress information when pulling images.

- `--remove-signatures=false`: Do not copy signatures when pulling images.

- `--retry=3`: The number of retries when the pull fails.

- `--retry-delay=2s`: The delay between retries when the pull fails.

## Examples:

- Pull an image: `sealos pull my-image:latest`

- Pull an image from the Docker daemon: `sealos pull docker-daemon:my-image:tag`

- Pull an image from a specific repository: `sealos pull myregistry/myrepository/my-image:tag`

- Pull multiple images: `sealos pull imageID1 imageID2 imageID3`

The above is a usage guide for the `sealos push` command, hoping to help you. If you encounter any problems during use, feel free to ask us.
