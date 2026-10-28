#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPONENT_DIR="${ROOT_DIR}/scripts/components"

run_component() {
  local name="$1"
  shift
  local env_args=()
  while [[ "$#" -gt 0 && "$1" == *=* ]]; do
    env_args+=("$1")
    shift
  done
  echo "[sealos-cloud] Deploying ${name}"
  if [[ "${#env_args[@]}" -gt 0 ]]; then
    (cd "${ROOT_DIR}" && env "${env_args[@]}" bash "${COMPONENT_DIR}/${name}.sh" "$@")
  else
    (cd "${ROOT_DIR}" && bash "${COMPONENT_DIR}/${name}.sh" "$@")
  fi
}

wait_deployment() {
  local namespace="$1" name="$2"
  kubectl rollout status "deployment/${name}" -n "${namespace}" --timeout=10m
}

wait_job() {
  local namespace="$1" name="$2"
  kubectl wait --for=condition=complete "job/${name}" -n "${namespace}" --timeout=15m
}

wait_cronjob() {
  local namespace="$1" name="$2"
  kubectl wait --for=create "cronjob/${name}" -n "${namespace}" --timeout=10m
}

run_component desktop-frontend
wait_deployment sealos sealos-desktop
run_component user-controller DROP_DIR="${ROOT_DIR}/assets/user-controller/drop"
kubectl apply -f "${ROOT_DIR}/manifests/app-controller/deploy.yaml"
run_component account-controller
run_component account-service
run_component job-init
run_component heartbeat
run_component license-controller
run_component costcenter-frontend
run_component license-frontend
run_component vlogs-service LEGACY_MANIFEST="${ROOT_DIR}/assets/vlogs-service/remove/deploy.yaml"
run_component node-controller DROP_DIR="${ROOT_DIR}/assets/node-controller/drop"
run_component resources-controller
run_component admission-webhook "CHART_PATH=${ROOT_DIR}/charts/admission-webhook" apply

wait_deployment user-system user-controller-manager
wait_deployment app-system app-controller-manager
wait_deployment account-system account-controller-manager
wait_deployment account-system account-service
wait_job account-system init-job
wait_cronjob heartbeat-system heartbeat-cronjob
wait_deployment license-system license
wait_deployment costcenter-frontend costcenter-frontend
wait_deployment license-frontend license-frontend
wait_deployment sealos vlogs-deployment
wait_deployment node-system node
wait_deployment resources-system resources-controller-manager
wait_deployment sealos-system admission-webhook
echo "[sealos-cloud] Component deployment completed"
