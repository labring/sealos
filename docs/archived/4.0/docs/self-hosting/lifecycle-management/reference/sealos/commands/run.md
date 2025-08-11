---
sidebar_position: 1
---

# Run: Execute Cluster Images

The `run` command of Sealos is a powerful and flexible tool that supports cluster initialization, application installation, multi-image execution, single-node clusters, and more. Below is a detailed explanation and some usage examples of the `sealos run` command and its parameters.

## Command Overview

```
sealos run <image> --masters [arg] --nodes [arg] [Options]
```

The `<image>` parameter is the name and version of the Docker image you want to run in the cluster. `--masters` and `--nodes` are the IP lists of the master and node nodes where you want to run this image.

### Option Explanation

- `--cluster='default'`: The name of the cluster where the operation is to be run.

- `--cmd=[]`: Overwrite the CMD instruction in the image.

- `--config-file=[]`: The path to the custom configuration file, used to replace resources.

- `-e, --env=[]`: The environment variables set during command execution.

- `-f, --force=false`: Forcefully overwrite the application in this cluster.

- `--masters=''`: The master nodes to be run.

- `--nodes=''`: The node nodes to be run.

- `-p, --passwd=''`: Authenticate using the provided password.

- `-i, --pk='/root/.ssh/id_rsa'`: Choose the private key file from which to read the public key authentication identity.

- `--pk-passwd=''`: The password to decrypt the PEM-encoded private key.

- `--port=22`: The connection port of the remote host.

- `-t, --transport='oci-archive'`: Load image transport from a tar archive file. (Optional values: oci-archive, docker-archive)

- `-u, --user=''`: The username for authentication.

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

3. Specify the InfraSSH port of the server:
```
sealos run labring/kubernetes:v1.24.0 --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
	--nodes 192.168.0.5,192.168.0.6,192.168.0.7 --port 24 --passwd 'xxx'
```

4. Customize a VIP Kubernetes cluster:
```
sealos run -e defaultVIP=10.103.97.2 labring/kubernetes:v1.24.0 --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
	--nodes 192.168.0.5,192.168.0.6,192.168.0.7 --passwd 'xxx'
```

5. Create a single-node Kubernetes cluster:
```
sealos run labring/kubernetes:v1.24.0 
```

6. Create a cluster using custom environment variables:
```
sealos run -e DashBoardPort=8443 mydashboard:latest  --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
	--nodes 192.168.0.5,192.168.0.6,192.168.0.7 --passwd 'xxx'
```

These examples demonstrate the power and flexibility of the `sealos run` command, which can be customized and adjusted according to your needs.

For more examples, please refer to [Run Cluster](/self-hosting/lifecycle-management/operations/run-cluster.md).
