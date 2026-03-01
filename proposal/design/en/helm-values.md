# Helm Values Management for Sealos Modules

## Purpose

This document proposes a way to support incremental configuration updates after a module is deployed.
The current Helm refactor solves most deployment concerns, but updating runtime configuration is still difficult when everything lives in one `values.yaml`.

## Problem

In the current model, immutable chart settings and mutable business/runtime settings are mixed in the same file.
As a result:

- User-level overrides are hard to preserve across upgrades.
- Runtime tuning is coupled with chart internals.
- Incremental updates rely on replacing large config blocks.

## Design

### Core Idea

Split Helm values into:

- `values.yaml`: stable or mostly immutable chart defaults.
- `desktop-values.yaml`: mutable runtime/business settings that should persist.

Helm then applies an overlay file (`-f desktop-values.yaml`) to support safe, incremental updates.

## Example: Before Split

The original `values.yaml` mixes immutable and mutable configuration:

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
  # ... many runtime and business-level settings omitted for brevity

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

## Example: After Split

### 1) Stable file: `values.yaml`

Keep chart-level defaults and settings that should rarely change:

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

### 2) Mutable file: `desktop-values.yaml`

Keep runtime, UI/business behavior, and resource tuning:

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

## Script Changes

In `desktop-frontend-entrypoint.sh`, persist mutable values into `/root/.sealos/cloud/values/core` and always pass them to Helm:

```sh
if [ ! -f "/root/.sealos/cloud/values/core/desktop-values.yaml" ]; then
  mkdir -p "/root/.sealos/cloud/values/core"
  cp "./charts/desktop-frontend/desktop-values.yaml" "/root/.sealos/cloud/values/core/desktop-values.yaml"
fi
HELM_ARGS="$HELM_ARGS -f /root/.sealos/cloud/values/core/desktop-values.yaml"
```

## Example Dir Structure

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
```

Only the front end uses <name>-values.yaml, and the variable configurations of other modules can be placed in the same directory for easy management and maintenance.

## Result

When users run `sealos run sealos:v5.2.0`, Sealos automatically reads `/root/.sealos/cloud/values/core/desktop-values.yaml`.
This enables safe and persistent incremental updates for mutable module configuration.
