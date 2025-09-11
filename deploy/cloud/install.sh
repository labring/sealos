#!/bin/bash

HELM_OPTS="${HELM_OPTS:-}"

SEALOS_CLOUD_DOMAIN="${SEALOS_CLOUD_DOMAIN:-"sealos.io"}"
SEALOS_CLOUD_PORT="${SEALOS_CLOUD_PORT:-"443"}"
SEALOS_CLOUD_DIR="${SEALOS_CLOUD_DIR:-"/root/.sealos/cloud"}"
kubectl create namespace sealos-system --dry-run=client  -o yaml  | kubectl apply -f -
kubectl create namespace sealos --dry-run=client  -o yaml  | kubectl apply -f -

source tools.sh
setMongoVersion() {
  set +e
  grep avx /proc/cpuinfo > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    echo "MongoDB 6.0 version depends on a CPU that supports the AVX instruction set. The current environment does not support AVX, so it has been switched to MongoDB 4.4 version. For more information, see: https://www.mongodb.com/docs/v6.0/administration/production-notes/"
    mongodbVersion="mongodb-4.4"
  fi
  set -e
  mongodbVersion="mongodb-6.0"
}

{
  if [ -f "${SEALOS_CLOUD_DIR}/pki/WechatPrivateKey" ]; then
    cp ${SEALOS_CLOUD_DIR}/pki/WechatPrivateKey ./charts/config/files/WechatPrivateKey
  fi
  if [ -f "${SEALOS_CLOUD_DIR}/pki/ALIPAY_APP_CERT_PUBLIC_KEY" ]; then
    cp ${SEALOS_CLOUD_DIR}/pki/ALIPAY_APP_CERT_PUBLIC_KEY ./charts/config/files/ALIPAY_APP_CERT_PUBLIC_KEY
  fi
  if [ -f "${SEALOS_CLOUD_DIR}/pki/ALIPAY_CERT_PUBLIC_KEY" ]; then
    cp ${SEALOS_CLOUD_DIR}/pki/ALIPAY_CERT_PUBLIC_KEY ./charts/config/files/ALIPAY_CERT_PUBLIC_KEY
  fi
  if [ -f "${SEALOS_CLOUD_DIR}/pki/ALIPAY_PRIVATE_KEY" ]; then
    cp ${SEALOS_CLOUD_DIR}/pki/ALIPAY_PRIVATE_KEY ./charts/config/files/ALIPAY_PRIVATE_KEY
  fi
  if [ -f "${SEALOS_CLOUD_DIR}/pki/ALIPAY_ROOT_CERT" ]; then
    cp ${SEALOS_CLOUD_DIR}/pki/ALIPAY_ROOT_CERT ./charts/config/files/ALIPAY_ROOT_CERT
  fi

  setMongoVersion
  helm upgrade --install cloud-database -n sealos-system charts/database  ${HELM_OPTS} --set mongodb.version=${mongodbVersion}
  gen_mongodbUri
  gen_cockroachdbUri
  gen_saltKey
  gen_regionUID
  gen_jwt_tokens
  helm upgrade --install cloud-config -n sealos-system charts/config  ${HELM_OPTS} --set mongodb.version=${mongodbVersion} \
    --set config.cloudDomain=${SEALOS_CLOUD_DOMAIN} \
    --set-string config.cloudPort=${SEALOS_CLOUD_PORT} \
    --set config.certSecretName="wildcard-cert" \
    --set-string config.passwordEnabled="true" \
    --set config.regionUID=${RegionUID} \
    --set config.databaseMongodbURI=${MongoDBURI} \
    --set config.databaseLocalCockroachdbURI=${CockroachLocalDBURI} \
    --set config.databaseGlobalCockroachdbURI=${CockroachGlobalDBURI} \
    --set config.passwordSalt=${PasswordSalt} \
    --set config.jwtInternal=${JwtInternal} \
    --set config.jwtRegional=${JwtRegional} \
    --set config.jwtGlobal=${JwtGlobal}
}

