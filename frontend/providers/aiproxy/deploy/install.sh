#!/bin/bash
timestamp() {
  date +"%Y-%m-%d %T"
}
print() {
  flag=$(timestamp)
  echo -e "\033[1;32m\033[1m INFO [$flag] >> $* \033[0m"
}
warn() {
  flag=$(timestamp)
  echo -e "\033[33m WARN [$flag] >> $* \033[0m"
}
info() {
  flag=$(timestamp)
  echo -e "\033[36m INFO [$flag] >> $* \033[0m"
}
#===========================================================================
HELM_OPTS=${HELM_OPTS:-""}

NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)
REPLICA_OPTIONS=""
if [ "$NODE_COUNT" -eq 1 ]; then
  REPLICA_OPTIONS="--set replicas=1 "
  HELM_OPTS="${HELM_OPTS} ${REPLICA_OPTIONS}"
fi


varJwtInternal=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.jwtInternal}')
adminKey=$(kubectl get configmap aiproxy -n aiproxy-system -o jsonpath='{.data.ADMIN_KEY}' )
SEALOS_CLOUD_DOMAIN=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.cloudDomain}')
SEALOS_CLOUD_PORT=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.cloudPort}')
CURRENCY_SYMBOL=$(kubectl get deployment -n dbprovider-frontend dbprovider-frontend -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="CURRENCY_SYMBOL")].value}')
if [[ "${CURRENCY_SYMBOL}" == "usd" ]]; then
  SUFFIX="/en/home"
fi

helm upgrade -i aiproxy-web -n aiproxy-system charts/aiproxy  ${HELM_OPTS} \
  --set aiproxy.APP_TOKEN_JWT_KEY=${varJwtInternal}  --set aiproxy.AI_PROXY_BACKEND_KEY=${adminKey} \
  --set suffix=${SUFFIX} \
  --set cloudDomain=${SEALOS_CLOUD_DOMAIN} --set cloudPort=${SEALOS_CLOUD_PORT} --set aiproxy.CURRENCY_SYMBOL=${CURRENCY_SYMBOL} --create-namespace
