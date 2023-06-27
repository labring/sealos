# sealos frontend

## prepare auto script

```bash
cd /sealos # Make sure you are in the sealos root directory
sh frontend/scripts/initFormat.sh
```

## prepare dev host

```bash
# dev
echo '34.96.232.236 apiserver.cluster.local' | sudo tee -a /etc/hosts
# io
echo '35.240.227.100 apiserver.cluster.local' | sudo tee -a /etc/hosts
# cn
echo '121.41.82.246 apiserver.cluster.local' | sudo tee -a /etc/hosts
```

## new App

Refer to other apps to add some configuration.

1. .github/workflows/frontend.yml
2. deploy/cloud/init.sh
3. deploy/cloud/scripts/init.sh
4. frontend/providers/app/deploy/manifests/appcr.yaml.tmpl
5. frontend/providers/app/deploy/manifests/deploy.yaml
6. frontend/providers/app/deploy/manifests/ingress.yaml.tmpl
