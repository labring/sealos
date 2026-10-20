#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTEXT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STAGING_DIR="${1:-${RUNNER_TEMP:-/tmp}/sealos-cloud-components}"
IMAGE_OWNER="${IMAGE_OWNER:-labring}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

rm -rf "${STAGING_DIR}"
mkdir -p "${STAGING_DIR}/charts" "${STAGING_DIR}/scripts/components" "${STAGING_DIR}/assets"
cp "${CONTEXT_DIR}/Kubefile" "${CONTEXT_DIR}/entrypoint.sh" "${STAGING_DIR}/"

copy_chart() {
  local source="$1" name destination
  name="$(basename "${source}")"
  destination="${STAGING_DIR}/charts/${name}"
  if [[ -e "${destination}" ]]; then
    echo "Duplicate Helm chart name: ${name} (${source})" >&2
    exit 1
  fi
  cp -R "${source}" "${destination}"
}

copy_file() {
  local source="$1" destination="$2"
  mkdir -p "$(dirname "${destination}")"
  cp "${source}" "${destination}"
}

copy_script() {
  local source="$1" name="$2"
  copy_file "${source}" "${STAGING_DIR}/scripts/components/${name}"
  chmod +x "${STAGING_DIR}/scripts/components/${name}"
}

copy_asset_dir() {
  local source="$1" name="$2"
  local destination="${STAGING_DIR}/assets/${name}"
  [[ -d "${source}" ]] || return 0
  [[ ! -e "${destination}" ]] || { echo "Duplicate component asset: ${name}" >&2; exit 1; }
  mkdir -p "$(dirname "${destination}")"
  cp -R "${source}" "${destination}"
}

add_chart_component() {
  local component="$1" source="$2" chart_dir
  chart_dir="${ROOT_DIR}/${source}/charts"
  while IFS= read -r -d '' chart_file; do
    copy_chart "$(dirname "${chart_file}")"
  done < <(find "${chart_dir}" -mindepth 2 -maxdepth 2 -name Chart.yaml -print0 | sort -z)
  while IFS= read -r -d '' values; do
    copy_file "${values}" "${STAGING_DIR}/charts/$(basename "$(dirname "${values}")")/$(basename "${values}")"
  done < <(find "${chart_dir}" -mindepth 2 -maxdepth 2 -type f -name '*-values.yaml' -print0 | sort -z)
  copy_script "${ROOT_DIR}/${source}/${3}" "${component}.sh"
}

# Charts share one root directory; duplicate chart names fail the assembly.
add_chart_component account-controller controllers/account/deploy account-controller-entrypoint.sh
add_chart_component heartbeat controllers/job/heartbeat/deploy heartbeat-cronjob-entrypoint.sh
add_chart_component job-init controllers/job/init/deploy job-init-entrypoint.sh
add_chart_component license-controller controllers/license/deploy license-controller-entrypoint.sh
add_chart_component node-controller controllers/node/deploy entrypoint.sh
add_chart_component resources-controller controllers/resources/deploy resources-controller-entrypoint.sh
add_chart_component user-controller controllers/user/deploy user-controller-entrypoint.sh
add_chart_component desktop-frontend frontend/desktop/deploy desktop-frontend-entrypoint.sh
add_chart_component costcenter-frontend frontend/providers/costcenter/deploy costcenter-frontend-entrypoint.sh
add_chart_component license-frontend frontend/providers/license/deploy license-frontend-entrypoint.sh
add_chart_component account-service service/account/deploy account-service-entrypoint.sh
add_chart_component database-service service/database/deploy entrypoint.sh
add_chart_component launchpad-service service/launchpad/deploy entrypoint.sh
add_chart_component vlogs-service service/vlogs/deploy entrypoint.sh

copy_file "${ROOT_DIR}/controllers/app/deploy/manifests/deploy.yaml" "${STAGING_DIR}/manifests/app-controller/deploy.yaml"
copy_asset_dir "${ROOT_DIR}/controllers/node/deploy/drop" node-controller/drop
copy_asset_dir "${ROOT_DIR}/controllers/user/deploy/drop" user-controller/drop
copy_asset_dir "${ROOT_DIR}/service/database/deploy/remove" database-service/remove
copy_asset_dir "${ROOT_DIR}/service/launchpad/deploy/remove" launchpad-service/remove
copy_asset_dir "${ROOT_DIR}/service/vlogs/deploy/remove" vlogs-service/remove
copy_file "${ROOT_DIR}/webhooks/admission/deploy/manifests/deploy.yaml.tmpl" "${STAGING_DIR}/manifests/admission/deploy.yaml.tmpl"

replace_image() {
  local repo="$1"
  local old_image="ghcr.io/labring/sealos-${repo}:latest"
  local new_image="ghcr.io/${IMAGE_OWNER}/sealos-${repo}:${IMAGE_TAG}"
  local matches
  matches="$(grep -RIlF "${old_image}" "${STAGING_DIR}/charts" "${STAGING_DIR}/assets" "${STAGING_DIR}/manifests" || true)"
  [[ -n "${matches}" ]] || { echo "No default image reference found for ${repo}" >&2; exit 1; }
  while IFS= read -r file; do
    [[ -n "${file}" ]] && sed -i.bak "s|${old_image}|${new_image}|g" "${file}" && rm -f "${file}.bak"
  done <<< "${matches}"
}

for image in \
  account-controller job-heartbeat-controller job-init-controller license-controller \
  node-controller resources-controller user-controller app-controller \
  desktop-frontend costcenter-frontend license-frontend \
  account-service database-service launchpad-service vlogs-service admission-webhook; do
  replace_image "${image}"
done

echo "Staged component cluster image context at ${STAGING_DIR}"
