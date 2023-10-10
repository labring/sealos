---
sidebar_position: 1
---


# cert 证书管理

`cert` 命令用于生成 Kubernetes 集群所需的证书文件。在 Kubernetes 集群中，证书用于确保组件之间的通信安全，例如 API server、kubelet 和 etcd 等。证书通过 TLS（Transport Layer Security）协议实现加密，以确保数据在传输过程中的保密性和完整性。

`sealctl cert` 命令可以根据提供的参数自动生成证书。这些参数包括节点 IP、节点名称、服务 CIDR、DNS 域以及可选的其他备用名称。通过生成并配置这些证书，您可以确保 Kubernetes 集群的安全通信。



```
cert 命令用于生成 Kubernetes 证书。

参数：
  --alt-names      备用名称，例如 sealos.io 或 10.103.97.2。可以包含多个备用名称。
  --node-name      节点名称，例如 master0。
  --service-cidr   服务网段，例如 10.103.97.2/24。
  --node-ip        节点的 IP 地址，例如 10.103.97.2。
  --dns-domain     集群 DNS 域，默认值为 cluster.local。
  --cert-path      Kubernetes 证书文件路径，默认值为 /etc/kubernetes/pki。
  --cert-etcd-path Kubernetes etcd 证书文件路径，默认值为 /etc/kubernetes/pki/etcd。

示例：
  sealctl cert --alt-names sealos.io --alt-names 10.103.97.2 \
               --node-name master0 --service-cidr 10.103.97.2/24 \
               --node-ip 10.103.97.2 --dns-domain cluster.local

```
