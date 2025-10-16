#!/bin/bash
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