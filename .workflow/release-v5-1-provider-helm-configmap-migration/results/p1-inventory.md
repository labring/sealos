# P1 Inventory

Source of truth: current release-v5.1-equivalent files on branch `chore/helm-chart-update`.

## applaunchpad

Current deployment path is already Helm chart based.

Kubefile env defaults:
- `certSecretName="wildcard-cert"`
- `monitorUrl="http://launchpad-monitor.sealos.svc.cluster.local:8428"`
- `billingUrl="http://account-service.account-system.svc:2333"`
- `logUrl=""`

Container env currently rendered by chart:
- `NODE_TLS_REJECT_UNAUTHORIZED`

ConfigMap currently rendered by chart:
- `config.yaml` mounted at `/app/data/config.yaml`

## terminal

Current deployment path is already Helm chart based.

Kubefile env defaults:
- none for app-specific env

Container env currently rendered by chart:
- `TTYD_IMAGE`
- `SITE`
- `KEEPALIVED`

ConfigMap currently rendered by chart:
- `config.yaml` mounted at `/config.yaml`

## dbprovider

Current deployment path is old manifest based: `kubectl apply -f manifests`.

Kubefile env defaults:
- `cloudDomain="127.0.0.1.nip.io"`
- `cloudPort=""`
- `certSecretName="wildcard-cert"`
- `monitorUrl="http://database-monitor.sealos.svc.cluster.local:9090"`
- `minioUrl=""`
- `minioAccessKey=""`
- `minioSecretKey=""`
- `minioPort=""`
- `migrateFileImage=""`
- `minioBucketName=""`
- `guideEnabled="true"`
- `billingUrl="http://account-service.account-system.svc:2333"`
- `vlogsBaseUrl="http://service-vlogs.sealos.svc.cluster.local:8428"`

Container env currently rendered by manifest:
- `SEALOS_DOMAIN`
- `DESKTOP_DOMAIN`
- `SEALOS_PORT`
- `MONITOR_URL`
- `MINIO_URL`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MIGRATE_FILE_IMAGE`
- `MINIO_PORT`
- `MINIO_BUCKET_NAME`
- `BACKUP_ENABLED`
- `SHOW_DOCUMENT`
- `GUIDE_ENABLED`
- `BILLING_URL`
- `MANAGED_DB_ENABLED`
- `VLOGS_BASE_URL`

ConfigMap currently rendered by manifest:
- `config.yaml` mounted at `/config.yaml`

Resources currently rendered:
- Namespace, ConfigMap, Deployment, Service, Ingress, App CR, ServiceAccount, ClusterRole, ClusterRoleBinding.

## template

Current deployment path is old manifest based: `kubectl apply -f manifests`.

Kubefile env defaults:
- `cloudDomain="127.0.0.1.nip.io"`
- `cloudPort=""`
- `userDomain=""`
- `certSecretName="wildcard-cert"`
- `templateRepoUrl="https://github.com/labring-actions/templates"`
- `templateRepoBranch="main"`
- `templateRepoPath="templates"`
- `guideEnabled="true"`
- `billingUrl="http://account-service.account-system.svc:2333"`
- `enableReadmeFetch="true"`

Container env currently rendered by manifest:
- `SEALOS_CLOUD_DOMAIN`
- `SEALOS_CLOUD_PORT`
- `SEALOS_USER_DOMAIN`
- `SEALOS_CERT_SECRET_NAME`
- `TEMPLATE_REPO_URL`
- `TEMPLATE_REPO_BRANCH`
- `SHOW_AUTHOR`
- `ACCOUNT_URL`
- `GUIDE_ENABLED`
- `BILLING_URL`
- `DESKTOP_DOMAIN`
- `ENABLE_README_FETCH`
- `TEMPLATE_CATEGORIES`

ConfigMap currently rendered by manifest:
- `config.yaml` mounted at `/config.yaml`
- `config.json` mounted at `/app/data/config.json`

Resources currently rendered:
- Namespace, ConfigMap, Deployment, Service, CronJob, ClusterRole, ClusterRoleBinding, Ingress, App CR.
