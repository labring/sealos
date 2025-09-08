#!/usr/bin/env bash
set -e

NAME=${NAME:-"vm-stack"}
NAMESPACE=${NAMESPACE:-"vm"}
CHARTS=${CHARTS:-"./charts/victoria-metrics-k8s-stack"}
HELM_OPTS=${HELM_OPTS:-" \
--set grafana.service.type=NodePort \
"}

cp kb-fix/prometheus-additional.yaml ./charts/victoria-metrics-k8s-stack/files/prometheus-additional.yaml
cp kb-fix/kubeblocks-fix.yaml ./charts/victoria-metrics-k8s-stack/templates/victoria-metrics-operator/vmagent/kubeblocks-fix.yaml

helm show crds charts/victoria-metrics-k8s-stack | kubectl apply -f - --server-side  --force-conflicts
helm upgrade -i ${NAME} ${CHARTS} -n ${NAMESPACE} --create-namespace -f ./charts/victoria-metrics-k8s-stack/values.yaml -f values-cloud.yaml ${HELM_OPTS}