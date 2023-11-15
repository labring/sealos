---
sidebar_position: 1
---

# 常见问题

部署及使用 Sealos cloud 时，您可能会遇到一些问题。以下是一些常见问题的答案和解决方法。

## 部署问题

下面总结了部署过程中可能遇到的问题及解决方法，假如您遇到了其他问题，请在 [Sealos 社区](https://forum.laf.run/) 中联系我们

### Q1：iptables / ip_forward 问题

部分操作系统默认并未启用iptables / ipv4 ip转发，如旧版本的 Centos、RHEL等，这会导致部署过程中，无法正常创建 iptables
规则或转发数据包，从而导致集群无法正常启动。

如果有 iptables 相关的问题，需要在每个节点上执行：

```bash
modprobe br_netfilter
echo 1 > /proc/sys/net/bridge/bridge-nf-call-iptables
echo 1 > /proc/sys/net/ipv4/ip_forward
```

### Q2：系统内核问题

在系统内核过低时，可能导致集群无法正常启动，或者部署后，部分依赖了 mongo5.0 的应用无法正常使用。

请在部署前确保系统内核在 5.4 及以上。

### Q3：系统资源问题

在系统资源紧张的情况下，可能会导致部署过程中卡在任意位置，当您等待过久时，请检查系统资源是否足够。

使用命令： `kubectl describe nodes` 查看节点资源状态是否正常，一般情况下，可以从CPU、内存、存储方向排查系统资源情况。

### Q4：网络问题

在部署过程中，服务器伤的不当配置可能会导致各种网络问题，例如：

1. http_proxy / https_proxy 环境变量配置；
2. 服务器防火墙配置；
3. 服务器路由配置；

请在出现网络问题时，检查以上配置是否正确。

## 证书及域名

### 证书更新

在您提供的证书即将过期时，您可以通过下面的方式更新证书：

1. 在 master0 上使用命令行保存旧证书，执行：
    ```shell
    kubectl get secret -n sealos-system wildcard-secret -o yaml > cert-backup.yaml
    ```
2. 将新的证书保存在 master0 上；
3. 使用命令行更新证书，执行下面脚本（需要替换证书路径）：
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

### 域名更换

域名更新较为复杂，涉及多处变更，我们计划在未来推出 Sealos 集群管理面板中可以方便地替换集群域名及证书，目前不在文档中提供域名更换教程。