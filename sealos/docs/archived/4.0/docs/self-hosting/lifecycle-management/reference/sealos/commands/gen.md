---
sidebar_position: 3
---

# Generate Cluster Configuration

Sealos' `gen` command is used to generate a Kubernetes cluster configuration file (Clusterfile), which can then be applied using the `sealos apply` command. The `gen` command can help users quickly generate a basic configuration file, which can then be modified and adjusted according to their needs.

Here are the basic usage of `sealos gen` command and some common examples:

1. Generate a single-node cluster with default configuration:

   ```bash
   sealos gen labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1
   ```

Notice: labring/helm should be set before labring/calico.

2. Generate a cluster that includes multiple images and specifies the master and worker nodes:

   ```bash
   sealos gen labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 \
       --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
       --nodes 192.168.0.5,192.168.0.6,192.168.0.7 --passwd 'xxx'
   ```

Notice: labring/helm should be set before labring/calico.

3. Specify SSH port, for servers using the same SSH port:

   ```bash
   sealos gen labring/kubernetes:v1.24.0 --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
       --nodes 192.168.0.5,192.168.0.6,192.168.0.7 --port 24 --passwd 'xxx'
   ```

   For servers using different SSH ports:

   ```bash
   sealos gen labring/kubernetes:v1.24.0 --masters 192.168.0.2,192.168.0.3:23,192.168.0.4:24 \
       --nodes 192.168.0.5:25,192.168.0.6:25,192.168.0.7:27 --passwd 'xxx'
   ```

After the Clusterfile is generated, users can modify this file according to their needs. Add or modify environment variables; modify the cluster cidr configuration. Once the modifications are done, users can use the `sealos apply` command to create or update the cluster based on this configuration file.

Example explanations:

- [Custom Configuration Installation](/self-hosting/lifecycle-management/operations/run-cluster/gen-apply-cluster.md)

That's the usage guide for the `sealos gen` command, and we hope it has been helpful. If you encounter any problems during usage, feel free to ask us.
