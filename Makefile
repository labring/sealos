COMMIT_SHA1 ?= $(shell git rev-parse --short HEAD || echo "0.0.0")
BUILD_VERSION ?= $(shell cat version.txt || echo "local")
BUILD_TIME ?= $(shell date "+%F %T")

.PHONY: fmt vet lint default
GO_RELEASE_TAGS := $(shell go list -f ':{{join (context.ReleaseTags) ":"}}:' runtime)

# Only use the `-race` flag on newer versions of Go (version 1.3 and newer)
ifeq (,$(findstring :go1.3:,$(GO_RELEASE_TAGS)))
	RACE_FLAG :=
else
	RACE_FLAG := -race -cpu 1,2,4
endif

# Run `go vet` on Go 1.12 and newer. For Go 1.5-1.11, use `go tool vet`
ifneq (,$(findstring :go1.12:,$(GO_RELEASE_TAGS)))
	GO_VET := go vet \
		-atomic \
		-bool \
		-copylocks \
		-nilfunc \
		-printf \
		-rangeloops \
		-unreachable \
		-unsafeptr \
		-unusedresult \
		.
else ifneq (,$(findstring :go1.5:,$(GO_RELEASE_TAGS)))
	GO_VET := go tool vet \
		-atomic \
		-bool \
		-copylocks \
		-nilfunc \
		-printf \
		-shadow \
		-rangeloops \
		-unreachable \
		-unsafeptr \
		-unusedresult \
		.
else
	GO_VET := @echo "go vet skipped -- not supported on this version of Go"
endif

fmt: ## fmt

	@echo gofmt -l
	@OUTPUT=`gofmt -l . 2>&1`; \
	if [ "$$OUTPUT" ]; then \
		echo "gofmt must be run on the following files:"; \
        echo "$$OUTPUT"; \
        exit 1; \
    fi

lint: ## lint

	@echo golint ./...
	@OUTPUT=`command -v golint >/dev/null 2>&1 && golint ./... 2>&1`; \
	if [ "$$OUTPUT" ]; then \
		echo "golint errors:"; \
		echo "$$OUTPUT"; \
		exit 1; \
	fi

vet: ## vet
	$(GO_VET)

default: fmt lint vet

local: clean ## 构建二进制
	@echo "build bin ${BUILD_VERSION} ${BUILD_TIME} ${COMMIT_SHA1}"
	# go get github.com/mitchellh/gox
	# eg darwin/amd64 linux/amd64 windows/amd64
	@gox -osarch="linux/amd64" \
        -output="dist/{{.Dir}}_{{.OS}}_{{.Arch}}" \
		-ldflags "-X 'github.com/linuxsuren/cobra-extension/version.version=${BUILD_VERSION}' \
				  -X 'github.com/linuxsuren/cobra-extension/version.commit=${COMMIT_SHA1}' \
				  -X 'github.com/linuxsuren/cobra-extension/version.date=${BUILD_TIME}'"

help: ## this help
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {sub("\\\\n",sprintf("\n%22c"," "), $$2);printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

clean: ## clean
	rm -rf dist

.EXPORT_ALL_VARIABLES:

GO111MODULE = on

GOPROXY = https://goproxy.cn
GOSUMDB = sum.golang.google.cn