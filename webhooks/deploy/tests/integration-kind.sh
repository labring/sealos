#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
CLUSTER_NAME=${KIND_CLUSTER_NAME:-webhook-helm}
trap 'kind delete cluster --name "$CLUSTER_NAME" >/dev/null 2>&1 || true' EXIT

kind create cluster --name "$CLUSTER_NAME" --wait 120s
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.16.3/cert-manager.yaml
kubectl -n cert-manager rollout status deployment/cert-manager --timeout=180s
kubectl -n cert-manager rollout status deployment/cert-manager-cainjector --timeout=180s
kubectl -n cert-manager rollout status deployment/cert-manager-webhook --timeout=180s

docker build -t webhook-admission:kind "$ROOT/webhooks/admission"
docker build -t webhook-stargz:kind "$ROOT/webhooks/stargz"
kind load docker-image --name "$CLUSTER_NAME" webhook-admission:kind webhook-stargz:kind
kubectl create namespace sealos-system --dry-run=client -o yaml | kubectl apply -f -

export HELM_TIMEOUT=3m
export GLOBAL_VALUES_FILE="$ROOT/.context/no-global-values.yaml"
export USER_VALUES_FILE="$ROOT/.context/kind-admission-values.yaml"
export CHART_PATH="$ROOT/webhooks/admission/deploy/charts/admission-webhook"
export WEBHOOK_MODULE=admission
printf 'image: webhook-admission:kind\nimagePullPolicy: Never\n' > "$USER_VALUES_FILE"
bash "$ROOT/webhooks/admission/deploy/entrypoint.sh" apply
kubectl -n sealos-system rollout status deployment/admission-controller-manager --timeout=180s
kubectl get mutatingwebhookconfiguration admission-mutating-webhook-configuration -o json |
  jq -e 'all(.webhooks[]; (.clientConfig.caBundle | length) > 0)'
kubectl create namespace admission-kind-test --dry-run=client -o yaml |
  kubectl label --local -f - user.sealos.io/owner=kind -o yaml | kubectl apply -f -
cat > "$ROOT/.context/kind-admission-values.yaml" <<'VALUES'
image: webhook-admission:kind
imagePullPolicy: Never
config:
  cnameCheck: false
  ingressMutatingAnnotations: kind.sealos.io/test=true
VALUES
bash "$ROOT/webhooks/admission/deploy/entrypoint.sh" apply
kubectl apply -f - <<'YAML'
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: webhook-mutation
  namespace: admission-kind-test
spec:
  rules:
    - host: example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: kubernetes
                port:
                  number: 443
YAML
kubectl -n admission-kind-test get ingress webhook-mutation -o json |
  jq -e '.metadata.annotations["kind.sealos.io/test"] == "true"'

cat > "$ROOT/.context/kind-admission-values.yaml" <<'VALUES'
image: webhook-admission:kind
imagePullPolicy: Never
replicaCount: 2
VALUES
bash "$ROOT/webhooks/admission/deploy/entrypoint.sh" apply
bash "$ROOT/webhooks/admission/deploy/entrypoint.sh" rollback 2

export USER_VALUES_FILE="$ROOT/.context/kind-stargz-values.yaml"
export CHART_PATH="$ROOT/webhooks/stargz/deploy/charts/stargz-webhook"
export WEBHOOK_MODULE=stargz
cat > "$USER_VALUES_FILE" <<'VALUES'
image: webhook-stargz:kind
imagePullPolicy: Never
runtimeClass:
  create: false
webhook:
  registries: docker.io
  runtimeClass: stargz
VALUES
bash "$ROOT/webhooks/stargz/deploy/entrypoint.sh" apply
kubectl -n sealos-system rollout status deployment/pod-stargz-runtime-injector --timeout=180s
kubectl get mutatingwebhookconfiguration pod-stargz-runtime-injector -o json |
  jq -e 'all(.webhooks[]; (.clientConfig.caBundle | length) > 0)'
kubectl create namespace webhook-kind-test --dry-run=client -o yaml |
  kubectl label --local -f - user.sealos.io/owner=kind -o yaml | kubectl apply -f -
kubectl -n webhook-kind-test run webhook-mutation --image=docker.io/library/busybox:1.36 \
  --restart=Never --command -- sleep 30
until [[ $(kubectl -n webhook-kind-test get pod webhook-mutation -o jsonpath='{.spec.runtimeClassName}') == stargz ]]; do
  sleep 2
done
kubectl -n webhook-kind-test delete pod webhook-mutation --ignore-not-found
echo 'PASS: Kind Helm install, staged upgrade, rollback, CA injection and admission mutation'
