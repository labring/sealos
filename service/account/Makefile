IMG ?= ghcr.io/labring/sealos-account-service:latest

# Get the currently used golang install path (in GOPATH/bin, unless GOBIN is set)
ifeq (,$(shell go env GOBIN))
GOBIN=$(shell go env GOPATH)/bin
else
GOBIN=$(shell go env GOBIN)
endif

# only support linux, non cgo
PLATFORMS ?= linux_arm64 linux_amd64
GOOS=linux
CGO_ENABLED=0
GOARCH=$(shell go env GOARCH)

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
build: ## Build service-hub binary.
	LD_FLAGS="-s -w"; \
	[ -n "$(CRYPTOKEY)" ] && LD_FLAGS+=" -X github.com/labring/sealos/controllers/pkg/crypto.encryptionKey=${CRYPTOKEY}"; \
	CGO_ENABLED=0 GOOS=linux go build -ldflags "$${LD_FLAGS}" -trimpath -o bin/manager main.go

.PHONY: docker-build
docker-build: build
	mv bin/manager bin/service-database-${TARGETARCH}
	docker build -t $(IMG) .

.PHONY: docker-push
docker-push:
	docker push $(IMG)
