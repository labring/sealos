# Copyright © 2022 sealos.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

GO := go
GO_LDFLAGS += -X $(VERSION_PACKAGE).gitVersion=${GIT_TAG} \
	-X $(VERSION_PACKAGE).gitCommit=${GIT_COMMIT} \
	-X $(VERSION_PACKAGE).buildDate=${BUILD_DATE} \
	-s -w
ifeq ($(DEBUG), 1)
	GO_BUILD_FLAGS += -gcflags "all=-N -l"
	GO_LDFLAGS=
endif
GO_BUILD_FLAGS += -tags "containers_image_openpgp netgo exclude_graphdriver_devicemapper static osusergo exclude_graphdriver_btrfs" -trimpath -ldflags "$(GO_LDFLAGS)"

ifeq ($(ROOT_PACKAGE),)
	$(error the variable ROOT_PACKAGE must be set prior to including golang.mk)
endif

COMMANDS ?= $(filter-out %.md, $(wildcard ${ROOT_DIR}/cmd/*))
BINS ?= $(foreach cmd,${COMMANDS},$(notdir ${cmd}))

ifeq (${COMMANDS},)
  $(error Could not determine COMMANDS, set ROOT_DIR or run in source dir)
endif
ifeq (${BINS},)
  $(error Could not determine BINS, set ROOT_DIR or run in source dir)
endif

.PHONY: go.build.verify
go.build.verify:
ifneq ($(shell $(GO) version | grep -q 'go version go' && echo 0 || echo 1), 0)
	$(error Go binary is not found. Please install Go first.)
endif

.PHONY: go.bin.%
go.bin.%:
	$(eval COMMAND := $(word 2,$(subst ., ,$*)))
	$(eval PLATFORM := $(word 1,$(subst ., ,$*)))
	@if [ ! -f $(BIN_DIR)/$(PLATFORM)/$(COMMAND) ]; then $(MAKE) go.build PLATFORM=$(PLATFORM); fi

.PHONY: go.build.%
go.build.%:
	$(eval COMMAND := $(word 2,$(subst ., ,$*)))
	$(eval PLATFORM := $(word 1,$(subst ., ,$*)))
	$(eval OS := $(word 1,$(subst _, ,$(PLATFORM))))
	$(eval ARCH := $(word 2,$(subst _, ,$(PLATFORM))))

	@echo "===========> Building binary $(COMMAND) $(VERSION) for $(PLATFORM)"
	@mkdir -p $(BIN_DIR)/$(PLATFORM)

	@if [ "$(COMMAND)" == "sealos" ] || [ "$(COMMAND)" == "sealctl" ]; then \
		CGO_ENABLED=1; \
		CC=x86_64-linux-gnu-gcc; \
		if [ "$(ARCH)" == "arm64" ]; then \
			CC=aarch64-linux-gnu-gcc; \
		fi; \
		CGO_ENABLED=$$CGO_ENABLED CC=$$CC GOOS=$(OS) GOARCH=$(ARCH) $(GO) build $(GO_BUILD_FLAGS) -o $(BIN_DIR)/$(PLATFORM)/$(COMMAND) $(ROOT_PACKAGE)/cmd/$(COMMAND); \
	else \
		CGO_ENABLED=0 GOOS=$(OS) GOARCH=$(ARCH) $(GO) build $(GO_BUILD_FLAGS) -o $(BIN_DIR)/$(PLATFORM)/$(COMMAND) $(ROOT_PACKAGE)/cmd/$(COMMAND); \
	fi

.PHONY: go.build
go.build: go.build.verify $(addprefix go.build., $(addprefix $(PLATFORM)., $(BINS)))

.PHONY: go.build.multiarch
go.build.multiarch: go.build.verify $(foreach p,$(PLATFORMS),$(addprefix go.build., $(addprefix $(p)., $(BINS))))

.PHONY: go.clean
go.clean:
	@echo "===========> Cleaning all build output"
	@-rm -vrf $(BIN_DIR) $(TMP_DIR)
	@-rm -vrf $(ROOT_DIR)/coverage.out

.PHONY: go.tidy
go.tidy:
	@$(GO) mod tidy

.PHONY: go.lint
go.lint: tools.verify.golangci-lint
	@echo "===========> Run golangci to lint source codes"
	@$(TOOLS_DIR)/golangci-lint run --build-tags=musl -c $(ROOT_DIR)/.golangci.yml

.PHONY: go.format
go.format: tools.verify.goimports
	@echo "===========> Formating codes"
	@$(FIND) -type f -name '*.go' | xargs gofmt -s -w
	@$(FIND) -type f -name '*.go' | xargs $(TOOLS_DIR)/goimports -l -w -local $(ROOT_PACKAGE)
	@$(GO) mod edit -fmt

.PHONY: go.coverage
go.coverage:
	@$(GO) test -race -failfast -coverprofile=coverage.out -covermode=atomic `go list ./pkg/env ./pkg/apply  | grep -v "/test\|/fork"`

