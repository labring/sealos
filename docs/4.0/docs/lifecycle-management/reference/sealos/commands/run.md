---
sidebar_position: 1
---

# run: Run Cluster Images

The `sealos run` command in Sealos is a powerful and flexible tool that supports cluster initialization, application installation, executing multiple images, and creating single-node clusters. Below is a detailed explanation of the `sealos run` command and its parameters, along with some usage examples.

## Command Overview

```
sealos run <image> --masters [arg] --nodes [arg] [Options]
```

The `<image>` parameter represents the name and version of the Docker image you want to run in the cluster. `--masters` and `--nodes` are the IP lists of the master and node nodes where you want to run this image.

### Option Explanation

- `--cluster='default'`: The name of the cluster to perform the operation on.

- `--cmd=[]`: Overrides the CMD instruction in the image.

- `--config-file=[]`: Path to a custom configuration file to replace resources.

- `-e, --env=[]`: Environment variables to be set during command execution.

- `-f, --force=false`: Force overwrite the application in this cluster.

- `--masters=''`: The master nodes to run on.

- `--nodes=''`: The node nodes to run on.

- `-p, --passwd=''`: Authentication password to use.

- `-i, --pk='/root/.ssh/id_rsa'`: The private key file from which to read the identity for public key authentication.

- `--pk-passwd=''`: Password to decrypt the PEM-encoded private key.

- `--port=22`: Connection port for the remote host.

- `-t, --transport='oci-archive'`: Image transport to load from a tar archive file. (Valid values: oci-archive, docker-archive)

- `-u, --user=''`: Username for authentication.

## Examples

1. Create a cluster on your bare-metal servers, specifying the IP list:
```
sealos run labring/kubernetes:v1.24.0 --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
	--nodes 192.168.0.5,192.168.0.6,192.168.0.7 --passwd 'xxx'
```

2. Run multiple images:
```
sealos run labring/kubernetes:v1.24.0 labring/helm:v3.11.3  calico:v3.24.6 \
    --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19
```

3. Specify the InfraSSH port of the servers:
```
sealos run labring/kubernetes:v1.24.0 --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
	--nodes 192.168.0.5,192.168.0.6,192.168.0.7 --port 24 --passwd 'xxx'
```

4. Customize VIP Kubernetes cluster:
```
sealos run -e defaultVIP=10.103.97.2 labring/kubernetes:v1.24.0 --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
	--nodes 192.168.0.5,192.168.0.6,192.168.0.7 --passwd 'xxx'
```

5. Create a single-node Kubernetes cluster:
```
sealos run labring/kubernetes:v1.24.0 
```

6. Create a cluster with custom environment variables:
```
sealos run -e DashBoardPort=8443 mydashboard:latest  --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
    --nodes 192.168.0.5,192.168.0.6,192.168.0.7 --passwd 'xxx'
```

These examples showcase the power and flexibility of the `sealos run` command, allowing you to customize and adjust it according to your needs.

For more examples, please refer to the [Run Cluster](https://docs.sealos.io/docs/lifecycle-management/operations/run-cluster) documentation.

