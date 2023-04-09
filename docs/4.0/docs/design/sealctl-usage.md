---
sidebar_position: 7
---

## sealctl

sealctl is a command-line tool for managing and configuring the SealOS system. It includes the following subcommands:

1. cert: Manage certificates, used for generating, viewing, and updating TLS certificates.
2. cri: Manage Container Runtime Interface (CRI) configurations, such as Docker or containerd.
3. hostname: View or set the system's hostname.
4. hosts: Manage the system's hosts file, used for defining static hostname-to-IP address mappings.
5. ipvs: Manage IP Virtual Server (IPVS) rules, used for load balancing and proxying.
6. registry: Manage image registries, used for storing container image repositories and managing image repositories.
7. static_pod: Manage static Pods, can create static Pod configurations.
8. token: Generate and manage access tokens, used for authorizing access to Kubernetes clusters.
9. version: Display the version information of sealctl.

With these subcommands, you can conveniently manage and configure your SealOS system, achieving control over various aspects such as containers, image registries, networks, and more.
### Cert Certificate Management Command

The `cert` command is used to generate the certificate files required for a Kubernetes cluster. In a Kubernetes cluster, certificates are used to ensure secure communication between components, such as the API server, kubelet, and etcd. Certificates are implemented using the TLS (Transport Layer Security) protocol to ensure the confidentiality and integrity of data during transmission.

The `sealctl cert` command can automatically generate certificates based on the provided parameters. These parameters include node IP, node name, service CIDR, DNS domain, and optional alternative names. By generating and configuring these certificates, you can ensure secure communication within your Kubernetes cluster.


```
The cert command is used to generate Kubernetes certificates.

Parameters:
  --alt-names      Alternative names, such as sealos.io or 10.103.97.2. Multiple alternative names can be included.
  --node-name      Node name, such as master0.
  --service-cidr   Service CIDR, such as 10.103.97.2/24.
  --node-ip        Node's IP address, such as 10.103.97.2.
  --dns-domain     Cluster DNS domain, default value is cluster.local.
  --cert-path      Kubernetes certificate file path, default value is /etc/kubernetes/pki.
  --cert-etcd-path Kubernetes etcd certificate file path, default value is /etc/kubernetes/pki/etcd.

Examples:
  sealctl cert --alt-names sealos.io --alt-names 10.103.97.2 \
               --node-name master0 --service-cidr 10.103.97.2/24 \
               --node-ip 10.103.97.2 --dns-domain cluster.local

```



### CRI Container Management Command

The cri command is used to manage and inspect the Container Runtime Interface (CRI) environment in a Kubernetes cluster. The container runtime is the underlying technology responsible for running containers, such as Docker, containerd, or CRI-O. In Kubernetes, container runtimes are used to start, stop, and manage containers to support workloads in the cluster.

The sealctl cri command provides a set of subcommands that allow you to perform various operations related to the container runtime, such as checking if the runtime is Docker, whether it is running, listing Kubernetes containers, removing containers, pulling images, checking if an image exists, and obtaining CGroup driver information.

By using the sealctl cri command, you can easily manage and inspect the container runtime environment in your Kubernetes cluster, ensuring it is properly configured and running smoothly.


```shell
sealctl cri [flags]
```



Subcommands:

1. socket: Detect the CRI socket.

```shell
sealctl cri socket
```

2. is-docker: Check if the container runtime is Docker.

```shell
sealctl cri is-docker
```

3. is-running: Check if the container runtime is running.

```shell
sealctl cri is-running [--short]
```

- --short: Print only the result.

4. list-containers: List Kubernetes containers.

```shell
sealctl cri list-containers [--short]
```

- --short: Print only the result.

5. remove-containers: Remove specified containers.

```shell
sealctl cri remove-containers --containers [CONTAINER_NAME_1,CONTAINER_NAME_2,...]
```

- --containers: List of container names to remove.

6. `pull-image`： Pull the specified image.

```shell
sealctl cri pull-image --image IMAGE_NAME
```

- `--image`： The name of the image to pull.

7. `image-exists`：Check if the specified image exists.

```shell
sealctl cri image-exists --image IMAGE_NAME [--short]
```

- `--image`： The name of the image to check.
- `--short`： Print only the result.

8. `cgroup-driver`：Get the container runtime's cgroup driver.

```shell
sealctl cri cgroup-driver [--short]
```

- `--short`：Print only the result.

Global parameters:

- --socket-path: CRI socket path.
- --config: CRI configuration file.

Examples：

```shell
sealctl cri socket
sealctl cri is-docker
sealctl cri is-running --short
sealctl cri list-containers --short
sealctl cri remove-containers --containers container1,container2
sealctl cri pull-image --image IMAGE_NAME
sealctl cri image-exists --image IMAGE_NAME --short
sealctl cri cgroup-driver --short
```

### hostname Get Operating System Hostname Command

Get the operating system's hostname:

```shell
sealctl hostname
```

Example：

```shell
sealctl hostname
```

Executing this command will return the operating system's hostname. No parameters need to be passed.

### hosts Configuration Management Command

The `hosts` command is used to manage the operating system's hosts file. The hosts file is a file used for resolving domain names to IP addresses, usually used in local systems to override DNS resolution. By modifying the hosts file, you can assign a custom IP address to a specific domain name without relying on a DNS server.

`sealctl hosts` provides the following three subcommands for managing the hosts file:

1. `list`：Lists all entries in the current hosts file.
2. `add`：Adds a new domain name and IP address mapping to the hosts file.
3. `delete`：Deletes a specified domain name and IP address mapping from the hosts file.

With these subcommands, you can easily view, add, and delete mappings in the hosts file, thus better controlling the resolution of domain names to IP addresses.

1. `sealctl hosts list`：List entries in the current hosts file.

   Example：

   ```shell
   sealctl hosts list
   ```

2. `sealctl hosts add`： Add a new entry to the hosts file.

   Parameters：

    - `--ip`：IP address (required)
    - `--domain`：Domain name (required)

   Example：

   ```shell
   sealctl hosts add --ip 192.168.1.100 --domain example.com
   ```

3. `sealctl hosts delete`：Remove an entry from the hosts file.

   Parameters：

    - `--domain`： Domain name to be deleted (required)

   Example：

   ```shell
   sealctl hosts delete --domain example.com
   ```

Note: You can add the --path parameter after any hosts subcommand to specify the path of the hosts file. The default path is /etc/hosts (for Linux systems).

Example：

```shell
sealctl hosts list --path /custom/path/hosts
```



### registry save Command

The `registry save`  command is used to pull remote Docker images to the local machine and save them in a specified directory. This is especially useful for deploying container images in offline or internal network environments. It supports two modes: default and raw.

- The `default` mode automatically fetches images based on the parsed image list. These image lists are sourced from the charts directory, manifests directory, and images directory.
- The `raw` mode allows users to directly specify the list of images to be saved.

When executing the `registry save` command, the authentication information from `sealos login` will be automatically obtained for repository authentication.

**Subcommands**

1. `default [CONTEXT]`

   Pull and save images using the default method. This mode automatically parses the `charts` directory, `manifests` directory, and `images` directory to obtain the image list.

   **Usage Example**

 ```shell
 sealctl registry save default my-context
 ```


2. `raw`

   Pull and save images using the raw method.

   **Usage Example**

  ```shell
  sealctl registry save raw --images my-image:latest
  ```

**Options**

The following options apply to the `save` command and its subcommands:

- `--max-procs`: The maximum number of parallel processes to use when pulling images.
- `--registry-dir`: The local directory to save the images.
- `--arch`: The target architecture of the images, such as: amd64, arm64, etc.

For the `raw` subcommand, there are also the following additional options:

- `--images`:  The list of images to pull and save, separated by commas. For example: "my-image1:latest,my-image2:v1.0".

**Usage Documentation**

To use the  `sealctl registry save` command, follow these steps:

1. Choose a subcommand (`default` or `raw`) as needed.
2. Provide the necessary options and parameters for the subcommand.
3. Execute the command, and the images will be pulled from the remote repository and saved to the specified local directory.

**Examples**

Save images from the default context:

```shell
sealctl registry save default my-context
```

Save a specified image using the raw method:

```shell
sealctl registry save raw --images my-image:latest
```

### ipvs Configuration Management Command

The `ipvs` command is used to create and manage local IPVS load balancing. IPVS (IP Virtual Server) is a module in the Linux kernel that allows high-performance load balancing to be implemented in kernel space. The ipvs command achieves load balancing of services by managing the mapping relationship between virtual servers and real servers.

`sealctl ipvs` supports the following features:

1. Create and manage the mapping relationship between virtual servers (virtual server) and real servers (real server).
2. Provide health check functionality to periodically check the health status of real servers and perform online/offline operations as needed.
3. Support two proxy modes: `route` and `link`。
4. Support configuration of proxy scheduling algorithms (such as round-robin, weighted round-robin, etc.).
5. Support one-time creation of proxy rules (`--run-once` flag) or continuous running and management of proxy rules.
6. Support cleanup functionality: By using the `-C` or `--clean` flag, existing IPVS rules can be cleared and exited.

With the `sealctl ipvs` command, users can easily create and manage high-performance load balancing services locally.

**Usage**

```shell
sealctl ipvs [flags]
```

**Options**

- `-C`, `--clean`: Clear existing rules and then exit.
- `--health-insecure-skip-verify`: Skip verification for insecure requests (default is true).
- `--health-path string`:  URL path for probing (default is "/healthz").
- `--health-req-body string`: Request body sent by the health checker.
- `--health-req-headers stringToString`: HTTP request headers (default is []).
- `--health-req-method string`: HTTP request method (default is "GET").
- `--health-schem string`: HTTP scheme of the probe (default is "https").
- `--health-status ints`: Valid status codes.
- `-h`, `--help`: ipvs help.
- `-i`, `--iface string`: The name of the virtual interface to be created, same as the behavior of kube-proxy (default is "lvscare"). Enabled only when mode=link.
- `--interval durationOrSecond`: Health check interval (default is 0s).
- `--ip ip`: The target IP as a routing gateway, used with the route mode.
- `--logger string`: Log level: DEBG/INFO (default is "INFO").
- `--masqueradebit int`: IPTables masquerade bit. Enabled only when mode=link.
- `--mode string`: Proxy mode: route/link (default is "route").
- `--rs strings`: Real server addresses, e.g., 192.168.0.2:6443.
- `--run-once`: Create proxy rules and exit.
- `--scheduler string`: Proxy scheduler (default is "rr").
- `--vs string`: Virtual server address, e.g., 169.254.0.1:6443.

**Global Options**

- `--debug`: Enable debug logs.
- `--show-path`: Enable showing code paths.

**Usage Documentation**

To use the `sealctl ipvs` command, follow these steps:

1. Provide the necessary options and parameters for the command.
2. Execute the command to create or manage local IPVS load balancing.

**Examples**

Create proxy rules and exit:

```shell
sealctl ipvs --vs 169.254.0.1:6443 --rs 192.168.0.2:6443 --run-once
```

Clear existing IPVS rules:

```shell
sealctl ipvs --clean
```

### static-pod Management Command

The `static-pod` command is used to generate static Pods, which are managed directly by kubelet rather than through the API server. Static Pods are very useful in certain scenarios, such as setting up and managing control plane components in a Kubernetes cluster.

The `sealctl static-pod` command provides a convenient way to generate static Pod configuration files for specific purposes. Currently, it primarily supports generating `lvscare` static Pods, where `lvscare` is a tool for managing IPVS rules.

By using `sealctl static-pod lvscare`, you can generate an `lvscare` static Pod YAML file based on the specified parameters (such as VIP, master node addresses, image name, etc.). The file can then be stored in the kubelet's static Pod path, and kubelet will automatically create and manage the corresponding Pod.


**Usage**

```shell
sealctl static-pod lvscare [flags]
```

**Options**

- `--vip`: Default VIP IP (default is "10.103.97.2:6443").
- `--name`: Generated lvscare static Pod name.
- `--image`: Generated lvscare static Pod image (default is `sealos.hub:5000/sealos/lvscare:latest`）。
- `--masters`: Generated master address list.
- `--print`: Whether to print YAML.

**Example**

Generate an lvscare static Pod file and print YAML:

```shell
sealctl static-pod lvscare --vip 10.103.97.2:6443 --name lvscare --image lvscare:latest --masters 192.168.0.2:6443,192.168.0.3:6443 --print
```

If the `--print` option is not used, the configuration file will be generated directly to `/etc/kubernetes/manifests` and enable the static Pod:

```shell
sealctl static-pod lvscare --vip 10.103.97.2:6443 --name lvscare --image lvscare:latest --masters 192.168.0.2:6443,192.168.0.3:6443
```

### token Management Command

The primary purpose of the `sealctl token` command is to generate a token for connecting master and worker nodes. In a Kubernetes cluster, when you want to add a new worker node to the cluster, you typically need to provide a token for authentication. This token ensures that only worker nodes with the correct token can join the cluster.

The `sealctl token` command generates an authentication token by accepting a configuration file (optional) and a certificate key (optional) as parameters. By default, if no configuration file and certificate key are provided, the command uses built-in default settings to generate the token.

In summary, the `sealctl token` command is used to generate an authentication token, allowing worker nodes to securely join a Kubernetes cluster. Using this command simplifies the process of nodes joining the cluster while ensuring its security.


**Usage**

```shell
sealctl token [config] [certificateKey]
```

**Parameters**

- `config`: Configuration file (optional).
- `certificateKey`: Certificate key (optional).

**Example**

Generate a token using default parameters:

```shell
sealctl token
```

Generate a token using a custom configuration file and certificate key:

```shell
sealctl token my-config my-certificate-key
```



## sealos Dependency Commands

1. **HostsAdd(ip, host, domain string) error**

   Add a new hosts record on the node with the specified IP address. Parameters include IP address, hostname, and domain. Use the `sealos hosts add` command.

2. **HostsDelete(ip, domain string) error**

   Delete a hosts record on the node with the specified IP address. Parameters include IP address and domain. Use the `sealctl hosts delete` command.

3. **Hostname(ip string) (string, error)**

   Get the hostname of the node with the specified IP address. Use the `sealctl hostname` command.

4. **IPVS(ip, vip string, masters []string) error**

   Configure IPVS on the node with the specified IP address for load balancing. Parameters include node IP address, virtual IP address, and master node IP address list. Use the `sealctl ipvs` command.

5. **IPVSClean(ip, vip string) error**

   Clears the IPVS configuration on the node with the specified IP address. Parameters include node IP address and virtual IP address. Use the `sealctl ipvs` command.

6. **StaticPod(ip, vip, name, image string, masters []string) error**

   Deploys a static Pod (lvscare) on the node with the specified IP address. Parameters include node IP address, virtual IP address, Pod name, image name, and master node IP address list. Use the `sealctl static-pod lvscare` command.

7. **Token(ip, config, certificateKey string) (string, error)**

   Generates a token for the node with the specified IP address. Parameters include node IP address, configuration file, and certificate key. Use the `sealctl token` command.

8. **CGroup(ip string) (string, error)**

   Retrieves the cri CGroup information for the node with the specified IP address. Use the `sealctl cri cgroup` command.

9. **Socket(ip string) (string, error)**

   Retrieves the cri Socket information for the node with the specified IP address. Use the `sealctl cri socket` command.

10. **Cert(ip string, altNames []string, hostIP, hostName, serviceCIRD, DNSDomain string) error**

    Generates a certificate for the node with the specified IP address. Parameters include node IP address, alternate names list, host IP address, hostname, service CIDR, and DNS domain. Use the `sealctl cert` command.

