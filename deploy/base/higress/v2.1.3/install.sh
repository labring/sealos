#!/bin/bash

HELM_OPTS="${HELM_OPTS:-}"
SEALOS_CLOUD_PORT="${SEALOS_CLOUD_PORT:-443}"
SEALOS_CLOUD_DOMAIN="${SEALOS_CLOUD_DOMAIN:-"127.0.0.1.nip.io"}"

cp -r fix/plugins.yaml charts/higress/charts/higress-core/templates/plugins.yaml
cp -r fix/configmap.yaml charts/higress/charts/higress-core/templates/configmap.yaml
cp -r fix/https.yaml charts/higress/charts/higress-core/templates/https.yaml

helm upgrade --install higress -n higress-system charts/higress --create-namespace --render-subchart-notes -f values-cloud.yaml  ${HELM_OPTS} \
      --set higress-core.gateway.httpsPort="${SEALOS_CLOUD_PORT}" --set higress-core.sealos.domain="${SEALOS_CLOUD_DOMAIN}"
