Dirs=$(shell ls)
COMMIT_ID ?= $(shell git rev-parse --short HEAD || echo "0.0.0")
BUILD_TIME=$(shell date +%FT%T%z)
GIT_TAG               := $(shell git describe --exact-match --tags --abbrev=0  2> /dev/null || echo untagged)
LDFLAGS=-ldflags

# only support linux
OS=linux
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
CGO_ENABLED=0
OS=darwin
endif
ifeq ($(UNAME_S),Linux)
CGO_ENABLED=1
endif

override LDFLAGS += "\
  -X github.com/labring/sealos/pkg/version.gitVersion=${GIT_TAG} \
  -X github.com/labring/sealos/pkg/version.gitCommit==${COMMIT_ID} \
  -X github.com/labring/sealos/pkg/version.buildDate=${BUILD_TIME} "


# Get the currently used golang install path (in GOPATH/bin, unless GOBIN is set)
ifneq (,$(shell go env GOBIN))
GOBIN=$(shell go env GOPATH)/bin
else
GOBIN=$(shell go env GOBIN)
endif

SHELL = /usr/bin/env bash -o pipefail
.SHELLFLAGS = -ec

# go-get-tool will 'go get' any package $2 and install it to $1.
PROJECT_DIR := $(shell dirname $(abspath $(lastword $(MAKEFILE_LIST))))
define go-get-tool
@[ -f $(1) ] || { \
set -e ;\
TMP_DIR=$$(mktemp -d) ;\
cd $$TMP_DIR ;\
go mod init tmp ;\
echo "Downloading $(2)" ;\
GOBIN=$(PROJECT_DIR)/bin go install $(2) ;\
rm -rf $$TMP_DIR ;\
}
endef


GOLINT_BIN = $(shell pwd)/bin/golangci-lint
install-golint: ## check license if not exist install go-lint tools
	$(call go-get-tool,$(GOLINT_BIN),github.com/golangci/golangci-lint/cmd/golangci-lint@v1.39.0)

lint: install-golint ## Run go lint against code.
	$(GOLINT_BIN) run --build-tags=musl -c .golangci.yml -v ./...

default:  build

build: build-amd64  build-arm64

build-amd64:
	CGO_ENABLED=${CGO_ENABLED} GOOS=${OS} GOARCH=amd64 go build ${LDFLAGS}   -o $(shell pwd)/bin/${OS}_amd64/sealos -tags "containers_image_openpgp" cmd/sealos/main.go
	CGO_ENABLED=0 GOOS=${OS} GOARCH=amd64 go build ${LDFLAGS} -o $(shell pwd)/bin/${OS}_amd64/seactl -tags "containers_image_openpgp" cmd/sealctl/main.go

build-arm64:
	CGO_ENABLED=${CGO_ENABLED} GOOS=${OS} GOARCH=arm64 go build ${LDFLAGS} -o $(shell pwd)/bin/${OS}_arm64/sealos -tags "containers_image_openpgp" cmd/sealos/main.go
	CGO_ENABLED=0 GOOS=${OS} GOARCH=arm64 go build ${LDFLAGS} -o $(shell pwd)/bin/${OS}_arm64/seactl -tags "containers_image_openpgp" cmd/sealctl/main.go

import:
	goimports -l -w cmd
	goimports -l -w pkg

GORELEASER_BIN = $(shell pwd)/bin/goreleaser
install-goreleaser: ## check license if not exist install go-lint tools
	#goimports -l -w cmd
	#goimports -l -w pkg
	$(call go-get-tool,$(GORELEASER_BIN),github.com/goreleaser/goreleaser@v1.6.3)

build-pack: SHELL:=/bin/bash
build-pack: install-goreleaser clean ## build binaries by default
	@echo "build sealos bin"
	$(GORELEASER_BIN) build --snapshot --rm-dist  --timeout=1h

build-release: SHELL:=/bin/bash
build-release: install-goreleaser clean ## build binaries by default
	@echo "build sealos bin"
	$(GORELEASER_BIN) release --timeout=1h  --release-notes=hack/release/Note.md


help: ## this help
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {sub("\\\\n",sprintf("\n%22c"," "), $$2);printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

clean: ## clean
	rm -rf dist

ADDLICENSE_BIN = $(shell pwd)/bin/addlicense
install-addlicense: ## check license if not exist install go-lint tools
	$(call go-get-tool,$(ADDLICENSE_BIN),github.com/google/addlicense@latest)

filelicense:
filelicense: install-addlicense
	for file in ${Dirs} ; do \
		if [[  $$file != '_output' && $$file != 'docs' && $$file != 'vendor' && $$file != 'logger' && $$file != 'fork' && $$file != 'applications' ]]; then \
			$(ADDLICENSE_BIN)  -y $(shell date +"%Y") -c "sealos." -f hack/template/LICENSE ./$$file ; \
		fi \
    done

OSSUTIL_BIN = $(shell pwd)/bin/ossutil
install-ossutil: ## check license if not exist install go-lint tools
	$(call go-get-tool,$(OSSUTIL_BIN),github.com/aliyun/ossutil@latest)


push-oss:install-ossutil build
	$(OSSUTIL_BIN) cp -f dist/sealos_linux_amd64/sealos oss://sealyun-temp/sealos/${COMMIT_ID}/sealos-amd64
	$(OSSUTIL_BIN) cp -f dist/sealos_linux_arm64/sealos oss://sealyun-temp/sealos/${COMMIT_ID}/sealos-arm64
	$(OSSUTIL_BIN) cp -f dist/sealctl_linux_amd64/sealctl oss://sealyun-temp/sealos/${COMMIT_ID}/sealctl-amd64
	$(OSSUTIL_BIN) cp -f dist/sealctl_linux_arm64/sealctl oss://sealyun-temp/sealos/${COMMIT_ID}/sealctl-arm64

generator-contributors:
	git log --format='%aN <%aE>' | sort -uf > CONTRIBUTORS


DEEPCOPY_BIN = $(shell pwd)/bin/deepcopy-gen
install-deepcopy: ## check license if not exist install go-lint tools
	$(call go-get-tool,$(DEEPCOPY_BIN),k8s.io/code-generator/cmd/deepcopy-gen@latest)

HEAD_FILE := hack/template/boilerplate.go.txt
INPUT_DIR := github.com/labring/sealos/pkg/types/v1beta1
deepcopy:install-deepcopy
	$(DEEPCOPY_BIN) \
      --input-dirs="$(INPUT_DIR)" \
      -O zz_generated.deepcopy   \
      --go-header-file "$(HEAD_FILE)" \
      --output-base "${GOPATH}/src"
