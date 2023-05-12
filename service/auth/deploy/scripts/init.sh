#!/bin/bash
set -e

clientIdPlaceholder="<clientId-place-holder>"
clientSecretPlaceholder="<clientSecret-place-holder>"

clientId=$(tr -cd 'a-z0-9' </dev/urandom | head -c20)
clientSecret=$(tr -cd 'a-z0-9' </dev/urandom | head -c40)

sed -i -e "s;$clientIdPlaceholder;$clientId;" -e "s;$clientSecretPlaceholder;$clientSecret;" manifests/configmap.yaml

kubectl apply -f manifests/configmap.yaml -f manifests/deploy.yaml -f manifests/ingress.yaml