
# Image URL to use all building/pushing image targets
IMG ?= ghcr.io/labring/sealos-imagehub-service:dev
TARGETARCH ?= amd64

# Get the currently used golang install path (in GOPATH/bin, unless GOBIN is set)
ifeq (,$(shell go env GOBIN))
GOBIN=$(shell go env GOPATH)/bin
else
GOBIN=$(shell go env GOBIN)
endif

# Setting SHELL to bash allows bash commands to be executed by recipes.
# This is a requirement for 'setup-envtest.sh' in the test target.
# Options are set to exit when a recipe line exits non-zero or a piped command fails.
SHELL = /usr/bin/env bash -o pipefail
.SHELLFLAGS = -ec

.PHONY: all
all: build

.PHONY: help
help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

.PHONY: fmt
fmt: ## Run go fmt against code.
	go fmt ./...

.PHONY: vet
vet: ## Run go vet against code.
	go vet ./...

.PHONY: test
test: fmt vet envtest ## Run tests.

##@ Build

.PHONY: build
build:  ## Build manager binary.
	CGO_ENABLED=0 GOOS=linux  go build -o bin/service main.go

.PHONY: run
run: manifests generate fmt vet ## Run a controller from your host.
	go run ./main.go

.PHONY: docker-build
docker-build: test build ## Build docker image with the manager.
	mv bin/service bin/service-imagehub-${TARGETARCH}
	chmod +x bin/service-imagehub-${TARGETARCH}
	docker build -t ${IMG} . --build-arg TARGETARCH=${TARGETARCH}

.PHONY: docker-push
docker-push: ## Push docker image with the manager.
	docker push ${IMG}

## Location to install dependencies to
LOCALBIN ?= $(shell pwd)/bin
$(LOCALBIN):
	mkdir -p $(LOCALBIN)