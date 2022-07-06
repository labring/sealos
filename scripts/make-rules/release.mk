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

.PHONY: release.build
release.build: tools.verify.goreleaser clean
	@echo "===========> Building sealos release binary"
	@$(TOOLS_DIR)/goreleaser build --snapshot  --timeout=1h --id=${BUILDSTEP}

.PHONY: release.release
release.release: tools.verify.goreleaser clean
	@echo "===========> Releasing sealos release binary"
	@$(TOOLS_DIR)/goreleaser release --timeout=1h --release-notes=scripts/release/Note.md

.PHONY: release.upx.%
release.upx.%:
	$(eval COMMAND := $(word 2,$(subst ., ,$*)))
	$(eval PLATFORM := $(word 1,$(subst ., ,$*)))
	@$(TOOLS_DIR)/upx $(BIN_DIR)/$(PLATFORM)/$(COMMAND)

.PHONY: release.upx
release.upx: tools.verify.upx $(addprefix release.upx., $(addprefix $(PLATFORM)., $(BINS)))

PACKAGES ?= rpm deb

.PHONY: release.package.%
release.package.%:
	$(eval PACKAGE := $(word 2,$(subst ., ,$*)))
	$(eval PLATFORM := $(word 1,$(subst ., ,$*)))
	@$(TOOLS_DIR)/nfpm package -p $(PACKAGE) -f $(ROOT_DIR)/scripts/$(PLATFORM).yml -t $(BIN_DIR)/$(PLATFORM)

.PHONY: release.package
release.package: tools.verify.nfpm $(addprefix release.package., $(addprefix $(PLATFORM)., $(PACKAGES)))
