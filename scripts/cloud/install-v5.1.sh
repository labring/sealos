#!/usr/bin/env bash
set -euo pipefail

SEALOS_VERSION="${SEALOS_VERSION:-v5.1.2-rc5}"
SEALOS_OSS_VERSION="${SEALOS_OSS_VERSION:-v5.1.2-rc5}"
SEALOS_V2_PROXY="${SEALOS_V2_PROXY:-false}"

timestamp() {
  date +"%Y-%m-%d %T"
}

info() {
  local flag
  flag="$(timestamp)"
  echo -e "\033[36m INFO [$flag] >> $* \033[0m"
}

error() {
  local flag
  flag="$(timestamp)"
  echo -e "\033[31m ERROR [$flag] >> $* \033[0m"
  exit 1
}

detect_platform() {
  local os_raw arch_raw
  os_raw="$(uname -s)"
  arch_raw="$(uname -m)"

  case "$os_raw" in
    Linux) os="linux" ;;
    Darwin) os="darwin" ;;
    *)
      error "unsupported OS: ${os_raw}"
      ;;
  esac

  case "$arch_raw" in
    x86_64|amd64) arch="amd64" ;;
    aarch64|arm64) arch="arm64" ;;
    *)
      error "unsupported architecture: ${arch_raw}"
      ;;
  esac
}

download_sealos_binary() {
  local version_no_v download_url use_proxy
  version_no_v="${SEALOS_VERSION#v}"
  workdir="$(mktemp -d)"
  trap 'rm -rf "$workdir"' EXIT

  download_url="https://github.com/labring/sealos/releases/download/${SEALOS_VERSION}/sealos_${version_no_v}_${os}_${arch}.tar.gz"
  use_proxy="$(echo "${SEALOS_V2_PROXY}" | tr '[:upper:]' '[:lower:]')"
  if [[ "${use_proxy}" == "true" || "${use_proxy}" == "1" ]]; then
    download_url="https://ghfast.top/${download_url}"
  fi
  info "Downloading sealos binary from: ${download_url}"
  curl -fsSL "${download_url}" -o "${workdir}/sealos.tar.gz"
  tar -xzf "${workdir}/sealos.tar.gz" -C "${workdir}" sealos
  chmod +x "${workdir}/sealos"
  sealos_bin="${workdir}/sealos"
}

choose_image() {
  local use_proxy
  use_proxy="$(echo "${SEALOS_V2_PROXY}" | tr '[:upper:]' '[:lower:]')"
  if [[ "${use_proxy}" == "true" || "${use_proxy}" == "1" ]]; then
    image="registry.cn-hangzhou.aliyuncs.com/labring/sealos-oss:${SEALOS_OSS_VERSION}"
  else
    image="ghcr.io/labring/sealos-oss:${SEALOS_OSS_VERSION}"
  fi
}

create_and_copy_bundle() {
  local bundle_path output_dir
  info "Creating image rootfs path via: sealos create ${image} --short"
  bundle_path="$("${sealos_bin}" create "${image}" --short | tail -n1 | tr -d '\r')"
  if [[ -z "${bundle_path}" ]]; then
    error "failed to get bundle path from sealos create"
  fi
  if [[ ! -d "${bundle_path}" ]]; then
    error "bundle path does not exist or is not a directory: ${bundle_path}"
  fi

  output_dir="/root/sealos-oss-${SEALOS_OSS_VERSION}"
  if [[ -e "${output_dir}" ]]; then
    error "output directory already exists: ${output_dir}. Please delete it and rerun this script."
  fi
  mkdir -p "${output_dir}"
  info "Copying bundle contents from ${bundle_path} to ${output_dir}"
  cp -a "${bundle_path}/." "${output_dir}/"
  info "Bundle copy completed: ${output_dir}"
  bundle_output_dir="${output_dir}"
}

run_default_install() {
  if [[ -z "${bundle_output_dir:-}" ]]; then
    error "bundle output directory is empty"
  fi
  if [[ ! -f "${bundle_output_dir}/sealos-oss.sh" ]]; then
    error "missing installer script: ${bundle_output_dir}/sealos-oss.sh"
  fi
  chmod +x "${bundle_output_dir}/sealos-oss.sh"
  info "Running default install: ./sealos-oss.sh install --default"
  (
    cd "${bundle_output_dir}"
    yes y | ./sealos-oss.sh install --default
  )
}

list_unready_pods() {
  kubectl get pods -A --no-headers 2>/dev/null | awk '
    NF < 4 { next }
    {
      ready = $3
      status = $4
      split(ready, arr, "/")
      ready_ok = (arr[1] == arr[2])
      if (status == "Running") {
        if (!ready_ok) print $0
      } else if (status == "Completed" || status == "Succeeded") {
        next
      } else {
        print $0
      }
    }'
}

wait_for_pods_ready() {
  local timeout_sec interval_sec deadline unready
  timeout_sec="${SEALOS_POD_READY_TIMEOUT:-1800}"
  interval_sec="${SEALOS_POD_READY_INTERVAL:-10}"
  deadline=$((SECONDS + timeout_sec))

  if ! command -v kubectl >/dev/null 2>&1; then
    error "kubectl is not installed, cannot check pod status"
  fi

  info "Waiting for all pods to be ready (timeout: ${timeout_sec}s, interval: ${interval_sec}s)"
  while true; do
    unready="$(list_unready_pods || true)"
    if [[ -z "${unready}" ]]; then
      info "All pods are ready"
      break
    fi

    if (( SECONDS >= deadline )); then
      error "timeout waiting for pods to be ready. Unready pods:\n${unready}"
    fi

    info "Pods are not ready yet, retrying in ${interval_sec}s"
    sleep "${interval_sec}"
  done
}

run_info() {
  if [[ -z "${bundle_output_dir:-}" ]]; then
    error "bundle output directory is empty"
  fi
  info "Running info command: ./sealos-oss.sh info"
  (
    cd "${bundle_output_dir}"
    ./sealos-oss.sh info
  )
}

main() {
  detect_platform
  info "Detected platform: ${os}/${arch}"
  download_sealos_binary
  choose_image
  info "Pulling image: ${image}"
  "${sealos_bin}" pull "${image}"
  info "Image pull completed"
  create_and_copy_bundle
  run_default_install
  wait_for_pods_ready
  run_info
}

main "$@"
