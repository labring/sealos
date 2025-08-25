
SERVICE_NAME=sealos-adminer
# Image URL to use all building/pushing image targets
IMG ?= $(SERVICE_NAME):latest
.PHONY: all
all: docker-build-and-push

##@ General

# The help target prints out all targets with their descriptions organized
# beneath their categories. The categories are represented by '##@' and the
# target descriptions by '##'. The awk commands is responsible for reading the
# entire set of makefiles included in this invocation, looking for lines of the
# file as xyz: ## something, and then pretty-format the target and help. Then,
# if there's a line with ##@ something, that gets pretty-printed as a category.
# More info on the usage of ANSI control characters for adminer formatting:
# https://en.wikipedia.org/wiki/ANSI_escape_code#SGR_parameters
# More info on the awk command:
# http://linuxcommand.org/lc3_adv_awk.php

.PHONY: help
help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Build

.PHONY: build
build: ## Build desktop-frontend binary.
	pnpm run build

.PHONY: run
run: ## Run a dev service from host.
	pnpm run start

.PHONY: docker-build
docker-build: ## Build docker image with the desktop-frontend.
	sudo docker build -t $(IMG) .

##@ Deployment

.PHONY: docker-push-image
docker-push-image: ## Push docker image to Docker Hub.
	docker push $(IMG)

.PHONY: docker-build-and-push
docker-build-and-push: docker-build docker-push-image ## Build and push docker image with the desktop-frontend.