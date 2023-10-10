---
sidebar_position: 0
---

# Sealos Command Reference

## Cluster Management Commands

- `apply`: Runs cluster images within a Kubernetes cluster using Clusterfile.
- `cert`: Updates the certificates of the Kubernetes API server.
- `run`: Easily runs cloud-native applications.
- `reset`: Resets all content in the cluster.
- `status`: Views the status of the Sealos cluster.

## Node Management Commands

- `add`: Adds nodes to the cluster.
- `delete`: Removes nodes from the cluster.

## Remote Operation Commands

- `exec`: Executes shell commands or scripts on the specified node.
- `scp`: Copies files to the remote location of the specified node.

## Experimental Commands

- `registry`: Commands related to the image registry.

## Container and Image Commands

- `build`: Builds images using instructions from Sealfile or Kubefile.
- `create`: Creates a cluster but does not run CMD, used for image inspection.
- `inspect`: Inspects the configuration of containers or images.
- `images`: Lists images in local storage.
- `load`: Loads images from a file.
- `login`: Logs into a container registry.
- `logout`: Logs out of a container registry.
- `manifest`: Operates on manifest lists and image indexes.
- `merge`: Merges multiple images into one.
- `pull`: Pulls images from a specified location.
- `push`: Pushes images to the specified destination.
- `rmi`: Removes one or more images from local storage.
- `save`: Saves images to an archive file.
- `tag`: Adds an additional name to a local image.

## Other Commands

- `completion`: Generates autocompletion scripts for the specified shell.
- `docs`: Generates API reference documentation.
- `env`: Prints all environment information used by Sealos.
- `gen`: Generates a Clusterfile with all default settings.
- `version`: Prints version information.

The `--debug` flag in Sealos is a global flag used to enable debug mode for more detailed information about the system's operation when issues occur.

For installation instructions, please refer to the [Sealos Installation Guide](/self-hosting/lifecycle-management/quick-start/installation); for a quick start guide, please refer to the [Quick Start Guide](/self-hosting/lifecycle-management/quick-start/.md).
