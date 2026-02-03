# Desktop Frontend Helm Chart

Sealos Desktop Frontend deployment using Helm charts with auto-configuration support.

## Quick Start

### Basic Usage (Auto-Configuration)

```bash
# Default deployment (auto-configured from sealos-system/sealos-config)
sealos run desktop-frontend:latest

# With custom domain
sealos run desktop-frontend:latest -- CLOUD_DOMAIN=cloud.example.com

# CNY version with GitHub OAuth
sealos run desktop-frontend:latest -- CURRENCY=cny GITHUB_ENABLED=true GITHUB_CLIENT_ID=xxx GITHUB_CLIENT_SECRET=yyy

# USD version with Google OAuth and GTM
sealos run desktop-frontend:latest -- CURRENCY=usd GOOGLE_ENABLED=true GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy GTM_ID=GTM-XXX
```

## Environment Variables

### Currency & Language

| Variable | Default | Description |
|----------|---------|-------------|
| `CURRENCY` | `usd` | Currency: `cny` or `usd` |
| `GTM_ID` | `""` | Google Tag Manager ID (USD version only) |

### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `GUIDE_ENABLED` | `false` | Enable user guide |
| `API_ENABLED` | `false` | Enable API access |
| `RECHARGE_ENABLED` | `false` | Enable recharge feature |
| `ENTERPRISE_REAL_NAME_AUTH_ENABLED` | `false` | Enable enterprise real-name authentication |
| `TRACKING_ENABLED` | `false` | Enable tracking/analytics |
| `REAL_NAME_AUTH_ENABLED` | `false` | Enable real-name authentication |
| `LICENSE_CHECK_ENABLED` | `false` | Enable license checking |

### OAuth Providers

#### GitHub OAuth

| Variable | Default | Description |
|----------|---------|-------------|
| `GITHUB_ENABLED` | `false` | Enable GitHub OAuth |
| `GITHUB_CLIENT_ID` | `""` | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | `""` | GitHub OAuth client secret |

#### WeChat OAuth

| Variable | Default | Description |
|----------|---------|-------------|
| `WECHAT_ENABLED` | `false` | Enable WeChat OAuth |
| `WECHAT_CLIENT_ID` | `""` | WeChat OAuth client ID |
| `WECHAT_CLIENT_SECRET` | `""` | WeChat OAuth client secret |

#### Google OAuth

| Variable | Default | Description |
|----------|---------|-------------|
| `GOOGLE_ENABLED` | `false` | Enable Google OAuth |
| `GOOGLE_CLIENT_ID` | `""` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | `""` | Google OAuth client secret |

#### Generic OAuth2

| Variable | Default | Description |
|----------|---------|-------------|
| `OAUTH2_ENABLED` | `false` | Enable generic OAuth2 |
| `OAUTH2_CALLBACK_URL` | `""` | OAuth2 callback URL |
| `OAUTH2_CLIENT_ID` | `""` | OAuth2 client ID |
| `OAUTH2_CLIENT_SECRET` | `""` | OAuth2 client secret |
| `OAUTH2_AUTH_URL` | `""` | OAuth2 authorization URL |
| `OAUTH2_TOKEN_URL` | `""` | OAuth2 token URL |
| `OAUTH2_USER_INFO_URL` | `""` | OAuth2 user info URL |

### Captcha Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `TURNSTILE_ENABLED` | `false` | Enable Cloudflare Turnstile |
| `TURNSTILE_SITE_KEY` | `""` | Turnstile site key |
| `TURNSTILE_SECRET_KEY` | `""` | Turnstile secret key |

### Custom Override Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLOUD_DOMAIN` | `""` | Override cloud domain (auto from sealos-config) |
| `CLOUD_PORT` | `""` | Override cloud port (auto from sealos-config) |
| `CERT_SECRET_NAME` | `wildcard-cert` | TLS certificate secret name |
| `REGION_UID` | `""` | Override region UID (auto from sealos-config) |
| `DATABASE_MONGODB_URI` | `""` | Override MongoDB URI (auto from sealos-config) |
| `DATABASE_GLOBAL_COCKROACHDB_URI` | `""` | Override global DB URI (auto from sealos-config) |
| `DATABASE_LOCAL_COCKROACHDB_URI` | `""` | Override local DB URI (auto from sealos-config) |
| `PASSWORD_SALT` | `""` | Override password salt (auto from sealos-config) |
| `JWT_INTERNAL` | `""` | Override internal JWT (auto from sealos-config) |
| `JWT_REGIONAL` | `""` | Override regional JWT (auto from sealos-config) |
| `JWT_GLOBAL` | `""` | Override global JWT (auto from sealos-config) |

## Auto-Configured Values

The following values are **automatically retrieved** from the `sealos-system/sealos-config` ConfigMap and **do not need manual configuration** unless you want to override them:

| ConfigMap Key | Target Value | Description |
|---------------|--------------|-------------|
| `cloudDomain` | `desktopConfig.cloudDomain` | Cloud domain |
| `cloudPort` | `desktopConfig.cloudPort` | Cloud port |
| `jwtInternal` | `desktopConfig.jwtInternal` | Internal JWT secret |
| `jwtRegional` | `desktopConfig.jwtRegional` | Regional JWT secret |
| `jwtGlobal` | `desktopConfig.jwtGlobal` | Global JWT secret |
| `regionUID` | `desktopConfig.regionUID` | Region UID |
| `databaseMongodbURI` | `desktopConfig.databaseMongodbURI` | MongoDB connection URI |
| `databaseGlobalCockroachdbURI` | `desktopConfig.databaseGlobalCockroachdbURI` | Global CockroachDB URI |
| `databaseLocalCockroachdbURI` | `desktopConfig.databaseLocalCockroachdbURI` | Local CockroachDB URI |
| `passwordSalt` | `desktopConfig.passwordSalt` | Password hash salt |

## Currency Auto-Configuration

The chart automatically configures version, language, and currency symbol based on the `CURRENCY` environment variable:

| Currency | Version | Language | Currency Symbol |
|----------|---------|----------|-----------------|
| `cny` | `cn` | `zh` | `shellCoin` |
| `usd` (default) | `en` | `en` | `usd` |

## ConfigMap Structure

The generated `sealos-desktop-config` ConfigMap contains the following structure:

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

## Helm Chart Values

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Deployment replica count | `1` |
| `image` | Container image | `ghcr.io/labring/sealos-desktop-frontend:latest` |
| `imagePullPolicy` | Image pull policy | `IfNotPresent` |
| `fullnameOverride` | Override full resource names | `sealos-desktop` |
| `serviceAccount.create` | Create service account | `true` |
| `serviceAccount.name` | Service account name | `desktop-frontend` |
| `service.port` | Service port | `3000` |
| `resources.requests.cpu` | CPU request | `100m` |
| `resources.requests.memory` | Memory request | `128Mi` |
| `resources.limits.cpu` | CPU limit | `2000m` |
| `resources.limits.memory` | Memory limit | `2048Mi` |
| `ingress.enabled` | Enable ingress | `true` |
| `ingress.className` | Ingress class | `nginx` |
| `autoConfigEnabled` | Auto-config from sealos-config | `true` |

## Troubleshooting

### Check Deployment Status

```bash
# Check helm release
helm status desktop-frontend -n sealos

# Check pods
kubectl get pods -n sealos -l app.kubernetes.io/name=desktop-frontend

# Check configmap
kubectl get configmap sealos-desktop-config -n sealos -o yaml

# Check ingress
kubectl get ingress sealos-desktop -n sealos

# Check logs
kubectl logs -n sealos -l app.kubernetes.io/name=desktop-frontend --tail=100 -f
```

### Common Issues

**Issue**: Ingress returns 404 or 502
- **Solution**: Check if service exists and port is correct: `kubectl get svc sealos-desktop -n sealos`

**Issue**: Pod CrashLoopBackOff
- **Solution**: Check logs for database connection errors or missing environment variables

**Issue**: OAuth callback fails
- **Solution**: Verify `callbackURL` in config matches your OAuth app settings

**Issue**: Existing resources prevent installation
- **Solution**: The script automatically adopts existing resources by adding Helm labels

## Advanced Usage

### Disable Auto-Configuration

```bash
sealos run desktop-frontend:latest -- AUTO_CONFIG_ENABLED=false CLOUD_DOMAIN=cloud.example.com DATABASE_MONGODB_URI=mongodb://...
```

### Custom Helm Options

```bash
HELM_OPTS="--timeout 10m --install" sealos run desktop-frontend:latest
```

### Override Namespace

```bash
RELEASE_NAMESPACE=my-namespace sealos run desktop-frontend:latest
```

## Build Image

```bash
sealos build -t docker.io/labring/sealos-cloud-desktop:latest -f Kubefile .
```
