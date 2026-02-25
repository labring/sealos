# Sealos 模块Helm模块配置管理

## 目的
主要解决模块部署后如何增量更新的问题，目前组件的helm改造已经基本确定但是还是无法解决修改配置的问题。

## 调整思路

主要核心思路就是拆分values，目前以desktop为例。主要是依赖使用helm的覆盖values的方案

当前的values.yaml是

```yaml
replicaCount: 1

image: ghcr.io/labring/sealos-desktop-frontend:latest
imagePullPolicy: IfNotPresent

imagePullSecrets: []
nameOverride: ""
fullnameOverride: "sealos-desktop"

serviceAccount:
  create: true
  automount: true
  annotations: {}
  name: "desktop-frontend"

podAnnotations: {}
podLabels: {}

podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1001

securityContext:
  allowPrivilegeEscalation: false
  runAsNonRoot: true

service:
  port: 3000

resources:
  limits:
    cpu: 2000m
    memory: 2048Mi
  requests:
    cpu: 100m
    memory: 128Mi

# Desktop frontend configuration
desktopConfig:
  # Basic cloud configuration
  cloudDomain: "127.0.0.1.nip.io"
  cloudPort: ""
  regionUID: "randomRegionUID"
  certSecretName: "wildcard-cert"

  # Database connections
  databaseMongodbURI: ""
  databaseGlobalCockroachdbURI: ""
  databaseLocalCockroachdbURI: ""

  # Authentication secrets
  passwordSalt: "randomSalt"
  jwtInternal: ""
  jwtRegional: ""
  jwtGlobal: ""

  # Billing configuration
  billingUrl: "http://account-service.account-system.svc:2333"
  billingToken: ""

  # Currency and language configuration
  # Options: "cn" (Chinese) or "en" (English)
  # forcedLanguage and currencySymbol will be auto-configured based on version:
  # - version: "cn" → forcedLanguage: "zh", currencySymbol: "shellCoin"
  # - version: "en" → forcedLanguage: "en", currencySymbol: "usd"
  version: "en"

  # Google Tag Manager
  gtmId: ""

  # Discord invite link (USD version only)
  discordInviteLink: ""

  # Feature flags
  guideEnabled: false
  apiEnabled: false
  rechargeEnabled: false
  enterpriseRealNameAuthEnabled: false
  trackingEnabled: false
  realNameAuthEnabled: false
  licenseCheckEnabled: false

  # Common URLs (default values)
  realNameReward: 0
  realNameCallbackUrl: "https://cloud.example.org/api/account/faceIdRealNameAuthCallback"
  templateUrl: "https://template.example.org"
  applaunchpadUrl: "https://applaunchpad.example.org"
  dbproviderUrl: "https://dbprovider.example.org"
  objectstorageUrl: "https://objectstorage.example.org"
  cfSiteKey: ""

  # Desktop layout configuration
  layoutTitle: "Sealos Cloud"
  layoutLogo: "/logo.svg"
  layoutBackgroundImage: "/images/bg-light.svg"
  customerServiceURL: ""
  layoutDocsUrl: "https://sealos.run/docs/Intro/"

  # Meta tags
  metaTitle: "Sealos Cloud"
  metaDescription: "Sealos Cloud"
  metaKeywords: "Sealos Cloud"

  # OAuth providers
  githubEnabled: false
  githubClientId: ""
  githubClientSecret: ""
  githubProxyAddress: ""

  wechatEnabled: false
  wechatClientId: ""
  wechatClientSecret: ""
  wechatProxyAddress: ""

  googleEnabled: false
  googleClientId: ""
  googleClientSecret: ""
  googleProxyAddress: ""

  oauth2Enabled: false
  oauth2CallbackUrl: ""
  oauth2ClientId: ""
  oauth2ClientSecret: ""
  oauth2AuthUrl: ""
  oauth2TokenUrl: ""
  oauth2UserInfoUrl: ""
  oauth2ProxyAddress: ""

  # Captcha configuration
  turnstileEnabled: false
  turnstileSiteKey: ""
  turnstileSecretKey: ""

  # SMS configuration (Aliyun)
  smsEnabled: false
  smsAliEnabled: false
  smsAliEndpoint: ""
  smsAliTemplateCode: ""
  smsAliSignName: ""
  smsAliAccessKeyID: ""
  smsAliAccessKeySecret: ""

  # Email configuration
  emailEnabled: false
  emailHost: ""
  emailPort: 0
  emailUser: ""
  emailPassword: ""
  emailLanguage: ""

  # Ali captcha configuration
  aliCaptchaEnabled: false
  aliCaptchaEndpoint: ""
  aliCaptchaSceneId: ""
  aliCaptchaPrefix: ""
  aliCaptchaAccessKeyID: ""
  aliCaptchaAccessKeySecret: ""

  # Tracking configuration
  trackingWebsiteId: ""
  trackingHostUrl: ""
  trackingScriptUrl: ""

  # RealName OSS configuration
  realNameOSSAccessKey: ""
  realNameOSSAccessKeySecret: ""
  realNameOSSEndpoint: ""
  realNameOSSSSL: false
  realNameOSSPort: 0
  realNameOSSRealNameBucket: ""
  realNameOSSEnterpriseRealNameBucket: ""

  # Workorder and cloud virtual machine URLs
  workorderUrl: ""
  cloudVirtualMachineUrl: "https://cloudvirtualmachine.example.org"

  # Team management
  maxTeamCount: 0
  maxTeamMemberCount: 0

# Auto configure from sealos-system configmap
autoConfigEnabled: true

livenessProbe:
  httpGet:
    path: /api/platform/getAppConfig
    port: 3000
  initialDelaySeconds: 15
  periodSeconds: 20

readinessProbe:
  httpGet:
    path: /api/platform/getAppConfig
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 3
  timeoutSeconds: 2
  successThreshold: 3
  failureThreshold: 3

# Ingress configuration
ingress:
  enabled: true
  className: "nginx"
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
  # Will be auto-configured from desktopConfig.cloudDomain
  hosts: []
  tls: []

nodeSelector: {}

tolerations: []

affinity: {}

```

拆分后可以变成

values.yaml
```yaml
image: ghcr.io/labring/sealos-desktop-frontend:latest
imagePullPolicy: IfNotPresent

imagePullSecrets: []
nameOverride: ""
fullnameOverride: "sealos-desktop"

serviceAccount:
  create: true
  automount: true
  annotations: {}
  name: "desktop-frontend"

podAnnotations: {}
podLabels: {}

podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1001

securityContext:
  allowPrivilegeEscalation: false
  runAsNonRoot: true

service:
  port: 3000


# Desktop frontend configuration
desktopConfig:
  # Basic cloud configuration
  cloudDomain: "127.0.0.1.nip.io"
  cloudPort: ""
  regionUID: "randomRegionUID"
  certSecretName: "wildcard-cert"

  # Database connections
  databaseMongodbURI: ""
  databaseGlobalCockroachdbURI: ""
  databaseLocalCockroachdbURI: ""

  # Authentication secrets
  passwordSalt: "randomSalt"
  jwtInternal: ""
  jwtRegional: ""
  jwtGlobal: ""

  # Billing configuration
  billingUrl: "http://account-service.account-system.svc:2333"
  billingToken: ""

# Auto configure from sealos-system configmap
autoConfigEnabled: true

# Ingress configuration
ingress:
  enabled: true
  className: "nginx"
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
  # Will be auto-configured from desktopConfig.cloudDomain
  hosts: []
  tls: []

```
desktop-values.yaml
```yaml
replicaCount: 1

resources:
  limits:
    cpu: 2000m
    memory: 2048Mi
  requests:
    cpu: 100m
    memory: 128Mi

# Desktop frontend configuration
desktopConfig:
  # Currency and language configuration
  # Options: "cn" (Chinese) or "en" (English)
  # forcedLanguage and currencySymbol will be auto-configured based on version:
  # - version: "cn" → forcedLanguage: "zh", currencySymbol: "shellCoin"
  # - version: "en" → forcedLanguage: "en", currencySymbol: "usd"
  version: "en"

  # Google Tag Manager
  gtmId: ""

  # Discord invite link (USD version only)
  discordInviteLink: ""

  # Feature flags
  guideEnabled: false
  apiEnabled: false
  rechargeEnabled: false
  enterpriseRealNameAuthEnabled: false
  trackingEnabled: false
  realNameAuthEnabled: false
  licenseCheckEnabled: false

  # Common URLs (default values)
  realNameReward: 0
  realNameCallbackUrl: "https://cloud.example.org/api/account/faceIdRealNameAuthCallback"
  templateUrl: "https://template.example.org"
  applaunchpadUrl: "https://applaunchpad.example.org"
  dbproviderUrl: "https://dbprovider.example.org"
  objectstorageUrl: "https://objectstorage.example.org"
  cfSiteKey: ""

  # Desktop layout configuration
  layoutTitle: "Sealos Cloud"
  layoutLogo: "/logo.svg"
  layoutBackgroundImage: "/images/bg-light.svg"
  customerServiceURL: ""
  layoutDocsUrl: "https://sealos.run/docs/Intro/"

  # Meta tags
  metaTitle: "Sealos Cloud"
  metaDescription: "Sealos Cloud"
  metaKeywords: "Sealos Cloud"

  # OAuth providers
  githubEnabled: false
  githubClientId: ""
  githubClientSecret: ""
  githubProxyAddress: ""

  wechatEnabled: false
  wechatClientId: ""
  wechatClientSecret: ""
  wechatProxyAddress: ""

  googleEnabled: false
  googleClientId: ""
  googleClientSecret: ""
  googleProxyAddress: ""

  oauth2Enabled: false
  oauth2CallbackUrl: ""
  oauth2ClientId: ""
  oauth2ClientSecret: ""
  oauth2AuthUrl: ""
  oauth2TokenUrl: ""
  oauth2UserInfoUrl: ""
  oauth2ProxyAddress: ""

  # Captcha configuration
  turnstileEnabled: false
  turnstileSiteKey: ""
  turnstileSecretKey: ""

  # SMS configuration (Aliyun)
  smsEnabled: false
  smsAliEnabled: false
  smsAliEndpoint: ""
  smsAliTemplateCode: ""
  smsAliSignName: ""
  smsAliAccessKeyID: ""
  smsAliAccessKeySecret: ""

  # Email configuration
  emailEnabled: false
  emailHost: ""
  emailPort: 0
  emailUser: ""
  emailPassword: ""
  emailLanguage: ""

  # Ali captcha configuration
  aliCaptchaEnabled: false
  aliCaptchaEndpoint: ""
  aliCaptchaSceneId: ""
  aliCaptchaPrefix: ""
  aliCaptchaAccessKeyID: ""
  aliCaptchaAccessKeySecret: ""

  # Tracking configuration
  trackingWebsiteId: ""
  trackingHostUrl: ""
  trackingScriptUrl: ""

  # RealName OSS configuration
  realNameOSSAccessKey: ""
  realNameOSSAccessKeySecret: ""
  realNameOSSEndpoint: ""
  realNameOSSSSL: false
  realNameOSSPort: 0
  realNameOSSRealNameBucket: ""
  realNameOSSEnterpriseRealNameBucket: ""

  # Workorder and cloud virtual machine URLs
  workorderUrl: ""
  cloudVirtualMachineUrl: "https://cloudvirtualmachine.example.org"

  # Team management
  maxTeamCount: 0
  maxTeamMemberCount: 0

livenessProbe:
  httpGet:
    path: /api/platform/getAppConfig
    port: 3000
  initialDelaySeconds: 15
  periodSeconds: 20

readinessProbe:
  httpGet:
    path: /api/platform/getAppConfig
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 3
  timeoutSeconds: 2
  successThreshold: 3
  failureThreshold: 3

nodeSelector: {}

tolerations: []

affinity: {}

```

## 脚本调整

在 desktop-frontend-entrypoint.sh

```shell
if [ ! -f "/root/.sealos/cloud/values/core/desktop-values.yaml" ]; then
  cp "./charts/desktop-frontend/desktop-values.yaml" "/root/.sealos/cloud/values/core/desktop-values.yaml"
fi
HELM_ARGS="$HELM_ARGS -f /root/.sealos/cloud/values/core/desktop-values.yaml"
```