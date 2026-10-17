IMG ?= ghcr.io/labring/sealos-vlogs-service:latest
CLUSTER_IMG ?= ghcr.io/labring/sealos-cloud-vlogs-service:latest
HELM_RELEASE ?= vlogs
HELM_NAMESPACE ?= sealos
HELM_VALUES ?= deploy/charts/vlogs-service/vlogs-service-values.yaml
HELM_OPTS ?=

# only support linux, non cgo
PLATFORMS ?= linux_arm64 linux_amd64
GOOS=linux
CGO_ENABLED=0
GOARCH=$(shell go env GOARCH)
TARGETARCH ?= $(GOARCH)

GO_BUILD_FLAGS=-trimpath -ldflags "-s -w"

.PHONY: all
all: build

##@ General

# The help target prints out all targets with their descriptions organized
# beneath their categories. The categories are represented by '##@' and the
# target descriptions by '##'. The awk commands is responsible for reading the
# entire set of makefiles included in this invocation, looking for lines of the
# file as xyz: ## something, and then pretty-format the target and help. Then,
# if there's a line with ##@ something, that gets pretty-printed as a category.
# More info on the usage of ANSI control characters for terminal formatting:
# https://en.wikipedia.org/wiki/ANSI_escape_code#SGR_parameters
# More info on the awk command:
# http://linuxcommand.org/lc3_adv_awk.php

.PHONY: help
help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Build

.PHONY: clean
clean:
	rm -f $(SERVICE_NAME)

.PHONY: build
build: clean ## Build service-hub binary.
	CGO_ENABLED=$(CGO_ENABLED) GOOS=$(GOOS) go build $(GO_BUILD_FLAGS) -o bin/manager main.go

.PHONY: docker-build
docker-build: ## Build docker image for specified architecture.
	docker build --platform linux/$(TARGETARCH) -t $(IMG) -f Dockerfile ../..

.PHONY: docker-push
docker-push:
	docker push $(IMG)

.PHONY: docker-buildx-push
docker-buildx-push: ## Build and push multi-arch image (amd64 & arm64).
	docker buildx build --platform linux/amd64,linux/arm64 -t $(IMG) -f Dockerfile --push ../..

##@ Deploy

.PHONY: helm-lint
helm-lint: ## Validate the Helm chart and installer shell script.
	helm lint --strict deploy/charts/vlogs-service -f $(HELM_VALUES)
	shellcheck deploy/entrypoint.sh

.PHONY: helm-deploy
helm-deploy: ## Install or upgrade vlogs with Helm.
	helm upgrade -i $(HELM_RELEASE) deploy/charts/vlogs-service \
		-n $(HELM_NAMESPACE) --create-namespace -f $(HELM_VALUES) $(HELM_OPTS)

.PHONY: cluster-buildx-push
cluster-buildx-push: ## Cache the chart's runtime image and publish a multi-arch cluster image.
	@grep -Fxq 'image: $(IMG)' deploy/charts/vlogs-service/values.yaml || \
		{ echo 'Set image in deploy/charts/vlogs-service/values.yaml to $(IMG) before building.' >&2; exit 1; }
	cd deploy && sealos registry save --registry-dir=registry_amd64 --arch amd64 --images="$(IMG)"
	cd deploy && sealos registry save --registry-dir=registry_arm64 --arch arm64 --images="$(IMG)"
	docker buildx build --platform linux/amd64,linux/arm64 -t $(CLUSTER_IMG) -f deploy/Kubefile --push deploy
