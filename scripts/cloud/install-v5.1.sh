#!/usr/bin/env bash
set -euo pipefail

SEALOS_VERSION="${SEALOS_VERSION:-v5.1.2-rc5}"
SEALOS_OSS_VERSION="${SEALOS_OSS_VERSION:-v5.1.2-rc4}"
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
}

main "$@"
