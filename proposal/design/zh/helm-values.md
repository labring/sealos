# Sealos 模块 Helm Values 配置管理

## 目的

本文档用于解决模块部署后的增量配置更新问题。  
当前 Helm 改造已基本完成，但当所有配置都放在同一个 `values.yaml` 时，运行期配置修改仍不够友好。

## 问题

现有模型把“稳定配置”和“可变配置”混在同一份 `values.yaml` 中，带来以下问题：

- 用户覆盖配置在升级时不易保留。
- 运行期调优与 Chart 内部实现耦合过深。
- 增量变更时通常需要替换大段配置，风险和维护成本较高。

## 方案

### 核心思路

拆分 Helm values：

- `values.yaml`：承载稳定/低频变更配置。
- `desktop-values.yaml`：承载可变的业务与运行期配置，并持久化。

部署时通过 Helm 覆盖文件机制（`-f desktop-values.yaml`）叠加配置，实现增量更新。

## 示例：拆分前

原始 `values.yaml` 同时包含稳定参数与可变参数，例如：

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

desktopConfig:
  cloudDomain: "127.0.0.1.nip.io"
  cloudPort: ""
  regionUID: "randomRegionUID"
  certSecretName: "wildcard-cert"
  databaseMongodbURI: ""
  databaseGlobalCockroachdbURI: ""
  databaseLocalCockroachdbURI: ""
  passwordSalt: "randomSalt"
  jwtInternal: ""
  jwtRegional: ""
  jwtGlobal: ""
  billingUrl: "http://account-service.account-system.svc:2333"
  billingToken: ""
  version: "en"
  # ... 省略其余运行期与业务参数

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

ingress:
  enabled: true
  className: "nginx"
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
  hosts: []
  tls: []

nodeSelector: {}
tolerations: []
affinity: {}
```

## 示例：拆分后

### 1) 稳定配置：`values.yaml`

保留 Chart 级默认值与低频变更配置：

```yaml
replicaCount: 1

resources:
  limits:
    cpu: 2000m
    memory: 2048Mi
  requests:
    cpu: 100m
    memory: 128Mi

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

desktopConfig:
  cloudDomain: "127.0.0.1.nip.io"
  cloudPort: ""
  regionUID: "randomRegionUID"
  certSecretName: "wildcard-cert"
  databaseMongodbURI: ""
  databaseGlobalCockroachdbURI: ""
  databaseLocalCockroachdbURI: ""
  passwordSalt: "randomSalt"
  jwtInternal: ""
  jwtRegional: ""
  jwtGlobal: ""
  billingUrl: "http://account-service.account-system.svc:2333"
  billingToken: ""

autoConfigEnabled: true

ingress:
  enabled: true
  className: "nginx"
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
  hosts: []
  tls: []
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
```

### 2) 可变配置：`desktop-values.yaml`

保留资源规格、探针、UI/业务行为和第三方集成等高频变更配置：

```yaml
replicaCount: 1

resources:
  limits:
    cpu: 2000m
    memory: 2048Mi
  requests:
    cpu: 100m
    memory: 128Mi

desktopConfig:
  version: "en"
  gtmId: ""
  discordInviteLink: ""
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
  layoutTitle: "Sealos Cloud"
  layoutLogo: "/logo.svg"
  layoutBackgroundImage: "/images/bg-light.svg"
  customerServiceURL: ""
  layoutDocsUrl: "https://sealos.run/docs/Intro/"
  metaTitle: "Sealos Cloud"
  metaDescription: "Sealos Cloud"
  metaKeywords: "Sealos Cloud"
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
  turnstileEnabled: false
  turnstileSiteKey: ""
  turnstileSecretKey: ""
  smsEnabled: false
  smsAliEnabled: false
  smsAliEndpoint: ""
  smsAliTemplateCode: ""
  smsAliSignName: ""
  smsAliAccessKeyID: ""
  smsAliAccessKeySecret: ""
  emailEnabled: false
  emailHost: ""
  emailPort: 0
  emailUser: ""
  emailPassword: ""
  emailLanguage: ""
  aliCaptchaEnabled: false
  aliCaptchaEndpoint: ""
  aliCaptchaSceneId: ""
  aliCaptchaPrefix: ""
  aliCaptchaAccessKeyID: ""
  aliCaptchaAccessKeySecret: ""
  trackingWebsiteId: ""
  trackingHostUrl: ""
  trackingScriptUrl: ""
  realNameOSSAccessKey: ""
  realNameOSSAccessKeySecret: ""
  realNameOSSEndpoint: ""
  realNameOSSSSL: false
  realNameOSSPort: 0
  realNameOSSRealNameBucket: ""
  realNameOSSEnterpriseRealNameBucket: ""
  workorderUrl: ""
  cloudVirtualMachineUrl: "https://cloudvirtualmachine.example.org"
  maxTeamCount: 0
  maxTeamMemberCount: 0

nodeSelector: {}
tolerations: []
affinity: {}
```

## 脚本调整

在 `desktop-frontend-entrypoint.sh` 中，将可变配置持久化到 `/root/.sealos/cloud/values/core`，并始终作为 Helm 覆盖文件传入：

```sh
if [ ! -f "/root/.sealos/cloud/values/core/desktop-values.yaml" ]; then
  mkdir -p "/root/.sealos/cloud/values/core"
  cp "./charts/desktop-frontend/desktop-values.yaml" "/root/.sealos/cloud/values/core/desktop-values.yaml"
fi
HELM_ARGS="$HELM_ARGS -f /root/.sealos/cloud/values/core/desktop-values.yaml"
```

## 目录示例

```text
/root/.sealos/cloud/values/core/
								desktop-values.yaml
								costcenter-values.yaml
								license-values.yaml
								account-controller-values.yaml
								app-controller-values.yaml
								heartbeat-values.yaml
								initjob-values.yaml
								license-controller-values.yaml
								resources-controller-values.yaml
								user-controller-values.yaml
								account-service-values.yaml
```

只有前端使用 <name>-values.yaml, 其他模块的可变配置可以放在同一目录下，便于管理和维护。


## 结论

用户执行 `sealos run sealos:v5.2.0` 时，Sealos 会自动读取 `/root/.sealos/cloud/values/core/desktop-values.yaml`。  
该机制可保证可变配置在升级过程中的持久化与增量更新能力。
