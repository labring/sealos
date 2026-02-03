# Desktop 前端 Helm Chart

Sealos Desktop 前端使用 Helm Chart 部署，支持自动配置。

## 快速开始

### 基础用法（自动配置）

```bash
# 默认部署（从 sealos-system/sealos-config 自动配置）
sealos run desktop-frontend:latest

# 自定义域名
sealos run desktop-frontend:latest -e CLOUD_DOMAIN=cloud.example.com

# 中文版本 + GitHub 登录
sealos run desktop-frontend:latest \
  -e HELM_OPTIONS="--set desktopConfig.version=cn --set desktopConfig.forcedLanguage=zh --set desktopConfig.currencySymbol=shellCoin --set desktopConfig.githubEnabled=true --set desktopConfig.githubClientId=xxx --set desktopConfig.githubClientSecret=yyy"

# 英文版本 + Google 登录 + GTM
sealos run desktop-frontend:latest \
  -e HELM_OPTIONS="--set desktopConfig.googleEnabled=true --set desktopConfig.googleClientId=xxx --set desktopConfig.googleClientSecret=yyy --set desktopConfig.gtmId=GTM-XXX"
```

## 环境变量

### Google Tag Manager

| 变量 | 默认值 | 描述 |
|----------|---------|-------------|
| `GTM_ID` | `""` | Google Tag Manager ID |

### 功能开关

| 变量 | 默认值 | 描述 |
|----------|---------|-------------|
| `GUIDE_ENABLED` | `false` | 启用用户引导 |
| `API_ENABLED` | `false` | 启用 API 访问 |
| `RECHARGE_ENABLED` | `false` | 启用充值功能 |
| `ENTERPRISE_REAL_NAME_AUTH_ENABLED` | `false` | 启用企业实名认证 |
| `TRACKING_ENABLED` | `false` | 启用追踪/统计 |
| `REAL_NAME_AUTH_ENABLED` | `false` | 启用实名认证 |
| `LICENSE_CHECK_ENABLED` | `false` | 启用 License 检查 |

### OAuth 提供商

#### GitHub OAuth

| 变量 | 默认值 | 描述 |
|----------|---------|-------------|
| `GITHUB_ENABLED` | `false` | 启用 GitHub OAuth |
| `GITHUB_CLIENT_ID` | `""` | GitHub OAuth 客户端 ID |
| `GITHUB_CLIENT_SECRET` | `""` | GitHub OAuth 客户端密钥 |

#### 微信 OAuth

| 变量 | 默认值 | 描述 |
|----------|---------|-------------|
| `WECHAT_ENABLED` | `false` | 启用微信 OAuth |
| `WECHAT_CLIENT_ID` | `""` | 微信 OAuth 客户端 ID |
| `WECHAT_CLIENT_SECRET` | `""` | 微信 OAuth 客户端密钥 |

#### Google OAuth

| 变量 | 默认值 | 描述 |
|----------|---------|-------------|
| `GOOGLE_ENABLED` | `false` | 启用 Google OAuth |
| `GOOGLE_CLIENT_ID` | `""` | Google OAuth 客户端 ID |
| `GOOGLE_CLIENT_SECRET` | `""` | Google OAuth 客户端密钥 |

#### 通用 OAuth2

| 变量 | 默认值 | 描述 |
|----------|---------|-------------|
| `OAUTH2_ENABLED` | `false` | 启用通用 OAuth2 |
| `OAUTH2_CALLBACK_URL` | `""` | OAuth2 回调 URL |
| `OAUTH2_CLIENT_ID` | `""` | OAuth2 客户端 ID |
| `OAUTH2_CLIENT_SECRET` | `""` | OAuth2 客户端密钥 |
| `OAUTH2_AUTH_URL` | `""` | OAuth2 授权 URL |
| `OAUTH2_TOKEN_URL` | `""` | OAuth2 令牌 URL |
| `OAUTH2_USER_INFO_URL` | `""` | OAuth2 用户信息 URL |

### 验证码配置

| 变量 | 默认值 | 描述 |
|----------|---------|-------------|
| `TURNSTILE_ENABLED` | `false` | 启用 Cloudflare Turnstile |
| `TURNSTILE_SITE_KEY` | `""` | Turnstile 站点密钥 |
| `TURNSTILE_SECRET_KEY` | `""` | Turnstile 密钥 |

### 自定义覆盖变量

| 变量 | 默认值 | 描述 |
|----------|---------|-------------|
| `CLOUD_DOMAIN` | `""` | 覆盖云域名（自动从 sealos-config 获取） |
| `CLOUD_PORT` | `""` | 覆盖云端口（自动从 sealos-config 获取） |
| `CERT_SECRET_NAME` | `wildcard-cert` | TLS 证书 Secret 名称 |
| `REGION_UID` | `""` | 覆盖区域 UID（自动从 sealos-config 获取） |
| `DATABASE_MONGODB_URI` | `""` | 覆盖 MongoDB URI（自动从 sealos-config 获取） |
| `DATABASE_GLOBAL_COCKROACHDB_URI` | `""` | 覆盖全局数据库 URI（自动从 sealos-config 获取） |
| `DATABASE_LOCAL_COCKROACHDB_URI` | `""` | 覆盖本地数据库 URI（自动从 sealos-config 获取） |
| `PASSWORD_SALT` | `""` | 覆盖密码盐（自动从 sealos-config 获取） |
| `JWT_INTERNAL` | `""` | 覆盖内部 JWT（自动从 sealos-config 获取） |
| `JWT_REGIONAL` | `""` | 覆盖区域 JWT（自动从 sealos-config 获取） |
| `JWT_GLOBAL` | `""` | 覆盖全局 JWT（自动从 sealos-config 获取） |

## 自动配置的值

以下值会**自动从 `sealos-system/sealos-config` ConfigMap 获取**，**无需手动配置**（除非需要覆盖）：

| ConfigMap 键 | 目标值 | 描述 |
|---------------|--------------|-------------|
| `cloudDomain` | `desktopConfig.cloudDomain` | 云域名 |
| `cloudPort` | `desktopConfig.cloudPort` | 云端口 |
| `jwtInternal` | `desktopConfig.jwtInternal` | 内部 JWT 密钥 |
| `jwtRegional` | `desktopConfig.jwtRegional` | 区域 JWT 密钥 |
| `jwtGlobal` | `desktopConfig.jwtGlobal` | 全局 JWT 密钥 |
| `regionUID` | `desktopConfig.regionUID` | 区域 UID |
| `databaseMongodbURI` | `desktopConfig.databaseMongodbURI` | MongoDB 连接 URI |
| `databaseGlobalCockroachdbURI` | `desktopConfig.databaseGlobalCockroachdbURI` | 全局 CockroachDB URI |
| `databaseLocalCockroachdbURI` | `desktopConfig.databaseLocalCockroachdbURI` | 本地 CockroachDB URI |
| `passwordSalt` | `desktopConfig.passwordSalt` | 密码哈希盐 |

## ConfigMap 结构

生成的 `sealos-desktop-config` ConfigMap 包含以下结构：

```yaml
cloud:
  domain: "cloud.example.com"
  port: ""
  regionUID: "randomRegionUID"
  certSecretName: "wildcard-cert"
  proxyDomain: "cloud.example.com"
  allowedOrigins:
    - "https://applaunchpad.cloud.example.com"
    - "https://dbprovider.cloud.example.com"
    - "https://costcenter.cloud.example.com"
    - "https://cronjob.cloud.example.com"
    - "https://objectstorage.cloud.example.com"
    - "https://template.cloud.example.com"
    - "https://terminal.cloud.example.com"
    - "https://kubepanel.cloud.example.com"
    - "https://license.cloud.example.com"
    - "https://devbox.cloud.example.com"
    - "https://aiproxy-web.cloud.example.com"
    - "https://aiproxy.cloud.example.com"
    - "https://sealaf-api.cloud.example.com"
    - "https://sealaf.cloud.example.com"

common:
  guideEnabled: false
  apiEnabled: false
  rechargeEnabled: false
  enterpriseRealNameAuthEnabled: false
  trackingEnabled: false
  realNameAuthEnabled: false
  licenseCheckEnabled: false
  realNameReward: 0
  realNameCallbackUrl: "https://cloud.example.org/api/account/faceIdRealNameAuthCallback"
  templateUrl: "https://template.example.org"
  applaunchpadUrl: "https://applaunchpad.example.org"
  dbproviderUrl: "https://dbprovider.example.org"
  objectstorageUrl: "https://objectstorage.example.org"
  cfSiteKey: ""

database:
  mongodbURI: "mongodb://..."
  globalCockroachdbURI: "postgres://..."
  regionalCockroachdbURI: "postgres://..."

desktop:
  layout:
    version: "en"
    title: "Sealos Cloud"
    logo: "/logo.svg"
    backgroundImage: "/images/bg-light.svg"
    forcedLanguage: "en"
    customerServiceURL: ""
    discordInviteLink: ""
    gtmId: null
    currencySymbol: "usd"
    meta:
      title: "Sealos Cloud"
      description: "Sealos Cloud"
      keywords: "Sealos Cloud"
      scripts: []
      noscripts: []
    common:
      githubStarEnabled: true
      accountSettingEnabled: true
      docsUrl: "https://sealos.run/docs/Intro/"
      aiAssistantEnabled: false
      bannerEnabled: false
      subscriptionEnabled: false
      guestModeEnabled: false
      emailAlertEnabled: false
      phoneAlertEnabled: false
      announcementEnabled: false
  auth:
    proxyAddress: ""
    callbackURL: "https://cloud.example.com/callback"
    signUpEnabled: true
    baiduToken: ""
    hasBaiduToken: false
    jwt:
      internal: "..."
      regional: "..."
      global: "..."
    idp:
      password:
        enabled: true
        salt: "..."
      github:
        enabled: false
        proxyAddress: ""
        clientID: ""
        clientSecret: ""
      wechat:
        enabled: false
        proxyAddress: ""
        clientID: ""
        clientSecret: ""
      google:
        enabled: false
        proxyAddress: ""
        clientID: ""
        clientSecret: ""
      oauth2:
        enabled: false
        callbackURL: ""
        clientID: ""
        proxyAddress: ""
        clientSecret: ""
        authURL: ""
        tokenURL: ""
        userInfoURL: ""
      sms:
        enabled: false
      email:
        enabled: false
    captcha:
      turnstile:
        enabled: false
        siteKey: ""
        secretKey: ""
    billingUrl: "http://account-service.account-system.svc:2333"
    billingToken: ""
  teamManagement:
    maxTeamCount: 0
    maxTeamMemberCount: 0

tracking:
  websiteId: ""
  hostUrl: ""
  scriptUrl: ""

realNameOSS:
  accessKey: ""
  accessKeySecret: ""
  endpoint: ""
  ssl: false
  port: 0
  realNameBucket: ""
  enterpriseRealNameBucket: ""
```

## Helm Chart 参数

| 参数 | 描述 | 默认值 |
|-----------|-------------|---------|
| `replicaCount` | 副本数 | `1` |
| `image` | 容器镜像 | `ghcr.io/labring/sealos-desktop-frontend:latest` |
| `imagePullPolicy` | 镜像拉取策略 | `IfNotPresent` |
| `fullnameOverride` | 覆盖完整资源名称 | `sealos-desktop` |
| `serviceAccount.create` | 创建服务账号 | `true` |
| `serviceAccount.name` | 服务账号名称 | `desktop-frontend` |
| `service.port` | 服务端口 | `3000` |
| `resources.requests.cpu` | CPU 请求 | `100m` |
| `resources.requests.memory` | 内存请求 | `128Mi` |
| `resources.limits.cpu` | CPU 限制 | `2000m` |
| `resources.limits.memory` | 内存限制 | `2048Mi` |
| `ingress.enabled` | 启用 Ingress | `true` |
| `ingress.className` | Ingress 类 | `nginx` |
| `autoConfigEnabled` | 从 sealos-config 自动配置 | `true` |

## 故障排查

### 检查部署状态

```bash
# 检查 helm 发布
helm status desktop-frontend -n sealos

# 检查 pods
kubectl get pods -n sealos -l app.kubernetes.io/name=desktop-frontend

# 检查 configmap
kubectl get configmap sealos-desktop-config -n sealos -o yaml

# 检查 ingress
kubectl get ingress sealos-desktop -n sealos

# 查看日志
kubectl logs -n sealos -l app.kubernetes.io/name=desktop-frontend --tail=100 -f
```

### 常见问题

**问题**: Ingress 返回 404 或 502
- **解决**: 检查 service 是否存在且端口正确：`kubectl get svc sealos-desktop -n sealos`

**问题**: Pod 处于 CrashLoopBackOff 状态
- **解决**: 查看日志，检查数据库连接错误或缺失的环境变量

**问题**: OAuth 回调失败
- **解决**: 验证配置中的 `callbackURL` 是否与 OAuth 应用设置匹配

**问题**: 现有资源阻止安装
- **解决**: 脚本会自动通过添加 Helm 标签来接纳现有资源

## 高级用法

### 使用 Helm Values 自定义配置

所有 config.yaml 设置都可以通过 `HELM_OPTIONS` 环境变量传递 Helm `--set` 参数来自定义。完整文档请参阅 [HELM_VALUES_GUIDE_CN.md](HELM_VALUES_GUIDE_CN.md)。

**快速示例：**

```bash
# UI 自定义通过 HELM_OPTIONS
sealos run desktop-frontend:latest \
  -e HELM_OPTIONS="--set desktopConfig.layoutTitle=\"我的云平台\" --set desktopConfig.metaTitle=\"我的云平台\""

# OAuth 提供商
sealos run desktop-frontend:latest \
  -e HELM_OPTIONS="--set desktopConfig.githubEnabled=true --set desktopConfig.githubClientId=your-client-id --set desktopConfig.githubClientSecret=your-client-secret"

# 功能和通讯配置
sealos run desktop-frontend:latest \
  -e HELM_OPTIONS="--set desktopConfig.guideEnabled=true --set desktopConfig.rechargeEnabled=true --set desktopConfig.smsEnabled=true --set desktopConfig.emailEnabled=true --set desktopConfig.emailHost=smtp.example.com --set desktopConfig.emailPort=587"

# 结合环境变量和 HELM_OPTIONS
sealos run desktop-frontend:latest \
  -e HELM_OPTIONS="--set desktopConfig.layoutTitle=\"我的云平台\"" \
  -e CLOUD_DOMAIN=override.example.com \
  -e GITHUB_ENABLED=true
```

**常用自定义选项：**

- **UI 自定义**: `layoutTitle`, `layoutLogo`, `metaTitle`, `metaDescription`, `customerServiceURL`
- **OAuth 提供商**: `githubEnabled`, `googleEnabled`, `wechatEnabled`, `oauth2Enabled` 及其对应的 `*ClientId`, `*ClientSecret`
- **功能开关**: `guideEnabled`, `rechargeEnabled`, `trackingEnabled`, `apiEnabled`, `realNameAuthEnabled`
- **通讯配置**: `smsEnabled`, `emailEnabled`, `emailHost`, `emailPort`, `emailUser`, `emailPassword`
- **URL 配置**: `templateUrl`, `applaunchpadUrl`, `dbproviderUrl`, `objectstorageUrl`, `workorderUrl`
- **数据库配置**: `databaseMongodbURI`, `databaseGlobalCockroachdbURI`, `databaseLocalCockroachdbURI`
- **团队管理**: `maxTeamCount`, `maxTeamMemberCount`

查看 23 个分类共 60+ 可配置参数，请参阅 [HELM_VALUES_GUIDE_CN.md](HELM_VALUES_GUIDE_CN.md)。

### 禁用自动配置

```bash
sealos run desktop-frontend:latest \
  -e AUTO_CONFIG_ENABLED=false \
  -e CLOUD_DOMAIN=cloud.example.com \
  -e DATABASE_MONGODB_URI=mongodb://...
```

### 自定义 Helm 选项

```bash
sealos run desktop-frontend:latest -e HELM_OPTIONS="--timeout 10m --install"
```

### 覆盖命名空间

```bash
sealos run desktop-frontend:latest -e RELEASE_NAMESPACE=my-namespace
```

## 构建镜像

```bash
sealos build -t docker.io/labring/sealos-cloud-desktop:latest -f Kubefile .
```

## 常见问题

### 1. 如何配置中文/英文版本？

**中文版本：**
```bash
sealos run desktop-frontend:latest \
  -e HELM_OPTIONS="--set desktopConfig.version=cn --set desktopConfig.forcedLanguage=zh --set desktopConfig.currencySymbol=shellCoin"
```

**英文版本：**
```bash
sealos run desktop-frontend:latest \
  -e HELM_OPTIONS="--set desktopConfig.version=en --set desktopConfig.forcedLanguage=en --set desktopConfig.currencySymbol=usd"
```

### 2. 如何启用第三方登录？

**方式 1: 使用环境变量（推荐）**
```bash
sealos run desktop-frontend:latest \
  -e GITHUB_ENABLED=true \
  -e GITHUB_CLIENT_ID=your-client-id \
  -e GITHUB_CLIENT_SECRET=your-client-secret
```

**方式 2: 使用 HELM_OPTIONS（推荐用于复杂配置）**
```bash
sealos run desktop-frontend:latest \
  -e HELM_OPTIONS="--set desktopConfig.githubEnabled=true --set desktopConfig.githubClientId=your-client-id --set desktopConfig.githubClientSecret=your-client-secret"
```

### 3. 如何更新配置？

**方式 1: 使用环境变量（推荐用于少量配置）**
```bash
sealos run desktop-frontend:latest -e CLOUD_DOMAIN=new.example.com
```

**方式 2: 使用 HELM_OPTIONS（推荐用于多个配置）**
```bash
sealos run desktop-frontend:latest \
  -e HELM_OPTIONS="--set desktopConfig.cloudDomain=new.example.com --set desktopConfig.layoutTitle=\"New Title\" --set desktopConfig.guideEnabled=true"
```

**方式 3: 直接编辑 ConfigMap**
```bash
kubectl edit configmap sealos-desktop-config -n sealos
kubectl rollout restart deployment sealos-desktop -n sealos
```

### 4. 配置文件在哪里？

配置存储在 `sealos-desktop-config` ConfigMap 中，挂载到 Pod 的 `/app/data/config.yaml`。

查看配置：
```bash
kubectl get configmap sealos-desktop-config -n sealos -o yaml
kubectl exec -n sealos deployment/sealos-desktop -- cat /app/data/config.yaml
```

### 5. 环境变量和 HELM_OPTIONS 的区别和优先级？

**使用场景：**
- **环境变量**: 少量配置、快速测试、常用配置项
- **HELM_OPTIONS**: 多个配置、生产部署、访问所有 60+ 参数

**优先级从高到低：**
1. 环境变量（如 `CLOUD_DOMAIN`）
2. HELM_OPTIONS 中的 `--set` 参数
3. values.yaml 默认值

**示例：**
```bash
# 环境变量会覆盖 HELM_OPTIONS 的值
sealos run desktop-frontend:latest \
  -e HELM_OPTIONS="--set desktopConfig.cloudDomain=from-helm.com" \
  -e CLOUD_DOMAIN=from-env.com  # 这个值会生效
```

## 技术支持

- 文档: https://sealos.run/docs/
- GitHub: https://github.com/labring/sealos
- 问题反馈: https://github.com/labring/sealos/issues
