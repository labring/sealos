Dirs=$(shell ls)
COMMIT_ID ?= $(shell git rev-parse --short HEAD || echo "0.0.0")

# Get the currently used golang install path (in GOPATH/bin, unless GOBIN is set)
ifneq (,$(shell go env GOBIN))
GOBIN=$(shell go env GOPATH)/bin
else
GOBIN=$(shell go env GOBIN)
endif

SHELL = /usr/bin/env bash -o pipefail
.SHELLFLAGS = -ec

PROJECT_DIR := $(shell dirname $(abspath $(lastword $(MAKEFILE_LIST))))
define go-get-tool
@[ -f $(1) ] || { \
set -e ;\
TMP_DIR=$$(mktemp -d) ;\
cd $$TMP_DIR ;\
go mod init tmp ;\
echo "Downloading $(2)" ;\
GOBIN=$(PROJECT_DIR)/bin go get $(2) ;\
rm -rf $$TMP_DIR ;\
}
endef

GOLINT_BIN = $(shell pwd)/bin/golangci-lint
install-golint: ## check license if not exist install go-lint tools
	$(call go-get-tool,$(GOLINT_BIN),github.com/golangci/golangci-lint/cmd/golangci-lint@v1.43.0)

lint: install-golint ## Run go lint against code.
	$(GOLINT_BIN) run -v ./...

default:  build


GORELEASER_BIN = $(shell pwd)/bin/goreleaser
install-goreleaser: ## check license if not exist install go-lint tools
	$(call go-get-tool,$(GORELEASER_BIN),github.com/goreleaser/goreleaser@latest)


build: SHELL:=/bin/bash
build: install-goreleaser clean ## build binaries by default
	@echo "build sealos bin"
	$(GORELEASER_BIN) build --snapshot --rm-dist  --timeout=1h

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
		if [[  $$file != '_output' && $$file != 'docs' && $$file != 'vendor' && $$file != 'logger' && $$file != 'applications' ]]; then \
			$(ADDLICENSE_BIN)  -y $(shell date +"%Y") -c "sealos." -f hack/template/LICENSE ./$$file ; \
		fi \
    done

OSSUTIL_BIN = $(shell pwd)/bin/ossutil
install-ossutil: ## check license if not exist install go-lint tools
	$(call go-get-tool,$(OSSUTIL_BIN),github.com/aliyun/ossutil@latest)


push-oss:install-ossutil build
	$(OSSUTIL_BIN) cp -f dist/sealos_linux_amd64/sealos oss://sealyun-temp/sealos/${COMMIT_ID}/sealos
	$(OSSUTIL_BIN) cp -f dist/sealos_linux_arm64/sealos oss://sealyun-temp/sealos/${COMMIT_ID}/sealos-arm64

generator-contributors:
	git log --format='%aN <%aE>' | sort -uf > CONTRIBUTORS


DEEPCOPY_BIN = $(shell pwd)/bin/deepcopy-gen
install-deepcopy: ## check license if not exist install go-lint tools
	$(call go-get-tool,$(DEEPCOPY_BIN),k8s.io/code-generator/cmd/deepcopy-gen@latest)

HEAD_FILE := hack/template/boilerplate.go.txt
INPUT_DIR := github.com/fanux/sealos/pkg/types/v1beta1
deepcopy:install-deepcopy
	$(DEEPCOPY_BIN) \
      --input-dirs="$(INPUT_DIR)" \
      -O zz_generated.deepcopy   \
      --go-header-file "$(HEAD_FILE)" \
      --output-base "${GOPATH}/src"
