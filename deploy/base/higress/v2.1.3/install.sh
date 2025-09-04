#!/bin/bash

HELM_OPTS="${HELM_OPTS:-}"
CLOUD_PORT="${CLOUD_PORT:-443}"
CLOUD_DOMAIN="${CLOUD_DOMAIN:-"sealos.cloud"}"

cp -r fix/plugins.yaml charts/higress/charts/higress-core/templates/plugins.yaml
cp -r fix/configmap.yaml charts/higress/charts/higress-core/templates/configmap.yaml

helm upgrade --install higress -n higress-system charts/higress --create-namespace --render-subchart-notes -f values-cloud.yaml  ${HELM_OPTS} \
      --set higress-core.gateway.httpsPort="${CLOUD_PORT}" --set higress-core.cloud.domain="${CLOUD_DOMAIN}"
