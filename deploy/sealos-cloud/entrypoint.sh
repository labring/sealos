#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPONENT_DIR="${ROOT_DIR}/scripts/components"
DEPLOY_TIMEOUT="${DEPLOY_TIMEOUT:-${SEALOS_CLOUD_DEPLOY_TIMEOUT:-30m}}"
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
  if [[ "${#env_args[@]}" -gt 0 ]]; then
    (cd "${ROOT_DIR}" && env "${env_args[@]}" bash "${COMPONENT_DIR}/${name}.sh" "$@")
  else
    (cd "${ROOT_DIR}" && bash "${COMPONENT_DIR}/${name}.sh" "$@")
  fi
}

timeout_to_seconds() {
  local timeout="$1" timeout_value
  if [[ "${timeout}" =~ ^([0-9]+)(s|m|h)?$ ]]; then
    timeout_value=$((10#${BASH_REMATCH[1]}))
    case "${BASH_REMATCH[2]:-}" in
      s) printf '%s\n' "${timeout_value}" ;;
      m) printf '%s\n' "$((timeout_value * 60))" ;;
      h) printf '%s\n' "$((timeout_value * 3600))" ;;
      *) printf '%s\n' "${timeout_value}" ;;
    esac
    return 0
  fi
  return 1
}

wait_namespace() {
  local name="$1" interval=30 start=$SECONDS timeout_seconds remaining

  if ! timeout_seconds="$(timeout_to_seconds "${DEPLOY_TIMEOUT}")" || (( timeout_seconds <= 0 )); then
    echo "[sealos-cloud] DEPLOY_TIMEOUT must be a positive number of seconds or duration (got: ${DEPLOY_TIMEOUT})" >&2
    return 2
  fi

  echo "[sealos-cloud] Waiting for namespace/${name} before installing license-frontend (timeout: ${DEPLOY_TIMEOUT})"
  while (( SECONDS - start < timeout_seconds )); do
    if kubectl get ns "${name}" >/dev/null 2>&1; then
      echo "[sealos-cloud] Namespace ${name} is ready; continuing with license-frontend"
      return 0
    fi

    remaining=$((timeout_seconds - (SECONDS - start)))
    (( remaining <= 0 )) && break
    echo "[sealos-cloud] Namespace ${name} is not available; license-frontend cannot be installed yet. Retrying in 30s"
    (( remaining > interval )) && remaining="${interval}"
    sleep "${remaining}"
  done

  echo "[sealos-cloud] Cannot install license-frontend: namespace ${name} did not appear within ${DEPLOY_TIMEOUT}" >&2
  return 1
}

wait_deployment() {
  local namespace="$1" name="$2"
  local timeout="${DEPLOY_TIMEOUT}" interval=5 start=$SECONDS timeout_seconds
  local generation observed_generation desired updated ready available

  if ! timeout_seconds="$(timeout_to_seconds "${timeout}")" || (( timeout_seconds <= 0 )); then
    echo "[sealos-cloud] DEPLOY_TIMEOUT must be a positive number of seconds or duration (got: ${timeout})" >&2
    return 2
  fi

  echo "[sealos-cloud] Waiting for deployment/${name} in namespace ${namespace} (timeout: ${timeout})"
  while (( SECONDS - start < timeout_seconds )); do
    local deployment_status
    if ! deployment_status="$(kubectl get "deployment/${name}" -n "${namespace}" \
      -o jsonpath='{.metadata.generation}{" "}{.status.observedGeneration}{" "}{.spec.replicas}{" "}{.status.updatedReplicas}{" "}{.status.readyReplicas}{" "}{.status.availableReplicas}' 2>/dev/null)"; then
      generation=""
      observed_generation=""
      desired=""
      updated=""
      ready=""
      available=""
    elif [[ -z "${deployment_status}" ]]; then
      generation=""
      observed_generation=""
      desired=""
      updated=""
      ready=""
      available=""
    else
      read -r generation observed_generation desired updated ready available <<<"${deployment_status}"
    fi

    desired="${desired:-1}"
    updated="${updated:-0}"
    ready="${ready:-0}"
    available="${available:-0}"
    observed_generation="${observed_generation:-0}"
    if [[ "${generation:-}" == "${observed_generation}" &&
      "${updated}" == "${desired}" &&
      "${ready}" == "${desired}" &&
      "${available}" == "${desired}" ]]; then
      echo "[sealos-cloud] Deployment ${namespace}/${name} is ready (${ready}/${desired} replicas)"
      return 0
    fi

    local remaining=$((timeout_seconds - (SECONDS - start)))
    (( remaining <= 0 )) && break
    (( remaining > interval )) && remaining="${interval}"
    sleep "${remaining}"
  done

  echo "[sealos-cloud] Timed out waiting for deployment/${name} in namespace ${namespace}" >&2
  echo "[sealos-cloud] Deployment status: generation=${generation:-unknown} observedGeneration=${observed_generation:-unknown} desired=${desired:-unknown} updated=${updated:-unknown} ready=${ready:-unknown} available=${available:-unknown}" >&2
  kubectl describe "deployment/${name}" -n "${namespace}" >&2 || true
  kubectl get pods -n "${namespace}" -o wide >&2 || true
  kubectl get events -n "${namespace}" --sort-by='.lastTimestamp' >&2 || true
  return 1
}

wait_job() {
  local namespace="$1" name="$2"
  kubectl wait --for=condition=complete "job/${name}" -n "${namespace}" --timeout="${JOB_TIMEOUT}"
}

wait_cronjob() {
  local namespace="$1" name="$2" timeout=600 interval=5 next_log=30 start=$SECONDS elapsed remaining

  echo "[sealos-cloud] Waiting for cronjob/${name} in namespace ${namespace} (timeout: 10m)"
  while (( SECONDS - start < timeout )); do
    if kubectl get "cronjob/${name}" -n "${namespace}" >/dev/null 2>&1; then
      echo "[sealos-cloud] CronJob ${namespace}/${name} exists"
      return 0
    fi

    elapsed=$((SECONDS - start))
    if (( elapsed >= next_log )); then
      echo "[sealos-cloud] CronJob ${namespace}/${name} is not available yet; retrying"
      next_log=$((next_log + 30))
    fi
    remaining=$((timeout - elapsed))
    (( remaining <= 0 )) && break
    (( remaining > interval )) && remaining="${interval}"
    sleep "${remaining}"
  done

  echo "[sealos-cloud] Timed out waiting for cronjob/${name} in namespace ${namespace}" >&2
  kubectl get "cronjob/${name}" -n "${namespace}" -o wide >&2 || true
  return 1
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
wait_namespace ns-admin
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
