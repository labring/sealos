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

BUILD_TOOLS ?= golangci-lint goimports addlicense deepcopy-gen conversion-gen

.PHONY: tools.install
tools.install: $(addprefix tools.install., $(BUILD_TOOLS))

.PHONY: tools.install.%
tools.install.%:
	@echo "===========> Installing $*"
	@$(MAKE) install.$*

.PHONY: tools.verify.%
tools.verify.%:
	@if [ ! -f $(TOOLS_DIR)/$* ]; then GOBIN=$(TOOLS_DIR) $(MAKE) tools.install.$*; fi

.PHONY: tools.verify.golangci-lint
tools.verify.golangci-lint:
	@if [ ! -f $(TOOLS_DIR)/golangci-lint ]; then \
		$(MAKE) tools.install.golangci-lint; \
	elif ! /usr/bin/env -u GOOS -u GOARCH $(TOOLS_DIR)/golangci-lint version >/dev/null 2>&1; then \
		rm -f $(TOOLS_DIR)/golangci-lint; \
		$(MAKE) tools.install.golangci-lint; \
	fi

.PHONY: install.golangci-lint
install.golangci-lint:
	@/usr/bin/env -u GOOS -u GOARCH bash -c "set -euo pipefail; curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/HEAD/install.sh | sh -s -- -b '$(TOOLS_DIR)' v2.5.0"

.PHONY: install.goimports
install.goimports:
	@$(GO) install golang.org/x/tools/cmd/goimports@latest

.PHONY: install.addlicense
install.addlicense:
	@$(GO) install github.com/google/addlicense@latest

.PHONY: install.deepcopy-gen
install.deepcopy-gen:
	@$(GO) install k8s.io/code-generator/cmd/deepcopy-gen@latest

.PHONY: install.conversion-gen
install.conversion-gen:
	@$(GO) install k8s.io/code-generator/cmd/conversion-gen@latest
