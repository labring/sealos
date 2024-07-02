---
sidebar_position: 3
---

# 常见问题

在部署及使用 Sealos Cloud 过程中，您可能会遇到各种问题。为了更好地帮助您解决这些问题，我们对常见问题进行了总结，并提供了详细的答案和解决方法。

## 部署问题

下面总结了部署过程中可能遇到的问题及解决方法，假如您遇到了其他问题，请在 [Sealos 社区](https://forum.laf.run/)中联系我们。

### Q1：iptables / ip_forward 问题

**问题描述**：在部分操作系统中，iptables 或 IPv4 IP 转发默认未启用，例如旧版本的 Centos、RHEL 等。这可能导致部署过程中无法正常创建
iptables 规则或转发数据包，从而导致集群无法正常启动。

**解决方法**：需要在每个节点上执行以下命令，以启用 iptables 和 IP 转发：

```shell
$ modprobe br_netfilter
$ echo 1 > /proc/sys/net/bridge/bridge-nf-call-iptables
$ echo 1 > /proc/sys/net/ipv4/ip_forward
```

### Q2：系统内核问题

- **问题描述**：如果系统内核版本过低，可能导致集群无法正常启动。低版本内核也可能导致依赖 MongoDB 5.0 的应用无法正常运行。
- **解决方法**：在部署前，请确保系统内核版本至少为 5.4 或更高。

### Q3：系统资源问题

- **问题描述**：系统资源紧张可能会导致部署过程中出现卡顿或停滞，当您等待过久时，请检查系统资源是否足够。
- **解决方法**：使用命令 `kubectl describe nodes` 查看节点资源状态。一般情况下可以从 CPU、内存、存储等方向排查系统资源是否充足。

### Q4：网络问题

- **问题描述**: 在部署过程中，服务器的不当配置可能会引发多种网络问题，例如：
   1. http_proxy / https_proxy 环境变量配置；
   2. 服务器防火墙配置；
   3. 服务器路由配置；
- **解决方法**: 遇到网络问题时，请检查以上配置是否正确。

## 证书及域名相关问题

### 证书更新

在您使用 Sealos 过程中，证书是保障集群安全的重要组成部分。以下是详细的证书更新步骤，这些步骤可以帮助您在证书即将过期时顺利更新：

1. **备份旧证书**：

   在主节点 `master0` 上，您需要先备份当前使用的证书。这是一个防止更新过程中出现问题而导致证书丢失的重要步骤。使用以下命令进行备份：

   ```shell
   $ kubectl get secret -n sealos-system wildcard-cert -o yaml > cert-backup.yaml
   ```

   此命令会将名为 `wildcard-cert` 的证书以 YAML 格式保存到文件 `cert-backup.yaml` 中。

2. **保存新证书**：

   将您已经准备好的新证书文件保存到 `master0` 节点上。确保新的证书文件（通常是 `.crt` 和 `.key` 文件）在节点上的某个位置。

3. **更新证书**：

   使用以下脚本来更新证书。您需要替换脚本中的 `<path-to-tls.crt>` 和 `<path-to-tls.key>`，以指向您的新证书文件和密钥文件的实际路径。

   ```shell
   #!/bin/bash 
   # 设置变量
   CRT_FILE=<path-to-tls.crt>
   KEY_FILE=<path-to-tls.key>
   
   # 将证书和密钥文件内容进行Base64编码
   CRT_BASE64=$(cat $CRT_FILE | base64 -w 0)
   KEY_BASE64=$(cat $KEY_FILE | base64 -w 0)
   
   # 构建部分更新的JSON对象
   PATCH_JSON='{"data":{"tls.crt":"'$CRT_BASE64'","tls.key":"'$KEY_BASE64'"}}'
   
   # 使用kubectl patch命令更新Secret
   kubectl patch secret wildcard-cert -n sealos-system -p $PATCH_JSON
   ```
   
   这个脚本的主要作用是将新证书的内容编码为 Base64 格式，并使用 `kubectl patch` 命令更新 Kubernetes 集群中的相应 Secret
   对象。

### 域名更换

域名更换是一个更加复杂的过程，因为它通常涉及到集群内多个组件和服务的配置更改。目前，我们尚未在文档中提供域名更换的详细教程。不过，我们计划在未来推出
Sealos 集群管理面板，该面板将提供更加简便的方法来替换集群域名和证书。

请注意，域名更换通常需要对集群的网络配置进行深入了解，并且可能涉及到 DNS
设置、服务发现等多个方面。因此，建议在执行此类操作时，确保您具备相应的技术知识或咨询专业人士的帮助。

### 用户注册开关

关闭用户注册:

```shell
kubectl get cm -n sealos desktop-frontend-config -o yaml | sed 's/signUpEnabled: true/signUpEnabled: false/g' | kubectl apply -f -
kubectl rollout restart deployment desktop-frontend -n sealos
```

开启用户注册:

```shell
kubectl get cm -n sealos desktop-frontend-config -o yaml | sed 's/signUpEnabled: false/signUpEnabled: true/g' | kubectl apply -f -
kubectl rollout restart deployment desktop-frontend -n sealos
```
