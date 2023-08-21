
# Image URL to use all building/pushing image targets
IMG ?= ghcr.io/labring/sealos-resources-controller:latest
# ENVTEST_K8S_VERSION refers to the version of kubebuilder assets to be downloaded by envtest binary.
ENVTEST_K8S_VERSION = 1.23

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

##@ Build

.PHONY: build
build: ## Build manager binary.
	CGO_ENABLED=0 GOOS=linux go build $(shell [ -n "${CRYPTOKEY}"  ] && echo "-ldflags '-X github.com/labring/sealos/controllers/pkg/crypto.encryptionKey=${CRYPTOKEY} -X github.com/labring/sealos/controllers/pkg/database.cryptoKey=${CRYPTOKEY}'") -o bin/manager main.go

.PHONY: run
run: ## Run a controller from your host.
	go run ./main.go

.PHONY: docker-build
docker-build: test ## Build docker image with the manager.
	docker build -t ${IMG} .

.PHONY: docker-push
docker-push: ## Push docker image with the manager.
	docker push ${IMG}

##@ Deployment

ifndef ignore-not-found
  ignore-not-found = false
endif

## Location to install dependencies to
LOCALBIN ?= $(shell pwd)/bin
$(LOCALBIN):
	mkdir -p $(LOCALBIN)
