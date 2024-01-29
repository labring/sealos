#!/usr/bin/env bash
set -e

function deploy_minio() {
  MINIO_EXTERNAL_ENDPOINT="https://objectstorageapi.${cloudDomain}"
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
  if [ ! -f "$HOME/minio-binaries/mc" ]; then
    curl https://dl.min.io/client/mc/release/linux-amd64/mc --create-dirs -o $HOME/minio-binaries/mc
  fi

  chmod +x $HOME/minio-binaries/mc
  export PATH=$PATH:$HOME/minio-binaries/

  while kubectl wait -l statefulset.kubernetes.io/pod-name=object-storage-pool-0-0 --for=condition=ready pod -n objectstorage-system --timeout=-1s 2>&1 | grep -q "error: no matching resources found"; do
    sleep 1
  done

  kubectl wait -l statefulset.kubernetes.io/pod-name=object-storage-pool-0-0 --for=condition=ready pod -n objectstorage-system --timeout=-1s
  kubectl wait -l statefulset.kubernetes.io/pod-name=object-storage-pool-0-1 --for=condition=ready pod -n objectstorage-system --timeout=-1s
  kubectl wait -l statefulset.kubernetes.io/pod-name=object-storage-pool-0-2 --for=condition=ready pod -n objectstorage-system --timeout=-1s
  kubectl wait -l statefulset.kubernetes.io/pod-name=object-storage-pool-0-3 --for=condition=ready pod -n objectstorage-system --timeout=-1s

  while mc alias set objectstorage ${MINIO_EXTERNAL_ENDPOINT} ${minioAdminUser} ${minioAdminPassword} 2>&1 | grep -q "Unable to initialize new alias from the provided credentials."; do
    sleep 1
  done

  mc admin policy create objectstorage userNormal ./manifests/policy/user_normal.json
  mc admin policy create objectstorage userDenyWrite ./manifests/policy/user_deny_write.json
  mc admin policy create objectstorage kubeblocks ./manifests/policy/kubeblocks.json

  mc admin user add objectstorage kubeblocks sealos.12345
  mc admin user add objectstorage testuser sealos2023
  mc admin group add objectstorage userNormal testuser
  mc admin group add objectstorage userDenyWrite testuser

  mc admin user rm testuser

  mc admin policy attach objectstorage userNormal --group userNormal
  mc admin policy attach objectstorage userDenyWrite --group userDenyWrite
  mc admin policy attach objectstorage kubeblocks --user kubeblocks
}

function install() {
    deploy_minio

    init_minio
}

install

