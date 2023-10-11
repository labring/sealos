---
sidebar_position: 1
---

# 安装 Sealos 集群

## 准备工作

### 服务器
奇数台的master服务器及任意的node服务器，推荐使用ubuntu 22.04 LTS linux发行版，操作系统内核在5.4以上；

配置推荐4c8g，存储100g以上，i.e. 最少一台的服务器配置如下：

|           | cpu | memory | disk |
|-----------|-----|--------|------|
| recommend | 4   | 8G     | 100G |
| minimum   | 2   | 4G     | 60G  |

### 网络
服务器之间的网络互通，其中`master0`（执行sealos cli的master节点）可以通过ssh免密登陆到其他节点；所有节点间可以互相通信。

### 域名
你需要一个域名，用于访问 Sealos 及你将部署的各种服务。如果您没有域名，可以使用`nip.io`提供的免费域名服务。

### 证书
Sealos 需要使用证书来保证通信安全，默认在您不提供证书的情况下我们会使用 [cert-manager](https://cert-manager.io/docs/) 来自动签发证书。

如果您能提供证书，证书需要解析下列域名（假设您提供的域名为：cloud.example.io）：
- `*.cloud.example.io`
- `cloud.example.io`

## 安装步骤

执行命令，并根据提示输入参数：

```bash 
curl -sfL https://raw.githubusercontent.com/labring/sealos/main/scripts/cloud/install.sh -o /tmp/install.sh && bash /tmp/install.sh 
```

默认的用户名密码：

+ 用户名：`root`
+ 密码：`sealos2023`