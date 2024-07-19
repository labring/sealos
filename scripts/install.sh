#!/bin/sh
# Copyright © 2023 sealos.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -e
set -o noglob

# Usage:
#   curl ... | ENV_VAR=... sh -
#   curl -sfL  https://raw.githubusercontent.com/labring/sealos/main/scripts/install.sh  |  sh -s v4.1.8-alpha2 labring/sealos
#
FILE_NAME=sealos
BIN_DIR=/usr/bin
# --- helper functions for logs ---
info() {
    echo '[INFO] ' "$@"
}
warn() {
    echo '[WARN] ' "$@" >&2
}
fatal() {
    echo '[ERROR] ' "$@" >&2
    exit 1
}

# --- ensures $SEALOS_URL is empty or begins with https://, exiting fatally otherwise ---
verify_url() {
    case "${SEALOS_URL}" in
    "") ;;
    https://*) ;;
    http://*) ;;
    *)
        fatal "Only https:// URLs are supported for SEALOS_URL (have ${SEALOS_URL})"
        ;;
    esac
}

# --- verify an executable sealos binary is installed ---
verify_is_executable() {
    if [ ! -x ${BIN_DIR}/sealos ]; then
        fatal "Executable sealos binary not found at ${BIN_DIR}/sealos"
    fi
}

# --- set arch and suffix, fatal if architecture not supported ---
setup_verify_arch() {
    if [ -z "$ARCH" ]; then
        ARCH=$(uname -m)
    fi
    case $ARCH in
    amd64 | x86_64)
        ARCH=amd64
        SUFFIX=
        ;;
    arm64 | aarch64)
        ARCH=arm64
        SUFFIX=-${ARCH}
        ;;
    *)
        fatal "Unsupported architecture $ARCH"
        ;;
    esac
}

# --- verify existence of network downloader executable ---
verify_downloader() {
    # Return failure if it doesn't exist or is no executable
    [ -x "$(command -v $1)" ] || return 1
    DOWNLOADER=$1
    # Set verified executable as our downloader program and return success
    DOWNLOADER_PREFIX=https://github.com/${OWN_REPO}/releases/download/
    if [ -n "$PROXY_PREFIX" ]; then
        DOWNLOADER_PREFIX="${PROXY_PREFIX%/}/${DOWNLOADER_PREFIX}"
    fi
    DOWNLOADER_URL=${DOWNLOADER_PREFIX}${VERSION}/${FILE_NAME}_${VERSION##v}_linux_${ARCH}.tar.gz
    return 0
}

get_release_version() {
    VERSION=$1
    # If the incoming version number is latest, get the latest version number from github
    if [ "$VERSION" = "latest" ]; then
        VERSION=$(curl -s https://api.github.com/repos/${OWN_REPO}/releases/latest | grep tag_name | cut -d '"' -f 4)
    fi
    info "Using ${VERSION} as release"
    OWN_REPO=$2
    if [ -z "$OWN_REPO" ]; then
        warn "OWN_REPO is empty, using default repo: labring/sealos"
        OWN_REPO=labring/sealos
    fi
    info "Using ${OWN_REPO} as your repo"
}

# --- download from github url ---
download() {
    [ $# -eq 2 ] || fatal 'download needs exactly 2 arguments'
    info "Downloading sealos, waiting..."
    case $DOWNLOADER in
    curl)
        status_code=$(curl -L "$2" -o "$1" --progress-bar -w "%{http_code}\n") || fatal 'Download failed'
        if [ "$status_code" != "200" ]; then
            fatal "Download failed, status code: $status_code"
        fi
        ;;
    wget)
        wget -qO $1 $2 || fatal 'Download failed'
        ;;
    *)
        fatal "Incorrect executable '$DOWNLOADER'"
        ;;
    esac
}

# --- download binary from github url ---
download_binary() {
    info "Downloading tar ${DOWNLOADER} ${DOWNLOADER_URL}"
    download ${TMP_TAR} ${DOWNLOADER_URL}
}

setup_tmp() {
    TMP_DIR=$(mktemp -d -t sealos-install.XXXXXXXXXX)
    TMP_TAR=${TMP_DIR}/sealos.tar.gz
    TMP_BIN=${TMP_DIR}/sealos
    cleanup() {
        code=$?
        set +e
        trap - EXIT
        rm -rf ${TMP_DIR}
        if [ $code -ne 0 ]; then
            warn "Failed to install sealos"
        fi
        exit $code
    }
    trap cleanup INT EXIT
}

cleanup_tmp() {
    rm -rf ${TMP_DIR}
}

# --- setup permissions and move binary to system directory ---
setup_binary() {
    cd ${TMP_DIR}
    chmod 755 ${TMP_TAR}
    tar -zxvf ${TMP_TAR} ${FILE_NAME}
    chmod 755 ${FILE_NAME}
    info "Installing sealos to ${BIN_DIR}/${FILE_NAME}"
    sudo chown $(whoami):$(whoami) ${TMP_BIN}
    sudo mv -f ${TMP_BIN} ${BIN_DIR}/${FILE_NAME}

}

verify_binary() {
    ${FILE_NAME} version || fatal 'failed to verify binary'
}

# --- run the install process --
{
    setup_verify_arch
    get_release_version $1 $2
    verify_downloader curl || verify_downloader wget || fatal 'Can not find curl or wget for downloading files'
    setup_tmp
    download_binary
    setup_binary
    verify_binary
    cleanup_tmp
}
