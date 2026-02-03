# Helm Values 自定义配置指南

本文档介绍如何通过 `HELM_OPTIONS` 环境变量传递 Helm `--set` 参数来自定义 Desktop Frontend 的所有配置项。

## 配置方式

### 方式 1: 通过 `HELM_OPTIONS` 使用 `--set` 参数

```bash
sealos run desktop-frontend:latest \
  -e HELM_OPTIONS="--set desktopConfig.cloudDomain=cloud.example.com --set desktopConfig.layoutTitle=\"My Cloud Platform\""
```

### 方式 2: 使用 `--set-string` 参数（用于确保值被当作字符串处理）

```bash
sealos run desktop-frontend:latest \
  -e HELM_OPTIONS="--set-string desktopConfig.realNameReward=0"
```

### 方式 3: 结合环境变量使用

环境变量优先级高于 `HELM_OPTIONS` 中的 `--set` 参数：

```bash
# 环境变量会覆盖 HELM_OPTIONS 中的值
sealos run desktop-frontend:latest \
  -e HELM_OPTIONS="--set desktopConfig.cloudDomain=from-helm.com" \
  -e CLOUD_DOMAIN=from-env.com  # 这个值会生效
```

## 配置项分类

### 1. 基础云配置

```yaml
desktopConfig:
  cloudDomain: "cloud.example.com"          # 云域名
  cloudPort: ""                              # 云端口（默认 443）
  regionUID: "region-123"                    # 区域 UID
  certSecretName: "wildcard-cert"            # TLS 证书 Secret 名称
```

### 2. 数据库配置

```yaml
desktopConfig:
  databaseMongodbURI: "mongodb://user:pass@mongodb:27017"
  databaseGlobalCockroachdbURI: "postgres://user:pass@cockroachdb:26257"
  databaseLocalCockroachdbURI: "postgres://user:pass@cockroachdb-local:26257"
```

### 3. 认证配置

```yaml
desktopConfig:
  passwordSalt: "your-random-salt"           # 密码哈希盐
  jwtInternal: "your-jwt-internal-key"       # 内部 JWT 密钥
  jwtRegional: "your-jwt-regional-key"       # 区域 JWT 密钥
  jwtGlobal: "your-jwt-global-key"           # 全局 JWT 密钥
```

### 4. 计费配置

```yaml
desktopConfig:
  billingUrl: "http://account-service.account-system.svc:2333"
  billingToken: "your-billing-token"
```

### 5. 货币和语言配置

```yaml
desktopConfig:
  version: "en"                               # UI 版本: "cn" (中文) 或 "en" (英文)
  forcedLanguage: "en"                        # 界面语言: "zh" (中文) 或 "en" (英文)
  currencySymbol: "usd"                       # 货币符号: "usd" 或 "shellCoin"
```

### 6. Google Tag Manager

```yaml
desktopConfig:
  gtmId: "GTM-XXXXXXXX"                       # GTM ID
```

### 7. Discord 配置

```yaml
desktopConfig:
  discordInviteLink: "https://discord.gg/sealos"
```

### 8. 功能开关

```yaml
desktopConfig:
  guideEnabled: false                         # 启用用户引导
  apiEnabled: false                           # 启用 API 访问
  rechargeEnabled: false                      # 启用充值功能
  enterpriseRealNameAuthEnabled: false        # 启用企业实名认证
  trackingEnabled: false                      # 启用追踪/统计
  realNameAuthEnabled: false                  # 启用实名认证
  licenseCheckEnabled: false                  # 启用 License 检查
```

### 9. Common URLs 配置

```yaml
desktopConfig:
  realNameReward: 0
  realNameCallbackUrl: "https://cloud.example.org/api/account/callback"
  templateUrl: "https://template.example.org"
  applaunchpadUrl: "https://applaunchpad.example.org"
  dbproviderUrl: "https://dbprovider.example.org"
  objectstorageUrl: "https://objectstorage.example.org"
  cfSiteKey: ""
```

### 10. 桌面布局配置

```yaml
desktopConfig:
  layoutTitle: "Sealos Cloud"                  # 平台标题
  layoutLogo: "/logo.svg"                      # Logo 路径
  layoutBackgroundImage: "/images/bg-light.svg" # 背景图片
  customerServiceURL: ""                       # 客服 URL
  layoutDocsUrl: "https://sealos.run/docs/Intro/" # 文档 URL
```

### 11. Meta 标签配置

```yaml
desktopConfig:
  metaTitle: "Sealos Cloud"
  metaDescription: "Sealos Cloud"
  metaKeywords: "Sealos Cloud"
```

### 12. GitHub OAuth 配置

```yaml
desktopConfig:
  githubEnabled: true
  githubClientId: "your-github-client-id"
  githubClientSecret: "your-github-client-secret"
  githubProxyAddress: ""                       # 代理地址（可选）
```

### 13. 微信 OAuth 配置

```yaml
desktopConfig:
  wechatEnabled: true
  wechatClientId: "your-wechat-app-id"
  wechatClientSecret: "your-wechat-app-secret"
  wechatProxyAddress: ""                       # 代理地址（可选）
```

### 14. Google OAuth 配置

```yaml
desktopConfig:
  googleEnabled: true
  googleClientId: "your-google-client-id.apps.googleusercontent.com"
  googleClientSecret: "your-google-client-secret"
  googleProxyAddress: ""                       # 代理地址（可选）
```

### 15. 通用 OAuth2 配置

```yaml
desktopConfig:
  oauth2Enabled: true
  oauth2CallbackUrl: "https://cloud.example.com/callback"
  oauth2ClientId: "your-oauth2-client-id"
  oauth2ClientSecret: "your-oauth2-client-secret"
  oauth2AuthUrl: "https://oauth2.example.com/oauth2/auth"
  oauth2TokenUrl: "https://oauth2.example.com/oauth2/token"
  oauth2UserInfoUrl: "https://oauth2.example.com/oauth2/userinfo"
  oauth2ProxyAddress: ""                       # 代理地址（可选）
```

### 16. 验证码配置（Cloudflare Turnstile）

```yaml
desktopConfig:
  turnstileEnabled: true
  turnstileSiteKey: "your-turnstile-site-key"
  turnstileSecretKey: "your-turnstile-secret-key"
```

### 17. 阿里云验证码配置

```yaml
desktopConfig:
  aliCaptchaEnabled: true
  aliCaptchaEndpoint: "https://captcha.aliyuncs.com"
  aliCaptchaSceneId: "your-scene-id"
  aliCaptchaPrefix: "your-prefix"
  aliCaptchaAccessKeyID: "your-access-key-id"
  aliCaptchaAccessKeySecret: "your-access-key-secret"
```

### 18. 短信配置（阿里云）

```yaml
desktopConfig:
  smsEnabled: true
  smsAliEnabled: true
  smsAliEndpoint: "https://dysmsapi.aliyuncs.com"
  smsAliTemplateCode: "SMS_123456789"
  smsAliSignName: "YourSignName"
  smsAliAccessKeyID: "your-access-key-id"
  smsAliAccessKeySecret: "your-access-key-secret"
```

### 19. 邮件配置

```yaml
desktopConfig:
  emailEnabled: true
  emailHost: "smtp.example.com"
  emailPort: 587
  emailUser: "noreply@example.com"
  emailPassword: "your-email-password"
  emailLanguage: "en"
```

### 20. 追踪配置（Umami）

```yaml
desktopConfig:
  trackingWebsiteId: "your-website-id"
  trackingHostUrl: "https://umami.example.com"
  trackingScriptUrl: "https://umami.example.com/script.js"
```

### 21. 实名认证 OSS 配置

```yaml
desktopConfig:
  realNameOSSAccessKey: "your-oss-access-key"
  realNameOSSAccessKeySecret: "your-oss-secret-key"
  realNameOSSEndpoint: "oss-cn-hangzhou.aliyuncs.com"
  realNameOSSSSL: true
  realNameOSSPort: 443
  realNameOSSRealNameBucket: "realname-bucket"
  realNameOSSEnterpriseRealNameBucket: "enterprise-realname-bucket"
```

### 22. 工作订单和云虚拟机配置

```yaml
desktopConfig:
  workorderUrl: "https://workorder.example.com"
  cloudVirtualMachineUrl: "https://cloudvirtualmachine.example.com"
```

### 23. 团队管理配置

```yaml
desktopConfig:
  maxTeamCount: 10                             # 最大团队数
  maxTeamMemberCount: 100                      # 每个团队最大成员数
```

## 使用示例

### 示例 1: 自定义域名和标题

```bash
sealos run desktop-frontend:latest \
  -e HELM_OPTIONS="--set desktopConfig.cloudDomain=mycloud.com --set desktopConfig.layoutTitle=\"My Cloud Platform\" --set desktopConfig.metaTitle=\"My Cloud Platform\" --set desktopConfig.metaDescription=\"Welcome to My Cloud Platform\""
```

### 示例 2: 启用 GitHub 和 Google 登录

```bash
sealos run desktop-frontend:latest \
  -e HELM_OPTIONS="--set desktopConfig.githubEnabled=true --set desktopConfig.githubClientId=your-github-id --set desktopConfig.githubClientSecret=your-github-secret --set desktopConfig.googleEnabled=true --set desktopConfig.googleClientId=your-google-id --set desktopConfig.googleClientSecret=your-google-secret"
```

### 示例 3: 配置短信和邮件

```bash
sealos run desktop-frontend:latest \
  -e HELM_OPTIONS="--set desktopConfig.smsEnabled=true --set desktopConfig.smsAliEnabled=true --set desktopConfig.smsAliEndpoint=https://dysmsapi.aliyuncs.com --set desktopConfig.smsAliAccessKeyID=your-key-id --set desktopConfig.smsAliAccessKeySecret=your-key-secret --set desktopConfig.emailEnabled=true --set desktopConfig.emailHost=smtp.example.com --set desktopConfig.emailPort=587 --set desktopConfig.emailUser=noreply@example.com --set desktopConfig.emailPassword=your-password"
```

### 示例 4: 完整生产环境配置

对于生产环境的多个配置，直接通过 `HELM_OPTIONS` 传递所有 Helm values：

```bash
sealos run desktop-frontend:latest \
  -e HELM_OPTIONS="
    --set desktopConfig.cloudDomain=production.example.com
    --set desktopConfig.regionUID=prod-region-001
    --set desktopConfig.version=cn
    --set desktopConfig.forcedLanguage=zh
    --set desktopConfig.currencySymbol=shellCoin
    --set desktopConfig.githubEnabled=true
    --set desktopConfig.githubClientId=prod-github-id
    --set desktopConfig.githubClientSecret=prod-github-secret
    --set desktopConfig.smsEnabled=true
    --set desktopConfig.smsAliEnabled=true
    --set desktopConfig.smsAliAccessKeyID=prod-sms-key-id
    --set desktopConfig.smsAliAccessKeySecret=prod-sms-key-secret
    --set desktopConfig.emailEnabled=true
    --set desktopConfig.emailHost=smtp.production.example.com
    --set desktopConfig.emailPort=587
    --set desktopConfig.emailUser=noreply@production.example.com
    --set desktopConfig.emailPassword=prod-email-password
    --set desktopConfig.trackingEnabled=true
    --set desktopConfig.trackingWebsiteId=prod-website-id
  "
```

**提示**:
- 所有配置统一通过 `HELM_OPTIONS` 传递
- 对于超长配置，建议创建部署脚本

## 注意事项

1. **敏感信息**: 建议将敏感配置（如密钥、密码）通过环境变量传递，或存储在 Kubernetes Secret 中
2. **类型注意**: 布尔值使用 `true`/`false`，数字不需要引号，字符串建议使用引号
3. **嵌套配置**: 使用 `.` 分隔嵌套层级，如 `desktopConfig.githubClientId`
4. **数组索引**: 对于数组配置，使用 `[]` 索引，如 `ingress.hosts[0].host`
5. **字符串包含特殊字符**: 使用 `--set-string` 或反斜杠转义引号（如 `\"`）
6. **引号转义**: 在 `HELM_OPTIONS` 中，字符串包含引号时需要转义（如 `--set desktopConfig.layoutTitle=\"My Cloud\"`）
7. **配置管理**: 对于复杂部署，建议使用脚本或配置管理工具来管理参数

## 验证配置

部署后可以查看生成的 ConfigMap 验证配置：

```bash
kubectl get configmap sealos-desktop-config -n sealos -o yaml
```

或在 Pod 中查看实际配置：

```bash
kubectl exec -n sealos deployment/sealos-desktop -- cat /app/data/config.yaml
```
