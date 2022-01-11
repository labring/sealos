Dirs=$(shell ls)
COMMIT_ID ?= $(shell git rev-parse --short HEAD || echo "0.0.0")

# Get the currently used golang install path (in GOPATH/bin, unless GOBIN is set)
ifneq (,$(shell go env GOBIN))
GOBIN=$(shell go env GOPATH)/bin
else
GOBIN=$(shell go env GOBIN)
endif

install-golint: ## check license if not exist install addlicense tools
ifeq (, $(shell which golangci-lint))
	@{ \
	set -e ;\
	o install github.com/golangci/golangci-lint/cmd/golangci-lint@v1.39.0 ;\
	}
GOLINT_BIN=$(GOBIN)/golangci-lint
else
GOLINT_BIN=$(shell which golangci-lint)
endif

lint: install-golint ## Run go lint against code.
	$(GOLINT_BIN) run -v ./...

default:  build

install-goreleaser: ## check license if not exist install addlicense tools
ifeq (, $(shell which goreleaser))
	@{ \
	set -e ;\
	go install github.com/goreleaser/goreleaser@latest ;\
	}
GORELEASER_BIN=$(GOBIN)/goreleaser
else
GORELEASER_BIN=$(shell which goreleaser)
endif

build: SHELL:=/bin/bash
build: install-goreleaser clean ## build binaries by default
	@echo "build sealos bin"
	$(GORELEASER_BIN) build --snapshot --rm-dist  --timeout=1h

help: ## this help
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {sub("\\\\n",sprintf("\n%22c"," "), $$2);printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

clean: ## clean
	rm -rf dist

install-addlicense: ## check license if not exist install addlicense tools
ifeq (, $(shell which addlicense))
	@{ \
	set -e ;\
	LICENSE_TMP_DIR=$$(mktemp -d) ;\
	cd $$LICENSE_TMP_DIR ;\
	go mod init tmp ;\
	go get -v github.com/google/addlicense ;\
	rm -rf $$LICENSE_TMP_DIR ;\
	}
ADDLICENSE_BIN=$(GOBIN)/addlicense
else
ADDLICENSE_BIN=$(shell which addlicense)
endif


filelicense: SHELL:=/bin/bash
filelicense: ## add license
	for file in ${Dirs} ; do \
		if [[  $$file != '_output' && $$file != 'docs' && $$file != 'vendor' && $$file != 'logger' && $$file != 'applications' ]]; then \
			$(ADDLICENSE_BIN)  -y $(shell date +"%Y") -c "sealos." -f hack/template/LICENSE ./$$file ; \
		fi \
    done

install-ossutil: ## check ossutil if not exist install ossutil tools
ifeq (, $(shell which ossutil))
	@{ \
	set -e ;\
	curl -sfL https://raw.githubusercontent.com/securego/gosec/master/install.sh | sh -s -- -b $(GOBIN) v2.2.0 ;\
	}
OSSUTIL_BIN=$(GOBIN)/ossutil
else
OSSUTIL_BIN=$(shell which ossutil)
endif

push-oss:install-ossutil build
	$(OSSUTIL_BIN) cp -f dist/sealos_linux_amd64/sealos oss://sealyun-temp/sealos/${COMMIT_ID}/sealos
	$(OSSUTIL_BIN) cp -f dist/sealos_linux_arm64/sealos oss://sealyun-temp/sealos/${COMMIT_ID}/sealos-arm64

generator-contributors:
	git log --format='%aN <%aE>' | sort -uf > CONTRIBUTORS
