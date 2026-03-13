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

NAMESPACE=${NAMESPACE:-"hubble-service"}

CloudDomain=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.cloudDomain}')
CloudPort=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.cloudPort}')

HELM_OPTS="${HELM_OPTS:-""}"
kubectl delete deployment service-hubble-deployment -n ${NAMESPACE} --ignore-not-found
kubectl delete service service-hubble -n ${NAMESPACE} --ignore-not-found
kubectl delete configmap service-hubble-config -n ${NAMESPACE} --ignore-not-found
kubectl delete serviceaccount service-hubble-sa -n ${NAMESPACE} --ignore-not-found
kubectl delete clusterrole service-hubble-role  -n ${NAMESPACE} --ignore-not-found
kubectl delete clusterrolebinding service-hubble-rolebinding  -n ${NAMESPACE} --ignore-not-found

wait_for_secret() {
  local secret_name=$1
  local namespace=${2:-hubble-service}

  info "Checking if secret $secret_name exists..."

  while ! kubectl get secret "$secret_name" -n "$namespace" > /dev/null 2>&1; do
    warn "Secret $secret_name does not exist, retrying in 5 seconds..."
    sleep 5
  done

  info "Secret $secret_name exists, proceeding with the next steps."
}

#===========================================================================
NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)
REPLICA_OPTIONS=""
if [ "$NODE_COUNT" -eq 1 ]; then
  REPLICA_OPTIONS="--set sentinel.enable=false --set cluster.replicas=1"
fi
kbVersion=$(kbcli version| grep  kbcli | awk '{print $2}')
helm upgrade -i hubble-redis ./charts/redis -n hubble-service --create-namespace ${HELM_OPTS} ${REPLICA_OPTIONS} --set kbVersion=${kbVersion}

wait_for_secret "hubble-redis-conn-credential" "hubble-service"


first_cluster=$(kubectl get cluster -n ${NAMESPACE} -o jsonpath='{.items[0].metadata.name}')
Whitelist=${CloudDomain}:6443
echo "API Server address: ${Whitelist}"
secret_name=${first_cluster}-conn-credential
endpoints=$(kubectl get secret -n ${NAMESPACE} ${secret_name} -o jsonpath={.data.endpoint} | base64 -d)
username=$(kubectl get secret -n ${NAMESPACE} ${secret_name} -o jsonpath={.data.username} | base64 -d)
password=$(kubectl get secret -n ${NAMESPACE} ${secret_name} -o jsonpath={.data.password} | base64 -d)

helm upgrade -i hubble ./charts/hubble -n ${NAMESPACE} --create-namespace \
   --set cloud.domain=${CloudDomain} \
   --set cloud.port=${CloudPort} \
   --set cloud.whiteList=${Whitelist} \
   --set redis.addr=${endpoints} \
  --set redis.username=${username} \
  --set redis.password=${password} ${HELM_OPTS}

print "Hubble Service has been installed/updated successfully."