---
sidebar_position: 0
---

# Sealctl User Guide

Sealos provides `sealctl`, a command-line tool for operating with Sealos and cluster nodes. It includes the following subcommands:

1. `cert`: Manages certificates for generating, viewing, and updating TLS certificates.
2. `cri`: Manages Container Runtime Interface (CRI) configuration, such as Docker or containerd.
3. `hostname`: Views or sets the system hostname.
4. `hosts`: Manages the system's hosts file, which defines static hostname-to-IP address mappings.
5. `ipvs`: Manages IP Virtual Server (IPVS) rules for load balancing and proxying.
6. `registry`: Manages image repositories for storing container images in container repository format and repository management.
7. `static_pod`: Manages static Pods and creates static Pod configurations.
8. `token`: Generates and manages access tokens for authorizing access to Kubernetes clusters.

With these subcommands, you can conveniently manage and configure your Sealos system, enabling control over containers, image repositories, networks, and other aspects.

# Sealos Dependent Commands

1. **Add Hosts**

   Adds a new hosts record on the node with the specified IP address. The parameters include the IP address, hostname, and domain name. Use the `sealctl hosts add` command.

2. **Delete Hosts**

   Deletes a hosts record on the node with the specified IP address. The parameters include the IP address and domain name. Use the `sealctl hosts delete` command.

3. **Hostname**

   Retrieves the hostname of the node with the specified IP address. Use the `sealctl hostname` command.

4. **IPVS Load Balancing**

   Configures IPVS for load balancing on the node with the specified IP address. The parameters include the node IP address, virtual IP address, and a list of master node IP addresses. Use the `sealctl ipvs` command.

5. **Clear IPVS Rules**

   Clears the IPVS configuration on the node with the specified IP address. The parameters include the node IP address and virtual IP address. Use the `sealctl ipvs` command.

6. **Generate Static Pods**

   Deploys a static Pod (lvscare) on the node with the specified IP address. The parameters include the node IP address, virtual IP address, Pod name, image name, and a list of master node IP addresses. Use the `sealctl static-pod lvscare` command.

7. **Manage Cluster Interact Authentication Token**

   Generates a token for the node with the specified IP address. The parameters include the node IP address, configuration file, and certificate key. Use the `sealctl token` command.

8. **Get Node's CGroup Information**

   Retrieves the CRI CGroup information of the node with the specified IP address. Use the `sealctl cri cgroup` command.

9. **Get Node's CRI Socket Information**

   Retrieves the CRI socket information of the node with the specified IP address. Use the `sealctl cri socket` command.

10. **Generate Self-signed HTTPS Certificates on Node**

    Generates certificates for the node with the specified IP address. The parameters include the node IP address, a list of alternate names, host IP address, hostname, service CIDR, and DNS domain. Use the `sealctl cert` command.

11. **Start Registry on Node**

    Starts the registry on the specified node for incremental image synchronization. Use the `sealctl registry serve` command.
