# Desktop 前端 Helm Chart

Sealos Desktop 前端使用 Helm Chart 部署，支持自动配置。

## 快速开始

### 基础用法（自动配置）

```bash
# 默认部署（从 sealos-system/sealos-config 自动配置）
sealos run desktop-frontend:latest

# 自定义域名
sealos run desktop-frontend:latest -- CLOUD_DOMAIN=cloud.example.com

# 人民币版本 + GitHub 登录
sealos run desktop-frontend:latest -- CURRENCY=cny GITHUB_ENABLED=true GITHUB_CLIENT_ID=xxx GITHUB_CLIENT_SECRET=yyy

# 美元版本 + Google 登录 + GTM
sealos run desktop-frontend:latest -- CURRENCY=usd GOOGLE_ENABLED=true GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy GTM_ID=GTM-XXX
```

## 环境变量

### 货币与语言

| 变量 | 默认值 | 描述 |
|----------|---------|-------------|
| `CURRENCY` | `usd` | 货币类型：`cny` 或 `usd` |
| `GTM_ID` | `""` | Google Tag Manager ID（仅美元版本） |

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

## 货币自动配置

Chart 会根据 `CURRENCY` 环境变量自动配置版本、语言和货币符号：

| 货币 | 版本 | 语言 | 货币符号 |
|----------|---------|----------|-----------------|
| `cny` | `cn` | `zh` | `shellCoin` |
| `usd`（默认） | `en` | `en` | `usd` |

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

### 禁用自动配置

```bash
sealos run desktop-frontend:latest -- AUTO_CONFIG_ENABLED=false CLOUD_DOMAIN=cloud.example.com DATABASE_MONGODB_URI=mongodb://...
```

### 自定义 Helm 选项

```bash
HELM_OPTS="--timeout 10m --install" sealos run desktop-frontend:latest
```

### 覆盖命名空间

```bash
RELEASE_NAMESPACE=my-namespace sealos run desktop-frontend:latest
```

## 构建镜像

```bash
sealos build -t docker.io/labring/sealos-cloud-desktop:latest -f Kubefile .
```

## 常见问题

### 1. 如何更改货币类型？

设置 `CURRENCY` 环境变量为 `cny` 或 `usd`：

```bash
sealos run --env CURRENCY="cny" desktop-frontend:latest
```

### 2. 如何启用第三方登录？

设置对应的 OAuth 提供商环境变量，例如 GitHub：

```bash
sealos run \
  --env GITHUB_ENABLED="true" \
  --env GITHUB_CLIENT_ID="your-client-id" \
  --env GITHUB_CLIENT_SECRET="your-client-secret" \
  desktop-frontend:latest
```

### 3. 如何更新配置？

修改环境变量后重新运行 `sealos run`，或直接更新 ConfigMap：

```bash
kubectl edit configmap sealos-desktop-config -n sealos
kubectl rollout restart deployment sealos-desktop -n sealos
```

### 4. 配置文件在哪里？

配置存储在 `sealos-desktop-config` ConfigMap 中，挂载到 Pod 的 `/app/data/config.yaml`。

## 技术支持

- 文档: https://sealos.run/docs/
- GitHub: https://github.com/labring/sealos
- 问题反馈: https://github.com/labring/sealos/issues
