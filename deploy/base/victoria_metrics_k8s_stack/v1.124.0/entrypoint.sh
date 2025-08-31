#!/usr/bin/env bash
set -e

NAME=${NAME:-"victoria-metrics-k8s-stack"}
NAMESPACE=${NAMESPACE:-"vm"}
CHARTS=${CHARTS:-"./charts/victoria-metrics-k8s-stack"}
HELM_OPTS=${HELM_OPTS:-" \
--set grafana.service.type=NodePort \
"}

helm upgrade -i ${NAME} ${CHARTS} -n ${NAMESPACE} --create-namespace ${HELM_OPTS}
