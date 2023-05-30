---
sidebar_position: 3
---

# Principle and Usage of image-cri-shim

## How It Works

image-cri-shim is a gRPC (Google Remote Procedure Call) shim based on CRI (Container Runtime Interface) and kubelet in Kubernetes. CRI is an interface in Kubernetes used for interacting with container runtimes, while kubelet is a Kubernetes component responsible for maintaining container runtime states and node-level resource management.

The main function of image-cri-shim is to automatically recognize image names, allowing users to deploy containers in Kubernetes without manually specifying image names. This can reduce user operation difficulty and improve the convenience of deploying containers.

In actual use, image-cri-shim can act as middleware, receiving requests from kubelet and forwarding them to the container runtime. By automatically recognizing image names, image-cri-shim can simplify the container image deployment process and reduce the burden on users.


```
+------------+         +----------------+         +-------------------+
|   User     |         |  Kubelet       |         |   image-cri-shim  |
| (Kubernetes|         | (Node agent)   |         |   (Middleware)    |
|  Manifest) |         |                |         |                   |
+-----+------+         +-------+--------+         +-------+-----------+
      |                        |                          |
      | YAML Manifest          |                          |
      |--------------->        |                          |
      |                        |                          |
      |                        |                          |
      |                        |   CRI Request            |
      |                        |------------------------> |
      |                        |                          |
      |                        |   Image Name             |
      |                        |   Auto-Recognition       |
      |                        |                          |
      |                        |                          |
      |                        |   CRI Response           |
      |                        | <------------------------+
      |                        |                          |
      |                        |                          |
      |          Container     |                          |
      |          Deployment    |                          |
      | <----------------------|                          |
      |                        |                          |
      |                        |                          |
+------------+         +-------+--------+         +-------+-----------+

```

As shown in the flowchart above, the user creates a Kubernetes YAML manifest containing container information and submits it to kubelet. Kubelet is the agent on the Kubernetes node responsible for managing containers.
Next, kubelet sends a CRI request to the image-cri-shim middleware. The primary task of image-cri-shim is to automatically recognize image names; it processes the CRI request and obtains the relevant image information. When image-cri-shim recognizes the image name, it returns the CRI response to kubelet.

Finally, kubelet deploys the container using the image name obtained from image-cri-shim. This process is transparent to the user, who does not need to manually specify the image name, thus simplifying the container deployment process and improving convenience.

## Usage Instructions

```yaml
shim: /var/run/image-cri-shim.sock
cri: /run/containerd/containerd.sock
address: http://sealos.hub:5000
force: true
debug: true
timeout: 15m
auth: admin:passw0rd

registries:
- address: http://172.18.1.38:5000
  auth: admin:passw0rd
```
This configuration snippet is a YAML-formatted file for configuring image-cri-shim. The configuration file contains several key parameters, with explanations for each parameter below:

1. shim: Specifies the UNIX socket file path for image-cri-shim. This path is used for communication between image-cri-shim and kubelet.
2. cri: Specifies the UNIX socket file path for the container runtime (e.g., containerd). Image-cri-shim uses this path to communicate with the container runtime.
3. address: Defines the address of the image repository. In this example, the image repository address is http://sealos.hub:5000
4. force: When set to true, image-cri-shim will forcibly start the shim without waiting for the CRI to start.
5. debug: When set to true, debug mode is enabled, providing more log output.
6. timeout: Defines the timeout for image operations. In this example, the timeout is set to 15 minutes (15m).
7. auth: Defines the authentication credentials for accessing the image repository. In this example, the username is 'admin' and the password is 'passw0rd'.

In addition, the configuration file contains a registries list for defining other image repositories and their authentication credentials. In this example, there is one additional repository:
- address: The repository address is http://172.18.1.38:5000.
- auth: Authentication credentials for accessing the repository. In this example, the username is 'admin' and the password is 'passw0rd'.
This configuration file provides the necessary information for image-cri-shim to correctly communicate with kubelet and the container runtime (such as containerd), as well as access and manage the image repository.

Note: image-cri-shim is compatible with both CRI API v1alpha2 and v1 simultaneously.

### Service Management

Image-cri-shim typically runs as a system service. To manage image-cri-shim,you can use system service management tools (such as systemctl) to start, stop, restart, or check the service status. First, make sure you have correctly installed image-cri-shim and configured it as a system service.

1. Start the service： `systemctl start image-cri-shim`
2. Stop the service： `systemctl stop image-cri-shim`
3. Restart the service： `systemctl restart image-cri-shim`
4. Check the service status： `systemctl status image-cri-shim`

### Log Management

To view the logs for the image-cri-shim service, you can use the journalctl command. Journalctl is a tool for querying and displaying system logs and works in conjunction with the systemd service manager.

Here are the commands for viewing the image-cri-shim service logs using journalctl:

```shell
journalctl -u image-cri-shim
```

This will display all the logs for the image-cri-shim service. If you want to view the logs in real-time, you can add the -f option:

```shell
journalctl -u image-cri-shim -f
```

Additionally, you can filter the logs based on time. For example, if you only want to view logs from the past hour, you can use the following command:


```shell
journalctl -u image-cri-shim --since "1 hour ago"
```

These commands should help you view and analyze the logs for the image-cri-shim service, allowing you to better understand the service's operation status and identify any potential issues.
