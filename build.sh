#!/bin/bash
# build.sh v3.0.2
COMMIT_SHA1=$(git rev-parse --short HEAD || echo "0.0.0")
BUILD_TIME=$(date "+%F %T")
goldflags="-s -w -X 'github.com/linuxsuren/cobra-extension/version.version=$1' -X 'github.com/linuxsuren/cobra-extension/version.commit=${COMMIT_SHA1}' -X 'github.com/linuxsuren/cobra-extension/version.date=${BUILD_TIME}'"
go build -o sealos -ldflags "$goldflags" main.go && command -v upx &> /dev/null && upx sealos
