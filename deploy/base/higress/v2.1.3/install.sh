#!/bin/bash

HELM_OPTS="${HELM_OPTS:-}"
CLOUD_PORT="${CLOUD_PORT:-443}"

helm upgrade --install higress -n higress-system charts/higress --create-namespace --render-subchart-notes ${HELM_OPTS} --set gateway.httpsPort=${CLOUD_PORT}
