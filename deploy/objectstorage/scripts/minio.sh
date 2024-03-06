#!/usr/bin/env bash
set -e

function deploy_minio() {
  CONSOLE_ACCESS_KEY=$(echo -n "${minioAdminUser}" | base64 -w 0)
  CONSOLE_SECRET_KEY=$(echo -n "${minioAdminPassword}" | base64 -w 0)


  MINIO_ROOT_USER=$(openssl rand -hex 12 | head -c 16)
  MINIO_ROOT_PASSWORD=$(openssl rand -hex 24 | head -c 32)

  CONFIG_ENV="export MINIO_STORAGE_CLASS_STANDARD=\"EC:2\"
  export MINIO_BROWSER=\"on\"
  export MINIO_ROOT_USER=\"${MINIO_ROOT_USER}\"
  export MINIO_ROOT_PASSWORD=\"${MINIO_ROOT_PASSWORD}\""

  ENCODED_CONFIG_ENV=$(echo -n "$CONFIG_ENV" | base64 -w 0)

  if kubectl get secret object-storage-env-configuration -n objectstorage-system 2>/dev/null >/dev/; then
    ENCODED_CONFIG_ENV=$(kubectl get secret object-storage-env-configuration -n objectstorage-system -o jsonpath='{.data.config\.env}')
  fi

  sed -i 's/{ENCODED_CONFIG_ENV}/'${ENCODED_CONFIG_ENV}'/g' manifests/minio/deploy.yaml
  sed -i 's/{CONSOLE_ACCESS_KEY}/'${CONSOLE_ACCESS_KEY}'/g' manifests/minio/deploy.yaml
  sed -i 's/{CONSOLE_SECRET_KEY}/'${CONSOLE_SECRET_KEY}'/g' manifests/minio/deploy.yaml

  kubectl apply -f manifests/minio/deploy.yaml
}

function init_minio() {
  chmod +x ./etc/minio-binaries/mc
  export PATH=$PATH:./etc/minio-binaries/

  while kubectl wait -l statefulset.kubernetes.io/pod-name=object-storage-pool-0-0 --for=condition=ready pod -n objectstorage-system --timeout=-1s 2>&1 | grep -q "error: no matching resources found"; do
    sleep 1
  done

  kubectl wait -l statefulset.kubernetes.io/pod-name=object-storage-pool-0-0 --for=condition=ready pod -n objectstorage-system --timeout=-1s
  kubectl wait -l statefulset.kubernetes.io/pod-name=object-storage-pool-0-1 --for=condition=ready pod -n objectstorage-system --timeout=-1s
  kubectl wait -l statefulset.kubernetes.io/pod-name=object-storage-pool-0-2 --for=condition=ready pod -n objectstorage-system --timeout=-1s
  kubectl wait -l statefulset.kubernetes.io/pod-name=object-storage-pool-0-3 --for=condition=ready pod -n objectstorage-system --timeout=-1s

  MINIO_INTERNAL_ENDPOINT=$(kubectl get svc object-storage -n objectstorage-system -o jsonpath='{.spec.clusterIP}')

  count=0
  while true; do
    if mc alias set objectstorage http://${MINIO_INTERNAL_ENDPOINT}:80 ${minioAdminUser} ${minioAdminPassword} 2>&1 | grep -q "Unable to initialize new alias from the provided credentials."; then
      count=$((count+1))
      if [ $count -eq 60 ]; then
        echo "Failed to set alias three times. Exiting."
        break
      fi
    else
      echo "Alias set successfully."
      mc admin policy create objectstorage userNormal etc/minio/policy/user_normal.json
      mc admin policy create objectstorage userDenyWrite etc/minio/policy/user_deny_write.json
      mc admin policy create objectstorage kubeblocks etc/minio/policy/kubeblocks.json
      mc admin user add objectstorage kubeblocks sealos.12345
      mc admin user add objectstorage testuser sealos2023
      mc admin group add objectstorage userNormal testuser
      mc admin group add objectstorage userDenyWrite testuser
      mc admin policy attach objectstorage userNormal --group userNormal
      mc admin policy attach objectstorage userDenyWrite --group userDenyWrite
      mc admin policy attach objectstorage kubeblocks --user kubeblocks
      break
    fi
    sleep 1
  done
}

function install() {
    deploy_minio

    init_minio
}

install

