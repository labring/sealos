#!/bin/bash
set -e
timestamp() {
  date +"%Y-%m-%d %T"
}

error() {
  flag=$(timestamp)
  echo -e "\033[31m ERROR [$flag] >> $* \033[0m"
  exit 1
}

logger() {
  flag=$(timestamp)
  echo -e "\033[36m INFO [$flag] >> $* \033[0m"
}

warn() {
  flag=$(timestamp)
  echo -e "\033[33m WARN [$flag] >> $* \033[0m"
}

debug() {
  flag=$(timestamp)
  echo -e "\033[32m DEBUG [$flag] >> $* \033[0m"
}

check_file_exits() {
  for f; do
    if [[ -f $f ]]; then
      logger "The machine $f is installed"
      exit 0
    fi
  done
}

check_file_exits /usr/bin/sealos

pushd "$(mktemp -d)" >/dev/null || exit
  until curl -sLo "sealos.tar.gz"  "https://github.com/labring/sealos/releases/download/v5.1.0-beta3/sealos_5.1.0-beta3_linux_amd64.tar.gz"; do sleep 3; done
  tar -zxf sealos.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
  rm -rf sealos.tar.gz
  sealos version
popd >/dev/null