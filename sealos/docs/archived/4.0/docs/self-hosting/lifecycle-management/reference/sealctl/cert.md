---
sidebar_position: 1
---


# Certificate Management with `cert`

The `cert` command is used to generate the necessary certificate files for a Kubernetes cluster. In a Kubernetes cluster, certificates are used to ensure secure communication between components such as the API server, kubelet, and etcd. Certificates provide encryption using the Transport Layer Security (TLS) protocol to ensure the confidentiality and integrity of data during transit.

The `sealctl cert` command generates certificates automatically based on the provided parameters. These parameters include node IP, node name, service CIDR, DNS domain, and optional additional alternate names. By generating and configuring these certificates, you can ensure secure communication within your Kubernetes cluster.


```
The `cert` command is used to generate Kubernetes certificates.

Options:
  --alt-names      Alternate names, such as sealos.io or 10.103.97.2. Can specify multiple alternate names.
  --node-name      Node name, such as master0.
  --service-cidr   Service CIDR, such as 10.103.97.2/24.
  --node-ip        IP address of the node, such as 10.103.97.2.
  --dns-domain     DNS domain for the cluster. Default value is cluster.local.
  --cert-path      Path to Kubernetes certificate files. Default value is /etc/kubernetes/pki.
  --cert-etcd-path Path to Kubernetes etcd certificate files. Default value is /etc/kubernetes/pki/etcd.

Examples:
  sealctl cert --alt-names sealos.io --alt-names 10.103.97.2 \
               --node-name master0 --service-cidr 10.103.97.2/24 \
               --node-ip 10.103.97.2 --dns-domain cluster.local

```
