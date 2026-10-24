#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPONENT_DIR="${ROOT_DIR}/scripts/components"
DEPLOY_TIMEOUT="${SEALOS_CLOUD_DEPLOY_TIMEOUT:-10m}"
JOB_TIMEOUT="${SEALOS_CLOUD_JOB_TIMEOUT:-15m}"

run_component() {
  local name="$1"
  shift
  local env_args=()
  while [[ "$#" -gt 0 && "$1" == *=* ]]; do
    env_args+=("$1")
    shift
  done
  echo "[sealos-cloud] Deploying ${name}"
  (cd "${ROOT_DIR}" && env "${env_args[@]}" bash "${COMPONENT_DIR}/${name}.sh" "$@")
}

wait_deployment() {
  local namespace="$1" name="$2"
  kubectl rollout status "deployment/${name}" -n "${namespace}" --timeout="${DEPLOY_TIMEOUT}"
}

wait_job() {
  local namespace="$1" name="$2"
  kubectl wait --for=condition=complete "job/${name}" -n "${namespace}" --timeout="${JOB_TIMEOUT}"
}

run_component desktop-frontend
wait_deployment sealos sealos-desktop
run_component user-controller DROP_DIR="${ROOT_DIR}/assets/user-controller/drop"
wait_deployment user-system user-controller-manager

kubectl apply -f "${ROOT_DIR}/manifests/app-controller/deploy.yaml"
wait_deployment app-system app-controller-manager
run_component account-controller
wait_deployment account-system account-controller-manager
run_component account-service
wait_deployment account-system account-service
run_component job-init
wait_job account-system init-job
run_component heartbeat
run_component license-controller
wait_deployment license-system license
run_component costcenter-frontend
wait_deployment costcenter-frontend costcenter-frontend
run_component license-frontend
wait_deployment license-frontend license-frontend
run_component vlogs-service LEGACY_MANIFEST="${ROOT_DIR}/assets/vlogs-service/remove/deploy.yaml"
run_component admission-webhook "CHART_PATH=${ROOT_DIR}/charts/admission-webhook" apply
wait_deployment sealos-system admission-webhook
run_component node-controller DROP_DIR="${ROOT_DIR}/assets/node-controller/drop"
wait_deployment node-system node
run_component resources-controller
wait_deployment resources-system resources-controller-manager
echo "[sealos-cloud] Component deployment completed"
