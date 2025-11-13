# Image-cri-shim Binary Service Usage Guide

## 1. Service Overview

### 1.1 What is image-cri-shim

Image-cri-shim is a binary proxy service that handles kubelet image names, running on each node of a Kubernetes cluster. It acts as a middleware between kubelet and container runtime, providing the following core functionalities:

- **Intelligent Image Name Processing**: Automatically intercepts, recognizes, and transforms kubelet image requests
- **Multi-Registry Unified Authentication**: Supports unified authentication management for multiple image registries
- **Dynamic Configuration Loading**: **v5.1.0-rc3+ core feature**, supports dynamic configuration updates via Kubernetes ConfigMap without service restart

### 1.2 Deployment Architecture and Startup Order

**Important**: image-cri-shim is a binary program and must be deployed in the following order:

```
Startup Order:
containerd → image-cri-shim → kubelet

Network Architecture:
kubelet → image-cri-shim → containerd → Image Registry
```

**Deployment Location**: image-cri-shim service must be deployed on every Kubernetes node

**Service Dependencies**:
- Depends on CRI interface provided by containerd
- Provides image management service for kubelet

### 1.3 New Version Dynamic Configuration Feature

**Important**: Dynamic configuration feature is only supported in **v5.1.0-rc3 and above versions**.

Traditional versions could only manage through static configuration files. v5.1.0-rc3+ versions add powerful dynamic configuration capabilities:

- **ConfigMap Synchronization**: Automatically reads configuration from Kubernetes ConfigMap
- **Hot Reload Mechanism**: Configuration changes take effect without service restart
- **Configuration Merging**: Intelligently merges ConfigMap configuration with local configuration
- **Fault Tolerance Design**: Automatically falls back to local configuration when ConfigMap is unavailable

## 2. Binary Deployment

### 2.1 System Requirements

- **Operating System**: Linux (CentOS 7+, Ubuntu 18.04+, RHEL 7+)
- **Container Runtime**: containerd or cri-dockerd
- **Kubernetes**: 1.22+ (supports CRI v1 and v1alpha2)
- **Sealos Version**: v5.1.0-rc3+ (required for dynamic configuration feature)
- **Permissions**: root privileges or corresponding system permissions

### 2.2 Installation Steps

#### Step 1: Download and Install sealos

**Important**: image-cri-shim is included in the sealos installation package, you need to install sealos first.

```bash
# Download sealos (recommend v5.1.0-rc3 or higher version)
wget https://github.com/labring/sealos/releases/download/v5.1.0-rc3/sealos_5.1.0-rc3_linux_amd64.tar.gz

# Extract
tar -xzf sealos_5.1.0-rc3_linux_amd64.tar.gz

# Install sealos to system path
sudo cp sealos /usr/local/bin/
sudo chmod +x /usr/local/bin/sealos

# Extract image-cri-shim from sealos package
sudo cp image-cri-shim /usr/local/bin/
sudo chmod +x /usr/local/bin/image-cri-shim

# Verify installation
image-cri-shim --version
```

#### Step 2: Create Basic Configuration File

```bash
# Create configuration file (required)
# image-cri-shim will automatically load this configuration file on startup
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

### 2.3 systemd Service Configuration

Create systemd service file:

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

# User and permissions
User=root
Group=root

# Environment variables
Environment=KUBECONFIG=/etc/kubernetes/admin.conf

# Resource limits
LimitNOFILE=1048576
LimitNPROC=infinity

# Log configuration
StandardOutput=journal
StandardError=journal
SyslogIdentifier=image-cri-shim

[Install]
WantedBy=multi-user.target
EOF
```

Reload systemd and enable service:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (auto-start on boot)
sudo systemctl enable image-cri-shim

# Start service
sudo systemctl start image-cri-shim
```

### 2.4 Verify Deployment

```bash
# Check service status
sudo systemctl status image-cri-shim

# Check socket file
ls -la /var/run/image-cri-shim.sock

# View startup logs
sudo journalctl -u image-cri-shim --no-pager

# Verify CRI connection
sudo /usr/local/bin/image-cri-shim --file=/etc/image-cri-shim/config.yaml --dry-run
```

## 3. Configuration Management

### 3.1 Local Configuration File

**Configuration File Location**: `/etc/image-cri-shim/config.yaml` **(Required File)**

**Important**: image-cri-shim will automatically load this configuration file on startup. If the file does not exist, the service will fail to start.

**Complete Configuration Example**:

```yaml
# Shim service configuration
shim: /var/run/image-cri-shim.sock          # Shim socket path
cri: /run/containerd/containerd.sock        # CRI runtime socket

# Primary registry configuration
address: https://registry.company.com       # Primary registry address
auth: registry-user:registry-password       # Primary registry authentication

# Additional registry list
registries:
- address: https://backup-registry.company.com
  auth: backup-user:backup-pass
- address: https://public.registry.com
  auth: ""  # Public registry requires no authentication

# Service configuration
force: false                                # Force startup mode
debug: false                                # Debug mode
timeout: 15m                                # Operation timeout
reloadInterval: 30s                         # Configuration reload interval
cache:
  imageCacheSize: 1024                      # Max cached rewrite entries (set 0 to disable)
  imageCacheTTL: 30m                        # TTL for rewritten image entries
  domainCacheTTL: 10m                       # TTL for domain→registry matches
  statsLogInterval: 60s                     # Periodic cache stats log (set 0 to stop)
  disableStats: false                       # true disables stats logging entirely
```

### 3.2 ConfigMap Dynamic Configuration

**v5.1.0-rc3+ core feature**: Supports dynamic configuration updates via Kubernetes ConfigMap

#### Create ConfigMap

```bash
# Create ConfigMap configuration file
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
    cache:
      imageCacheSize: 2048
      imageCacheTTL: "45m"
      domainCacheTTL: "15m"
      statsLogInterval: "120s"
      disableStats: false
EOF

# Apply to cluster
kubectl apply -f image-cri-shim-configmap.yaml
```

### 3.3 Configuration Synchronization Mechanism

**Working Principle**:

1. **Startup Synchronization**: Automatically attempts to read configuration from ConfigMap on service startup
2. **Periodic Synchronization**: Periodically checks ConfigMap updates based on `reloadInterval` configuration
3. **Configuration Merging**: Intelligently merges ConfigMap configuration with local configuration
4. **Hot Reload**: Configuration changes are automatically applied to the running service

**Synchronization Logic**:
```go
// Based on configmap_sync.go logic
func SyncConfigFromConfigMap(ctx context.Context, configPath string) {
    // 1. Create Kubernetes client
    client, err := kubeClientFactory()

    // 2. Read ConfigMap
    cm, err := client.CoreV1().ConfigMaps("kube-system").Get(ctx, "image-cri-shim", metav1.GetOptions{})

    // 3. Parse configuration and merge to local file
    if !applyConfigMapToFile(configPath, cm) {
        logger.Debug("ConfigMap produced no updates")
        return
    }

    // 4. Configuration updated, wait for next reload cycle to take effect
    logger.Info("syncing image-cri-shim config from ConfigMap completed")
}
```

### 3.4 Configuration Update Verification

```bash
# 1. Update ConfigMap
kubectl edit configmap image-cri-shim -n kube-system

# 2. Wait for configuration synchronization (default 30-60 seconds)
sleep 60

# 3. Check if local configuration file is updated
sudo cat /etc/image-cri-shim/config.yaml

# 4. View service logs to confirm reload
sudo journalctl -u image-cri-shim --since="2m ago" | grep -i "reload\|config"

# 5. Verify if configuration is effective
sudo systemctl status image-cri-shim
```

### 3.5 Cache Configuration & Hot Reload

`cache` is a dedicated block used to tune the in-process LRU cache. All fields support ConfigMap hot updates and are applied without restarting the shim:

| Field | Description | Default |
|-------|-------------|---------|
| `imageCacheSize` | Max number of rewritten image entries. Set `0` to disable caching completely. | `1024` |
| `imageCacheTTL` | Time-To-Live for rewritten image entries (e.g. `30m`, `1h`). | `30m` |
| `domainCacheTTL` | TTL for domain→registry matches. Keeps expensive lookups fast. | `10m` |
| `statsLogInterval` | Periodic interval for logging cache hit/miss metrics. Set `0` to stop logging. | `60s` |
| `disableStats` | When `true`, disables metric logging regardless of `statsLogInterval`. | `false` |

**Hot update steps**:

```bash
# 1. Edit the ConfigMap and update the cache block
kubectl edit configmap image-cri-shim -n kube-system

# Example change
cache:
  imageCacheSize: 2048
  imageCacheTTL: 45m
  domainCacheTTL: 15m
  statsLogInterval: 120s
  disableStats: false

# 2. Wait for the reload interval (default 30s) or force sooner by patching reloadInterval
sleep 40

# 3. Confirm new settings are in use (logs contain cache stats / rewrite entries)
sudo journalctl -u image-cri-shim --since="1m ago" | grep "cache"
```

When the ConfigMap is updated, the shim automatically calls `UpdateCache` with the new values. Existing cache entries are invalidated as needed, and metric logging switches to the new cadence immediately (or stops if `disableStats: true`). This makes it safe to experiment with cache sizes/TTLs during live traffic without restarting kubelet or containerd.

## 4. Core Functionality Usage

### 4.1 Image Name Processing

**Workflow**:

```
kubelet image request
    ↓
image-cri-shim intercepts
    ↓
Image name recognition and transformation
    ↓
Select target registry based on configuration
    ↓
Add authentication information
    ↓
Forward to containerd
    ↓
containerd pulls image
```

**Example Scenario**:
```bash
# kubelet request: nginx:latest
# image-cri-shim processing:
# - Recognize image name: nginx:latest
# - Select registry based on configuration: https://registry.company.com
# - Add authentication: registry-user:registry-password
# - Transform to: registry.company.com/library/nginx:latest
# - Forward to containerd for processing
```

### 4.2 Multi-Registry Configuration

**Failover Mechanism**:
```yaml
# Configure multiple registries for failover
registries:
- address: https://primary-registry.company.com  # Primary registry
  auth: primary-user:primary-pass
- address: https://backup-registry.company.com   # Backup registry 1
  auth: backup-user:backup-pass
- address: https://third-registry.company.com    # Backup registry 2
  auth: third-user:third-pass
```

**Use Cases**:
- Automatically switch to backup registry when primary registry is unavailable
- Different projects use different dedicated registries
- Separate management of public and private images

### 4.3 Authentication Management

**Authentication Format**: `username:password`

**Multi-Authentication Configuration**:
```yaml
# Primary registry authentication
auth: main-user:main-password

# Independent authentication for each backup registry
registries:
- address: https://private-registry.company.com
  auth: private-user:private-password
- address: https://public-registry.company.com
  auth: ""  # No authentication required
```

**Dynamic Authentication Update**:
```bash
# Method 1: Update via ConfigMap
kubectl edit configmap image-cri-shim -n kube-system

# Method 2: Directly modify local configuration (temporary effect)
sudo vim /etc/image-cri-shim/config.yaml
sudo systemctl reload image-cri-shim
```

### 4.4 Failover

**Automatic Failover**:
- Automatically try backup registries when primary registry connection fails
- Try each registry in configuration order
- Return error when all registries are unavailable

**Failover Recovery**:
- Automatically switch back to primary registry when it recovers
- No manual intervention required, automatic availability detection

## 5. Operations Management

### 5.1 Service Status Check

```bash
# Check service running status
sudo systemctl status image-cri-shim

# Check process details
ps aux | grep image-cri-shim

# Check socket listening
sudo ss -tlnp | grep image-cri-shim

# Check resource usage
sudo systemctl status image-cri-shim --no-pager -l
```

### 5.2 Log Viewing and Analysis

```bash
# View real-time logs
sudo journalctl -u image-cri-shim -f

# View recent logs
sudo journalctl -u image-cri-shim --since="1 hour ago"

# Filter specific logs
sudo journalctl -u image-cri-shim | grep -i "error\|warn"

# View configuration synchronization related logs
sudo journalctl -u image-cri-shim | grep -i "config\|sync\|reload"

# Export logs to file
sudo journalctl -u image-cri-shim --since="today" > /tmp/image-cri-shim.log
```

### 5.3 Configuration Synchronization Monitoring

```bash
# Check ConfigMap status
kubectl get configmap image-cri-shim -n kube-system -o yaml

# Monitor configuration changes
kubectl get configmap image-cri-shim -n kube-system -w

# Check recent configuration synchronization
sudo journalctl -u image-cri-shim --since="10m" | grep -i "syncing"

# Verify local configuration file
sudo cat /etc/image-cri-shim/config.yaml
```

### 5.4 Common Issue Handling

**Issue 1: Service Startup Failure**

```bash
# Check configuration file syntax
sudo /usr/local/bin/image-cri-shim --file=/etc/image-cri-shim/config.yaml --dry-run

# Check containerd status
sudo systemctl status containerd

# Check socket permissions
sudo ls -la /run/containerd/containerd.sock

# View detailed error logs
sudo journalctl -u image-cri-shim --no-pager
```

**Issue 2: ConfigMap Synchronization Failure**

```bash
# Check Kubernetes connection
kubectl cluster-info

# Check RBAC permissions
kubectl auth can-i get configmaps --namespace=kube-system

# Check if ConfigMap exists
kubectl get configmap image-cri-shim -n kube-system

# Manually trigger synchronization
sudo systemctl reload image-cri-shim
```

**Issue 3: Image Pull Failure**

```bash
# Check authentication information
sudo cat /etc/image-cri-shim/config.yaml | grep -A 10 "auth\|registries"

# Test registry connection
curl -k -u username:password https://registry.company.com/v2/

# Check network connectivity
ping registry.company.com
telnet registry.company.com 443

# View image pull logs
sudo journalctl -u image-cri-shim | grep -i "pull\|image\|registry"
```

**Issue 4: Configuration Update Not Taking Effect**

```bash
# Check reload interval configuration
grep -i "reloadInterval" /etc/image-cri-shim/config.yaml

# Manually reload configuration
sudo systemctl reload image-cri-shim

# Force restart service (last resort)
sudo systemctl restart image-cri-shim

# Verify configuration file format
yamllint /etc/image-cri-shim/config.yaml
```

## 6. Configuration Examples

### 6.1 Basic Configuration

```yaml
# Single registry basic configuration
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

### 6.2 Multi-Registry Configuration

```yaml
# Production environment multi-registry configuration
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

### 6.3 High Availability Configuration

```yaml
# High availability production environment configuration
shim: /var/run/image-cri-shim.sock
cri: /run/containerd/containerd.sock
address: https://ha-registry.company.com
auth: ha-user:ha-pass
force: true
debug: false
timeout: 30m
reloadInterval: 30s
registries:
# Primary and backup registry configuration
- address: https://registry-region1.company.com
  auth: region1-user:region1-pass
- address: https://registry-region2.company.com
  auth: region2-user:region2-pass
- address: https://registry-region3.company.com
  auth: region3-user:region3-pass
# Public image sources
- address: https://mirror.gcr.io
  auth: ""
- address: https://registry.k8s.io
  auth: ""
```

## Summary

The new version of image-cri-shim significantly improves operational efficiency in production environments through dynamic configuration loading:

### Core Advantages

1. **Binary Deployment**: Lightweight deployment with excellent performance
2. **Dynamic Configuration**: Supports ConfigMap hot updates without restart
3. **High Availability**: Multi-registry failover ensures service continuity
4. **Operations Friendly**: Detailed logs and monitoring for easy troubleshooting

### Best Practices

1. **Sequential Deployment**: Ensure containerd → image-cri-shim → kubelet startup order
2. **Use ConfigMap**: Recommend using ConfigMap for configuration management for easy dynamic updates
3. **Monitor Logs**: Regularly check service logs to detect and resolve issues promptly
4. **Test Failover**: Regularly test registry failover mechanisms

This design is particularly suitable for large-scale production environment Kubernetes cluster image management needs, greatly simplifying operational complexity through dynamic configuration features.
