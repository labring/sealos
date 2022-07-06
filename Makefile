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

# ==============================================================================
# Build options

ROOT_PACKAGE=github.com/labring/sealos
VERSION_PACKAGE=github.com/labring/sealos/pkg/version

# ==============================================================================
# Includes

include scripts/make-rules/common.mk # must be the first to include
include scripts/make-rules/golang.mk
include scripts/make-rules/gen.mk
include scripts/make-rules/license.mk
include scripts/make-rules/oss.mk
include scripts/make-rules/release.mk
include scripts/make-rules/tools.mk

# ==============================================================================
# Usage

define USAGE_OPTIONS

Options:
  DEBUG            Whether or not to generate debug symbols. Default is 0.
  BINS             Binaries to build. Default is all binaries under cmd.
                   This option is available when using: make build/compress
                   Example: make build BINS="sealos sealctl"
  PACKAGES         Packages to build. Default is rpm and deb.
                   This option is available when using: make package
                   Example: make package PACKAGES="rpm deb"
  PLATFORM         Alternate platform to build for. Default is the host platform.
                   This option is available when using: make build/compress/package
                   Example: make build PLATFORM="linux_arm64"
  V                Set to 1 enable verbose build. Default is 0.
endef
export USAGE_OPTIONS

# ==============================================================================
# Targets

.DEFAULT_GOAL = build

## build: Build source code for host platform.
.PHONY: build
build:
	@$(MAKE) go.build

## lint: Check syntax and styling of go sources.
.PHONY: lint
lint:
	@$(MAKE) go.lint

## format: Gofmt (reformat) package sources.
.PHONY: format
format:
	@$(MAKE) go.format

## coverage: Run unit tests and output test coverage.
.PHONY: coverage
coverage:
	@$(MAKE) go.coverage

## verify-license: Verify the license headers for all files.
.PHONY: verify-license
verify-license:
	@$(MAKE) license.verify

## add-license: Ensure source code files have license headers.
.PHONY: add-license
add-license:
	@$(MAKE) license.add

## gen: Generate all necessary files.
.PHONY: gen
gen:
	@$(MAKE) gen.run

## tools: Install dependent tools.
.PHONY: tools
tools:
	@$(MAKE) tools.install

## clean: Remove all files that are created by building.
.PHONY: clean
clean:
	@echo "===========> Cleaning all build output"
	@-rm -vrf $(OUTPUT_DIR) $(BIN_DIR)

## release-build: Build release binaries for multiple platforms.
.PHONY: release-build
release-build:
	@$(MAKE) release.build

## release: Create a release with custom release notes.
.PHONY: release
release:
	@$(MAKE) release.release

## compress: Compress the binaries using upx for host platform.
.PHONY: compress
compress:
	@$(MAKE) release.upx

## package: Build rpm/deb packages for host platform.
.PHONY: package
package:
	@$(MAKE) release.package

## update-contrib: Update list of contributors.
.PHONY: update-contrib
update-contrib:
	@git log --format='%aN <%aE>' | sort -uf > CONTRIBUTORS

## help: Show this help info.
.PHONY: help
help: Makefile
	@echo -e "\nUsage: make <TARGETS> <OPTIONS> ...\n\nTargets:"
	@sed -n 's/^##//p' $< | awk -F':' '{printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}' | sed -e 's/^/ /'
	@echo "$$USAGE_OPTIONS"
