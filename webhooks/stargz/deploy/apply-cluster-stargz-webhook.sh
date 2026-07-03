#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-apply}"

NAMESPACE="${NAMESPACE:-sealos-system}"
WEBHOOK_NAME="${WEBHOOK_NAME:-pod-stargz-runtime-injector}"
SERVICE_NAME="${SERVICE_NAME:-pod-stargz-runtime-injector}"
TLS_SECRET_NAME="${TLS_SECRET_NAME:-stargz-runtime-injector-tls}"
CERTIFICATE_NAME="${CERTIFICATE_NAME:-stargz-runtime-injector-serving-cert}"
ISSUER_NAME="${ISSUER_NAME:-stargz-runtime-injector-selfsigned-issuer}"
RUNTIME_CLASS_NAME="${RUNTIME_CLASS_NAME:-stargz}"
RUNTIME_HANDLER="${RUNTIME_HANDLER:-stargz}"
WEBHOOK_IMAGE="${WEBHOOK_IMAGE:-}"
INTERNAL_REGISTRIES="${INTERNAL_REGISTRIES:-sealos.hub:5000}"
SKIP_ANNOTATION="${SKIP_ANNOTATION:-stargz.sealos.io/skip}"
WEBHOOK_FAILURE_POLICY="${WEBHOOK_FAILURE_POLICY:-Ignore}"
WEBHOOK_REPLICAS="${WEBHOOK_REPLICAS:-2}"
STARGZ_NODE_LABEL_KEY="${STARGZ_NODE_LABEL_KEY:-stargz.sealos.io/runtime}"
STARGZ_NODE_LABEL_VALUE="${STARGZ_NODE_LABEL_VALUE:-true}"

usage() {
  cat <<'USAGE'
Usage:
  apply-cluster-stargz-webhook.sh apply
  apply-cluster-stargz-webhook.sh delete

Required for apply:
  WEBHOOK_IMAGE=<registry>/<repo>/stargz-runtime-injector:<tag>

Common variables:
  INTERNAL_REGISTRIES=sealos.hub:5000,registry.internal:5000
  RUNTIME_CLASS_NAME=stargz
  RUNTIME_HANDLER=stargz
  WEBHOOK_FAILURE_POLICY=Ignore
  CERTIFICATE_NAME=stargz-runtime-injector-serving-cert
  ISSUER_NAME=stargz-runtime-injector-selfsigned-issuer
  STARGZ_NODE_LABEL_KEY=stargz.sealos.io/runtime
  STARGZ_NODE_LABEL_VALUE=true

The webhook mutates only Pods whose images use one of INTERNAL_REGISTRIES and
which do not already set spec.runtimeClassName.

RuntimeClass scheduling uses scheduling.nodeSelector on STARGZ_NODE_LABEL_KEY.
Label nodes after running deploy-stargz-runtime.sh deploy on each worker.

cert-manager must already be installed. This script uses the Kubebuilder
cert-manager pattern: an Issuer and Certificate create the TLS Secret, and
cert-manager cainjector fills MutatingWebhookConfiguration caBundle.
USAGE
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

normalize_csv() {
  printf '%s' "$1" |
    tr ',' '\n' |
    awk '
      {
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", $0)
        sub(/^https?:\/\//, "", $0)
        sub(/\/$/, "", $0)
      }
      NF && !seen[$0]++ {
        if (out != "") {
          out = out "," $0
        } else {
          out = $0
        }
      }
      END {
        print out
      }
    '
}

require_cert_manager() {
  kubectl api-resources --api-group=cert-manager.io --no-headers 2>/dev/null |
    awk '$1 == "certificates" { found = 1 } END { exit found ? 0 : 1 }' || {
    echo "cert-manager CRDs are required; install cert-manager before applying this webhook" >&2
    exit 1
  }
}

wait_for_webhook_cabundle() {
  local ca_bundle

  for ((i = 0; i < 60; i++)); do
    ca_bundle="$(
      kubectl get mutatingwebhookconfiguration "${WEBHOOK_NAME}" \
        -o jsonpath='{.webhooks[0].clientConfig.caBundle}' 2>/dev/null || true
    )"
    if [[ -n "${ca_bundle}" ]]; then
      return 0
    fi
    sleep 2
  done

  echo "timed out waiting for cert-manager to inject caBundle into ${WEBHOOK_NAME}" >&2
  exit 1
}

apply_all() {
  local internal_registries

  require_cmd kubectl
  require_cert_manager

  if [[ -z "${WEBHOOK_IMAGE}" ]]; then
    echo "WEBHOOK_IMAGE is required, for example:" >&2
    echo "  WEBHOOK_IMAGE=hub.staging-usw-1.sealos.io/ns-admin/stargz-runtime-injector:v1 $0 apply" >&2
    exit 1
  fi

  internal_registries="$(normalize_csv "${INTERNAL_REGISTRIES}")"
  if [[ -z "${internal_registries}" ]]; then
    echo "INTERNAL_REGISTRIES is empty" >&2
    exit 1
  fi

  kubectl apply -f - <<YAML
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: ${RUNTIME_CLASS_NAME}
handler: ${RUNTIME_HANDLER}
scheduling:
  nodeSelector:
    ${STARGZ_NODE_LABEL_KEY}: "${STARGZ_NODE_LABEL_VALUE}"
---
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: ${ISSUER_NAME}
  namespace: ${NAMESPACE}
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: ${CERTIFICATE_NAME}
  namespace: ${NAMESPACE}
spec:
  dnsNames:
  - ${SERVICE_NAME}
  - ${SERVICE_NAME}.${NAMESPACE}
  - ${SERVICE_NAME}.${NAMESPACE}.svc
  - ${SERVICE_NAME}.${NAMESPACE}.svc.cluster.local
  issuerRef:
    kind: Issuer
    name: ${ISSUER_NAME}
  secretName: ${TLS_SECRET_NAME}
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ${WEBHOOK_NAME}
  namespace: ${NAMESPACE}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${WEBHOOK_NAME}
  namespace: ${NAMESPACE}
  labels:
    app.kubernetes.io/name: ${WEBHOOK_NAME}
spec:
  replicas: ${WEBHOOK_REPLICAS}
  selector:
    matchLabels:
      app.kubernetes.io/name: ${WEBHOOK_NAME}
  template:
    metadata:
      annotations:
        ${SKIP_ANNOTATION}: "true"
      labels:
        app.kubernetes.io/name: ${WEBHOOK_NAME}
    spec:
      serviceAccountName: ${WEBHOOK_NAME}
      containers:
      - name: webhook
        image: ${WEBHOOK_IMAGE}
        imagePullPolicy: IfNotPresent
        args:
        - --webhook-cert-dir=/tls
        - --webhook-cert-name=tls.crt
        - --webhook-cert-key=tls.key
        - --metrics-bind-address=0
        - --health-probe-bind-address=:8081
        - --runtime-class=${RUNTIME_CLASS_NAME}
        - --registries=${internal_registries}
        - --skip-annotation=${SKIP_ANNOTATION}
        ports:
        - name: https
          containerPort: 9443
        - name: health
          containerPort: 8081
        readinessProbe:
          httpGet:
            path: /readyz
            port: health
        livenessProbe:
          httpGet:
            path: /healthz
            port: health
        volumeMounts:
        - name: tls
          mountPath: /tls
          readOnly: true
        resources:
          requests:
            cpu: 20m
            memory: 32Mi
          limits:
            cpu: 200m
            memory: 128Mi
      volumes:
      - name: tls
        secret:
          secretName: ${TLS_SECRET_NAME}
---
apiVersion: v1
kind: Service
metadata:
  name: ${SERVICE_NAME}
  namespace: ${NAMESPACE}
spec:
  selector:
    app.kubernetes.io/name: ${WEBHOOK_NAME}
  ports:
  - name: https
    port: 443
    targetPort: https
---
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: ${WEBHOOK_NAME}
  annotations:
    cert-manager.io/inject-ca-from: ${NAMESPACE}/${CERTIFICATE_NAME}
webhooks:
- name: ${WEBHOOK_NAME}.${NAMESPACE}.svc
  admissionReviewVersions:
  - v1
  sideEffects: None
  failurePolicy: ${WEBHOOK_FAILURE_POLICY}
  timeoutSeconds: 5
  reinvocationPolicy: Never
  clientConfig:
    service:
      name: ${SERVICE_NAME}
      namespace: ${NAMESPACE}
      path: /mutate
      port: 443
  rules:
  - operations:
    - CREATE
    apiGroups:
    - ""
    apiVersions:
    - v1
    resources:
    - pods
YAML

  kubectl -n "${NAMESPACE}" wait --for=condition=Ready "certificate/${CERTIFICATE_NAME}" --timeout=120s
  wait_for_webhook_cabundle
  kubectl -n "${NAMESPACE}" rollout status "deployment/${WEBHOOK_NAME}" --timeout=120s
}

delete_all() {
  require_cmd kubectl
  kubectl delete mutatingwebhookconfiguration "${WEBHOOK_NAME}" --ignore-not-found=true
  kubectl -n "${NAMESPACE}" delete deployment,service,serviceaccount,certificate,issuer \
    -l "app.kubernetes.io/name=${WEBHOOK_NAME}" --ignore-not-found=true
  kubectl -n "${NAMESPACE}" delete deployment,service,serviceaccount,certificate,issuer \
    "${WEBHOOK_NAME}" "${SERVICE_NAME}" "${CERTIFICATE_NAME}" "${ISSUER_NAME}" \
    --ignore-not-found=true
  kubectl delete runtimeclass "${RUNTIME_CLASS_NAME}" --ignore-not-found=true
  kubectl -n "${NAMESPACE}" delete secret "${TLS_SECRET_NAME}" --ignore-not-found=true
}

case "${ACTION}" in
  apply)
    apply_all
    ;;
  delete)
    delete_all
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    usage >&2
    exit 1
    ;;
esac
