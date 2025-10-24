# Image-cri-shim 二进制服务使用指南

## 1. 服务概述

### 1.1 什么是 image-cri-shim

Image-cri-shim 是一个处理 kubelet 镜像名称的二进制代理服务，运行在 Kubernetes 集群的每个节点上。它作为 kubelet 和容器运行时之间的中间层，提供以下核心功能：

- **镜像名称智能处理**：自动拦截、识别和转换 kubelet 的镜像请求
- **多注册表统一认证**：支持多个镜像仓库的统一认证管理
- **动态配置加载**：**v5.1.0-rc3+ 核心特性**，支持通过 Kubernetes ConfigMap 动态更新配置，无需重启服务

### 1.2 部署架构和启动顺序

**重要**：image-cri-shim 是二进制程序，必须按照以下顺序部署：

```
启动顺序：
containerd → image-cri-shim → kubelet

网络架构：
kubelet → image-cri-shim → containerd → 镜像仓库
```

**部署位置**：每个 Kubernetes 节点上都必须部署 image-cri-shim 服务

**服务依赖**：
- 依赖 containerd 提供的 CRI 接口
- 为 kubelet 提供镜像管理服务

### 1.3 新版本动态配置功能

**重要**：动态配置功能仅在 **v5.1.0-rc3 及以上版本**中支持。

传统版本只能通过静态配置文件管理，v5.1.0-rc3+ 版本增加了强大的动态配置能力：

- **ConfigMap 同步**：自动从 Kubernetes ConfigMap 读取配置
- **热重载机制**：配置变更无需重启服务即可生效
- **配置合并**：智能合并 ConfigMap 配置和本地配置
- **容错设计**：ConfigMap 不可用时自动回退到本地配置

## 2. 二进制部署

### 2.1 系统要求

- **操作系统**：Linux (CentOS 7+, Ubuntu 18.04+, RHEL 7+)
- **容器运行时**：containerd 或 cri-dockerd
- **Kubernetes**：1.22+ (支持 CRI v1 和 v1alpha2)
- **Sealos 版本**：v5.1.0-rc3+ (动态配置功能需要)
- **权限要求**：root 权限或具有相应系统权限

### 2.2 安装步骤

#### 步骤 1：下载并安装 sealos

**重要**：image-cri-shim 包含在 sealos 安装包中，需要先安装 sealos。

```bash
# 下载 sealos (推荐使用 v5.1.0-rc3 或更高版本)
wget https://github.com/labring/sealos/releases/download/v5.1.0-rc3/sealos_5.1.0-rc3_linux_amd64.tar.gz

# 解压
tar -xzf sealos_5.1.0-rc3_linux_amd64.tar.gz

# 安装 sealos 到系统路径
sudo cp sealos /usr/local/bin/
sudo chmod +x /usr/local/bin/sealos

# 从 sealos 安装包中提取 image-cri-shim
sudo cp image-cri-shim /usr/local/bin/
sudo chmod +x /usr/local/bin/image-cri-shim

# 验证安装
image-cri-shim --version
```

#### 步骤 2：创建基础配置文件

```bash
# 创建配置文件（必需）
# image-cri-shim 启动时会自动加载此配置文件
sudo mkdir -p /etc/image-cri-shim
sudo tee /etc/image-cri-shim/config.yaml > /dev/null << 'EOF'
shim: /var/run/image-cri-shim.sock
cri: /run/containerd/containerd.sock
address: https://your-registry.company.com
force: false
debug: false
timeout: 15m
reloadInterval: 30s
auth: your-username:your-password
registries:
- address: https://backup-registry.company.com
  auth: backup-user:backup-pass
EOF
```

### 2.3 systemd 服务配置

创建 systemd 服务文件：

```bash
sudo tee /etc/systemd/system/image-cri-shim.service > /dev/null << 'EOF'
[Unit]
Description=Image CRI Shim Service
After=network-online.target containerd.service
Requires=network-online.target
Wants=containerd.service

[Service]
Type=simple
ExecStart=/usr/local/bin/image-cri-shim --file=/etc/image-cri-shim/config.yaml
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=5
StartLimitInterval=0
StartLimitBurst=5

# 用户和权限
User=root
Group=root

# 环境变量
Environment=KUBECONFIG=/etc/kubernetes/admin.conf

# 资源限制
LimitNOFILE=1048576
LimitNPROC=infinity

# 日志配置
StandardOutput=journal
StandardError=journal
SyslogIdentifier=image-cri-shim

[Install]
WantedBy=multi-user.target
EOF
```

重新加载 systemd 并启用服务：

```bash
# 重新加载 systemd
sudo systemctl daemon-reload

# 启用服务（开机自启）
sudo systemctl enable image-cri-shim

# 启动服务
sudo systemctl start image-cri-shim
```

### 2.4 验证部署

```bash
# 检查服务状态
sudo systemctl status image-cri-shim

# 检查套接字文件
ls -la /var/run/image-cri-shim.sock

# 查看启动日志
sudo journalctl -u image-cri-shim --no-pager

# 验证 CRI 连接
sudo /usr/local/bin/image-cri-shim --file=/etc/image-cri-shim/config.yaml --dry-run
```

## 3. 配置管理

### 3.1 本地配置文件

**配置文件位置**：`/etc/image-cri-shim/config.yaml` **（必需文件）**

**重要**：image-cri-shim 启动时会自动加载此配置文件，如果文件不存在，服务将无法启动。

**完整配置示例**：

```yaml
# Shim 服务配置
shim: /var/run/image-cri-shim.sock          # Shim 套接字路径
cri: /run/containerd/containerd.sock        # CRI 运行时套接字

# 主注册表配置
address: https://registry.company.com       # 主注册表地址
auth: registry-user:registry-password       # 主注册表认证

# 附加注册表列表
registries:
- address: https://backup-registry.company.com
  auth: backup-user:backup-pass
- address: https://public.registry.com
  auth: ""  # 公共仓库无需认证

# 服务配置
force: false                                # 强制启动模式
debug: false                                # 调试模式
timeout: 15m                                # 操作超时时间
reloadInterval: 30s                         # 配置重载间隔
```

### 3.2 ConfigMap 动态配置

**v5.1.0-rc3+ 核心特性**：支持通过 Kubernetes ConfigMap 动态更新配置

#### 创建 ConfigMap

```bash
# 创建 ConfigMap 配置文件
cat > image-cri-shim-configmap.yaml << 'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: image-cri-shim
  namespace: kube-system
data:
  registries.yaml: |
    version: "v1"
    sealos:
      address: "https://registry.company.com"
      auth:
        username: "admin"
        password: "new-password123"
    registries:
      - address: "https://backup-registry.company.com"
        auth:
          username: "backup-user"
          password: "backup-pass"
      - address: "https://new-registry.company.com"
        auth:
          username: "new-user"
          password: "new-pass"
    reloadInterval: "60s"
    force: true
    debug: false
    timeout: "20m"
EOF

# 应用到集群
kubectl apply -f image-cri-shim-configmap.yaml
```

### 3.3 配置同步机制

**工作原理**：

1. **启动时同步**：服务启动时自动尝试从 ConfigMap 读取配置
2. **定时同步**：根据 `reloadInterval` 配置定时检查 ConfigMap 更新
3. **配置合并**：ConfigMap 配置与本地配置智能合并
4. **热重载**：配置变更自动应用到运行中的服务

**同步逻辑**：
```go
// 基于 configmap_sync.go 的逻辑
func SyncConfigFromConfigMap(ctx context.Context, configPath string) {
    // 1. 创建 Kubernetes 客户端
    client, err := kubeClientFactory()

    // 2. 读取 ConfigMap
    cm, err := client.CoreV1().ConfigMaps("kube-system").Get(ctx, "image-cri-shim", metav1.GetOptions{})

    // 3. 解析配置并合并到本地文件
    if !applyConfigMapToFile(configPath, cm) {
        logger.Debug("ConfigMap produced no updates")
        return
    }

    // 4. 配置已更新，等待下次重载周期生效
    logger.Info("syncing image-cri-shim config from ConfigMap completed")
}
```

### 3.4 配置更新验证

```bash
# 1. 更新 ConfigMap
kubectl edit configmap image-cri-shim -n kube-system

# 2. 等待配置同步（默认 30-60 秒）
sleep 60

# 3. 检查本地配置文件是否更新
sudo cat /etc/image-cri-shim/config.yaml

# 4. 查看服务日志确认重载
sudo journalctl -u image-cri-shim --since="2m ago" | grep -i "reload\|config"

# 5. 验证配置是否生效
sudo systemctl status image-cri-shim
```

## 4. 核心功能使用

### 4.1 镜像名称处理

**工作流程**：

```
kubelet 镜像请求
    ↓
image-cri-shim 拦截
    ↓
镜像名称识别和转换
    ↓
根据注册表配置选择目标仓库
    ↓
添加认证信息
    ↓
转发到 containerd
    ↓
containerd 拉取镜像
```

**示例场景**：
```bash
# kubelet 请求：nginx:latest
# image-cri-shim 处理：
# - 识别镜像名称：nginx:latest
# - 根据配置选择注册表：https://registry.company.com
# - 添加认证信息：registry-user:registry-password
# - 转换为：registry.company.com/library/nginx:latest
# - 转发给 containerd 处理
```

### 4.2 多注册表配置

**故障转移机制**：
```yaml
# 配置多个注册表，实现故障转移
registries:
- address: https://primary-registry.company.com  # 主注册表
  auth: primary-user:primary-pass
- address: https://backup-registry.company.com   # 备用注册表 1
  auth: backup-user:backup-pass
- address: https://third-registry.company.com    # 备用注册表 2
  auth: third-user:third-pass
```

**使用场景**：
- 主注册表不可用时自动切换到备用注册表
- 不同项目使用不同的专用注册表
- 公共镜像和私有镜像分离管理

### 4.3 认证管理

**认证格式**：`username:password`

**多认证配置**：
```yaml
# 主注册表认证
auth: main-user:main-password

# 各个备用注册表独立认证
registries:
- address: https://private-registry.company.com
  auth: private-user:private-password
- address: https://public-registry.company.com
  auth: ""  # 无需认证
```

**动态更新认证**：
```bash
# 方法 1：通过 ConfigMap 更新
kubectl edit configmap image-cri-shim -n kube-system

# 方法 2：直接修改本地配置（临时生效）
sudo vim /etc/image-cri-shim/config.yaml
sudo systemctl reload image-cri-shim
```

### 4.4 故障转移

**自动故障转移**：
- 主注册表连接失败时自动尝试备用注册表
- 按配置顺序依次尝试各个注册表
- 所有注册表都不可用时返回错误

**故障恢复**：
- 主注册表恢复后自动切换回主注册表
- 无需手动干预，自动检测可用性

## 5. 运维管理

### 5.1 服务状态检查

```bash
# 检查服务运行状态
sudo systemctl status image-cri-shim

# 检查进程详情
ps aux | grep image-cri-shim

# 检查套接字监听
sudo ss -tlnp | grep image-cri-shim

# 检查资源使用情况
sudo systemctl status image-cri-shim --no-pager -l
```

### 5.2 日志查看和分析

```bash
# 查看实时日志
sudo journalctl -u image-cri-shim -f

# 查看最近日志
sudo journalctl -u image-cri-shim --since="1 hour ago"

# 过滤特定日志
sudo journalctl -u image-cri-shim | grep -i "error\|warn"

# 查看配置同步相关日志
sudo journalctl -u image-cri-shim | grep -i "config\|sync\|reload"

# 导出日志到文件
sudo journalctl -u image-cri-shim --since="today" > /tmp/image-cri-shim.log
```

### 5.3 配置同步监控

```bash
# 检查 ConfigMap 状态
kubectl get configmap image-cri-shim -n kube-system -o yaml

# 监控配置变更
kubectl get configmap image-cri-shim -n kube-system -w

# 检查最近的配置同步
sudo journalctl -u image-cri-shim --since="10m" | grep -i "syncing"

# 验证本地配置文件
sudo cat /etc/image-cri-shim/config.yaml
```

### 5.4 常见问题处理

**问题 1：服务启动失败**

```bash
# 检查配置文件语法
sudo /usr/local/bin/image-cri-shim --file=/etc/image-cri-shim/config.yaml --dry-run

# 检查 containerd 状态
sudo systemctl status containerd

# 检查套接字权限
sudo ls -la /run/containerd/containerd.sock

# 查看详细错误日志
sudo journalctl -u image-cri-shim --no-pager
```

**问题 2：ConfigMap 同步失败**

```bash
# 检查 Kubernetes 连接
kubectl cluster-info

# 检查 RBAC 权限
kubectl auth can-i get configmaps --namespace=kube-system

# 检查 ConfigMap 是否存在
kubectl get configmap image-cri-shim -n kube-system

# 手动触发同步
sudo systemctl reload image-cri-shim
```

**问题 3：镜像拉取失败**

```bash
# 检查认证信息
sudo cat /etc/image-cri-shim/config.yaml | grep -A 10 "auth\|registries"

# 测试注册表连接
curl -k -u username:password https://registry.company.com/v2/

# 检查网络连通性
ping registry.company.com
telnet registry.company.com 443

# 查看镜像拉取日志
sudo journalctl -u image-cri-shim | grep -i "pull\|image\|registry"
```

**问题 4：配置更新不生效**

```bash
# 检查重载间隔配置
grep -i "reloadInterval" /etc/image-cri-shim/config.yaml

# 手动重载配置
sudo systemctl reload image-cri-shim

# 强制重启服务（最后手段）
sudo systemctl restart image-cri-shim

# 验证配置文件格式
yamllint /etc/image-cri-shim/config.yaml
```

## 6. 配置示例

### 6.1 基础配置

```yaml
# 单注册表基础配置
shim: /var/run/image-cri-shim.sock
cri: /run/containerd/containerd.sock
address: https://registry.company.com
auth: admin:password123
force: false
debug: false
timeout: 15m
reloadInterval: 30s
registries: []
```

### 6.2 多注册表配置

```yaml
# 生产环境多注册表配置
shim: /var/run/image-cri-shim.sock
cri: /run/containerd/containerd.sock
address: https://primary-registry.company.com
auth: primary-user:primary-pass
force: true
debug: false
timeout: 20m
reloadInterval: 60s
registries:
- address: https://backup-registry-1.company.com
  auth: backup1-user:backup1-pass
- address: https://backup-registry-2.company.com
  auth: backup2-user:backup2-pass
- address: https://public-hub.docker.com
  auth: ""
```

### 6.3 高可用配置

```yaml
# 高可用生产环境配置
shim: /var/run/image-cri-shim.sock
cri: /run/containerd/containerd.sock
address: https://ha-registry.company.com
auth: ha-user:ha-pass
force: true
debug: false
timeout: 30m
reloadInterval: 30s
registries:
# 主备注册表配置
- address: https://registry-region1.company.com
  auth: region1-user:region1-pass
- address: https://registry-region2.company.com
  auth: region2-user:region2-pass
- address: https://registry-region3.company.com
  auth: region3-user:region3-pass
# 公共镜像源
- address: https://mirror.gcr.io
  auth: ""
- address: https://registry.k8s.io
  auth: ""
```

## 总结

新版本的 image-cri-shim 通过动态配置加载功能，显著提升了生产环境的运维效率：

### 核心优势

1. **二进制部署**：轻量级部署，性能优异
2. **动态配置**：支持 ConfigMap 热更新，无需重启
3. **高可用性**：多注册表故障转移，确保服务连续性
4. **运维友好**：详细的日志和监控，便于问题排查

### 最佳实践

1. **按顺序部署**：确保 containerd → image-cri-shim → kubelet 的启动顺序
2. **使用 ConfigMap**：推荐使用 ConfigMap 管理配置，便于动态更新
3. **监控日志**：定期检查服务日志，及时发现和解决问题
4. **测试故障转移**：定期测试注册表故障转移机制

这种设计特别适合大规模生产环境的 Kubernetes 集群镜像管理需求，通过动态配置功能大大简化了运维复杂度。