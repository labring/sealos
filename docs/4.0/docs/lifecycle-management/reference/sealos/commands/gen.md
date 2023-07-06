---
sidebar_position: 3
---

# gen: Generate Cluster Configuration

The `sealos gen` command in Sealos is used to generate the configuration file (Clusterfile) for a Kubernetes cluster, which can be later applied using the `sealos apply` command. The `gen` command helps users quickly generate a basic configuration file that can be modified and adjusted according to their needs.

Below are the basic usage and some common examples of the `sealos gen` command:

1. Generate a single-node cluster with default configuration:

   ```bash
   sealos gen labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1
   ```

2. Generate a cluster with multiple images, specified master and worker nodes:

   ```bash
   sealos gen labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 \
       --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
       --nodes 192.168.0.5,192.168.0.6,192.168.0.7 --passwd 'xxx'
   ```

3. Specify the SSH port for all servers, using the same SSH port:

   ```bash
   sealos gen labring/kubernetes:v1.24.0 --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
       --nodes 192.168.0.5,192.168.0.6,192.168.0.7 --port 24 --passwd 'xxx'
   ```

   For servers using different SSH ports:

   ```bash
   sealos gen labring/kubernetes:v1.24.0 --masters 192.168.0.2,192.168.0.3:23,192.168.0.4:24 \
       --nodes 192.168.0.5:25,192.168.0.6:25,192.168.0.7:27 --passwd 'xxx'
   ```

Once the Clusterfile is generated, users can modify it according to their needs. They can add or modify environment variables and modify the cluster CIDR configuration. After making the necessary changes, users can create or update the cluster using the `sealos apply` command with the generated Clusterfile.

Example documentation:

- [Custom Configuration Installation](https://docs.sealos.io/docs/lifecycle-management/operations/run-cluster/gen-apply-cluster)

That concludes the usage guide for the `sealos gen` command. We hope this information has been helpful to you. If you encounter any issues during usage, please feel free to ask us for assistance.
